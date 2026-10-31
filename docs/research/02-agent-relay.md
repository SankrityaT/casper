# 02 — Agent Relay: builder reference for Casper

Researched 2026-10-29 from three sources: the live docs, the source at `github.com/agentworkforce/relay` (HEAD `d305af8`, pushed 2026-10-30, about 1.06k stars, Apache-2.0), and npm. Nothing below was run against the live service. **Every code block is UNTESTED pseudo-code.** It uses real names from the v14 source. Where a claim comes from code and not docs, it says so.

Abbreviations: `R:` = path in `/tmp/agent-relay`. `D:` = https://agentrelay.com/llms-full.txt (the combined current docs). `OA:` = Relaycast OpenAPI, https://github.com/AgentWorkforce/relaycast/blob/main/openapi.yaml.

---

## 0. TL;DR for the build

- **Versions.** `@agent-relay/sdk`, `agent-relay` (CLI), `@agent-relay/harnesses`, `@agent-relay/harness-driver` and `@agent-relay/fleet` are all **14.0.0** (`latest`). `next` is `15.0.0-next.4`. All were published today, 2026-10-29. Requires **Node ≥ 22** (`R:packages/sdk/package.json`). Releases ship very fast (14 majors), so **pin `14.0.0`**.
- **The current docs site is product docs for the desktop app** (Sessions, Forward-deployed agents, Relay Connect, Flows, For agents, Relaycast API, MCP). The SDK and harness reference pages (`/docs/typescript-sdk`, `/docs/harnesses`, `/docs/observer`, …) **redirect to an archived v7.1.1 docs set**, which is stale against v14. There are no current pages for "messaging / actions / delivery / webhooks / humans / pricing" (all 404 under `/docs/markdown/*.md`). **For v14 behaviour, the source and the package READMEs are the only reliable reference.**
- **Hosted and self-hosted both exist.** Hosted engine: `https://cast.agentrelay.com/v1`. Self-hosted: `@relaycast/engine` (Node + SQLite, port 8787) or `relay init` local mode.
- **Mirror all traffic into Terse with an *observer token*** (`ot_live_*`, read-only, `stream:read`, mint with `includeDms: true`). Use `new AgentRelay({ observerToken })` or a raw `wss://cast.agentrelay.com/v1/ws?token=…`. This is the one path that sees the whole workspace. A workspace-key client **cannot** stream events. A normal `relay.addListener` only sees what flows through agents registered **in that process**.
- **Five gotchas where the README disagrees with the code.** Each one could cost an hour:
  1. **`relay.registerAction` (the workspace-level client) stays in-process.** It is not registered on the relay, so agents never see it as a tool. Register on an **agent client** (the object from `workspace.register`/`reconnect`) instead (`R:packages/sdk/src/agent-relay.ts:363-374`, `facade.ts:wireRelayAction`).
  2. **`claude.create({ relay })` returns a handle** (`id`, `name`, `handle`, status predicates). It does **not** return a client with `.sendMessage`, despite the README (`R:packages/harnesses/src/define.ts:150-224`).
  3. **`relay.on(...)` and `relay.notify(...)` do not exist** on the v14 `AgentRelay` class. The README test that uses them is excluded from `tsc` (`R:packages/harnesses/tsconfig.json` excludes `src/**/*.test.ts`). Use `relay.addListener`.
  4. **The README uses `envelope.from.handle`, but `RelayMessageSender` is `{ id?, name? }`** (`R:packages/sdk/src/messaging/types.ts:238`). Use `envelope.from?.name`.
  5. **Actions are fire-and-forget.** The handler's return value goes to listeners as `action.completed` in the **handler's process**. It is never returned to the agent that called the action.
- **Recommendation for 5 hours.** Run one small "Casper hub" Node service that holds the workspace key. Each human's agent runs as our own TS process (OpenAI Responses loop + SDK) on a laptop or a boat.dev VM. Summon = the hub registers a new identity and starts a loop. Mirror via an observer stream into `room.appendEvent`. Use the managed Claude/Codex harnesses only as a stretch goal: they need a Rust broker binary plus an authed CLI on the host, and they have open spawn bugs.

---

## 1. Hosted vs self-hosted, workspaces, keys, auth, limits

### Topology
| Option | URL | How |
|---|---|---|
| Hosted (Relay Cloud / Relaycast) | `https://cast.agentrelay.com/v1` (SDK default; `R:packages/sdk/src/messaging/observer-source.ts:272`) | `AgentRelay.createWorkspace({ name })`, or `relay init --hosted` |
| Self-hosted engine | `http://localhost:8787/v1` | `npx @relaycast/engine --db ./relaycast.db --port 8787`. Single-tenant, single-process (`R:docs/self-hosting/README.md`). Point clients at it with `baseUrl` / `RELAY_BASE_URL`. |
| Local, no account | `http://127.0.0.1:8787` | `relay init` → "This machine". "No account and no limits" (`R:docs/quickstart.md`). Only the one machine can join. |

**For two laptops plus VMs, use hosted.**

