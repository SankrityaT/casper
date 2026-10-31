# Casper: edge cases

Draft, Oct 30. Each case says what the person sees and what the system does underneath.
"Build Sat" marks what has to work in the demo. The rest goes in the pitch, or comes later.

How the parts are named below:
- **Room actor**: the Terse actor that holds the room's numbered event log, claims, locks and alarms.
- **Hub**: our small server. It holds the Relay workspace key, runs agent loops, and talks to boat.
- **Relay**: carries messages between agents and people.
- **Computer**: an agent's boat VM.

---

## 1. Bringing in a new agent

| Case | What you see | Underneath | Build Sat |
|---|---|---|---|
| You summon one (draw a circle) | It rises out of the circle and gets a card | Hub registers it on Relay; actor logs `agent.joined` | yes |
| A friend brings their own agent into your room | Invite link. It walks in through the "front door" with the owner's name on it, marked **Guest** | Hub gives it a Relay token scoped to this room only. The owner of the room approves before it can act | yes (Kinjal's Batty is exactly this) |
| It joins halfway through a task | It doesn't ask "what's going on". Casper hands it a short catch-up note | Actor replays the log since it joined, or Casper summarizes it | yes |
| Two agents with the same name | The new one gets a suffix, and you can rename it | Names are unique per room in the actor | no |
| It has no computer yet | It can talk and answer. Web jobs show "Needs a computer" with a Draw-a-frame hint | Tasks that need a VM are held | yes |
| No computers left (plan limit) | "All computers are busy", with an option to free one | boat trial allows 2 at once, the paid plan 100 | no |
| A guest agent from another company | It can only see what's shared with it, and can't start actions without the host's yes | Guest messages are marked, and actions from guests need approval (also covers prompt injection) | pitch |

## 2. An agent stops working

| Case | What you see | Underneath | Build Sat |
|---|---|---|---|
| Stuck: no progress on its computer | Worried face, card "No progress for 2 min on the Stripe login page" with **Steer / Take over / Stop** | Actor alarm checks the time since the last boat event | yes |
| Its run fails | "Couldn't finish." It says the last step done and what it did **not** do, plus **Try again** | boat prompt status `failed` → actor logs it | yes |
| Crashed mid-action on money (refund sent, not logged) | "Check this: it may have refunded jess.m" instead of a silent retry | Action ids are deduped. Unknown outcomes are flagged, never retried blindly | yes (say it in the pitch, it's a strong moment) |
| Computer went to sleep (time limit) | Its screen greys out, "Computer is asleep", **Wake** | boat auto-stops after the time limit. `resume` takes seconds, but open apps don't survive | yes |
| Live screen link expired | Nothing visible, it reconnects by itself | boat desktop links must be opened within 10 min, so we fetch a fresh one on every reconnect | yes |
| Model key missing or rate-limited | "Jack needs a model key" sent to its owner | boat returns `provider_not_configured` / 429 | no |
| Agent drops off Relay | Shows **Offline**. Messages to it show "waiting" and arrive when it's back | Relay keeps the inbox | yes |
| Our server restarts | Room looks the same after a moment | The room state lives in the actor, not the server. Agents re-register | pitch (great Terse moment: kill it on stage) |
| Its owner leaves | It keeps going within its rules. Anything needing a yes waits, or goes to the owner's phone | Approval cards stay open in the actor | no |

## 3. An agent wants something

| Case | What you see | Underneath | Build Sat |
|---|---|---|---|
| Needs a human yes | Card aimed at one person ("Needs Kinjal"), visible to everyone, with **Approve / Not now** | Actor holds the request. Only one approval counts, even if two people click | yes |
| Nobody answers | After a set time it asks the next person, or expires and says so | Actor alarm | yes |
| Needs a login or a 2FA code | It never asks for the code in chat. **Take over** opens its screen so a human types it, then it carries on | Human drives the boat desktop. The agent's turn is paused (`interrupt`), then resumed | yes |
| Needs a fact | Asks Casper first (team memory). If Casper doesn't know, asks one human, not the whole room | Relay DM to Casper, then one person | yes |
| Needs another agent's help | Sends it a note. If that agent is busy, the note waits in line | Relay DM or a Relay action | yes |
| Needs a computer | Card: "Salem wants a computer" → you draw a frame | | no |
| Several asks at once | "Needs you (3)" in the corner, oldest first | Actor keeps an ordered list | no |

## 4. Agents talking to each other

| Case | What you see | Underneath | Build Sat |
|---|---|---|---|
| A message to "the room" | Only one agent answers, the right one | Only @mentioned agents reply. For untargeted messages, a router picks one or none (Jev's best use) | yes |
| Two agents ping-pong forever | After 6 back-and-forths with no human: "Jack and Batty have gone back and forth 6 times. Step in?" and both pause | Per-thread hop limit in the actor (also caps cost) | yes |
| Two agents grab the same task | Only one gets it. The other is told "Jack already has it" | Claim-once in the actor (one request at a time) | yes (the Terse founders' own story) |
| Two agents touch the same thing (same charge) | The second one waits | A lock per resource in the actor, plus idempotency keys | no |
| They disagree ($500 vs $1,000 limit) | A "They disagree" card showing both sources. A person picks, and Casper remembers the answer | | pitch |
| Message to a sleeping agent | "Luna is asleep until 2 AM. Wake her?" | Relay inbox, actor alarm | no |
| One agent asks for another owner's private data | Jack asks Sankritya before sharing anything from his Gmail: **Share once / Always / No** | Owner approval per data source | pitch |
| Too much chatter | In chat, agent-to-agent talk folds into one row ("Jack and Batty talked, 4 notes"). On the canvas only the line pulses | | yes |
| Everyone sees a different order | Never happens: everyone sees the same order | Every event gets a number in the actor's log. Relay can send duplicates, so we dedupe | yes |

## 5. People edge cases

| Case | What you see | Underneath |
|---|---|---|
| Two people steer the same agent | "Kinjal is steering Jack". The second person gets "Ask to take over" | Steering lock in the actor |
| Both watch the same computer | Unknown: boat may hand the stream to the newest viewer. Test first. Fallback: each person sees their own agent's screen live and others see a still frame | boat stream behaviour, untested |
| Someone draws while someone else drags | Both show up live with named cursors, and there are no conflicts | Each stroke is a small event in the actor |

---

## The Saturday demo should show four of these on purpose
1. **Claim-once:** two agents reach for the same task and only one gets it.
2. **Needs you:** Batty asks Kinjal, he approves on his phone, and it continues.
3. **Stuck → Take over:** the agent hits a login, a human types the code, and the agent carries on.
4. **Kill the server:** restart our server on stage. The room comes back exactly as it was, because it lives in the Terse actor.
