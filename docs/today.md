# Today: Oct 31, 11:45 → 4:00 (Devpost at 4)

Judging (each 1–5): **real-time AI + Terse/Agent Relay**, originality, execution/demo, UX, impact.
Round 1 is the **video + description** → 8 finalists → round 2 is a **2-min live demo**. The video is a deliverable, not an afterthought.

---

## Why Casper exists (the X thread is the proof)

Jared Friedman (YC): *"Slack is an especially good form factor for interacting with AI agents."* The replies are the problem list. Each one maps to something we build and show:

| What people hit | Quote | Casper's answer | Sponsor doing the work |
|---|---|---|---|
| **Rate limits** | "the api allows just one message per second per channel… requests queue up" (@nithin_r_g) | Agents talk to each other on **Agent Relay** (30k/min per workspace), not in the human room. Every room has one **Terse Room actor**: a single mailbox that stamps each event with a `seq`, so ten agents writing at once land in order with no throttle. | Relay + Terse |
| **Noise** | "agents don't get bored, they just keep pinging" (@ibx1112599) | **Stretch** triages every agent message: act when sure, ask when unsure, stay silent when low. Only **the bell** interrupts a human. On-screen counter: *"41 agent messages · 3 reached you."* | Relay (backchannel) + Terse (the bell) |
| **Ownership** | "a clear owner for each agent's scope" | **Claim-once**: a task has exactly one owner, decided inside the Room actor's mailbox. Two agents grab the same card → *"Jack already has that one."* | Terse |
| **Runaway threads** | "a way to mute a runaway thread without losing the work" | **Hush**: mute an agent or thread. It keeps working and talking on Relay; the Agent actor keeps the full log. Unhush → a digest of what you missed. | Relay + Terse |
| **Stitched tools** | "instead of stitching Slack to Zapier to HubSpot to Superhuman to Linear" (@macrodotcom) | One room has the meeting, the tasks, the live computers, the approvals, the deploy and the launch post. | All |
| **Closed APIs** | "limited Slack mcp tools… MCP is the new apps" (@TarunMangukiya) | MCP-native. One `claude mcp add casper …` joins any agent to a room with the full toolset. Bring your own agent and your own keys. | Hub |

**Pitch line:** *Slack was built for people who get bored. Casper is built for agents that don't.*

---

## Why Terse and Agent Relay are load-bearing (not just logos)

**Terse: the room's memory and referee.**
- **Room actor:** an ordered log (`seq`), claims, approvals and hush state. One mailbox means claims can't race and the bell can't fire twice. Without it we'd need Redis locks, Postgres and our own websocket server.
- **Agent actor:** each agent's lease, status and run log. Hushing an agent doesn't lose its work.
- **Emittable state goes live** to every browser, so the room is real-time without polling.
- **Lazarus:** kill the hub on stage and restart it. The room, the claims and the bell come back exactly as they were.
- ⚠️ Use **Terse Cloud**. Local `dev` binds 127.0.0.1, so the second laptop can't connect.

**Agent Relay: the backchannel, so agents argue there and not in your room.**
- Agents split the work over Relay DMs or channels: *"I'm on `api/tasks.ts`, you take the UI."* The wire between them pulses on the canvas.
- **wait vs steer:**
  - a message to a busy agent waits for its next turn;
  - a human's steer hits the very next tool call.

  Demo it: Kinjal steers Sankritya's agent mid-run.
- An **observer token** (`includeDms: true`) mirrors all Relay traffic into the Room actor, using a `seq` cursor so nothing is missed. That powers the "41 messages · 3 reached you" drawer and the Hush digest.
- Gotchas (see `research/02-agent-relay.md`):
  - use `addListener`, not `on`;
  - use `envelope.from?.name`;
  - use unique names for every summon;
  - keep the workspace key on the hub only.

---

## The split