### Creating a workspace
- REST: `POST /workspaces` needs **no auth** and is idempotent by name. The workspace key (`rk_live_*`) is returned **only on first creation** (D: Relaycast API › Workspaces).
- SDK: `const relay = await AgentRelay.createWorkspace({ name: 'casper-demo' })`, then persist `relay.workspaceKey` (`R:packages/sdk/src/agent-relay.ts:216`).
- CLI: `agent-relay workspace create <name>`. On other machines: `relay workspace join <name> <key>`.
- ⚠️ Because creation is idempotent by name and returns the key only once, **create the workspace once, save the key immediately**, and pick a unique name.

### Token types
All four are from D: Relaycast API › Authentication.

| Token | Prefix | Minted by | Use |
|---|---|---|---|
| Workspace key | `rk_live_*` | `POST /workspaces` | Admin: register agents, mint observer tokens, create subscriptions/webhooks. **Server-side only.** |
| Agent token | `at_live_*` | `POST /agents` (workspace key). Returned once; rotate with `POST /agents/{name}/rotate-token`. | Acts as one identity: send, DM, join channels, invoke actions |
| Node token | `nt_live_*` | `POST /agent/node-token` or `POST /nodes` | Broker/node realtime delivery (`/v1/node/ws`) |
| Observer token | `ot_live_*` | `POST /observer-tokens` (workspace key) | Read-only. `stream:read` lets it open `GET /v1/ws`. |

Inbound webhooks use `wh_live_*`. WebSockets accept `?token=` because browsers cannot set headers.

### Rate limits and pricing
- **Rate limits** (OA `info.description`): per workspace, per route bucket, per minute. Default bucket is **30,000/min**. Some routes, e.g. `POST /dm`, are lower; the exact number is not published. A 429 returns `rate_limit_exceeded` with `Retry-After ≤ 60`. Headers: `X-RateLimit-Limit/Remaining/Reset`.
- **Delivery backpressure:** 429 `workspace_delivery_depth_exceeded` with `Retry-After: 30`, and 503 `mailbox_full`.
- **Hosted admission policy:** the hosted service "may refuse… message sends or new registrations… (usage quota or device cap)".
- **Pricing / free tier.** `R:docs/quickstart.md`: "The hosted service has a free tier, enough to try agents across machines." The README says "no credit card". `/pricing` returns 404. **I could not verify the quota numbers.** Expect a soft device or agent cap. Don't create dozens of throwaway agents during the demo.
- **Flows:** the first runs use included model access; after that, bring your own subscription (D: Flows).

### Two laptops, one workspace: yes
There are three ways in.

1. **SDK/CLI path (what Casper should use).**
   - The workspace is just a key. Anyone holding `rk_live_*` can join (`relay workspace join <name> <key>`; "Treat the key like a password", `R:docs/quickstart.md`).
   - Better: **the hub mints a per-agent `at_live_*` token** (`relay.workspace.register({ name })` → `client.token`, or `POST /agents`) and hands only that token to Kinjal's machine.
   - Kinjal's process then does `relay.workspace.reconnect({ apiToken })` (`R:packages/sdk/README.md` "Reconnect a registered agent"). It needs an `AgentRelay` constructed with a credential, and `agentToken` is an accepted option (`R:packages/sdk/src/messaging/relaycast-client.ts:203-243`).
   - An agent token can only act as its own identity. It cannot register others or read the whole workspace. **That is the "invite a friend's agent" primitive: per-agent tokens, scoped to one identity.**
   - Registration is **create-only.** A duplicate name rejects with `name_conflict` (409) and the old token is unchanged (`R:packages/sdk/src/facade.ts:RelayWorkspace.register` doc).
2. **Desktop app path.** Google sign-in. The workspace you approve is the shared one, and "a teammate needs an invite to the same one" (D: Quickstart §2). Addresses look like `name@machine`. This is for existing Claude Code/Codex chats, not for our custom app.
3. **Relay Connect.** A temporary isolated room created from a Cloud account. The invite link is a bearer capability. Maximum **8 participants**, **60-minute default expiry**, and guests need no account (D: Relay Connect). It is driven by an agent reading `agentrelay.com/connect`; I found **no SDK API** for it. You could demo "invite a guest's Claude Code" this way, but it is separate from our workspace.

No fine-grained ACLs on messaging were found in the SDK. Actions do have per-caller allow-lists (`availableTo`, `policy`).

---

## 2. Browser vs backend; subscribing to ALL traffic

### Can a browser connect directly?
- **Read-only, yes.** Mint an observer token server-side and give it to the browser.
  - The SDK's observer stream uses the global `WebSocket`. In browsers it falls back to `?token=` after two header-auth closes (`R:packages/sdk/src/messaging/observer-source.ts:61-120`).
  - The SDK source has no `node:` imports (I grepped `packages/sdk/src`), but `engines` says Node ≥ 22. **Browser bundling is unverified.** A raw WebSocket to `wss://cast.agentrelay.com/v1/ws?token=ot_live_…` needs no SDK at all.
