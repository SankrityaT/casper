# 03 — boat.dev, Jev (TypeSafe), gbrain: due diligence for Casper

Written Thu Oct 29 2026. Sources: docs read on that date (boat `.md` pages, TypeSafe `.md` pages, gbrain repo cloned to `/tmp/gbrain` at commit `3654a77`, VERSION `0.60.504.0`). Nothing was run against any service. **[UNVERIFIED]** means the docs don't settle it and we have to test it ourselves.

Bottom line:
| Tool | Verdict | Why |
|---|---|---|
| boat.dev | **CORE** | This is the "agents do real web work in VMs, live on screen" pillar. Built-in agent harnesses, computer use, an iframe-embeddable desktop stream, steer and interrupt. Almost nothing to build. |
| Jev | **NICE-TO-HAVE**, with one strong use | Casper works without it. Its real job is the ~100 ms "should anyone react to this, and who?" gate on every room event, plus cheap per-event mood or expression labels. Cut it first if time is short. |
| gbrain | **NICE-TO-HAVE, kept thin** | Keyless keyword search over ~20 fake company docs is cheap to set up. The extras (synthesis, graph, remember/forget) take more setup work and carry more risk. A plain markdown folder in the VM covers most of the value. |

Local machine check (report only, no login, nothing created):
- `boat` CLI **is installed**: `boat 1.0.54` at `~/.ascii/bin/boat`, wrapped by a zsh function that exports `BOAT_CURRENT_ID` / `BOAT_CURRENT_CONVO`. A `~/.config/ascii` dir exists, so you may already be signed in (not checked).
- `bun`: **not installed** locally. `gbrain`: not installed. `tailscale`: not installed. Node v24.22.0.

---

## A) boat.dev — cloud Ubuntu VMs with a streamable desktop

Index: https://docs.boat.dev/llms.txt (every page is also available as `<url>.md`). The pages read are cached at `/tmp/boatdocs/*.md`.

