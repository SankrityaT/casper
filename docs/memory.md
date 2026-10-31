# Casper: memory, and who can see it (Oct 31)

Five layers. An agent never reads more than its owner could, and every read is logged.

| Layer | What | Who reads | Who writes |
|---|---|---|---|
| 1 Yours | your notes, preferences, how you write | you + your agents while acting for you | you, or your agents with your OK |
| 2 Agent notebook | an agent's working notes from its runs | that agent; owner can inspect | the agent |
| 3 Room | threads, files, decisions in one room | everyone in the room (people, agents, guests until their pass ends) | anyone in the room |
| 4 Wing Library | settled decisions, team knowledge | wing members and their agents | Fatso files; anyone proposes, a person confirms |
| 5 Manor | company-wide knowledge | everyone in the org | owners promote from a wing |

Rules
- **Origin sticks (deterministic, no model judgement).** Every fact carries the place it came from. Anything learned in a
  private room or a DM can only ever be disclosed back in that same place. Facts derived from several sources inherit the
  strictest one. Moving a fact to a wider layer always takes a person (a "Share with the wing?" prompt), never the agent.
  This answers "how does it know what it can and cannot say": it doesn't decide, the origin does.
- Agents never read each other's notebooks. Agent → agent knowledge goes through the room (casper_ask over Relay), so it's visible.
- Human ↔ human DMs never enter the Library.
- Memory belongs to the room/wing, not to an agent: swap agents, keep the memory (exposed to any agent via MCP `casper_memory_search`).
- Reads are logged on the memory ("Read by Jack 2:06").

Backend: each layer is keyed in the actor that owns it (Space actor for wing/manor, Room actor for room, Agent actor for notebook, user record for "yours"). `casper_memory_search(q)` filters by the caller's layers before ranking, and appends a read event.

## Implicit knowledge (things people know but forget to share)
Fatso notices answers that keep getting given privately (the same question answered in 3 DMs or private rooms) and asks the
person who answered: "This came up 3 times. Share it with the wing?" One tap promotes it, with them as the source.
Nothing private moves without that tap.
