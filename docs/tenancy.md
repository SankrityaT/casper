# Casper: workspaces, spaces and roles (draft, Oct 30)

Goal: a company is one workspace, and each team gets its own space. People see only the spaces they're in, with view or edit rights. It's small enough to sketch on Saturday, and the shape is right for later.

## The levels
```
Org (Acme)                       one per company. Billing, SSO later, org admins
 └─ Space (Engineering)          one per team. Private by default
     ├─ Room (#autopay-launch)   one per project: canvas + threads + computers
     ├─ Agents                   each belongs to a person (owner) and is added to spaces
     ├─ Computers                each belongs to one agent
     └─ Memory + decisions       per space. Org-wide memory is opt-in
Shared room (Acme ↔ Northwind)   later: a room two orgs both join; each side brings guests
```

## Roles (per space)
| Role | See rooms | Draw / move / summon | Approve | Take over computers | Invite / change roles |
|---|---|---|---|---|---|
| Owner | yes | yes | yes | yes | yes |
| Editor | yes | yes | asks aimed at them | their own agents' computers, others with the owner's ok | no |
| Viewer | yes | no | no | no (can watch) | no |
| Guest (person) | only rooms shared with them | in those rooms | asks aimed at them | no | no |
| Org admin | the list of spaces, not their contents (unless added) | no | no | no | can add themselves (logged) |

Agents get a role too, set on the cord: **Can read** (follows the room, answers questions), **Can act** (claims tasks, uses its computer), **Asks first for** a list (push, pay, post, email). An agent can never have more rights than its owner has in that space.

## Where it lives in the build
- **Terse actors:**
  - `Org` (members and spaces list)
  - `Space` (members, roles, agents, memory index)
  - `Room` (log, claims, locks, approvals, alarms)
  - Every write goes through the actor, which checks the caller's role first. That's one `can(user, action, resource)` function shared by all three.
- **Agent Relay:** one Relay workspace per org. Each space is a channel prefix (`eng/`), and each room is a channel (`eng/autopay-launch`). The hub mints each agent's token with only the channels of the spaces it was added to. A DM across spaces is refused by the hub.
- **Computers (boat or Superserve):** each VM is tagged `org/space/agent`. Live-view links are minted per viewer after a role check, and expire fast (boat 10 min, Superserve 60 s).
- **Memory (gbrain):** one brain per space. Casper answers only from the spaces the asker can see, and it names the source.
- **Auth:** Supabase Auth for people (sponsor credits). Agents authenticate with hub-minted tokens, never people's sessions.

## Saturday scope
- Real: one org, two spaces (Engineering, Growth), roles Owner / Editor / Viewer enforced in the actor's `can()`. The Growth agent (Wick) is added to one Engineering room with **Can read**, which shows that spaces are walled off.
- Drawn but not built: guests, org admin, shared rooms across companies, SSO.

## Usage and spend (designed in `design/settings.html` → Usage and spend; build later)

What we count, per space, rolled up to the org:
- **Model usage.** Every model call the hub makes, for Casper and for agents running on our computers, is written to the Space actor as `usage {agent, owner, model, tokens_in, tokens_out, cost_usd, at}`. The cost comes from a price table per model.
- **Computers.** boat or Superserve seconds per VM, times the plan rate. These are polled from the provider and written as `usage {agent, vm, seconds, cost_usd}`.
- **Agents people bring on their own plan** (Claude Code or Codex on a laptop): shown, but **not billed to the org**. Claude Code can export token and cost metrics (OpenTelemetry), which the join command can switch on. What Codex reports is unknown, so check before promising it.
- **Org view:** org admins see totals per space and per person, but not what's inside private spaces.

Spending limits are **off by default**, and only an Owner turns them on:
- a monthly limit per space, a daily limit per agent, and a warning at 50, 80 or 90%
- when a limit is hit, either pause agents and ask an Owner, or just warn. The current step finishes first, so nothing stops halfway through a refund.
- The Space actor checks the running total before each model call or VM start, using the same `can()` path as roles. Its alarm sends the warnings.

Saturday: record usage events for real if there's time (it's cheap and makes a good "kill the server, totals survive" moment). Limits stay drawn only.