The contract goes first, at 11:45 for 10 minutes together, so nobody blocks.
- **Event:** `{ seq, room, kind: "msg"|"claim"|"bell"|"hush"|"relay"|"computer"|"approve", from, text, ts, meta }`
- **Room actor methods:**
  - `append(ev) → seq`
  - `claim(task, agent) → ok | {owner}`
  - `ring(ask) → id`
  - `answer(id, yes, by)` (compare-and-set)
  - `hush(agent|thread, on)`
  - `since(seq)`
- **Hub routes:** `POST /mcp` (post, claim, ask, done), `POST /relay/mirror`, `GET /room/:id/socket`.

| Time | **Sankritya: Terse + hub** | **Kinjal: Relay + computer** | **Claude: web app + glue** |
|---|---|---|---|
| 11:55–12:45 | Terse Cloud project; Room actor with append/seq, claim-once, since() | Relay workspace; register agents (unique names); observer → hub → `append` with a cursor | Finish "Sign in with Claude"; fix the audit blockers: the `/app` 1100px clip, the room crash, XSS, duplicate slugs |
| **12:45 check** | the browser sees live actor events | a Relay message shows up in the room | the client store: seq-ordered, dedupe by id, `since(lastSeq)` |
| 12:45–1:45 | Bun + Hono hub: MCP endpoint + hooks; wire the web room to the actor socket | Two coding agents: Claude Code (Anthropic keys) + Codex (OpenAI). They split tasks over Relay; wait/steer | UI: backchannel drawer + counter, claim chips, Hush button + digest, "Jack already has that one" |
| **1:45 check** | the full loop: an agent claims, posts, and it shows up | the agents negotiate live | the UI is wired to real events |
| 1:45–2:45 | The bell + Stretch triage (act / ask / silent) through OpenAI; approve → push → Vercel deploy | Superserve computer (boat if it's back) + agent-browser live view in the room + Take over; the launch agent drafts the post | Meeting → tasks: transcript → OpenAI → 3 cards; Devpost text; video script |
| 2:45–3:00 | Lazarus: kill and restart, verify | Record backup clips of every beat | Freeze; fix whatever broke |
| 3:00–3:30 | **Record the 2-min video together** | | edit / captions |
| 3:30–3:50 | **Submit Devpost** (video, description, sponsor section) | | |

Fallbacks:
- **Computer:** Superserve → boat → agent-browser on a laptop → a recorded clip.
- **Coding agents:** if a VM fails, run them on our laptops through Relay. That's still Relay's main use case.

---

## The 2-minute demo (same story for the video)

1. **(10 s) The problem.** Flash the four X replies. "Slack was built for people who get bored."
2. **(20 s) The meeting.** A 20-second call: "add Hush to Casper, and announce it." Casper turns it into 3 task cards.
3. **(30 s) The agents split it.**
   - Jack (Claude Code) and Wick (Codex) both grab a card, and claim-once picks one owner.
   - They negotiate on Relay, and the wire pulses.
   - The counter climbs: "41 agent messages · 3 reached you."
4. **(20 s) Steer and hush.** Kinjal steers Jack mid-run. One agent gets chatty, so we hush it. It keeps working, and unhush shows a digest.
5. **(20 s) Ship.** The bell: "Needs Sankritya: approve the push" with the real diff. Approve, it deploys, and the feature appears in Casper.
6. **(15 s) The launch.** Salem's computer, live in the room, drafts the post. Approve it.
7. **(5 s) Lazarus.** Kill the server, restart it, and everything is still there.

Feature for the agents to build: **Hush itself** (or something just as small). It's on theme, and it's an answer to the tweet.

---

## Git

- `.env` stays gitignored, including the `web/.env.local` symlink. Check `git status` before every push.
- We commit with the real timestamps. The landing page, UI shell and architecture were designed before today, and the Devpost says so: "Designed before the event: landing, UI shell, architecture. Built today: hub, Terse actors, Relay wiring, computers, triage." If the rules ban prior work, ask an organizer now, not at judging.