- **Writes from the browser: don't.** A workspace key is admin, and the engine rejects it on `/v1/ws` anyway (D: MCP › Observer Links). An agent token in the browser is technically possible but leaks an identity. Keep sends behind the hub.
- **Casper design:** the Terse actor is the browser's source of truth, so the browser doesn't need to touch Relay at all.

### Mirroring every message (for the flying-message animation)
Why ordinary listeners don't work:
- A workspace-key `AgentRelay` client **does not stream events**. `relay.addListener` fans in only through the agent clients this process registered or reconnected. Code comment: "Relaycast v5 streams events over each agent's node transport; the workspace-key stream cannot receive them" (`R:packages/sdk/src/agent-relay.ts:181-190`).
- So if Sankritya's agent lives on his laptop, the hub won't see its DMs to Kinjal's agent through normal listeners.

**Solutions, in order of preference:**

1. **Observer mode (recommended).**
   - Mint once with the workspace key:
     ```ts
     createObserverToken({ workspaceKey, name: 'casper-mirror', filters: { includeDms: true }, expiresAt })
     ```
     It is exported from `@agent-relay/sdk` (`R:packages/sdk/src/messaging/thin-client.ts:250-330`). **DMs are excluded unless `includeDms: true`** (`thin-client.ts:241-248`; the CLI defaults to excluding them).
   - Then: `new AgentRelay({ observerToken, sinceSeq, onCursor })`.
   - The observer source first **backfills the durable log** (`GET /v1/workspace/events?since=<seq>`, pages ≤ 500), then streams `/v1/ws` **deduped and ordered by per-workspace `seq`**, and re-backfills after a reconnect (`observer-source.ts:323-520`).
   - Persist `onCursor(seq)` in the Terse actor and pass it back as `sinceSeq`. That gives gapless, exactly-once mirroring. **This pairs naturally with a durable actor.**
   - Observer mode is read-only: `workspace.register()` throws.
   - CLI equivalent: `agent-relay observer --include-dms --expires 24h --json`. MCP equivalent: the `get_observer_url` tool.
2. **Outbound webhook subscription** (see §6). Point `events: ["*"]` at an HTTPS endpoint that calls the actor.
3. **Polling REST:** `GET /workspace/events?since=` (durable log), `GET /dm/conversations/all` (workspace key or observer), and `GET /activity`.

### Event names and payload shapes

**Public selector events** for `relay.addListener(selector, h)`, from `RelayEventMap` (`R:packages/sdk/src/listeners.ts:558-577`):
- `message.created`, `message.updated`, `thread.reply`, `dm.received`, `group_dm.received`, all shaped:
  ```ts
  { type, message: RelayMessage, envelope: { from?: {id?,name?}, to?: RelayMessageTarget, channel?: {id?,name?}, parent?: string } }
  ```
- `message.read` → `{ messageId, agentName, readAt? }`
- `message.reacted` → `{ messageId, emoji, agentName, action: 'added'|'removed' }`
- `action.invoked | action.completed | action.failed | action.denied` → `{ type, action, agent: caller, input?, output?, error?, reason?, at }`. ⚠️ These come from the **local ActionRegistry** in the handler process. Remote action frames are not mapped (`listeners.ts:752-755`; `normalize.ts:800` maps only raw `action.invoked`).
- `agent.status.changed|idle|active|blocked|waiting|offline`, `agent.activity.changed` → from **local** harness session events (`emitSessionEvent`).

**Selectors** can be `'*'`, a prefix like `'message.*'`, an exact name, or a fluent predicate such as `relay.events.message.created().in('#room').mentions('kinjal-ghost')` or `relay.action('casper.summon').completed()`.

**`RelayMessage`** (`R:packages/sdk/src/messaging/types.ts:255-277`):
```
id, messageId, kind?, text, from:{id?,name?}, target?, channel?, conversationId?, threadId?, parentId?,
mode?('wait'|'steer'), createdAt?, metadata?, blocks?, attachments?, replyCount?, reactions?, mentions?
```
`target` is one of:
- `{kind:'agent', agentName}`
- `{kind:'channel', channelName}`
- `{kind:'dm', conversationId}`
- `{kind:'group_dm', conversationId}`

**Raw wire types** handled by `normalizeMessagingEvent` (`R:packages/sdk/src/messaging/normalize.ts:682-820`):
- Messages: `message.created/updated` (`channel`, `message`), `thread.reply` (`parent_id`), `dm.received` / `group_dm.received` (`conversation_id`, `message`).
- Presence and spawn: `agent.online/offline` (legacy), `agent.spawn_requested`, `agent.release_requested`.
- Channels and members: `channel.created/updated/archived`, `member.joined/left/...`.
- Reads and reactions: `message.read`, `message.reacted`.
- Actions: `action.invoked` (`invocation_id`, `action_name`, `caller_name`, `handler_agent_id`).
- **Everything else** (`agent.status.*`, `action.completed`, `delivery.*`, `node.*`, `file.uploaded`, `agent.exited`) normalizes to `{ type:'unknown', sourceType, raw }`.

**Shared vocabulary** for subscriptions and WebSockets (D: Relaycast API › Webhooks): `message.created`, `message.reacted`, `message.read`, `delivery.*`, `agent.status.*`, `action.*`, `node.*`, `file.uploaded`.

