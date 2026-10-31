# Coding agents in Casper: the two-way link (draft, Oct 30)

Goal: a coding agent on someone's laptop (Claude Code or Codex) is a full member of the room. It can see and use Casper, and Casper and the room's agents can reach it.

## Three pipes, one job each
```
             ┌──── 1. Casper MCP (agent asks Casper) ─────►┐
 Claude Code │                                             │  Casper hub ── Terse room actor
  or Codex   │◄─── 2. Relay (anyone messages the agent) ───┤  (claims, log, approvals, memory)
 on a laptop │                                             │
             └──── 3. Hooks (Casper sees what it does) ───►┘
```
1. **Casper MCP server: the agent calls Casper.** MCP only goes one way: the agent calls tools, and the server can't start a conversation. So this pipe is for the agent asking things and doing things.
   - `casper_room`: who's here, open tasks, who claimed what
   - `casper_claim(task or files)`: returns "yours", or "Kinjal's Codex has it". Claim-once lives in the Terse actor.
   - `casper_release`, `casper_post_update`
   - `casper_ask(agent, question)`: asks another agent, sent over Relay
   - `casper_request_approval(summary, diff)`: waits until a named person approves or declines
   - `casper_memory_search`, `casper_decide`: team memory and the decision log
2. **Agent Relay: everyone else reaches the agent.** Relay already delivers messages into a running Claude Code or Codex session (its broker injects them; `steer` interrupts, `wait` queues for the next turn). This is how Casper says "new task for you", "Kinjal asks why you changed the schema", "approved, go ahead", or "Batty is touching `api/tasks.ts`". Relay ships its own MCP tools for send, DM and inbox, so we don't rebuild messaging.
3. **Hooks: Casper sees the agent work.** Claude Code hooks (after each tool call, on stop) post small events to the hub: file edited, command run, task done. That's what drives its card, face and "working on `api/tasks.ts`" line on the canvas, without needing a cloud computer. Codex has a smaller notify hook, so its card shows less.

## Joining
One prompt or command per person, like TalentOS's "copy one prompt" (they already have this, so it isn't our edge):
`claude mcp add casper https://…/mcp --header "Authorization: Bearer <room pass>"`, plus the hook config and the Relay agent token, all minted by the hub per agent and per room.

## Why it beats "Claude Code joins a chat room"
- **Claims stop duplicate work by design, not by advice.** The second agent gets a no.
- **Live activity from hooks:** you see which files each agent is touching right now.
- **Ask why:** anyone can question anyone's coding agent through Relay, and it answers from its own session.
- **Approvals carry the real diff,** and each yes is saved as a decision.

## Unknowns to test Friday
- Relay message injection into a Claude Code session we started ourselves, versus only sessions its broker launched.
- Whether Claude Code can receive pushed messages from an MCP server directly. Check the current Claude Code docs; if it can, pipe 2 could also go through our MCP server.
- How much Codex's hooks expose.
