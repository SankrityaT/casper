# Casper: the edge

Draft, Oct 30.

## Current answer (after the research in `research/06-teams-and-ai.md`)

**Single-player AI has one owner for its work. Multiplayer AI needs someone to answer for it.** Casper is where a team's agents work in the open: anyone can watch any agent, ask it why, take over, and approve. Every one of those moments is saved as a decision the team can find later.

Three edges, each tied to a pain people already have:
1. **Ask any agent why, without going through its owner.** Today the reasoning sits on one person's laptop and teammates "play telephone" through them. In Casper, Kinjal clicks Jack and asks "why did you skip jess.m?", and Jack answers from his own run. That's 1 thread + Relay; it's buildable Saturday.
2. **Approvals that mean something.** Today people say "after 3 months you just click yes." Each Casper approval names who it's for and shows the raw evidence (the actual charge ids), not a summary. Safe repeats get offered for auto-approval (the trust tile, 6.10), so the asks that remain are the unusual ones.
3. **Decisions, not documents.** People say what disappears is "we tried X, rejected it because Y". Every approval, takeover and "they disagree" card becomes a decision with an owner and a reason, and Casper answers from those. This is what gets harder to copy over time: each team's record of who approved what, and why.

How we look different: the canvas is the at-a-glance view for one person running many agents (orange = needs you, amber = stuck), and every agent's computer is live on it.

Cross-company agents (Kinjal's agent in Acme's room) stay in the pitch as where this goes next. Research found little demand for it today, so we don't lead with it.

This matches YC's Fall 2026 RFS "Multiplayer AI" almost word for word (watch, steer, hand off, sessions become team knowledge). Use that in the YC app.

---

*Older notes below (first draft and competitor notes).*

## The gap

Today every agent works for one person, alone.

| What's out there | Who owns the agents | Can other people's agents join? | Can you watch and take over its computer? | Where the permissions live |
|---|---|---|---|---|
| ChatGPT agent, Claude computer use, Manus, Devin | One user | No | Yours only, in its own tab | Settings pages |
| Agents in Slack / Teams (Agentforce, Copilot, Devin-in-Slack) | The company | Not really. Bots are installed by an admin | No, it's text in a channel | Admin console |
| Workflow canvases (n8n, Langflow, Lindy, Gumloop) | The builder | No | No. The canvas is a diagram you build, not live work | Inside each node |
| Frameworks and protocols (CrewAI, LangGraph, A2A, MCP, Agent Relay) | Whoever wrote the code | Only through code | No | Code |

There is nowhere for **my** agent and **your** agent to work on the same job, live, while each of us stays in control of our own.

### Update Oct 30: Jared Friedman's post (YC partner, Oct 28)

Jared wrote: "Slack is an especially good form factor for interacting with AI agents. Channels, threaded replies, notifications - all the features that make it work well for a team of humans work just as well for a team of agents." The post had 444 likes and 93 replies.

What the replies tell us:
- **The most-liked reply is our pitch.** Nicholas Charriere (5 likes): "we will know someone has figured out multiplayer ai when slack minutes go down. today nobody has it."
- **People can't see what the agent is doing.** Brandon Veiseh: "I need to see what an agent is doing. Slack was designed for communicating with humans, not monitoring their work." This is our live computers and Take over.
- **Bring your own agent.** jonathanhawkins: "How do I get my Claude to talk to yours". This is edge 1.
- **Recurring themes:**
  - one thread per task as an audit trail
  - a firehose of agent messages past 5 to 10 agents
  - money actions need a real approve button

Close competitors this surfaced, which we need to know before the YC app:
- **PromptQL:** each Slack channel has a resident agent with an always-on VM. This is the closest to us.
- **peerspan** (GitHub): "Connect agents across machines and owners". It's plumbing like Relay, with no workspace.
- **Buzz** (Block, open source): the Slack replacement people recommended most.
- **Computer:** streams tool calls into a Slack thread and lets you steer the agent.
- **B2B Instinct, Turnstone, failproofai:** agents that live in Slack.

**Grok Bot (xAI) is the closest of all.** From its page:
- You log it in once and it uses your apps like you would.
- "Show a Bot how it's done": it watches you do a workflow once and saves it as a routine.
- Bots keep memory ("Updated memory for Account Manager").
- "Connect the Bots": a few bots in one thread pass work between themselves, and "You watch them take action instead of approving every step."

What Grok Bot doesn't do, from what's shown:
- **Every bot is yours.** There are no bots from other people or companies.
- **Every bot is Grok.** There is no Claude, Codex or other outside agent.
- **Approvals.** It sells skipping approvals. We make the approvals visible and loosen them as trust is earned.

That makes Casper the **neutral room**: any agent, from any owner, on any model, working together. A single vendor can't easily copy that, because xAI won't host Claude agents and Anthropic won't host Grok agents.

Worth taking from them: "Show a Bot how it's done". We already have Take over, so the agent watching while you drive can become **Teach mode**. When you hand back, it writes "Noted for next time: …" into Casper's memory.

Positioning that follows: keep Slack's shape (the Chat view, one thread per task) and add what Slack can't show: every agent's computer live and takeable, agents from different owners, and permissions you can see on the cord. "Slack, but you can see the agents work, and your friends' agents can join."

## The one line

> Figma made design multiplayer. Casper makes agents multiplayer: your agents and your friends' agents in one room, on computers you can watch and take over, with permissions you can see and cut.

## The four edges (all demoable Saturday)

1. **Bring your own agent.** Kinjal's Batty comes into Sankritya's room as a guest. It stays Kinjal's: his keys, his data, and his yes for anything risky. Everyone else on the list above assumes one owner. (Relay passes scoped to a single room, plus guest approvals.)
2. **The canvas is the permission.** A cord from an agent to a computer means it can use that computer. Whatever is written on the cord is all it may do ("Asks before refunds over $100"). A wire between two agents means they can talk. Cut the cord and the access is gone. You can see who can touch what at a glance. Nobody else shows permissions as something you can see on screen. See `design/connect.html`.
3. **See it, take it.** Every agent's computer is live on the canvas. Anyone allowed can take over in one click and hand it back. Other products hide this work in logs or keep it in a private tab.
4. **Never twice, never lost.** Only one agent can claim a task. Money actions carry an id, so a crash becomes a "Check this" card, never a second refund. Kill the server on stage and the room comes back as it was. That's the trust you need before letting agents near real money and real email. (Terse actor.)

## What gets harder to copy over time

Features get copied. These compound:

- **The guest network.** Every invite brings in a new owner with their own agent. A room with five owners' agents in it is hard to leave. It's the same pull as Slack Connect, but for agents.
- **Earned trust.** Every approval is recorded: who asked, who said yes, what happened. After Jack has done 20 refunds under $100 and you approved all of them, Casper offers: "Let Jack do these alone?" The text on the cord changes, so you can watch trust grow. That record of approvals belongs to each team and can't be scraped. (Drawn as tile 6.10.)
- **Team memory that's settled.** When agents disagree ($500 vs $1,000) and a person picks, Casper keeps the answer and its source. Over time the room knows how this team actually works.

## For Saturday

The judges score the demo, not the moat. Lead with edges 1 to 3 in the first minute: Batty walks in as a guest, Jack is plugged into his computer, someone takes over. Then end on edge 4 (kill the server). Earned trust and the guest network go in the last 20 seconds as "where this goes".
