# Casper: how agents remember, know their territory, and decide to speak (Oct 31)

Sources: Supermemory's three articles (Claude Code memory, memory beginner's guide, open-sourced company-brain harness)
and Juno's read of the Dhravya / Andrew Qu threads. We take the ideas, not the product. Our stack: Terse actors,
Agent Relay, Jev, the hub, and the house crew (Casper, Stretch, Fatso, Stinkie).

---

## 1. Territory: how every agent knows who owns what

The problem people named: "tracking tasks and sharing context across agents is super broken" (Mitko), and agents
"need to know who to loop in" (Christina, bshaan). In Casper, territory is data, not vibes.

**Where it lives**
- **Room actor**: `claims (task → agent)`, `locks (file glob → agent, expires)`, `threads (thread → participants)`.
- **Space actor**: the agent registry. For each agent: owner, kind, rights on the cord, and `skills` (what it's good at,
  learned from what it actually shipped: "api/**, billing, Stripe").

**How an agent learns it**
- **Session start (profile):** the hub's MCP server returns a short *territory index*, one line per agent, like
  Claude Code's `MEMORY.md` (≤ 40 lines):
  `Batty (Kinjal · Codex) · owns ui/** · task "Autopay toggle UI" · ask before touching AutopayToggle.tsx`
- **Every change is an event:** a claim, release or lock is appended in the Room actor and pushed over Relay as a one-line
  notice to agents it affects ("Batty now owns ui/**"). `wait` delivery, so it lands on their next turn.
- **Before acting:** `casper_claim(files)` is the check. The actor answers `yours` or `Batty has ui/**, ask her`.
  Agents don't need to remember territory perfectly; the actor is the source of truth and says no.
- **Stretch routes by it:** an untargeted "the toggle is broken" goes to whoever owns `ui/**`.

## 2. Memory for agents (the harness, three parts)

From the Claude Code article: every memory system must get **writing**, **representation** and **the harness** right.

**Writing: done by Fatso, never by the working agent.** Learning runs outside the main conversation ("dreaming"):
after events settle (a thread goes quiet, an approval is decided, a call transcript lands), Fatso extracts facts,
checks them against what's already there, and files only what would change a future answer. Working agents can
*propose* a memory; a person confirms anything that becomes a wing decision.

**Representation: small facts with time and links, plus the raw.**
- Each memory is one fact with a source, a scope (see `memory.md`), and links: **updates** (replaces an older fact,
  old one kept as history), **extends** (adds detail), **derives** (inferred, weighted lower until confirmed).
- Time-bound facts carry an expiry ("demo is Saturday" stops counting Sunday).
- Raw stays too: transcripts, threads and files are indexed as chunks, so search is hybrid (facts + original text).
- **Durable vs live:** the Library holds decisions, ownership, project context. Live state (PR status, deploy,
  latest Linear status) is always fetched from the tool, never stored as memory. Stale memory is worse than none.

**The harness: how memory reaches the agent.**
1. **Profile at session start** (always): room charter, who's who, territory index, the agent's rules, the owner's voice.
2. **Hook on every prompt** (Claude Code `UserPromptSubmit`): the hub searches the caller's scopes and injects up to
   ~10 short memories (≤ 300 chars each) before the agent reads the prompt. This fixes "a note only helps if the agent
   thinks to look".
3. **Tool mid-task:** `casper_memory_search(q)` for what it didn't know it needed. Every read is logged.

Memory belongs to the room and wing, not the agent: swap Claude Code for Codex and the knowledge stays.

## 3. Deciding whether to speak (Stretch, powered by Jev)

People hate chatty agents. For any message that isn't an explicit @mention:

