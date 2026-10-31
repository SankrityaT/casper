# Saturday demo: meeting to shipped feature (draft, Oct 30)

One story, about 3 minutes. It uses every sponsor: Agent Relay (agents talking), Terse (claims, order, survives a crash), and boat or Superserve (computers).

## The story
1. **The call (30 s).** Sankritya and Kinjal on a short call: "Let's add X and Y to Casper, and announce it." The transcript lands in the room. Casper turns it into 3 task cards on the canvas: build X, build Y, announce it.
2. **The agents split the work (30 s).** Sankritya's Claude Code and Kinjal's Codex both see the cards. Each claims one. When both reach for the same card, only one gets it: "Jack already has that one". They agree through Relay: "I'm touching `api/tasks.ts`, you take the UI." The wire between them pulses on the canvas.
3. **Watch and ask (30 s).** Both coding agents are live on the canvas. Kinjal asks Sankritya's agent "why did you change the schema?" and it answers from its own run, without going through Sankritya.
4. **Review and ship (30 s).** "Needs Sankritya: review 2 changes", with the real diff. Approve, and it pushes and deploys. The feature shows up in Casper itself (it ships into the app we're demoing).
5. **The launch (30 s).** The marketing agent, on its own computer, opens the new feature, records a 10-second clip, and drafts the post. "Needs Kinjal: post this?" Approve. It posts from a demo account.
6. **Lazarus (15 s).** Kill the server and restart it on stage: "Lazarus brings the room back." The room, the claims and the history come back exactly as they were.

## What's real vs. prepared
| Step | Real on stage | Prepared beforehand |
|---|---|---|
| Call | A real 30-second call | Fallback: a recorded transcript dropped into the room (Zoom or Granola export) |
| Splitting | Claims in the Terse actor, messages on Relay | Tasks chosen so each takes the agents under 2 min |
| Coding | Claude Code and Codex running for real | Two tiny features picked and tested Friday night; the repo snapshot is ready |
| Ship | Push and deploy from an approval | Deploy hook set up (Vercel) |
| Launch | The agent records and drafts on its computer | A demo X account, already logged in |
| Crash | Real restart | None |

## Where the coding agents run
- **Option A, laptops:** Claude Code and Codex on our own laptops, joined to the room through Relay's MCP tools. This is Relay's main use case. We show their messages and claims, but no live computer.
- **Option B, cloud computers:** each coding agent runs in its own boat or Superserve computer (boat includes Claude/Codex). Everyone can watch it live and take over.
- **Pick:** B if the Friday test passes (it looks much better), A as the fallback.

## Biggest risks
- **Agents are slow or wrong live.** Keep the features tiny, and have a pre-recorded run ready.
- **Posting to X from a VM gets blocked.** Fallback: show the drafted post and skip posting.
- **Too many moving parts for 5 hours.** Cut order if late: 5 (launch), then 3 (ask why). Never cut 2 (agents splitting the work) or 6 (killing the server).
