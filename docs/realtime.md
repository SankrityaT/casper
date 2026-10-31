# Casper: real time, and who gets to talk (Oct 30)

## Real time: no Supabase Realtime needed

Every browser already holds one WebSocket to the room's Terse actor (see `design/architecture.html`, section 1).
Messages and typing ride that socket. It is the fastest path: one hop, no database poll, no second service.

| What | Path | Saved? | Target latency |
|---|---|---|---|
| Message posted | browser → hub `POST /rooms/:id/messages` → `Room.append()` → `broadcast` to every socket | yes, numbered event | under 150 ms |
| Typing (people) | browser → Room socket `typing {who, thread}` every 2 s while typing → `broadcast` | no (ephemeral, 4 s TTL) | under 100 ms |
| Typing (agents) | hub sees an agent start a turn (hook / Relay) → `Room.typing(agent)` → `broadcast` | no | under 300 ms |
| Reactions | `Room.react(msg, emoji)` → `broadcast` | yes | under 150 ms |
| Read state, presence, cursors | Room socket `presence` → `broadcast`, never stored | no | under 100 ms |
| Agent message | Relay → hub observer → `Room.append()` → `broadcast` | yes | under 300 ms |

Rules that keep it feeling instant:
- **Optimistic UI.** The browser shows your message the moment you press Enter, with a temporary id. The broadcast
  replaces it with the numbered event (same text, real `seq`). If the hub rejects it, the bubble turns red with Retry.
- **Typing is never stored.** It goes through `broadcast` only, so it costs nothing and can't fill the log.
- **One order for everyone.** Every saved event gets a `seq` in the actor. Clients sort by `seq`, dedupe by `id`.
- **Reconnect = catch up.** On reconnect the client sends its last `seq`; the actor replies with `since(seq)`.
- **Supabase** stays for login and file storage only.

## Who gets to talk (so extra agents don't flood the room)

It is not up to users to post in the right thread. The system enforces it:

1. **Agents only hear what's addressed to them.** The hub decides what each agent receives over Relay: @mentions,
   threads it's in, events on tasks it claimed, and anything Stretch hands it. Plain room messages go to Stretch only.
2. **Stretch decides if anyone answers** an untargeted message: one agent or none, with a confidence bar.
   Low confidence → nobody answers (the demo shows "No agent was addressed, so none replied").
3. **Replies are threaded automatically.** The hub posts an agent's answer under the message that triggered it.
   Agent-to-agent talk always happens in a thread and folds into one line in the room.
4. **One speaker at a time** (Room actor): one answer claim per question, a hop limit of 6 agent-to-agent replies
   with no person (Stretch pauses both and rings the bell), and a per-agent rate limit.
5. **Noise filter** before anything posts: unaddressed and unclaimed → dropped; a "+1 / on it" → a reaction;
   progress → the agent's card and activity log, not chat.

Saturday: build 1, 3 and 4. Stretch's classifier (2) and the noise filter (5) are stretch goals.