### What it is
Each sandbox is a full-root Ubuntu 24.04 VM (x86_64): SSH, Docker, public IPv4, Xorg desktop at 1920x1080, Chrome 151, Node 24, **Bun 1.3.14**, Python 3.12, and the `claude` CLI preinstalled (https://docs.boat.dev/machines/tools.md). Billing is per second. Stopping a sandbox snapshots its disk. You can resume or fork in "a few seconds, whatever the size of the disk" (https://docs.boat.dev/readiness.md). Sandbox IDs look like `bx_xxxxxxxx`. API base: `https://boat.dev/api/v1`, Bearer `boat_…` keys.

### What we'd actually use (mapped to Casper)

**1. One sandbox per agent.** Don't put two GUI agents on one sandbox. "A sandbox has one screen… If two agents click at the same time, they interfere" (https://docs.boat.dev/desktop-streaming/drive-and-record.md). Parallel *conversations* on one sandbox are fine for non-GUI work.
```bash
boat new --from casper-base --ttl 7200 --json          # or: boat fork <prepared-id> --ttl 7200
# BYO agent: the human's own key goes only on their sandbox
boat new --from casper-base --no-env -e ANTHROPIC_API_KEY=sk-ant-…       # API key
boat new --from casper-base --no-env -e CLAUDE_CODE_OAUTH_TOKEN=…        # Claude Pro/Max sub via `claude setup-token`
```
TS: `npm install @boatdev/sdk`, then `boat.create({ from, ttlSeconds, noEnv, env })` and `boat.fork({ sandboxId, idempotencyKey, ttlSeconds })` (https://docs.boat.dev/sdks/typescript.md, https://docs.boat.dev/integrated-agents/keys.md). Always pass an `Idempotency-Key` on create/fork so a retry doesn't create a second paid VM.

**2. Agent does web work: `boat prompt`.** Seven harnesses ship on every sandbox: `claude`, `codex`, `pi`, `opencode`, `prime`, `kimi`, `mistral`. Every harness gets a `computer` MCP server (Cua Driver) with these tools: `get_window_state`, `click`, `type_text`, `scroll`, `launch_app`, `browser_navigate`, `browser_click`, `browser_type`, `get_browser_state`, clipboard, and more (https://docs.boat.dev/integrated-agents/computer-use.md).
```bash
POST /sandboxes/{id}/prompt  {"provider":"claude-code","model":"sonnet","prompt":"…","new":true}
  → {promptId, conversationId, status, done}
# TS: await boat.prompt({ sandboxId, provider, model, prompt, new: true })
```
Store `conversationId` for each agent and send it back on later prompts. Turns are one at a time per conversation; other conversations run in parallel (about two dozen on `default`). Without a connected key or subscription you get `409 provider_not_configured` (https://docs.boat.dev/integrated-agents/conversations.md).

**3. Live feed: `/events` (polling only).** "boat has no SSE or WebSocket stream for agent events, and no webhook when a prompt finishes. Poll… about once per second."
```
GET /sandboxes/{id}/events?sort=asc&conversation=<cid>&cursor=<b64url("<timestamp>:<id>")>
  response events: data.content (text), data.is_streaming, data.tools (tool calls+results)
  prompt events:   data.status (queued|running|finished|failed|interrupted)
  steer events
TS helpers: streamEvents(boat, id, {type:"prompt,response", signal}), streamPrompt(...), waitForPrompt(...)
```
Plan: a single server-side poller per sandbox pushes each event into the Terse actor as an ordered, emitted record. That keeps the boat poll invisible and makes the sponsor tech the visible core. Cost: 1 req/s per VM, well under boat's 10k req/60s per-IP limit (https://docs.boat.dev/faq.md).

**4. Steer and interrupt map directly onto human-in-the-loop** (https://docs.boat.dev/integrated-agents/steering.md):
- `POST /sandboxes/{id}/steer {message, conversation}` puts the message into the running turn without stopping it. This is native for Claude Code, Codex, pi and Prime. OpenCode, Kimi and Vibe fall back to stop-then-continue. If no turn is running it returns `409 no_running_turn`. Use `prompt` in that case.
- `POST /sandboxes/{id}/interrupt {conversation}` stops one turn. Files stay and memory stays.
- So a teammate "taking over" or "redirecting" an agent mid-task is one call.

**5. Showing the VM on our site (the avatar "sitting on" its window).** See https://docs.boat.dev/desktop-streaming.md and https://docs.boat.dev/desktop-streaming/urls-and-security.md.
- **Server-side**, on every page load: `POST /sandboxes/{id}/desktop?theme=dark` → `desktopUrl` (TS `boat.desktop({sandboxId, theme})`). The API key needs the `desktop` scope and must never reach the browser.
- URL shape: `https://<host>/stream.html?hostId=…&appId=…&theme=dark&overlay=0#token=…`. Add `overlay=0` **before the `#`** to hide the stats/side panel.
- Embed it officially: `<iframe src="DESKTOP_URL" allow="autoplay; fullscreen; clipboard-read; clipboard-write" style="width:100%;aspect-ratio:16/9;border:0">`.
- Stream: Moonlight over **WebRTC**, 1080p at 60 fps. The URL must be **opened within 10 min**. An open stream keeps playing, but a reload or reconnect after 10 min needs a new URL. Desktop apps don't survive stop or resume.
- **Chrome-only view**: `POST /sandboxes/{id}/browser` → `browserUrl` (CLI `boat browser <id> [--profile /data/p1]`). Better for "agent sitting on top of its browser window". **Gotcha: "Two browser viewer tabs cannot share the stream. The new tab takes the stream from the first tab."**
- **noVNC alternative**: `POST /sandboxes/{id}/desktop?vnc=1` with body `{"publicAccess": true}` returns a noVNC URL that needs no token. If the response is `provisioning: true`, poll again (https://docs.boat.dev/api/reference/agent/get-desktop-streaming-url.md).
- **[UNVERIFIED, highest risk] Multiplayer viewing.** We don't know whether the Moonlight *desktop* stream allows 2+ simultaneous viewers or steals like the browser view does. If it steals, two humans in Casper watching the same agent VM would fight over the stream. Mitigations: (a) noVNC mode (noVNC usually supports shared and view-only clients; not verified on boat), (b) one presenter screen shows the live streams while other clients see an image or MP4 fallback, (c) one viewer per VM by design ("your agent's window is on your screen").
- Theming: put a PNG at `~/.config/boat/wallpaper.png` (it survives stop, resume and fork). Use a Halloween wallpaper per agent.
- Demo insurance: `boat exec <id> "ascii-record-desktop start /home/user/demo.mp4"` … `stop`, then `boat scp` it out.

**6. Public URLs for anything we run in a VM** (for example a mock "Haunted Back Office" admin site): `boat host <id> 3000` → `https://<sandbox>-3000.on.boat.dev` (token-gated with `?_token=`). FAQ: "In an iframe on another site, browsers can block the access cookie of a protected URL. Host the port with `--public` to embed it" (https://docs.boat.dev/hosting.md).

**7. Templates.** Set up one sandbox, then `boat stop <id>` (so the snapshot has the latest writes) and `boat snapshot <id> casper-base`. After that, `boat new --from casper-base` starts with the full disk in seconds (https://docs.boat.dev/snapshots/templates.md). `AGENTS.md` / `CLAUDE.md` in `~`, MCP registrations (`claude mcp add --scope user …`) and skills in `~/.claude/skills/` all persist into the snapshot (https://docs.boat.dev/integrated-agents/customize.md). Config is **per sandbox, not per conversation**, which is one more reason for one VM per agent persona.

**8. Reaching our own services from inside a VM.** "A sandbox has no route back to your laptop." Options: `boat forward <id> --reverse --local 7777` (an SSH tunnel; doesn't survive stop), or give the service a public URL. Simplest: VM agents call out to public HTTPS (Relay cloud, a deployed backend). Our orchestrator calls into VMs only through the boat API.

### Recommended Casper wiring
Relay message to agent X → orchestrator (our backend) → `boat prompt` / `steer` on X's sandbox → poller reads `/events` → Terse actor (ordered log, `@Emittable`) → UI updates avatar, speech bubble and mood → iframe shows X's desktop.
The in-VM agent doesn't need to know about Relay. The orchestrator is X's Relay identity. That keeps Relay and actor code in *our* repo where judges can see it, and it means we don't have to install agent-relay inside VMs. Optional upgrade: install the Relay CLI/MCP in `casper-base` so in-VM agents can message each other directly.

### Setup allowed BEFORE the event (no product code)
1. Decide trial vs paid. **The trial blocks this plan**: 2 sandboxes at once, **no saved snapshots** (`trial_saved_snapshots_not_allowed`), auto-stop of 2 h or less, no `large`, 25 h of compute total, 5 starts/min (https://docs.boat.dev/free-trial.md). **Pay the $20 plan** (Dashboard → Billing → Upgrade now): 100 at once, 12 starts/min, saved snapshots, and $20 of included VM time.
2. Connect a Claude subscription or API key at https://boat.dev/dashboard?tab=agents (or plan per-sandbox `-e` keys for the BYO story).
3. Create a scoped API key with prompt, desktop, events, steer, interrupt, create and fork (https://docs.boat.dev/api-keys/scopes.md). Keep it server-side.
4. Build `casper-base`: `bun upgrade` (Bun 1.3.14 is preinstalled, but Terse needs ≥1.4.2 and gbrain ≥1.4.4), Halloween wallpaper, `~/AGENTS.md` + `~/CLAUDE.md` house rules, optional Relay CLI/MCP, optional gbrain MCP registration, Chrome signed into nothing sensitive. Then `boat stop` and `boat snapshot`.
5. Time these from SF on venue-like wifi: `boat new --from casper-base` to ready, `POST /desktop` to first frame, and one `boat prompt` "open example.com" round trip. **Test the iframe on a localhost page and test two tabs on the same desktop URL** (the multiplayer question above).
6. Record an MP4 fallback of a full agent run.

### Costs and limits
- `default` (4 vCPU / 8 GB) is $0.036/h. Four agent VMs × 6 h ≈ **$0.86**, covered by the $20 plan's included time. Starts above plan limits cost $0.03–$0.07 each, from the wallet. The AI proxy is $1/day if enabled (not needed).
- Commands: 30 s default timeout, 600 s max. Use `--detach` / `detached:true` for servers.
- Auto-stop defaults to 1 h after create. A running prompt pushes the deadline. Pass `--ttl` / `ttlSeconds`, or call `boat extend <id> --hours 8`.

### Risks
- **EU-only region** (Germany, Finland, France; you can't pick one): about 100–200 ms RTT from the US (https://docs.boat.dev/faq.md). That's fine for watching. Several 1080p60 WebRTC streams on conference wifi is a bandwidth risk **[UNVERIFIED bitrate]**. Show 1–2 live streams at once and use thumbnails or recordings for the rest.
- Multi-viewer behaviour (above). The 10-minute URL rule means our UI must re-fetch the URL on every mount or reconnect.
- No push events, so the 1 s poll adds up to ~1 s of lag on the feed.
- Computer-use agents are slow (screenshot loops). Keep the demo web task short and scripted against our own mock site.
- Judges may read it as "boat + Claude did the work". Keep the Relay and actor layers visible.

**Verdict: CORE.** Nothing else gives us a real VM, a real agent, a live embeddable screen, plus steer and interrupt for about $1 of compute.

---

## B) Jev by TypeSafe — a fast typed-judgment model

Docs: https://docs.typesafe.ai/llms.txt. Pages read are cached at `/tmp/tsdocs/*.md`. OpenAPI: https://api.typesafe.ai/openapi.json.

### What it is (and isn't)
A "System One" classifier. You send `state` (string, JSON or array) plus a map of typed questions, and every question is evaluated in parallel and independently against that state. It **does not generate text, call tools or chat** (https://docs.typesafe.ai/introduction/coding-agents.md). Question types:
- **Choice**: one option from a set. Returns `choice`, per-option `probabilities` and `confidence`.
- **Score**: ordered rubric levels. Returns `score` (an expectation), `probabilities` and `confidence`.
- **Noul**: yes/no probability `noul` from 0 to 1. **No confidence field.**
- **Box**: a bounding box in an image. Needs `jev-preview` and the image header.

Speed claims: "Most calls complete in about 100 ms" (https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md) and "real-time speeds (150ms)" (https://docs.typesafe.ai/concepts/use-case-map.md). **[UNVERIFIED from SF; measure it.]**

### API we'd use
```bash
POST https://api.typesafe.ai/v1/systemone   (Authorization: Bearer $TYPESAFE_API_KEY)
{"model":"jev-latest","state":{...},"questions":{"responder":{"type":"choice","instructions":"…","criteria":{"ghost":"…","bat":"…","none":"…"}}, "needs_human":{"type":"noul","instructions":"…"}}}
```
TS: `npm install @typesafe-ai/sdk` (Node 22+ per the SDK page, 20+ per the quickstart).
```ts
import { choice, noul, score, TypeSafeClient } from "@typesafe-ai/sdk";
const ts = new TypeSafeClient();                 // reads TYPESAFE_API_KEY
const { answers } = await ts.systemOne({ state, questions: { responder: choice("…", {ghost:"…", bat:"…", none:"…"}) } });
answers.responder.choice; answers.responder.confidence;
```
- Models: `jev-1.14.0` (`jev-latest`, released Oct 14 2026) and `jev-1.13.0`. Context: 64k tokens per request / 32k per question. The `TypeSafe-Danger-Zone-Long-Context: true` header raises that to 262k, but it's slower and less accurate.
- Images: the `TypeSafe-Danger-Zone-Images: true` header is labelled "dreamer-ready", not production (https://docs.typesafe.ai/images.md). PNG and JPEG only. Note: https://docs.typesafe.ai/concepts/system-one.md still says "text input only". The docs contradict each other, so treat images as experimental.
- **Price: $0.042 per million input tokens; output is free** (https://docs.typesafe.ai/models.md). A whole hackathon day of per-event calls costs cents.
- Rate limits are per org, in tokens/s and requests/s, and visible only in the console (https://console.typesafe.ai/rate-limits). **[UNVERIFIED]** The SDK retries 429 and 529.
- Known weak spots (https://docs.typesafe.ai/model-jaggedness/jev-1.13.md): it reads instructions literally, and it is bad at counting, math and date comparison. Accuracy drops with large irrelevant state. It is susceptible to adversarial content and leans toward the **first Choice option** (so put `none` first or shuffle). It can't generate text.

### Where Jev actually improves Casper (ranked)
1. **Floor control: "who (if anyone) should answer this?"** Every human or agent message in the shared room → one Jev call. State: the message, the last ~5 turns, and each agent's one-line role and current status. `Choice(responder: none|ghost|bat|witch|…)` plus `Noul(addressed_to_agents)`. Gate on confidence: high wakes that agent through Relay, medium shows a "👻 thinks this is for Ghost?" chip, low stays silent. **This is the one place Jev beats an LLM in practice.** It runs on *every* message with near-UI latency, and it gives a calibrated "nobody should talk" signal, which is what stops a room full of agents from all replying at once. Pattern: https://docs.typesafe.ai/patterns/intent-routing.md and https://docs.typesafe.ai/patterns/confidence-routing.md.
2. **Human message to a busy agent: steer, interrupt, or queue?** One Choice `{steer, interrupt, new_task, just_chat}` maps directly onto boat's `/steer`, `/interrupt` and `/prompt`. Small, concrete, demoable ("Kinjal typed 'stop, wrong customer' and the agent was interrupted in ~100 ms").
3. **Avatar mood or expression from the VM event stream.** On each boat `/events` batch (about 1/s per agent): `Choice(expression: focused|confused|stuck|triumphant|waiting_on_human)` and `Score(progress)`. An LLM per tick per agent is too slow and too pricey. Jev costs fractions of a cent. Honest caveat: simple rules on tool names (`browser_navigate` → focused, prompt `failed` → stuck, `finished` → triumphant) get you maybe 70% of this for free. Jev is better at reading the *text*: "I can't find the login button…" → confused.
4. **"Should we interrupt the human?"** `Noul(agent is blocked on a human decision)` plus `Score(urgency)` → ping, toast or nothing. Same gate as #1, pointed at people.
5. **Pre-action guardrail.** Before the agent clicks Submit on a refund in the mock admin site: `Noul(action is irreversible)` and `Noul(amount matches the approved request)`. The amount check runs in code, not in Jev.
6. Experimental only: screenshot classification ("Is the VM showing a CAPTCHA, error page or login wall?") using the image header. Fun, but marked not ready for production. Skip it.

### Where an ordinary LLM (or plain code) is fine or better
Writing agent replies, planning, the actual web work (that's boat + Claude), summarizing the VM's work, querying gbrain, any free-text output. Exact routing like `@ghost` mentions is plain code: route deterministically and only call Jev when there's no mention.

### The straight answer to "why do we even need the Jev key?"
**We don't need it. Casper works without it.** It earns its place in one spot: the **live, always-on decision layer**. Every message and every VM event gets a ~100 ms, near-free, *calibrated* call to decide whether anyone should react, who, and how (steer, interrupt or ignore), plus what each avatar's face shows. That's what makes a room with 4+ agents feel calm and live instead of a chatbot pile-up, and its "low confidence = stay silent" behaviour is the feature. Doing the same with an LLM costs 1–3 s and real money per event, and its probabilities aren't calibrated. If we're behind at 2 pm, replace it with @mention rules plus tool-name→mood rules and lose little of the demo. Also: TypeSafe isn't a listed sponsor/judge (Terse and Agent Relay are), so it wins no prize points. Ask organizers whether outside APIs are fine (see `docs/research/00-juno-packet.md` line 5).

### Setup before the event
1. Sign in at https://console.typesafe.ai and check the key and the rate-limits page.
2. In the Playground (https://console.typesafe.ai/playground), prototype the `responder` Choice and the `steer|interrupt|new_task|just_chat` Choice on 10 hand-written room messages. Reorder the options to check for first-option bias.
3. Time one curl call from your machine (p50 over 10 calls). Only quote "~100 ms" on stage if *we* measured it.
4. Optional: install the skill for the day's coding agent with `claude plugin marketplace add typesafe-ai/skills` and `claude plugin install typesafe@typesafe-ai`. It's the same docs as the local `typesafe:typesafe-ai` skill.

**Verdict: NICE-TO-HAVE.** Build #1 (floor control) and #2 (steer/interrupt router) if there's time; they share one request. #3 (mood) is a speculative fan-out question on the same call, so it adds no latency. Cut everything else.

---

## C) gbrain (Garry Tan) — agent memory / company brain

Repo: https://github.com/garrytan/gbrain (MIT), cloned read-only at `/tmp/gbrain`. VERSION `0.60.504.0`, last commit Oct 30 2026 (UTC). **It moves very fast. Pin a commit.**

### What it is
A memory server for agents: markdown pages with frontmatter and `[[links]]` → a typed graph plus hybrid keyword/vector search. Optional cited synthesis with gap analysis (`gbrain think` / MCP `synthesize`). Facts can be corrected or withdrawn (`remember` / `forget`). Exposed through a CLI and MCP (stdio or HTTP with bearer/OAuth). Sources: `/tmp/gbrain/README.md`, `/tmp/gbrain/docs/INSTALL.md`.
- **Storage:** **PGLite** is the default (Postgres 17 compiled to WASM, zero config, no Docker, "up to ~50K pages"). Postgres + pgvector is for shared or large brains. No SQLite. **PGLite is single-writer.** While `gbrain serve` is running, host-side commands that open the DB fail with `live_serve`. Either run one server and go through it, or use the CLI only (`/tmp/gbrain/docs/guides/remote-mcp.md`).
- **Keyless mode:** `--no-embedding` gives keyword retrieval with no API keys. Synthesis, fact extraction and query expansion need `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`. Embeddings default to Voyage (`VOYAGE_API_KEY`).
- **MCP starter surface** (`/tmp/gbrain/docs/TOOL_CATALOG.md`, 162 tools total): `search`, `query`, `get_page`, `list_pages`, `resolve_slugs`, `recall`, `remember`, `forget`, `capture`, `entity`, `context_pack`, `traverse_graph`, `get_backlinks`, `synthesize` (marked EXPENSIVE / SLOW, uses an LLM), `put_page`, `edit_page`, `add_timeline_entry`, `list_skills`, `get_skill`, `request_tools`.
- **Company-brain mode:** `gbrain sources demo company-brain` runs a keyless in-memory demo of a fictional company. `gbrain sources inspect ./wiki --profile company-brain` then `gbrain sources connect ./wiki --brain <b> --source wiki --profile company-brain [--yes]` needs **committed markdown in a git checkout** and an existing named brain, and comes with consent and receipt ceremony (`/tmp/gbrain/docs/guides/company-brain-ingestion.md`). Multi-user OAuth grants are covered in `/tmp/gbrain/docs/tutorials/company-brain.md` (~90 min). **Too much ceremony for us.**
- **`gbrain mcp expose`** publishes `serve --http` on your **Tailscale** tailnet as a launchd/systemd user service. `--funnel` makes it public for cloud agents. It needs a Tailscale install and login, HTTPS certificates enabled in the tailnet admin, and Funnel enabled in ACLs. It has many consent and exit-2 states. **Avoid it for the hackathon.**

### Install (exact; note the traps)
```bash
curl -fsSL https://bun.sh/install | bash          # need Bun >= 1.4.4 (package.json engines)
bun install -g github:garrytan/gbrain#latest-stable   # NEVER `npm i -g gbrain` (different, unrelated package)
gbrain init --pglite --no-embedding                 # keyless, no server, no Docker
gbrain doctor
```
If the postinstall fails, run `gbrain apply-migrations --yes --no-autopilot-install` (issue #218). Better: pin to a specific commit instead of `#latest-stable`, because it changes daily.

### Minimum realistic setup for Casper (pick one)
- **Option 1 (recommended): brain on the orchestrator host, used by our backend.** Import the docs, then the orchestrator calls `gbrain search "<q>" --json` (or `query`), or holds one stdio MCP client (`gbrain serve --surface starter`). It puts the top hits *into the agent's prompt* with page slugs as citations. VM agents never need network access to the brain. The "ghost of the departed lead" persona is that agent's system prompt plus brain lookups shown in the feed.
- **Option 2: agents query the brain over MCP directly.** Run it in a boat VM (pin Bun ≥1.4.4 in the snapshot): `gbrain auth create agents --scopes read` (**mint the token before the server starts** on PGLite), `boat exec <id> --detach "gbrain serve --http --port 3131 --bind 0.0.0.0"`, `boat host <id> 3131 --public` (gbrain's bearer token is the auth). In `casper-base`, register it with `claude mcp add --scope user --transport http gbrain https://<id>-3131.on.boat.dev/mcp --header "Authorization: Bearer gbrain_…"` **[UNVERIFIED end to end; `--header` is Claude Code's flag]**. This adds the visible "agent calls `gbrain.search`" tool events in the feed, but it's one more moving part.
- **Option 0: no gbrain.** Drop the same markdown in `~/company/` inside `casper-base` and let Claude grep it. That covers most of the value for 20 docs.

### Fastest seeding with fake company docs
1. Copy the shape of the bundled sample: `/tmp/gbrain/src/core/company-brain/sample/` (`company.md`, `strategy.md`, `customers/`, `people/`, `decisions/`, `meetings/`, `weekly/`). Frontmatter: `type`, `title`, `status`, `owner: "[[people/x]]"`, `created`, `updated`, `last_verified`, `tags`, `supersedes` for decisions. Bodies use `[[slug]]` links. See `/tmp/gbrain/src/core/company-brain/sample/customers/acme-example.md`.
2. Have an LLM generate ~20 pages before the event. These are content, not product code: a fictional company, the departed finance lead's refund, fee-waiver and deposit SOPs, 3 customers, 1 decision that supersedes an older one (good for "the brain knows policy changed"), and 2 meeting notes. Put the departed lead's "skills" in as plain how-to pages.
3. `gbrain import ./casper-co --no-embed`, then check `gbrain search "refund over $500" --json`. **[UNVERIFIED]** Whether plain `import` keeps custom `type: customer|decision` under the default `gbrain-base-v2` pack, or files them as `note`. Fine for keyword search either way. To try it with no data: `gbrain sources demo company-brain --json`.

### Costs, limits, risks
- $0 in keyless mode. `synthesize` / `think` spend LLM tokens on our key. Expect the HTTP mode to need 8 GB+ only for always-on enrichment, which we don't need.
- Risks: daily releases with breaking migrations; consent prompts that exit 2 in non-interactive runs (agents and CI); the PGLite single-writer lock; the Bun floor (boat ships 1.3.14); the "uses outside libs" rule (ask organizers, packet line 5). Judges may see "a gbrain wrapper", so keep it behind the scenes.

**Verdict: NICE-TO-HAVE, thin.** Do Option 1 with a pinned commit, ~20 seeded pages and keyword search, all set up before the event. Make one live moment count: agent A calls `remember` on a correction, then agent B `recall`s it. That shows shared, correctable team memory, which a markdown folder can't. If install fights us Friday night, use Option 0 and don't look back.

---

## Pre-event checklist (setup only)
- [ ] boat: pay $20 plan; connect Claude; scoped API key; build and snapshot `casper-base` (Bun ≥1.4.4, wallpaper, AGENTS.md/CLAUDE.md, optional Relay CLI and gbrain MCP); time create, desktop and prompt from SF-like wifi; **test iframe embed and two-viewer behaviour**; record a fallback MP4.
- [ ] Jev: console sign-in; check rate limits; Playground-test the `responder` and `steer|interrupt` Choices; measure p50 latency.
- [ ] gbrain: install Bun, pin a gbrain commit, `init --pglite --no-embedding`, import ~20 seeded pages, test 5 queries; decide between Option 1 and Option 0.
- [ ] Ask organizers whether boat, Jev and gbrain are allowed as outside services and libraries.
