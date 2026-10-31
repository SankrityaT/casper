# 01: Terse Durable Actors, a builder reference for Casper

Researched 2026-10-29. Sources:
- Repo `TerseAI/durable-actors` @ `20d2899` (cloned to `/tmp/terse-da`, read only, nothing run).
- npm registry.
- useterse.ai, docs.useterse.ai, and the YC launch page.

Paths like `sdk/src/...` are relative to the repo root.

Confidence markers:
- ✅ verified in source or docs.
- ⚠️ inferred from source but not exercised.
- ❓ could not verify.

---

## 0. TL;DR for the day

- **Packages.** There are two flavours of the same SDK:
  - **OSS:** npm `durable-actors@0.14.4` with the CLI `bunx durable-actors`. It runs locally and self-hosts on GCP.
  - **Hosted Terse Cloud:** npm `terse-sdk@0.14.7` (imports from `terse-sdk/actor`, depends on `durable-actors@0.14.4`) with the CLI `terse-cli@0.14.7` (`bunx terse-cli@latest install`, then `terse init`, `terse actor dev`, `terse actor generate`, `terse deploy`). Same API names. ✅ (npm view; https://docs.useterse.ai/quickstart, https://docs.useterse.ai/reference/cli.md)
- **Release churn is extreme.** There were about 14 npm releases between Oct 23 and Oct 29 (`npm view durable-actors time`). **Pin exact versions** and don't `@latest` on Saturday morning.
- **Bun ≥ 1.4.2 is required** (`sdk/package.json` engines; README). The latest Bun on npm is 1.4.4. **Bun is NOT installed on this machine** (`bun: command not found`). Install before the event (`curl -fsSL https://bun.sh/install | bash`).
- **The native runtime downloads on first `dev`.** It comes from GitHub releases (`sdk/src/runtimeInstaller.ts:65`). darwin-arm64, darwin-x64, linux-arm64 and linux-x64 assets exist for v0.14.4 ✅. Run `dev` once at home so it is cached in `~/.cache/durable-actors`. Don't depend on venue wifi for that download.
- **Biggest demo risk: local `dev` binds 127.0.0.1 only.** Grants contain `ws://127.0.0.1:7100/v1/socket?key=…` (`src/control_plane/local.rs:117-120`, `src/control_plane/admin.rs:256-279`). A second laptop can't connect without a proxy or Terse Cloud (§6).
- **The architecture fits Casper well:**
  - One `Room` actor per workspace: an ordered log in SQLite, live `broadcast`, `@Emittable` summary state.
  - One `Agent` actor per agent: `@Emittable` status/mood.
  - The agent loops plus Agent Relay handlers live in a **plain Node/Bun process** that calls actor methods through the generated client.
  - Don't run long agent loops as background work inside actors (§5).

---

## 1. Mental model (✅ unless marked)

- An actor is a class extending `Actor`. Identity is `(projectId, ClassName, actorId)`.
  - `X.get(id)` returns a reference.
  - The first call starts the actor; a new ID starts with empty state. (docs.useterse.ai/concepts.md)
- **There is one mailbox per actor.** Method calls and socket events (connect/message/disconnect/alarm) run one at a time, in order. A call holds the mailbox across `await`, including `fetch`, unless the method is `@Interleave`. (`docs/reference/typescript-guide.md` "Interleaving calls"; concepts.md)
- **Idle eviction.** The default is **10 s idle** (`DURABLE_ACTORS_HOST_IDLE_TIMEOUT_MS=10000`, range 1 to 86 400 000). Override per class with `@Compute({ idleTimeoutMs })`.
  - Method calls and socket handlers reset the timer.
  - **A running handler defers eviction.**
  - **Open WebSockets do NOT keep the actor alive.** They stay open at the gateway, and the next message wakes the actor.
  - Gateway auto-replies don't reset idle time.
  - Sources: `docs/reference/configuration.md` (Capacity table), `sdk/src/actor/compute.ts`.
- **What survives eviction:**
  - `@Persisted` fields and `this.db` (SQLite) survive.
  - `@Ephemeral` fields and in-memory objects reset.
  - The alarm is stored outside the actor and fires while it is dormant.
- **Storage:**
  - Locally, state lives in `<project>/.durable-actors/`; keep that directory to keep state.
  - In the cloud, state goes to GCS (Standard or "Rapid"). Concepts.md says each commit is written to Rapid storage before the call returns.

---

## 2. Exact API surface

Exports from `durable-actors` (`sdk/src/index.ts`): `Actor`, `Compute`, `Atomic`, `Emittable`, `Ephemeral`, `Interleave`, `Persisted`, `Resource`, `ActorInvocationError`, `unchecked`.

Exported types: `Unchecked`, `ActorSocket`, `ActorConnection`, `ActorBroadcastOptions`, `ActorContext`, `ActorDatabase`, `ActorAlarm`, `ActorResource`, `ActorStateMessage`, `ActorStateUpdate`, `ActorSocketOf<T>`, `ActorMessageOf<T>`, `ComputeOptions`.

For the hosted product, import the same names from `terse-sdk/actor`.

### 2.1 Class shape (`sdk/src/actor/actor.ts`)

```ts
abstract class Actor<Metadata = JsonValue, Incoming = JsonValue, Outgoing = Incoming, Tag extends string = string>
  get db(): ActorDatabase          // per-actor SQLite
  get alarm(): ActorAlarm          // single alarm slot
  protected get id(): string       // this actor's ID (usable in field initializers)
  static get(actorId): ActorReference   // works in backend AND inside other actors
  protected getConnections(tag?): Promise<ActorSocket[]>   // only during an invocation
  protected getConnectionCount(): Promise<number>
  protected setWebSocketAutoResponse({ request, response }?)  // raw text frame -> reply w/o waking actor
  protected broadcast(message: Outgoing, { tags?, tagMatch?: "all"|"any", except?: socket|socket[] }?)
  // optional hooks:
  onConnect?(socket), onMessage?(socket, msg: Incoming), onDisconnect?(socket, code, reason, wasClean), onAlarm?()
```

Hard rules, enforced in `discoverMethods` / `validateActorState` in `actor.ts` and `host/actor-runtime.ts`:

- **The class must extend `Actor` directly.** No intermediate base classes.
- **Every function on the prototype must be `async`.** Every prototype method also becomes a public RPC method.
  - ⚠️ A sync TS-`private` helper method will throw "must be async". Put helpers in module-level functions.
  - Reserved method names: `then`, `connect`, `broadcast`, `db`, `alarm`.
  - No getters or setters. No symbol methods. `onAlarm` takes no args.
- **Every instance field needs `@Persisted` or `@Ephemeral`.** Otherwise you get a runtime throw: "must declare @Persisted or @Ephemeral". The exception is initialized private `ActorResource` fields, which are implicitly ephemeral.
- **Field-name restrictions:**
  - `db` and `alarm` are reserved field names.
  - `@Persisted` can't decorate JS `#private` fields; TS `private` is fine.
- **Explicit constructors** must be `constructor(ctx: ActorContext) { super(ctx) }`.
  - Constructor and field-initializer SQL must be synchronous and repeatable (`CREATE TABLE IF NOT EXISTS`) because it reruns on every wake.
- **IDs:** Actor IDs, names and methods match `^[A-Za-z0-9._-]+$`, with actor IDs 1 to 128 chars (`sdk/src/actor/identity.ts`). **No `:` or `/`.** Use `casper-room-1`, `agent.kinjal.pumpkin`.
- Args and return values must be JSON. Trailing `undefined` args are stripped; an `undefined` before a supplied arg throws (`client-runtime/stub.ts`).

### 2.2 Decorators (`sdk/src/actor/decorators.ts`, typescript-guide.md)

| Decorator | Meaning |
|---|---|
| `@Persisted` | Saved **on each assignment**, immediately. Writes made before a throw stay saved. **Reassign objects and arrays**: `this.x = [...this.x, v]`. Nested mutation (`push`, `obj.k = v`) is memory-only and is not saved, **and doesn't trigger `@Emittable` updates**. Assign `undefined` to delete. Values are cloned as JSON. Assigning outside an active invocation throws "persisted actor fields cannot change outside its invocation" (`actor/context.ts` `assertAccess`, `host/persisted-fields.ts`). |
| `@Ephemeral` | In-memory only. Resets on eviction, **and also when a non-interleaved call throws**: the instance is rebuilt (`restoreInstance` in `actor-runtime.ts`). |
| `@Emittable` | Use with `@Persisted` on a **public** field. On connect the client gets `{type:"state", state:{...}}`. After each **successful** call that changed the field it gets `{type:"state_update", changes:{field: FULL_NEW_VALUE}, removed:[], version}`. The diff is per field, so the whole field value is resent. Don't make a 5 000-item log `@Emittable` (`actor-runtime.ts` `stateUpdates`/`socketEffects`). Message types `"state"`/`"state_update"` are reserved; you can't send them yourself (`socketValidation.ts`). |
| `@Atomic` | All writes of the method commit together on success, or none on throw. While an `@Atomic` method runs, background SQL throws (`host/database.ts`). |
| `@Interleave` | Experimental. Admits the next queued call immediately when this method starts, so others run while it awaits (`admitNext` in `actor-runtime.ts`). **Cost:** disables rollback for the **whole class**, and state can change under you across awaits. If the actor hits an internal error (hydrate or DB commit failure) it goes into a sticky `fatal` state that returns the same failure until the worker restarts (`this.fatal`). Non-interleaved methods in the same class still serialize. |
| `@Compute({cpu, cpuLimit, memoryMiB, memoryLimitMiB, idleTimeoutMs, regions})` | Class decorator. Locally only `idleTimeoutMs` matters. Hosted: non-default sizes skip the prewarmed pool, so cold starts are slower (guide). |
| `@Resource` | Field whose type implements `ActorResource { onResume(): Promise<void>; onGracefulShutdown(): Promise<void> }`. `onResume` runs on every wake (after hydrate). Shutdown is best effort and is not called on crash. Pattern in `examples/pi/pi-durable/src/modal/SandboxResource.ts`: reattach to a sandbox ID stored in SQLite, or create one. That example is the template for a "boat.dev VM per agent" resource. |
| `Unchecked<T>` / `unchecked(v)` | Make a type opaque (`unknown`) in the generated client only. |

### 2.3 SQLite (`this.db`)

- `this.db.exec<Row>(sql, ...bindings): Row[]` is synchronous. Bindings are `string | number | bigint | Uint8Array | null`. Use `?` placeholders.
- **Rejected statements:** `BEGIN/COMMIT/END/ROLLBACK/SAVEPOINT/RELEASE/ATTACH/DETACH/VACUUM`. Only a whitelist of PRAGMAs is allowed. The `__terse_` and `_litestream_` prefixes are reserved. (typescript-guide.md)
- `RETURNING` works (`examples/background/background-gym/src/actors.ts`: `INSERT … RETURNING id`).
- Background (post-invocation) SQL is allowed and saved immediately, except while an `@Atomic` method runs (`host/database.ts`).
- Open issues from Agent Relay's founder (willwashburn, filed 2026-10-30, porting **relaycast** onto Durable Actors):
  - #369: no nested savepoint/rollback inside a call.
  - #368: rows come back as objects, so duplicate column names collide; alias your columns.

### 2.4 Alarms (`sdk/src/actor/alarm.ts`, `src/control_plane/alarms.rs`)

- `this.alarm.set(epochMs)` replaces the alarm, `get()` reads it, `delete()` clears it.
- **Only one alarm per actor.** For many timers, keep a `timers` SQLite table and set the alarm to the min due time.
- Past timestamps fire immediately.
- `onAlarm()` runs; the alarm is cleared afterward unless `onAlarm` re-sets it.
- The control plane polls every 100 ms (`DURABLE_ACTORS_ALARM_POLL_INTERVAL_MS`).
- Delivery: **up to 3 attempts, 60 s attempt timeout** (`MAX_ATTEMPTS=3`, `ATTEMPT_TIMEOUT=60s`). Keep `onAlarm` short (well under 60 s) and idempotent, or you will get duplicate runs ⚠️.

### 2.5 WebSockets

**Actor side** (`sdk/src/actor/socket.ts`):
- `socket.id`, `socket.metadata` (assignable; whole value; ≤16 KiB JSON), `socket.tags`, `socket.state`.
- `socket.send(msg)`; `socket.close(code=1000|3000–4999, reason≤123B)`.
- `socket.reject(4003, reason)` works **only in `onConnect`**. The default code 1008 is rejected, so pass one explicitly.
- `socket.setTags(...)`: max 10 tags, 1 to 256 chars each.
- Per-actor connection limit: 32 768 (`DURABLE_ACTORS_SOCKET_MAX_CONNECTIONS`). Concepts.md nonetheless says to keep "a few connected clients per actor".

**Broadcast and send semantics:**
- They are fire-and-forget, **not saved, not replayed**. "Delivery does not confirm saved state, and messages may arrive out of order."
- `broadcast`/`send`/`getConnections` work **only during an active invocation** of that actor. Otherwise they throw "actor connections are available only during an actor invocation".
- Effects from methods and `onMessage` are published **live as they happen** (`publish` callback; closed issue #326 "publish actor socket output immediately"), so you can stream tokens from inside an `@Interleave` method (README example).
- Effects from `onConnect` are batched until it returns; the `state` snapshot is appended after them.
- **From outside the actor:** `SomeActor.get(id).broadcast(msg)` (class reference) POSTs `/socket-effects` and sends to all connections **without running actor code** (`client/remoteClient.ts`). The generated client stub only exposes RPC methods plus `prepareWebsocket`; ⚠️ it doesn't expose `broadcast`/`connect`.
- `onDisconnect` "may be skipped on server failure". **Don't rely on it for presence.** Use `getConnections()` (§7.3).

**Grant flow** (✅ `sdk/src/client-runtime/proxy.ts`, `compiler/generators/backend-generator.ts`, `src/control_plane/issuer.rs`):

```ts
// backend (Node or Bun), after YOUR auth check
import { actors } from "./generated/index.js"
const grant = await actors.Room.prepareWebsocket({ actorId: "casper-main", metadata: { kind: "human", id: "sankritya", name: "Sankritya" } })
// grant = { websocketUrl: "ws(s)://…/v1/socket?key=<EdDSA JWT>", homeRegion, connectByMs }
res.set("Cache-Control", "no-store").json(grant)
```

Grant rules:
- The **ticket must be used within ≤60 s** (`min(maxJwtLifetime, 60 000)`). Treat the URL as a credential.
- Authorization is checked once at connect. The socket stays authorized until closed, even across actor sleep.
- **Every reconnect needs a fresh grant.**
- Metadata is fixed in the ticket, but the actor can overwrite `socket.metadata`.
- Optional signature: `prepareWebsocket(auth, { projectId?, controlPlaneUrl?, apiKey?, setupTimeoutMs=180000 })`.
- There is also a generated `ActorProxy.handle({ actorName, actorId, metadata })` for multi-actor routes (see `examples/documents/src/backend.ts`).

**Browser side:**
- There is no browser SDK and no React hooks. The generated runtime's browser entry throws "actors must be used on the server" (`client-runtime/index.browser.ts`).
- The browser uses a raw `new WebSocket(websocketUrl)` and JSON frames.
- Pattern (from `examples/chat/src/Chat.tsx`, `examples/documents/src/collaboration.ts`):

```ts
async function connect(onMsg: (m: any) => void) {
  const g = await (await fetch("/api/grant/Room/casper-main", { method: "POST" })).json()
  const ws = new WebSocket(g.websocketUrl)
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.type === "state") setState(m.state)                       // @Emittable snapshot
    else if (m.type === "state_update") patch(m.changes, m.removed) // merge; delete removed keys
    else onMsg(m)                                                   // your Outgoing union
  }
  ws.onclose = () => setTimeout(() => connect(onMsg), 500 + Math.random() * 1000) // new grant each time
  return ws
}
// send: ws.send(JSON.stringify(incomingMessage))
// raw text "ping" -> "pong" without waking actor if setWebSocketAutoResponse({request:"ping",response:"pong"}) was set
```

### 2.6 Typed client generation

- Run `durable-actors generate` (needs `dev` running; it fetches the contract) or `durable-actors generate src/actors.ts` (compiles from source). Hosted: `terse actor generate`. (`docs/reference/cli.md`)
- Output goes to `generated/`: `index.js`, `index.d.ts`, `types.d.ts`, a **self-contained `runtime/`** that uses `fetch` and has no `ws` import, and a `package.json`.
- Usage:
  - `actors.X.get(id, transport?)` returns a stub of the RPC methods.
  - `actors.X.prepareWebsocket(...)`.
  - Types: `actors.X.Metadata|Incoming|Outgoing|State`, `actors.X.Methods["m"]["Args"|"Result"]`.
  - Exports: `createActorTransport`, `createActorSessionTransport`, `ActorInvocationError`, `ActorProxy`.
- **Regenerate after changing public methods or types.** The examples run `durable-actors generate && bun src/backend.ts`.
- Browser code may import **types only** from `generated` (`import type { actors } …`), as in the README frontend.

### 2.7 Calling actors from a plain Node/Bun backend (Agent Relay handlers)

✅ Sources: `client-runtime/client.ts`, `settings.ts`, `stub.ts`; `examples/bank-typescript/client.ts`, `examples/background/cli/src/index.ts`.

```ts
import { actors, createActorTransport } from "./generated/index.js"
// env-based: DURABLE_ACTORS_CONTROL_PLANE_URL (default http://127.0.0.1:7100), DURABLE_ACTORS_PROJECT_ID (default "local" on localhost; required remotely), DURABLE_ACTORS_SECRET (Bearer)
await actors.Room.get("casper-main").append({ from: "agent.pumpkin", kind: "chat", text: "boo" })
// explicit:
const t = createActorTransport({ controlPlaneUrl: "http://127.0.0.1:7100", projectId: "local", apiKey: undefined })
await actors.Agent.get("agent.pumpkin", t).setStatus({ mood: "spooky" })
```

- It is plain HTTP `POST {cp}/v1/projects/{p}/actors/{Name}/{id}/invoke`, so it works in Node 18+ (global fetch) and Bun.
- **Node doesn't auto-load `.env`**: use `node --env-file=.env` or dotenv. Bun auto-loads it.
- **Hosted variant:** set `TERSE_ACTOR_URL=https://api.useterse.ai/<PROJECT_ID>/actors` and `TERSE_API_KEY` (docs.useterse.ai/reference/cli.md). ❓ I didn't verify how `terse-sdk`'s generated client maps these.
- Alternatively, import the actor class itself in the backend and call `ChatHistory.get(id).load()` (`examples/ai-chat/src/backend.ts`). This also gives `.connect(metadata)` for a backend WebSocket and `.broadcast(msg)`. It needs the `durable-actors` package, which has a Bun engine requirement.

**Errors** (`ActorInvocationError(code, requestId, message)`):
- `actor_method_failed`: your throw.
- `unavailable`: connection refused.
- `outcome_unknown`: it may have executed. Make Agent Relay → actor writes **idempotent** (pass a client-generated `eventId` and dedupe in SQLite).
- `unauthenticated`.
- `429 actor_quota_exceeded` / `actor_start_rate_limited` (hosted limits: 500 active actors and 50 starts/s per project by default; `configuration.md`).

**Timeouts:**
- The invocation HTTP path only has 5 s connect timeouts.
- The control plane retries `not_executed` for up to 30 s (`CONTROL_PLANE_REQUEST_TIMEOUT`, `src/control_plane/invocation.rs`).
- ⚠️ I found **no hard max duration for a running method**, so long awaited calls look allowed. ❓ The hosted ingress may impose one; check before relying on it.

### 2.8 Calling one actor from another

- ✅ The same `Other.get(id).method()` works inside an actor method. Test fixture: `sdk/tests/fixtures/actorSession.ts:43`.
- The host process gets `DURABLE_ACTORS_CONTROL_PLANE_URL` in its env (`src/sandbox/local.rs:420`), and `actorClient()` falls back to the HTTP client (`sdk/src/client/client.ts`).
- Gotchas ⚠️:
  - **Deadlock:** if non-interleaved A awaits B and B calls back into A, A's mailbox is busy, and nothing found in source times this out. Keep calls one-directional (Agent → Room only) or make the callee `@Interleave`.
  - Each hop is an HTTP round trip through the control plane.
  - With `DURABLE_ACTORS_SECRET` set, ❓ unclear whether actor hosts carry a credential for nested calls. Local default has no secret, so it's fine.

---

## 3. Outbound network from actors

- ✅ Actors run ordinary JS (Node-compatible worker). `fetch`, SDK clients and WebSockets work.
  - The README actor streams from OpenAI.
  - `examples/pi` drives Modal sandboxes and OpenAI from inside the actor (`examples/pi/pi-durable/src/modal/SandboxResource.ts`).
- Secrets:
  - Local: the actor project's `.env`.
  - Hosted: `terse secrets add NAME` (docs.useterse.ai/reference/cli.md).
- **Costs and limits:**
  - A non-interleaved method awaiting an LLM **blocks every other call and socket event** for that actor. Use `@Interleave` on LLM/VM methods, or move the work out of the actor.
  - **Background work (fire-and-forget after the method returns) does NOT keep the actor alive.** It dies at idle eviction (10 s default). See `examples/background/cli/src/index.ts` scenario `eviction`, labelled "Fails until background work keeps the actor alive".
  - Background code also **can't assign `@Persisted` fields or `broadcast`**; only `this.db.exec` works.
  - A running (awaited) handler does defer eviction.
  - Unhandled rejections in background code crash the actor Worker and fail every in-flight call (comment in `background-gym/src/actors.ts`). Wrap them in try/catch.
- Neither system makes external calls transactional, so use idempotency keys (useterse.ai blog "terse-vs-rivet-actors").

---

## 4. Running locally vs hosting

| Option | How | Notes |
|---|---|---|
| **Local OSS** | `bunx durable-actors init casper-actors` (templates: `actor`, `chat`, `ai-chat`, `documents`), then `bun install`, then `bunx durable-actors dev [--port 7100] [--no-watch]` | Hot-reloads actor code. State in `.durable-actors/`. `durable-actors inspect [Name/id] [--json]` prints persisted state. `durable-actors observe` opens the built-in observability UI (request timelines, sockets, state inspector). **Show it to the Terse judges.** Binds **127.0.0.1 only**. Programmatic start: `import { startLocalActors } from "durable-actors/dev"` (used in `sdk/tests/scripts/reentrant.test.mjs`). If file-watch limits break reload, restart `dev`. |
| **Terse Cloud (hosted)** | `bunx terse-cli@latest install`, `terse init <name>`, `terse actor dev` (local), `terse deploy`. Create an API key in the web app, then set `TERSE_ACTOR_URL` and `TERSE_API_KEY` in the backend. | Public HTTPS/WSS endpoint, so multi-laptop works natively. Pricing and limits aren't published (useterse.ai). The `terse-cli` and `terse-sdk` 0.14.7 builds are a day old. ❓ I didn't test a deploy. |
| **Self-host on GCP** | GKE Sandbox (gVisor) + Postgres + GCS + Helm chart (`docs/self-hosting.md`, `charts/durable-actors`); or the Modal data plane (`configuration.md` "Modal data plane") | **Not realistic in 5 to 8 h.** |

### 4.1 Realistic demo plan on venue wifi

1. **Primary: Terse Cloud.**
   - Judges are the Terse founders; deploying on their cloud is the strongest signal.
   - Every laptop and phone can open the same room.
   - Do a throwaway `counter` deploy **before** Saturday to validate login, API key and websocket. That is setup, not product code.
2. **Fallback A: one-laptop local.**
   - Everything (actors, backend, agent runner, browsers) runs on the presenting laptop.
   - Show two browser windows side by side, the "Sankritya" and "Kinjal" seats.
   - Zero wifi dependency except LLM, boat.dev and Agent Relay calls.
3. **Fallback B: local + LAN or tunnel.**
   - Proxy `/v1/socket` and the grant endpoint through your app server (`0.0.0.0`) to `127.0.0.1:7100`.
   - Rewrite the grant's host in the backend: `url = new URL(grant.websocketUrl); url.host = req.headers.host`.
   - ⚠️ Untested. The gateway checks the `key` JWT; I didn't check whether it validates the Host header.
   - Vite: `server.proxy = { "/v1/socket": { target: "ws://127.0.0.1:7100", ws: true } }`.
   - The repo's own staging flow uses ngrok in front of `durable-actors start` (`scripts/tunnel.mjs`, `.env.staging.example`), but that is the production server (Postgres + GCP); don't use it.

Pre-cache the runtime binary and `bun install` at home. Multiple projects need distinct ports and `.durable-actors` dirs (`examples/README.md`).

---

## 5. Gotchas (collected)

1. **Reassign, don't mutate.** `this.events = [...this.events, e]`, not `push`. Mutations are neither saved nor emitted.
   - The README quickstart and `examples/chat/README.md` snippets use `push` and are wrong.
   - The actual `examples/chat/src/actors.ts` reassigns.
2. **`@Emittable` resends the entire field** on every change and only at the end of a successful call. Use it for small summaries; stream log entries with `broadcast`.
3. **`@Ephemeral` resets on eviction (10 s idle) and after a thrown error in non-interleaved classes.** Never store presence or anything important there.
4. **Background work dies at idle eviction** and can't write `@Persisted` or broadcast. Either await inside an `@Interleave` method (keeps the actor alive), raise `@Compute({ idleTimeoutMs })`, or run loops outside actors.
5. **`@Interleave` disables rollback for the whole class.** Errors leave partial writes, and state can change across awaits; re-read after each await. A sticky `fatal` can follow internal errors.
6. **Writes are immediate by default.** A throw after writes leaves the writes saved; use `@Atomic` for all-or-nothing.
   - Doc drift: the blog says failed calls roll back by default, but the TS guide and source say only `@Atomic` rolls back DB writes. Trust the guide: `typescript-guide.md` "Using SQLite".
7. **All prototype methods are public RPC and must be async.** Use module functions for helpers. Extend `Actor` directly.
8. **Actor IDs have no `:` or `/`.**
9. **Socket messages are not persisted or replayed.** On (re)connect, send a backlog from SQLite in `onConnect`, and give clients `seq` numbers so they can dedupe and gap-fill via an RPC like `since(seq)`.
10. **Grants expire within 60 s and are single-connection.** Fetch a new one per reconnect.
11. **`socket.reject` default code 1008 is rejected.** Pass 4003.
12. **One alarm per actor.** Delivery has a 60 s timeout and 3 attempts.
13. **Browser can't use the generated client.** It is types only; keep `DURABLE_ACTORS_SECRET` and `TERSE_API_KEY` server-side.
14. Restart the backend and regenerate after changing public actor types (examples' READMEs).
15. Open issue #177: per-actor invocation queues are unbounded, so a stalled actor accumulates requests. Don't hammer one actor with high-rate calls from many agents. Batch, or debounce status updates to about 2 to 5 per second.
16. Open issue #228: you can't delete actor instances. Use fresh IDs for demo resets, e.g. `casper-demo-3`.

Issues skimmed via `gh issue list -R TerseAI/durable-actors`. Open: #369, #368, #367, #330, #324, #233, #232, #228, #224, #203, #197, #195, #193, #192, #178, #177, #176. Nothing blocking Casper.

---

## 6. Recommended Casper topology

```
Browser (each human)  --POST /api/grant/Room/<roomId>-->  App backend (Bun/Node, Express/Hono)
        |  <-- {websocketUrl} ---------------------------------|  (prepareWebsocket, metadata={kind:"human",id,name})
        |==== ws ====> Terse gateway ==> Room actor (one per workspace)
        |==== ws ====> Agent actor (optional, per agent detail panel)

Agent runner process(es) (Node/Bun, one per human's agent or one shared):
   - holds the Agent Relay connection(s)
   - runs the LLM loop + boat.dev VM calls
   - on every step: actors.Agent.get(id).setStatus(...) and actors.Room.get(room).append(...)
   - Agent Relay action handlers -> actors.Room.get(room).claimTask(...)
```

Why the agent loops stay outside actors:
- Agent Relay needs persistent connections, which don't fit an actor that sleeps after 10 s.
- Background work can't broadcast.
- Long LLM awaits would block the room's mailbox.

Actors stay the **source of truth and fan-out**; the runner is stateless and restartable, and resumes from actor state. The creative use for the Terse judges: kill the runner or the actor server live on stage, then show the room recovering from persisted state, plus the `observe` UI.

---

## 7. Patterns

### 7.1 Room with an ordered event log watched live

- Store the log in **SQLite** (`events(seq INTEGER PRIMARY KEY AUTOINCREMENT, …)`). `seq` gives total order because the mailbox is serial.
- In `append`: insert with `RETURNING seq`, then `this.broadcast({type:"event", event})`.
- In `onConnect`: `socket.send({type:"backlog", events: last N})`.
- `since(seq)` RPC for gap-fill. Clients drop any `event.seq <= lastSeq`.
- Keep small derived state (`tasks`, `agents` summary, `topic`) as `@Persisted @Emittable` so a late joiner gets `state` automatically.
- Don't put `@Interleave` on Room. Its methods are fast (no external awaits), and you keep serial semantics plus error rollback (`@Atomic` where it matters).

### 7.2 Per-agent actor

- `@Persisted @Emittable status = { mood, task, activity, avatar, updatedAt }`, updated via `setStatus(patch)` (reassign the object).
- Optionally mirror a summary to Room (`await Room.get(roomId).upsertAgent(...)`, one-directional only) so browsers need just one socket.
- Optionally `@Resource` a boat.dev VM handle (pattern: `examples/pi/pi-durable/src/modal/SandboxResource.ts`, VM ID in SQLite and reattach in `onResume`).
- `@Compute({ idleTimeoutMs: 120_000 })` to avoid cold wake-ups mid-demo (local wake is fast, but the resource's `onResume` may call the VM API).

### 7.3 Presence

- Put identity in the socket's grant metadata (`{kind, id, name}`) and tag sockets by kind (`socket.setTags("human")`).
- Compute presence from `await this.getConnections()` inside `onConnect`/`onDisconnect`/`append`, then broadcast `{type:"presence", members}`.
- Note that `onDisconnect` may be skipped on server failure, and `getConnections()` includes the joining socket and excludes disconnected ones (`actor.ts` doc comment).
- Agents count as "present" via a `lastSeen` map updated by `setStatus` (`@Persisted`, ⚠️ not socket-based). Optional: an alarm every 15 s that marks stale agents offline and re-sets itself.
- Optional heartbeat: `setWebSocketAutoResponse({request:"ping",response:"pong"})` keeps NAT and proxies happy without waking the actor.

### 7.4 Task claimed exactly once

- The serial mailbox makes check-and-set atomic in a non-interleaved actor.
- `claimTask(taskId, agentId, requestId)`:
  - If the task is unclaimed, set `claimedBy` and return `{ok:true}`.
  - If it is already claimed by the same agent, return `{ok:true}` (idempotent retries after `outcome_unknown`).
  - Otherwise return `{ok:false, by}`.
- Mark it `@Atomic`.
- For leases: `claimedUntil = now + 60s`, plus an alarm that re-opens expired claims.

---

## 8. Illustrative sketch: UNTESTED pseudo-code using the real API names

```ts
// src/actors.ts  (actor project; run with `bunx durable-actors dev`)
// UNTESTED: illustrative only. Verify against durable-actors@0.14.4 on the day.
import { Actor, type ActorContext, type ActorSocket, Atomic, Compute, Emittable, Persisted } from "durable-actors"
// hosted: import { ... } from "terse-sdk/actor"

type Member = { kind: "human" | "agent" | "viewer"; id: string; name: string }
type RoomEvent = { seq: number; at: number; from: string; kind: "chat" | "status" | "task" | "tool" | "system"; text?: string; data?: unknown }
type Task = { id: string; title: string; status: "open" | "claimed" | "done"; claimedBy?: string; claimedUntil?: number }
type AgentCard = { id: string; owner: string; avatar: string; mood: string; activity: string; lastSeen: number }

type RoomIn = { type: "say"; text: string } | { type: "addTask"; title: string } | { type: "since"; seq: number }
type RoomOut =
  | { type: "event"; event: RoomEvent }
  | { type: "backlog"; events: RoomEvent[] }
  | { type: "presence"; members: Member[] }
type RoomSocket = ActorSocket<Member, RoomOut, Member["kind"]>

const BACKLOG = 200

export class Room extends Actor<Member, RoomIn, RoomOut, Member["kind"]> {
  @Persisted @Emittable tasks: Record<string, Task> = {}
  @Persisted @Emittable agents: Record<string, AgentCard> = {}
  @Persisted @Emittable topic = "Haunted workspace"

  constructor(ctx: ActorContext) {
    super(ctx)
    this.db.exec("CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, from_id TEXT NOT NULL, kind TEXT NOT NULL, body TEXT NOT NULL, dedupe TEXT UNIQUE)")
    this.db.exec("CREATE TABLE IF NOT EXISTS timers (task_id TEXT PRIMARY KEY, due INTEGER NOT NULL)")
  }

  // ---- RPC (called by backend / agent runner / Agent actors) ----
  async append(e: { from: string; kind: RoomEvent["kind"]; text?: string; data?: unknown; dedupe?: string }): Promise<number> {
    return writeEvent(this.db, e, ev => this.broadcast({ type: "event", event: ev }))
  }

  async since(seq: number): Promise<RoomEvent[]> {
    return readEvents(this.db, seq, 1000)
  }

  async addTask(title: string, from: string): Promise<Task> {
    const id = `t${Date.now().toString(36)}`
    const task: Task = { id, title, status: "open" }
    this.tasks = { ...this.tasks, [id]: task } // reassign!
    writeEvent(this.db, { from, kind: "task", text: `new task: ${title}`, data: task }, ev => this.broadcast({ type: "event", event: ev }))
    return task
  }

  @Atomic
  async claimTask(taskId: string, agentId: string): Promise<{ ok: boolean; by?: string }> {
    const t = this.tasks[taskId]
    if (!t) return { ok: false }
    const live = t.claimedBy && (t.claimedUntil ?? 0) > Date.now()
    if (live && t.claimedBy !== agentId) return { ok: false, by: t.claimedBy }
    const claimedUntil = Date.now() + 60_000
    this.tasks = { ...this.tasks, [taskId]: { ...t, status: "claimed", claimedBy: agentId, claimedUntil } }
    this.db.exec("INSERT INTO timers (task_id, due) VALUES (?, ?) ON CONFLICT(task_id) DO UPDATE SET due = excluded.due", taskId, claimedUntil)
    armAlarm(this.db, this.alarm)
    writeEvent(this.db, { from: agentId, kind: "task", text: `claimed ${t.title}`, dedupe: `claim:${taskId}:${agentId}:${claimedUntil}` }, ev => this.broadcast({ type: "event", event: ev }))
    return { ok: true }
  }

  async completeTask(taskId: string, agentId: string, summary: string): Promise<void> {
    const t = this.tasks[taskId]
    if (!t || t.claimedBy !== agentId) throw new Error("not your task")
    this.tasks = { ...this.tasks, [taskId]: { ...t, status: "done" } }
    this.db.exec("DELETE FROM timers WHERE task_id = ?", taskId)
    writeEvent(this.db, { from: agentId, kind: "task", text: `done: ${summary}` }, ev => this.broadcast({ type: "event", event: ev }))
  }

  async upsertAgent(card: AgentCard): Promise<void> {
    this.agents = { ...this.agents, [card.id]: card } // whole map is re-emitted; keep it small
  }

  // ---- lifecycle ----
  async onConnect(socket: RoomSocket) {
    socket.setTags(socket.metadata.kind)
    this.setWebSocketAutoResponse({ request: "ping", response: "pong" })
    socket.send({ type: "backlog", events: readEvents(this.db, 0, BACKLOG, true) })
    this.broadcast({ type: "presence", members: (await this.getConnections()).map(s => s.metadata) })
    // the runtime appends {type:"state", state:{tasks,agents,topic}} for this socket automatically
  }

  async onMessage(socket: RoomSocket, msg: RoomIn) {
    if (msg.type === "say") writeEvent(this.db, { from: socket.metadata.id, kind: "chat", text: msg.text }, ev => this.broadcast({ type: "event", event: ev }))
    else if (msg.type === "addTask") await this.addTask(msg.title, socket.metadata.id) // ⚠️ verify calling own RPC method from a hook is fine (same instance, no network hop expected)
    else if (msg.type === "since") socket.send({ type: "backlog", events: readEvents(this.db, msg.seq, 1000) })
    // Human -> agent messages: the backend/agent-runner forwards to Agent Relay. The actor can't hold the relay connection.
  }

  async onDisconnect(socket: RoomSocket) {
    this.broadcast({ type: "presence", members: (await this.getConnections()).map(s => s.metadata) }, { except: socket })
  }

  async onAlarm() {
    const now = Date.now()
    for (const { task_id } of this.db.exec<{ task_id: string }>("SELECT task_id FROM timers WHERE due <= ?", now)) {
      const t = this.tasks[task_id]
      if (t && t.status === "claimed") this.tasks = { ...this.tasks, [task_id]: { ...t, status: "open", claimedBy: undefined } }
      this.db.exec("DELETE FROM timers WHERE task_id = ?", task_id)
    }
    armAlarm(this.db, this.alarm)
  }
}

// ---- module-level helpers (prototype methods must be async + become RPC, so keep helpers here) ----
function writeEvent(db: Actor["db"], e: { from: string; kind: string; text?: string; data?: unknown; dedupe?: string }, emit: (ev: RoomEvent) => void): number {
  if (e.dedupe) {
    const [dup] = db.exec<{ seq: number }>("SELECT seq FROM events WHERE dedupe = ?", e.dedupe)
    if (dup) return dup.seq // idempotent retry after outcome_unknown
  }
  const at = Date.now()
  const body = JSON.stringify({ text: e.text, data: e.data })
  const [{ seq }] = db.exec<{ seq: number }>("INSERT INTO events (at, from_id, kind, body, dedupe) VALUES (?, ?, ?, ?, ?) RETURNING seq", at, e.from, e.kind, body, e.dedupe ?? null)
  emit({ seq, at, from: e.from, kind: e.kind as RoomEvent["kind"], text: e.text, data: e.data })
  return seq
}
function readEvents(db: Actor["db"], afterSeq: number, limit: number, tail = false): RoomEvent[] {
  const rows = tail
    ? db.exec<any>("SELECT * FROM (SELECT seq, at, from_id, kind, body FROM events ORDER BY seq DESC LIMIT ?) ORDER BY seq", limit)
    : db.exec<any>("SELECT seq, at, from_id, kind, body FROM events WHERE seq > ? ORDER BY seq LIMIT ?", afterSeq, limit)
  return rows.map(r => ({ seq: r.seq, at: r.at, from: r.from_id, kind: r.kind, ...JSON.parse(r.body) }))
}
function armAlarm(db: Actor["db"], alarm: Actor["alarm"]) {
  const [{ due }] = db.exec<{ due: number | null }>("SELECT min(due) AS due FROM timers")
  if (due == null) alarm.delete(); else alarm.set(due)
}

// ---------------- Agent actor ----------------
type AgentMeta = { kind: "viewer"; id: string }
type AgentOut = { type: "thought"; text: string } | { type: "tool"; name: string; detail?: string }
type AgentStatus = { mood: "idle" | "curious" | "spooked" | "working" | "triumphant"; activity: string; taskId?: string; updatedAt: number }

@Compute({ idleTimeoutMs: 120_000 })
export class Agent extends Actor<AgentMeta, null, AgentOut> {
  @Persisted @Emittable profile = { id: "", owner: "", name: "", avatar: "ghost", roomId: "" }
  @Persisted @Emittable status: AgentStatus = { mood: "idle", activity: "haunting", updatedAt: 0 }
  @Persisted @Emittable vm: { id?: string; previewUrl?: string } = {}

  async init(p: { owner: string; name: string; avatar: string; roomId: string }) {
    this.profile = { id: this.id, ...p }
    await Room.get(p.roomId).upsertAgent(card(this.profile, this.status)) // one-way Agent -> Room only (avoid deadlock)
  }

  async setStatus(patch: Partial<Omit<AgentStatus, "updatedAt">>) {
    this.status = { ...this.status, ...patch, updatedAt: Date.now() } // reassign -> state_update to viewers
    if (this.profile.roomId) await Room.get(this.profile.roomId).upsertAgent(card(this.profile, this.status))
  }

  // live "thinking" stream to anyone watching this agent's detail panel (not persisted)
  async think(text: string) { this.broadcast({ type: "thought", text }) }
  async toolCall(name: string, detail?: string) { this.broadcast({ type: "tool", name, detail }) }

  async attachVm(vm: { id: string; previewUrl?: string }) { this.vm = vm }
  async getState() { return { profile: this.profile, status: this.status, vm: this.vm } }
}
function card(p: Agent["profile"], s: AgentStatus): AgentCard {
  return { id: p.id, owner: p.owner, avatar: p.avatar, mood: s.mood, activity: s.activity, lastSeen: s.updatedAt }
}
```

```ts
// agent-runner.ts (plain Bun/Node process; holds Agent Relay + LLM + boat.dev). UNTESTED.
import { actors } from "./generated/index.js"
const room = actors.Room.get("casper-main")
const me = actors.Agent.get("agent.kinjal.pumpkin")
await me.init({ owner: "kinjal", name: "Pumpkin", avatar: "pumpkin", roomId: "casper-main" })
// on Agent Relay message / action handler:
async function onRelayAction(a: { taskId: string; requestId: string }) {
  const r = await room.claimTask(a.taskId, "agent.kinjal.pumpkin")
  if (!r.ok) return room.append({ from: "agent.kinjal.pumpkin", kind: "system", text: `beaten by ${r.by}`, dedupe: a.requestId })
  await me.setStatus({ mood: "working", activity: "opening VM", taskId: a.taskId })
  // ... LLM + VM loop; throttle setStatus/think to a few per second (issue #177) ...
}
```

```ts
// backend grant route (Express). UNTESTED.
app.post("/api/grant/:actor/:id", async (req, res) => {
  const user = authenticate(req) // your check
  const { actor, id } = req.params
  if (actor !== "Room" && actor !== "Agent") return res.sendStatus(404)
  const metadata = actor === "Room" ? { kind: "human", id: user.id, name: user.name } : { kind: "viewer", id: user.id }
  res.set("Cache-Control", "no-store").json(await actors[actor].prepareWebsocket({ actorId: id, metadata } as any))
})
```

---

## 9. Unverified or open items

- ❓ Whether `terse-sdk`'s generated client uses `TERSE_ACTOR_URL`/`TERSE_API_KEY` exactly as the hosted docs say. Hosted WSS URL format and hosted limits and pricing aren't published.
- ❓ Whether the hosted ingress imposes a max request duration on long awaited methods.
- ⚠️ Rewriting the grant host and proxying `/v1/socket` for LAN access is untested.
- ⚠️ Actor → actor calls with `DURABLE_ACTORS_SECRET` enabled (auth of nested calls).
- ⚠️ Calling an actor's own RPC method from its `onMessage` (shown in the sketch) is an in-process call. It should be fine but hasn't been tested. If in doubt, inline the logic.
- The Python SDK exists (`docs/reference/python-guide.md`, `sdk-python/`) with the same concepts. It's irrelevant for Casper (use TS).
- Agent Relay's founder (willwashburn) is filing Durable Actors issues for "relaycast" (#368, #369), so the two judging teams are already integrating. Running Agent Relay on top of Durable Actors is the obvious "creative use of both" angle.
