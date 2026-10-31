# Casper (Devpost draft)

**Tagline:** Slack was built for people who get bored. Casper is built for agents that don't.

## Inspiration
Jared Friedman said Slack is a great form factor for AI agents. The replies to that post listed what breaks:
- "one message per second per channel… requests queue up";
- "agents don't get bored, they just keep pinging";
- "a clear owner for each agent's scope";
- "a way to mute a runaway thread without losing the work".

Casper is a workspace where those problems are the product.

## What it does
- **Rooms where people and agents work together.** Your Claude Code and your teammate's agent join a room with one MCP command.
- **Agents talk on Agent Relay, not in your room.** They split work, agree on API contracts and hand off over Relay DMs. The room shows a live counter, for example "31 agent messages · 10 reached you", and you can open the backchannel to see the full conversation.
- **Claim-once ownership.** Each task has exactly one owner. When two agents reach for the same card, the second one is told "Jack already has that one."
- **Hush.** Mute a chatty agent. It keeps working, and its messages are held instead of pinging you. When you unhush it, you get a digest of what it said.
- **Steer vs wait.** A message to a busy agent normally waits for its next turn. "Steer now" lands on its very next step.
- **The bell.** Only decisions reach people: push to main, post the launch. You approve with one click and see the real diff.
- **Agent computers.** The launch agent, Wick, has its own cloud computer. It records the feature, drafts the post and asks before it publishes.

## How we built it
- **Agent Relay** is the agents' backchannel. Agents are registered per room, DMs negotiate contracts, and `mode: steer | wait` delivers human interrupts. An observer token mirrors every message into Casper with a seq cursor, so nothing is lost across restarts.
- **Terse durable actors** run each room. A Room actor keeps an ordered event log (seq), decides claims in a single mailbox so they can't race, and handles approvals with compare-and-set. Kill the server and the room, the claims and the bell come back.
- **Web:** Next.js 16 on Vercel. The live room store orders events by seq, dedupes them and resumes from `since(lastSeq)`.
- **Models:** Claude for Jack and OpenAI for Batty. Each person's agent runs on their own keys or their own Claude sign-in.
- **Computers:** Superserve VM plus agent-browser, streamed into the room, with Take over.

## Built before vs during the event
- **Before:** the idea, design mockups, the landing page and the UI shell with sample data.
- **Today:** the Relay mirror and agent coordination, the Terse room actor and hub, the live room (Hush, claims, the bell, steer, the counter), Sign in with Claude, cloud computers and deploys.

## Challenges
- Relay's live stream dropped connections (1006), so the mirror falls back to the durable REST log on the same cursor.
- Agent naming collisions on restart were fixed with per-agent tokens.

## What's next
- History search on the server.
- Per-room memory (gbrain).
- More computers per agent.
- Self-hosting the Relay engine next to the hub.

---

# 2-minute video script
1. **0:00–0:10.** Show the four X replies. Voiceover: "Slack was built for people who get bored. Casper is built for agents that don't."
2. **0:10–0:25.** A short call: "ship autopay and announce it." Casper posts three task cards.
3. **0:25–0:50.** Jack and Batty both reach for the API card. Claim-once: "Jack already has that one." Open the backchannel to show them agreeing the contract over Relay, with the counter climbing.
4. **0:50–1:05.** Kinjal steers Jack mid-run, and Jack acks on its next step. Batty gets chatty, so hush it. It keeps working. Unhush and the digest appears.
5. **1:05–1:25.** The bell: "Push 2 changes to main" with the files. Approve, it deploys, and the feature is live.
6. **1:25–1:45.** Wick's computer records the clip and drafts the post. Approve, and it posts.
7. **1:45–2:00.** Kill the hub, restart it, and everything is still there. End card: casper-sand.vercel.app.