**For the animation, listen raw**: `relay.events.on('any', ev => …)`. `relay.events` is the enriched events surface; call `relay.events.connect()` if you don't also call `addListener`. Then map:
- `messageCreated` / `dmReceived` / `groupDmReceived` / `threadReply` → `from = ev.message.from.name`. The "to" is `ev.message.target` or `ev.channel`.
- `unknown` (with `raw`) → action and status frames.

**Known bug, issue #1987 (open):** a DM read back via `messages.get` reports `kind: 'channel'`. **Don't branch on `kind`.** Use the event type (`dmReceived`) or `target.kind`.

---

## 3. Actions end to end, and "summon"

Sources: `R:packages/sdk/README.md` §Actions, `R:packages/sdk/src/facade.ts:registerFacadeAction/wireRelayAction/handleActionInvoked`, D: Agent Relay MCP.

1. **Register on an agent client.**
   - Call `hostClient.registerAction({ name, description, input: zodSchema, output?, availableTo?: [...names], policy?, handler })`.
   - The registration is local, and it is also sent to the relay as a descriptor: `commands.register({ command, description, handlerAgent: <this agent's name>, inputSchema: JSON-Schema-from-Zod, availableTo })` → REST `POST /actions`.
   - The handler agent then subscribes to `actionInvoked` events on its own stream.
   - ⚠️ `RelayAgentClient`'s TS interface doesn't declare `registerAction`, though it exists at runtime (spread from `agentRelayAgent`, `R:packages/sdk/src/agent-relay.ts:538-553`). **Expect to cast.**
   - ⚠️ The workspace-level `relay.registerAction` skips relay wiring entirely ("the action stays in-process", `agent-relay.ts:366-373`).
   - The descriptor registration is fire-and-forget. Failures only go to `onError`, so **attach `onError`**.
2. **Discovery.** Any agent running `agent-relay mcp` (stdio MCP; env `RELAY_WORKSPACE_KEY`, optional `RELAY_AGENT_NAME`) gets **one generated MCP tool per registered action**, named exactly like the action (e.g. `casper.summon`), with JSON Schema from the Zod schema. It also gets `list_actions` and `invoke_action`.
3. **Invoke.**
   - MCP tool call, or REST `POST /actions/{name}/invoke` with an agent token, or SDK `agentRelay.messaging.commands.invoke(name, input)`. That last one needs an agent-token client (`requireAgentActions`).
   - It returns immediately: `{ ok:true, status:'invoked', invocation:{ invocationId:'act_…', actionName } }`.
4. **Handle.**
   - The handler process receives `action.invoked`.
   - It loads the input with `commands.getInvocation`.
   - It runs the policy (`availableTo` / `policy`; on denial it emits `action.denied`), then runs the handler.
   - It posts the result with `commands.completeInvocation(name, id, { output } | { error })`. Non-object outputs are wrapped as `{ value }`.
   - Locally it emits `action.completed` / `action.failed`.
5. **Getting results back.**
   - The caller does **not** get the output. "If the agent needs the result, message it from the handler" (D: MCP).
   - Other parties can poll `GET /actions/{name}/invocations/{id}`, or see `action.*` frames on the observer stream or a webhook. That those frames appear there is documented vocabulary; **I did not verify it on the wire**.

`triggers` (`POST /triggers`) are declarative message-pattern triggers that invoke actions, e.g. a message matching `/summon/` in `#room` invokes `casper.summon`. They're optional, but could make "type `summon kinjal-ghost` in chat" trivial. **Untested.**

### "Summon": spawning or registering an agent at runtime
| Option | What | Needs | Fit |
|---|---|---|---|
| A. Register plus our own loop | Hub calls `relay.workspace.register({ name: 'pumpkin-3', type: 'agent', persona, metadata })` and starts an in-process OpenAI loop for it | SDK only | **Best for demo: instant and reliable** |
| B. Managed harness on the hub/VM | `await claude.create({ relay, name, task, model, channels, cwd })` (or `codex.create`) from `@agent-relay/harnesses` | Rust broker (`@agent-relay/broker-<platform>` optional dep), `claude`/`codex` CLI installed **and authenticated** on that host, Node 22 | Stretch goal |
| C. Fleet placement (remote) | On the VM: `agent-relay node up --spawn --background --broker-name $UNIQUE` (advertises `spawn:claude` etc.). From anywhere: `relay.messaging.placement.spawn({ capability: 'spawn:claude', input: { name, task }, confirm: true })` or the MCP `spawn` tool / REST `POST /agents/spawn` | Node running in VM, workspace key injected at runtime, agent-relay ≥ 11.3.1 (older versions print the key) | Cool, but buggy (see §8) |

Also available: `relay.workspace.release({ name, … })` and `registerDriverActions` (`@agent-relay/harness-driver`), which exposes `agent.create` / `agent.release` / `agent.status` as actions.

---

## 4. Harnesses

### How `claude.create` / `codex.create` work
Source: `R:packages/harnesses/src/index.ts`, `define.ts`, `broker-binding.ts`.

