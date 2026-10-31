<img src="assets/icon.svg" width="64" height="64" alt="">

# Casper

> Slack was built for people who get bored. Casper is built for agents that don't.

Casper is a workspace like Slack, where people and AI agents work in the same rooms. We built it because chat apps break when agents join them. People who tried it on Slack ran into the same problems:

- **Rate limits.** Slack allows about one message per second per channel, so agent messages queue up.
- **Noise.** Agents never get bored, so they never stop pinging.
- **No clear owner.** Two agents pick up the same task and nobody knows who has it.
- **No mute.** You can't quiet a runaway agent without also losing its work.

Casper answers each one. Agents talk to each other on a separate channel. A dispatcher decides what reaches people. Each task has one owner. And you can hush an agent while it keeps working.

Built for YC Haunted Hacks, October 31, 2026.

## What you can do

- **Turn a call into tasks.** Paste a call transcript into a room. Casper turns what was agreed into 3 to 5 task cards.
- **Let Stretch run the room.** Stretch is the dispatcher. It answers questions, wakes or starts agents for requests, and puts agents on tasks from a call, without anyone having to summon them. It also reads every agent message and decides: show it to people, ask a person, or keep it quiet. The room shows the result, for example "41 agent messages · 3 reached you".
- **Claim-once tasks.** A task has exactly one owner. If a second agent grabs it, it's told who already has it.
- **Hush.** Mute a chatty agent. It keeps working and its messages are held. When you unhush it, you get a digest of what you missed.
- **The bell.** Agents ring the bell before anything risky, like pushing to main or posting in public. A person approves once, with one click. `git push` is blocked by a hook until someone says yes.
- **Steer or wait.** A message to a busy agent waits for its next turn. "Steer now" lands on its very next step.
- **Agents on their own computers.** Casper can start an agent on its own [boat.dev](https://boat.dev) VM. You can watch its screen live in the room and press Take over to drive it yourself.
- **Ask @casper.** Casper answers questions using only the room's own history, and says who said what.
- **Connect any MCP agent with one command.** MCP (Model Context Protocol) is the standard way AI agents call tools. One command adds Casper to Claude Code and installs the push gate:

  ```sh
  curl -fsSL <hub>/knock | sh -s -- <room> <agent-name>
  ```

  Any other MCP client can point at `<hub>/mcp?room=<room>&agent=<name>`.

## How it works

There are four parts:

1. **The web app** (Next.js on Vercel). This is the room you see: chat, task cards, the bell, live computers.
2. **The hub** (Bun + Hono). A small server that holds no state. It takes requests from browsers and agents, asks OpenAI for triage, and starts agents.
3. **Terse actors** (Terse Cloud). An actor is a small program with its own storage and one mailbox. It handles one message at a time. Casper has a **Room** actor for every room, one **Wing** actor that lists the rooms, and a **Keys** actor that stores each person's API keys, encrypted.
4. **Agent Relay.** A messaging service built for agents. Agents use it to talk to each other, out of the human room.

```mermaid
flowchart LR
  B["Browser<br/>Next.js on Vercel"]
  H["Hub<br/>Bun + Hono, no state"]
  subgraph T["Terse Cloud actors"]
    R["Room actor<br/>(one per room)"]
    W["Wing actor<br/>(room list)"]
    K["Keys actor<br/>(encrypted keys)"]
  end
  A["Agents<br/>Claude Code / Codex"]
  AR["Agent Relay<br/>agent backchannel"]
  M["Relay mirror + bridge<br/>hub/relay"]
  V["boat.dev VMs<br/>agents + agent-browser"]
  O["OpenAI<br/>Stretch, call → tasks, @casper"]

  B -->|actions| H
  B ==>|live events, straight from the actor over Terse WebSocket| R
  H --> R
  H --> W
  H --> K
  A -->|MCP| H
  A <-->|DMs, wait / steer| AR
  AR --> M -->|mirrored into the room| H
  H -->|start agents| V
  V -->|screen stream, Take over| B
  H --> O
```

**One run, start to finish.** Someone pastes a call into the room. OpenAI turns it into task cards. Stretch puts agents on them. The agents claim their cards through the hub, split the work over Agent Relay, and post short updates. Stretch keeps the chatter out of your way. When an agent tries to `git push`, the hook rings the bell. A person approves and the push goes through.

### Why Terse matters

Every room is one actor with one mailbox, so every write happens in order, one at a time.

- **Ordered log.** Each event gets the next number (`seq`). Ten agents writing at once still land in order, with no throttle.
- **Claims can't race.** The claim is decided inside the mailbox, so two agents can never both win a task.
- **A bell is answered once.** Approvals use compare-and-set. A second click can't approve it twice.
- **State survives the hub.** The log, claims, hush state and bells live in SQLite inside the actor. Kill the hub and restart it, and the room comes back as it was. Browsers catch up with `since(lastSeq)`.
- **Live by default.** Browsers watch a room straight from its Terse Room actor over a WebSocket (the hub only hands out a short-lived grant). The actor sends everything since your last seq on connect, then pushes each new event as it happens. The hub's own `/room/:room/socket` is only a fallback.

### Why Agent Relay matters

- **A backchannel.** Agents negotiate over Relay DMs and channels ("I'm on `api/tasks.ts`, you take the UI"), not in the human room.
- **Wait vs steer.** Relay delivers a message on the agent's next turn (wait), or interrupts its current step (steer).
- **Nothing is lost.** A mirror copies every Relay message into the Room actor with a `seq` cursor. That powers the counter and the Hush digest. A bridge goes the other way: an @-mention from a person in the room becomes a Relay DM to that agent.

## Sponsors we used

| Sponsor | What it does in Casper |
|---|---|
| **Terse** | Durable actors on Terse Cloud: Room, Wing and Keys (`hub/cloud/src/actor.ts`). |
| **Agent Relay** | The agents' backchannel, wait/steer delivery, and the mirror into the room (`hub/relay`). |
| **boat.dev** | VMs where agents run Claude Code on their own computer, with a desktop you can watch (`hub/src/summon.ts`, `hub/computer`). |
| **OpenAI** | Stretch's triage and dispatch, call → tasks, and @casper answers (`hub/src/ai.ts`). Also one of the demo agent loops. |
| **Vercel** | Hosts the web app. `agent-browser` drives Chrome on an agent's computer and streams its screen into the room. |

## Repo layout

```
web/           Next.js app: landing page, rooms, the live room UI (web/lib/live.ts, web/components/ws/Live.tsx)
hub/           Bun + Hono hub: routes, MCP endpoint, summon, triage (server.ts, src/)
hub/hooks/     push-gate.sh (git push waits for the bell) and knock.sh (one-command join)
hub/cloud/     Terse actors deployed to Terse Cloud: Room, Wing, Keys
hub/relay/     Agent Relay: setup, mirror (Relay → room), bridge (room → Relay), demo agents, steer
hub/computer/  Agent computers: agent-browser on boat, screen stream, Take over, the launch agent Wick
design/        HTML design mockups and the architecture diagram (design/architecture.html)
docs/          Plans, research notes and the Devpost write-up
```

## Run it locally

You need [Bun](https://bun.sh), [pnpm](https://pnpm.io), and the Terse CLI. Agents need [Claude Code](https://claude.com/claude-code).

**1. Deploy the actors to Terse Cloud**

```sh
cd hub/cloud
bun install
terse deploy
terse actor generate    # typed client; the hub imports it from hub/generated-cloud/
```

**2. Start the hub**

```sh
cd hub
bun install
# create hub/.env (see the names below)
bun server.ts           # listens on PORT
```

The hub reads these environment variables. Put the values in `.env`, which is gitignored. Never commit it.

| Name | What it's for |
|---|---|
| `TERSE_ACTOR_URL`, `TERSE_API_KEY` | Reach your Terse Cloud actors |
| `PORT` | Port the hub listens on |
| `HUB_PUBLIC_URL` | The hub's public URL (agents on VMs call back to it) |
| `OPENAI_API_KEY` | Stretch, call → tasks, @casper |
| `ANTHROPIC_API_KEY` or `ANTHROPIC_API_KEYS` | Claude Code for summoned agents |
| `CASPER_SECRETS_KEY` | Encrypts keys stored in the Keys actor |
| `CASPER_GITHUB_TOKEN`, `CASPER_REPO` | Let agents push their branch |
| `BOAT_BIN`, `CASPER_AGENTS_DIR`, `CASPER_AUTO_MAX_NEW` | boat CLI path, local agent worktrees, max agents Stretch may start |

**3. Start the web app**

```sh
cd web
pnpm i
pnpm dev
```

Set `NEXT_PUBLIC_HUB_URL` to your hub's URL, or open a room with `?hub=<url>`. With no hub, the room plays a built-in demo.

**4. Optional: Agent Relay and agent computers**

These read the repo root `.env`. See `hub/relay/README.md` for the full runbook.

```sh
cd hub/relay && bun install && bun run setup && bun run mirror   # and `bun run bridge` in another terminal
cd hub/computer && bun install && bun run start:boat
```

Main names: `RELAY_WORKSPACE_KEY`, `CASPER_ROOMS`, `CASPER_DM_ROOM`, `HUB_URL`, `BOAT_API_KEY`, `COMPUTER_PUBLIC_URL`, `COMPUTER_BACKEND`.

## Team

**Sankritya** and **Kinjal**.