```
message + context ─► Jev triage (≈100 ms) ─► scores 0–100:
   usefulness · confidence · urgency · noise · interruption cost · investigation value · reaction fit
        │
        ▼
   deterministic evaluator (formulas + the room's proactivity mode)
        │
   ┌────┴─────────┬─────────────┬────────────┐
 ANSWER       INVESTIGATE      REACT        PASS
 wake the     look first,      a spooky     silence
 owner agent  speak only if    reaction
              something found  only
```
- An explicit @mention always gets ANSWER (or a quick REACT if it's lightweight).
- INVESTIGATE can end in a **silent conclusion**: no "I checked and found nothing" posts.
- Each room has a proactivity mode (quiet / normal / eager), set on the room.
- The score Stretch is optimizing: `usefulness × correctness × timeliness ÷ (noise × risk × interruption cost)`.

## 4. Messages that arrive while an agent is working

A teammate adds context, corrects the premise, or says stop. The hub runs an *active-turn gate* (small model):
`IGNORE` (unrelated) · `APPEND` (queue into its Relay inbox, delivered with `wait`) · `REPLACE` (supersede the request)
· `STOP` (Relay `steer`/interrupt). The Room actor records which revision the agent is answering.

## 5. Approvals that suspend and resume

When an agent calls something consequential (push, spend, post, email, delete), the hub classifies it against the cord.
If it needs a yes: checkpoint the agent's turn in the Room actor, post the bell card, suspend. On Approve, the *same*
agent resumes with the decision in context (it proposed it, it finishes it). On Not now, it's told why and stops.
Too many approvals is its own failure: earned trust offers to drop repeat asks.

## 6. Turn hygiene (from the harness article)

- **Progress goes to the card, not the chat:** "editing api/autopay.ts" updates the agent's card through hooks.
- **Salvage:** if an agent's last output is only "working on it", the hub asks once for a final answer.
- **Step budget:** near the end of a long run, tell the agent how many steps remain, then force a final answer.
- **Recovery:** every turn is checkpointed in the actor (Lazarus), so a crash resumes instead of repeating.

## 7. What the threads told us to build (Juno's read)

| What people said | What Casper does |
|---|---|
| Agents need approval flows, rich cards, inline handoffs; Slack is for humans talking (Nitish Mutha) | Bell cards with real evidence; handoff cards; structured messages are the default |
| Tracking tasks and context across agents is broken (Mitko) | Claims, territory index, the canvas |
| Permissioning agents across channels without leaking context (Scott Shapiro) | Cords + memory scopes; agents never read more than their owner |
| People forget to tag the agent | Stretch routes untargeted messages (or stays quiet) |
| The brain should be available to other agents like Claude Code | The Library over MCP (`casper_memory_search`) |
| Listen to huddles / calls | Call transcript → tasks (Casper) |
| Know people and roles, who to loop in, who approves | Space directory + approver lists on each cord |
| Per-channel memory isn't enough; memory shouldn't be owned by one agent | Five scopes; memory belongs to room/wing |
| Search is "impossible" | ⌘K + Fatso answers with sources |
| "How does it know what it can and cannot say?" (Cynthia McGillis); "if it records from a private convo, only disclose it there" (David Cramer) | Origin sticks: a deterministic rule in `memory.md`, not model judgement |
| "Extract things people know implicitly but forget to share" (Cynthia) | Fatso's "Share with the wing?" prompt, one tap from the person who knows |
| Humans hate verbosity, agents thrive on it; the noise is the context agents lack (Harshil Mathur) | Two views of one room: agents read the full event stream in their scope; people get folded agent talk and Casper's digest |
| Slack is everyone's AI connective tissue (Gergely Orosz); but most big companies are on Teams (Matt Slotnick) | Don't replace it: import Slack history, post the bell and digests into Slack/Teams, approve from there. Casper is the room where agent work happens |
| "Rebuild all software around chat, one vendor" (Macro) | The opposite bet: a neutral room that connects the tools a team already has, any agent, any owner |

## Saturday cut
Build: territory index in `casper_room`, claims/locks, the prompt hook injecting memories, approval suspend/resume.
Stretch goal: Jev triage scores and INVESTIGATE, the active-turn gate, Fatso's background dreaming.