**Definitions.**
- `claude = defineManagedHarness('claude', { runtime:'pty', command:'claude' })`
- `codex` is the same with `command:'codex'`.
- PTY-only built-ins: `gemini`, `cursor` (`cursor-agent`), `devin`, `droid`, `opencode` (managed), `muse`, `aider`, `goose`, `grok`.
- Native-only and experimental: `pi`, `deepAgents`.

**`create(input)`.** Input fields: `{ relay?, runtime?: 'auto'|'native'|'pty', name?, model?, args?, task?, cwd?, env?, channels? }`.

**Runtime selection.** `auto` resolves to **PTY**. The native AI-SDK adapters (`@ai-sdk/harness-claude-code@1.0.35`, `-codex@1.0.40`) are explicit and **experimental** (`R:packages/harnesses/README.md`).

**With `relay`:**
1. `getHarnessDriver(relay)` creates one `BrokerDriver({ env: { RELAY_API_KEY: workspaceKey } })` per relay instance, so **the relay must have been built with a workspace key**.
2. `driver.spawn({ name, cli, transport:'pty', model, task, args, channels, cwd })` launches the CLI in a PTY under the local **Rust broker** (`agent-relay-broker`). The broker registers the agent and injects relay messages into the terminal.
3. It returns a `HarnessAgent` handle: `{ id, name, handle, kind:'pty', cli, status.becomes(), activity.becomes(), tools.called() }`. **This is not a messaging client.** The spawned CLI talks over its own injected MCP tools.

**Without `relay`:** it returns a descriptor that you register yourself.

**Requirements:**
- Node 22.
- The broker binary: resolved from `BROKER_BINARY_PATH`/`AGENT_RELAY_BIN`, then `~/.agentworkforce/relay/bin`, then the npm platform package, then `PATH` (CHANGELOG).
- The harness CLI on `PATH` and logged in **as the same Linux user that runs the broker** (D: Forward deployed agents › Freestyle).
- Native runtime additionally: macOS/Linux, `pnpm`, loopback ports.

**PTY observability is coarse.** You get exact start/failure and *inferred* busy/idle. Tools and reasoning are reported as unavailable (`R:packages/harnesses/README.md` §Observability). This is fine for the "is thinking" avatar state.

**Inside a remote VM: yes, in principle.** The docs give a full recipe for Freestyle VMs: one broker per VM, a unique `BROKER_NAME`, `RELAY_WORKSPACE_KEY` injected at runtime, clean `machine-id` / `node-tokens` before snapshotting, then `agent-relay node up --spawn --background` (D: Forward deployed agents › "Run the answering agent on a Freestyle VM"). The same pattern should apply to boat.dev, but **I have not verified boat.dev specifically**.

Caveats:
- Issue #1863 (open): headless "put any agent on the relay with one npx command", i.e. sandbox auto-relay, does not exist yet.
- Issue #1951: a fresh Codex spawn blocks on Codex's hook-trust modal while the broker says "working".
- Issue #1865: Codex `database is locked` with multiple agents.

### A custom harness for our own LLM loop (OpenAI Responses API)
The SDK contract is `defineHarness({ name, create(input, ctx) → AgentSession })`. An `AgentSession` is `{ identity, capabilities, receiveMessage(msg, ctx) → receipt('accepted'|'delivered'|'deferred'|'failed'), onEvent?, release? }` (`R:packages/sdk/src/session/types.ts:530-571`, `session/index.ts:74`).

But `defineHarness().create()` only builds a **descriptor**. Nothing in the SDK automatically brings it online. You `relay.workspace.register(descriptor)` and then either:
- **Simple (recommended):** reconnect the agent client and `addListener('dm.received' | 'message.created', …)` on it. Run your OpenAI turn, then `agent.sendMessage(...)`. The agent client streams its own events. At-most-once-ish, which is fine for a demo.
- **Durable:** `new DeliveryRunner({ messaging, delivery: session, agentName }).start()`. It drains `inbox.subscribe` (server delivery ledger: `GET /deliveries`, ack/fail/defer) into `session.receiveMessage` (`R:packages/sdk/src/delivery/runner.ts`). It requires agent-scoped messaging with `capabilities.serverDeliveryState === true`. ⚠️ The README passes `reviewer.messages`, but the runner calls `messaging.capabilities` and `messaging.inbox`. **Pass the agent's messaging object, not `.messages` (unverified).**

---

## 5. Delivery modes: what works today

- **Session-level modes** (`AgentSessionDeliveryMode`, `R:packages/sdk/src/session/types.ts:124`): `'immediate' | 'next-message' | 'next-tool-call' | 'on-idle' | 'manual'`.
- **On the wire, a message carries only `mode: 'wait' | 'steer'`** (`POST /channels/{name}/messages` supports `mode: wait|steer`). The facade maps `immediate` and `next-tool-call` to `steer` and everything else to `wait` (`R:packages/sdk/src/facade.ts:deliveryToMode`).
- **Who actually honours steer/wait is the runtime.** PTY broker injection works today. Claude Code `crossSessionInbound`: `accept` (default; starts a new turn), `hold`, or `refuse` (D: For agents). Codex delivers directly.
- **Messages land "when the agent is between turns"** (D: Quickstart §4). For our custom loop, we decide when.
- **Send status `queued_unconfirmed` is normal.** It means stored, not yet read (`R:docs/quickstart.md`). `Idempotency-Key` is supported on all message-creating endpoints and via SDK `idempotencyKey`.

Not supported or immature:
- `inbox.markRead` returns *unsupported* ("delivery ledger has no read state; use inbox.ack", `R:packages/sdk/src/messaging/relaycast.ts:569-575`). Use `POST /messages/{id}/read` for read receipts instead.
- PTY delivery confirmation relies on screen heuristics (#1961). Two PTY write paths bypass the delivery seam (#1832). Headless routes ack on spawn before the child reads (#1831). Delivery-size checks are still to do (#1960). Fleet `--task` arrives truncated (#1938).
- The native AI-SDK runtimes are experimental.
- The React SDK is "Coming soon" (v7.1.1 docs). The Python SDK was removed (CHANGELOG); only TS and Swift remain.
- Flows `dispatch` is declared but the runtime refuses it (`unsupported_verb`) (relayflows docs).

---

## 6. Webhooks in and out → Terse

- **Outbound (Relay → you):**
  - `POST /subscriptions { url, events: [...] | ["*"], secret?, signature_scheme?: 'legacy'|'standard-webhooks', headers? }`, with a workspace key or agent token.
  - SDK: `relay.webhooks.subscribe({ url, events, secret, headers })` or `relay.integrations.subscriptions.create(...)` (`R:packages/sdk/src/messaging/relaycast.ts:662-700`).
  - Payload: `{ type, workspace_id, timestamp, data }`, with a stable `webhook-id` across retries.
  - Signature: HMAC-SHA256 `X-Relay-Signature: sha256=<hex>`, or Standard Webhooks headers.
  - **The URL must be HTTPS and resolve to a globally routable address, and redirects are not followed** (OA `/subscriptions`).
  - So **yes, you can forward into a Terse actor** if the actor (or a thin edge function in front of it) has a public HTTPS endpoint. Dedupe on `webhook-id`, because delivery is at least once.
  - Trade-off vs observer: webhooks need no long-lived process, but there are no ordering guarantees I could verify. The observer stream gives a `seq` cursor. **Prefer observer → actor; use webhooks as a fallback.**
- **Inbound (you → Relay):**
  - `POST /webhooks { channel, name? }` returns `{ url, token(wh_live_, once) }`. SDK: `relay.webhooks.createInbound({ channel })`.
  - External services `POST /hooks/{webhookId}` to post into that channel.
  - This is handy for "the browser button posts a human message into `#room`" without minting a human agent token, though messages then come from the webhook, not from a person.
  - Alternative: `createHuman({ relay, name })` from `@agent-relay/harnesses`, which is just `workspace.register({ name, type:'human' })` (`R:packages/harnesses/src/create-human.ts`).

---

## 7. Flows: skip for Casper

- **What they are:**
  - Relay Flows (`@relayflows/surface` v2.0.55) are journaled, resumable TypeScript/YAML scripts. Steps: `f.run` (shell), `f.llm`, `f.agent` (a harnessed coding agent), `f.human` gates, and `f.done(verdict)`. `.gate({ type:'regex_match', … })` adds verification.
  - Hosted flows are trigger-driven (GitHub PRs, Linear issues, schedules), with a catalog at agentrelay.com/flows (D: Flows; https://agentrelay.com/docs/relayflows/introduction).
- **Verdict:** this is a CI/automation product built around repos and GitHub grants. It doesn't fit a live multiplayer room, and it adds an OAuth surface. **Not worth it in 5–8 hours.** At most, mention "a summoned ghost could kick off a flow" as roadmap.

---

## 8. Limitations, open issues, maturity

**Maturity.**
- Very active: commits daily, 14 majors, `next` already at 15.
- About 1.06k stars. Repo created 2025-12-17.
- The API churns; the pre-v8 → v8 migration renamed most surfaces.
- **Docs drift is the #1 practical risk** (see TL;DR gotchas).

**Open issues that matter to us** (`gh issue list -R agentworkforce/relay --limit 40`, fetched 2026-10-29):
- **#1987** DM readback reports `kind: 'channel'`. Don't trust `kind`.
- **#1949** spawning under an existing name reports "timed out" instead of name-conflict. **Generate unique names for summons.**
- **#1927** spawn readiness receipts never complete on 13.1.x brokers (`spawn_unconfirmed` while the agent runs). **#1817** `fleet spawn muse` returns `spawn_failed` after launching a live worker. **#1758** an HTTP-API spawn can bind the wrong provider. **#1905/#1908** sandbox spawn identity lifecycle. **#1748** `--sandbox` UUID rejection. **Placement/spawn is the flakiest area.**
- **#1951** Codex spawn stalls on the trust modal. **#1865** Codex SQLite lock with many agents. **#1898** PTY verifier fails after Codex starts.
- **#1950** keyless fleet commands silently use a stale machine-global workspace and fail with a misleading 401. **Always pass the key explicitly.**
- **#1889** fleet spawn passes credentials on process command lines. This is a security issue; don't screen-share `ps`.
- **#1863** there is no headless one-command "agent on relay" for sandboxes yet.
- **#1926** "agent is typing" indicator is still a spike. Derive "thinking" ourselves.
- **#1818** `install.sh` can leave the CLI and broker versions split on Linux x64.

**Other limits.**
- Long message pastes get truncated ("the message is the pointer", D: For agents).
- Relay Connect: 8 participants and one Connect per local session.
- The self-hosted engine is single-tenant.
- Hosted quotas are not published.

---

## 9. Casper sketch (UNTESTED pseudo-code, real v14 names)

Architecture:
```
[Casper hub (Node 22, e.g. Railway)]  holds RELAY_WORKSPACE_KEY
   ├─ creates workspace once, mints per-agent tokens ("invite")
   ├─ host agent client registers action `casper.summon`
   ├─ observer-mode AgentRelay → room.appendEvent()  (cursor persisted in actor)
[Sankritya laptop / boat.dev VM]  ghost process: reconnect(apiToken) + OpenAI loop
[Kinjal laptop / boat.dev VM]     ghost process: reconnect(apiToken) + OpenAI loop
[Browser] ← Terse actor push (never touches Relay)
```

```ts
// ── hub/setup.ts (run ONCE) ─────────────────────────────────────────────── UNTESTED
import { AgentRelay } from '@agent-relay/sdk';          // pin 14.0.0, Node >= 22
const relay = await AgentRelay.createWorkspace({ name: 'casper-haunted-7f3a' });
console.log('RELAY_WORKSPACE_KEY=', relay.workspaceKey); // returned ONLY on first create — save it now
```

```ts
// ── hub/invite.ts: mint a per-agent token for a human's agent ───────────── UNTESTED
import { AgentRelay } from '@agent-relay/sdk';
const relay = new AgentRelay({ workspaceKey: process.env.RELAY_WORKSPACE_KEY! });

export async function inviteAgent(owner: string, ghostName: string, avatar: string) {
  // create-only; duplicate name -> RelayError 'name_conflict' (409)
  const client = await relay.workspace.register({
    name: ghostName, type: 'agent',
    persona: `${owner}'s agent`, metadata: { owner, avatar },
  });
  await client.channels.join('room');           // shared room channel
  return { name: client.name, apiToken: client.token }; // hand ONLY this to the friend's machine
}
// e.g. await inviteAgent('sankritya', 'sank-pumpkin', 'pumpkin');
//      await inviteAgent('kinjal', 'kinjal-witch', 'witch');
```

```ts
// ── ghost.ts: runs on each laptop / boat.dev VM (custom OpenAI harness) ─── UNTESTED
import { AgentRelay } from '@agent-relay/sdk';
import OpenAI from 'openai';

// Credential: the agent token alone (AgentRelayOptions accepts agentToken; unverified end-to-end).
// Fallback if this fails: give the machine the workspace key (admin) instead.
const relay = new AgentRelay({ agentToken: process.env.GHOST_TOKEN! });
const me = await relay.workspace.reconnect({ apiToken: process.env.GHOST_TOKEN! });
const openai = new OpenAI();

relay.onError((err, ctx) => console.warn('[relay]', ctx, err));

// Incoming DMs to me (agent clients stream their own events)
relay.addListener('dm.received', async ({ message, envelope }) => {
  const from = envelope.from?.name;           // NOT .handle — sender is {id?, name?}
  if (!from || from === me.name) return;
  const r = await openai.responses.create({
    model: 'gpt-5.5',
    input: [{ role: 'system', content: `You are ${me.name}, a Halloween ghost agent.` },
            { role: 'user', content: `${from} says: ${message.text}` }],
  });
  await me.sendMessage({ to: `@${from}`, text: r.output_text, idempotencyKey: `reply:${message.id}` });
});

// Mentions in the shared room
relay.addListener(relay.events.message.created().in('#room').mentions(me.name), async ({ message }) => {
  /* same loop; reply in thread */ await me.reply({ messageId: message.id, text: '👻 on it' });
});

// Agent → agent DM (this is what the UI animates)
await me.sendMessage({ to: '@kinjal-witch', text: 'Can you scrape the venue list? I will draft the invite.' });
```

```ts
// ── hub/summon.ts: register `casper.summon` as a relay action (MCP tool) ── UNTESTED
import { z } from 'zod';
import { AgentRelay } from '@agent-relay/sdk';
const relay = new AgentRelay({ workspaceKey: process.env.RELAY_WORKSPACE_KEY! });
relay.onError((e, ctx) => console.error('[relay]', ctx, e)); // descriptor registration fails silently otherwise

// Must be an AGENT client — relay.registerAction() on the workspace client stays in-process.
const host = await relay.workspace.reconnect({ apiToken: process.env.CASPER_HOST_TOKEN! });

(host as any).registerAction({                      // runtime method; not on RelayAgentClient's TS type
  name: 'casper.summon',
  description: 'Summon a new Halloween agent into the Casper room',
  input: z.object({ avatar: z.enum(['ghost','witch','pumpkin','vampire']), task: z.string(), owner: z.string() }),
  // availableTo: ['sank-pumpkin', 'kinjal-witch'],   // optional allow-list
  handler: async ({ input, agent }) => {
    const name = `${input.avatar}-${Date.now().toString(36)}`;          // unique (issue #1949)
    const ghost = await relay.workspace.register({ name, type: 'agent', metadata: { avatar: input.avatar, owner: input.owner } });
    startOpenAiLoop(ghost, input.task);           // Option A: in-process loop like ghost.ts
    // Option B (stretch): await claude.create({ relay, name, task: input.task })  // needs broker + authed claude CLI
    // Option C (stretch): await relay.messaging.placement.spawn({ capability: 'spawn:claude', input: { name, task: input.task }, confirm: true })
    await host.sendMessage({ to: `@${agent.name}`, text: `Summoned @${name}` }); // caller never sees the return value
    return { name, avatar: input.avatar };        // → action.completed in THIS process only
  },
});

relay.addListener(relay.action('casper.summon').completed(), (ev) =>
  room.appendEvent({ kind: 'summoned', by: ev.agent.name, ...(ev.output as object), at: ev.at }));

// Invoking: an agent running `agent-relay mcp` (env RELAY_WORKSPACE_KEY, RELAY_AGENT_NAME) sees tool `casper.summon`.
// From code with an agent token: await ghostRelay.messaging.commands.invoke('casper.summon', { avatar:'witch', task:'…', owner:'kinjal' })
// REST: POST https://cast.agentrelay.com/v1/actions/casper.summon/invoke  (Bearer at_live_…)
// The human "Summon" button in the UI → hub endpoint → call the same handler directly (no need to round-trip Relay).
```

```ts
// ── hub/mirror.ts: every workspace event → Terse actor ─────────────────── UNTESTED
import { AgentRelay, createObserverToken } from '@agent-relay/sdk';

const ot = await createObserverToken({
  workspaceKey: process.env.RELAY_WORKSPACE_KEY!,
  name: `casper-mirror-${Date.now()}`,               // must be unique per workspace
  filters: { includeDms: true },                     // DMs are EXCLUDED by default
  expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
});

const observer = new AgentRelay({
  observerToken: ot.token!,
  sinceSeq: await room.getRelayCursor(),            // persisted in the durable actor → gapless resume
  onCursor: (seq) => void room.setRelayCursor(seq),
});

observer.events.on('any', async (ev: any) => {
  switch (ev.type) {
    case 'messageCreated': case 'threadReply': case 'dmReceived': case 'groupDmReceived':
      return room.appendEvent({
        kind: 'message',
        id: ev.message.id,
        from: ev.message.from?.name,
        to: ev.message.target?.agentName ?? ev.channel ?? ev.message.target?.conversationId,
        dm: ev.type === 'dmReceived',                  // don't trust message.kind (issue #1987)
        text: ev.message.text,
        at: ev.message.createdAt,
      });
    case 'reactionAdded':  return room.appendEvent({ kind: 'reaction', ...ev });
    case 'actionInvoked':  return room.appendEvent({ kind: 'action', action: ev.actionName, by: ev.callerName, id: ev.invocationId });
    case 'unknown':        return room.appendEvent({ kind: 'raw', sourceType: ev.sourceType, raw: ev.raw }); // agent.status.*, action.completed, node.*
  }
});
observer.events.connect();     // opens backfill + live /v1/ws; dedupes by seq
// DM "to" is a conversationId; resolve participant names once via GET /dm/conversations/all (workspace key) and cache in actor.

// Fallback (no long-lived process): outbound webhook straight to a public actor endpoint
// await relay.webhooks.subscribe({ url: 'https://casper.example/relay-hook', events: ['*'], secret: process.env.HOOK_SECRET });
// verify X-Relay-Signature (HMAC-SHA256 of raw body), dedupe on webhook-id, then room.appendEvent(...)
```

**Pre-flight checklist for build day.** All of this is configuration, not product code:
- Node 22+.
- Decide the workspace name.
- Confirm hosted free-tier agent caps by creating about 10 test agents.
- Verify that the observer stream carries DMs with `includeDms` and shows `action.*` frames.
- Verify that `new AgentRelay({ agentToken })` plus `reconnect` works without a workspace key.
- If using boat.dev for Claude Code: confirm the `claude` CLI is authed for the broker's user, and use agent-relay ≥ 11.3.1.

## Unverified / could not confirm
- Hosted free-tier limits and pricing (no page exists; the only statement is "free tier, enough to try").
- That observer frames include `action.completed` and `agent.status.*` (they are in the documented vocabulary but I did not observe them).
- Browser bundling of `@agent-relay/sdk`.
- An agent-token-only `AgentRelay` client end-to-end.
- `DeliveryRunner` argument shape (README vs code).
- The exact `POST /dm` rate limit.
- boat.dev-specific compatibility.
- Ordering of outbound webhook deliveries.
