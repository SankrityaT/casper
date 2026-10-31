# What breaks at scale: full audit (Oct 31, before the build)

Three passes over everything:
- the web app under stress, tested in Chrome: long text, many items, and 320–2560px screens;
- the client's state and performance, partly measured;
- the backend plan in `design/architecture.html` and `docs/`.

Nothing was changed in `web/`. Test scripts are in `/tmp/audit/` and `/tmp/casper-audit/`; screenshots are `/tmp/audit-*.png`.

Severity labels: **demo** = it will bite during the build or on stage. **build** = settle it before wiring the backend.
**scale** = it matters with real companies.

---

## 1. Decide before coding (backend)

| # | Problem | Fix |
|---|---|---|
| 1 | **The plan covers more than the build time (demo).** The "One run" walkthrough has 16 steps, and the build order only covers about half of them. | Boat is the heart of the demo, so it's built first (Kinjal, from 11:00). Demo = run steps 1–4, 9–12 (Salem's computer: live view, Take over, the bell), 13 and 16. Check at 12:00 and 1:00, and use the fallback ladder in architecture §6. Steps 5–8, 14 and 15 are stretch or slides. |
| 2 | **Killing the hub on stage drops more than we assumed (demo).** The hub holds MCP sessions, approval calls that block waiting for an answer, the Relay observer, the boat pollers and the agent-browser stream. Browser grants are single-use and last 60 s. | Run MCP stateless, with no session id. Approvals return "pending" right away and "approved" arrives later. Run the tunnel as its own process. Rehearse `kill -9` with live agents connected. |
| 3 | **The Relay MCP needs the workspace (admin) key, and Relay has no per-channel limits (demo + scale).** A plain idle `claude` session also won't start a turn when a message arrives. | Agents never get a Relay key. The hub delivers each agent's inbox through the prompt hook. *(Already changed in architecture §5.)* |
| 4 | **The boat trial blocks the plan (demo).** It allows 2 VMs, 2 h max, and no saved snapshots, but our flows use `boat new --from casper`. | Pay the $20 plan (Sankritya's call: it needs a card). Build the snapshot tonight. Create the demo VMs less than 2 h before judging. |
| 5 | **The Room actor handles one call at a time, and each write is about 100 ms durable (demo, mild; scale, hard).** That's roughly 10 writes/s. 30 agents' hook events alone hit that, so claims and approvals queue behind them. `@Emittable` resends the whole summary on every change. | The Room keeps only coordination writes: tasks, claims, approvals, chat. Hook and VM progress go to the Agent actor (sent 1–2 times a second at most) or to screens with no write (`broadcast`). Take `lastSeq` out of the emitted summary. Cursors go through a separate presence actor. |
| 6 | **Approvals are only advisory (demo + scale).** A laptop agent can `git push` without asking. In a VM the agent can confirm its own agent-browser action. An approval isn't tied to the diff. | A PreToolUse hook blocks `git push` unless the hub holds an approval for that exact SHA, and fails closed if the hub is down. Only the hub sends agent-browser confirms. *(Added to the §5 hooks.)* |
| 7 | **Jack and Salem share Sankritya's Claude plan (demo).** They share one rate limit, and tonight's tests eat into it. | Check remaining quota before judging and keep a spare token. Check that the plan's terms allow it to run inside a hosted product. |
| 8 | **Jev's numbers aren't measured (demo).** It's about 68% accurate and leans toward the first option. The ~100 ms is the vendor's claim. Take over crosses US→EU, so expect 300–500 ms of lag. | Route by keyword against the territory index first, with Jev only as a tiebreak. Put `none` first among the options. Only quote numbers we measure. |
| 9 | **Memory can leak despite "origin sticks" (scale).** An agent's context holds everything its *owner* can see, but it speaks to the whole room. Summaries, "updates" links, gbrain synthesis, embeddings, Jev context and observer copies of DMs are all leak paths. If filtering happens after search, a top-10 full of private results comes back empty. | Inject memory using the intersection of everyone who can see where the agent will speak. Filter by a scope column *before* ranking. Build summaries only from wing-public facts. Scope broadcasts with socket tags. Never send scoped text to Jev. |
| 10 | **The event log grows forever (scale).** A hot room writes about 290 MB a day. Terse blocks VACUUM, and actors can't be deleted. | Split the log into per-day segment actors, archive old events to Postgres, and have `since()` fall back to the archive. |
| 11 | **Copying from Relay into the room isn't exactly-once (scale).** N hubs means N observers, each copying every message, and the hub sees echoes of its own messages. | Take event ids from the source: Relay message id, session + `tool_use_id`, boat event id. Run one observer and one poller per workspace under a lease, with the cursor in the Org actor. |
| 12 | **Claims never expire (build).** | Give claims a lease that hooks renew. When it expires, mark the task "stale" and ask a person; don't silently reopen it. Make `onAlarm` idempotent. |
| 13 | **Lazarus can't resume an agent's turn (build).** Terse stores state; it doesn't replay execution. | Only claim that the *room* comes back. VM agents use `claude --resume`. |
| 14 | **Secrets are exposed in the VM (scale).** The OAuth token is in the VM's environment, so any prompt-injected shell command can read it. Passing it on a command line leaks it the same way as Relay issue #1889. Nobody owns the encryption key. | Saturday: pass the token through the SDK and store nothing. Later: envelope encryption, a token proxy outside the VM, `--allowed-domains`, and treat other agents' messages as untrusted. |
| 15 | **gbrain on PGLite won't scale (scale).** One writer, about 50K pages, one host. Calling the CLI on every prompt adds seconds. Keyless mode has no vector search. | Run `gbrain serve` as a long-running process now. Move to Postgres + pgvector with a scope column later. |
| 16 | **Cost (scale).** VMs are about $26/month per always-on agent. Frames through the hub are about 0.7 Mbps per viewer; 300 streams is about $9/h in egress. Jev costs almost nothing. | Stream only while someone is watching, at 5 fps. Give viewers short-lived direct `boat host` URLs instead of proxying through the hub. |

Contradictions fixed tonight:
- §5 said Vite; the app is Next.js.
- The join command used a Relay MCP and the `rt_` token prefix (the real prefix is `at_live_`).

Contradictions still open:
- `memory.md` says memory lives in actors, but `knowledge.md` says gbrain.
- FLOWS gives the launch to Wick; RUN gives it to Salem.

---

## 2. Client data model (settle before wiring realtime)

**Measured bugs:**
- Saving message 0 in #refunds-v2, then switching rooms, shows #incidents' message 0 as saved. Keys are array indexes.
- Creating a room, going to `/` and back to `/app` crashes at `data.tsx:261`.
- Naming a new room `refunds-v2` silently wipes that room's history.

| Problem | Where | Fix |
|---|---|---|
| Messages have no ids. List keys, reaction keys, `THREAD_OF` and `ATT` are all positions | `Workspace.tsx:168,469,478`, `data.tsx:72,127,205`, `Chat.tsx:120-131` | Key everything by server `msg.id`. Keep per-user flags in a store keyed by `msgId` |
| Imported objects get mutated during render (`P`, `SCRIPT`, `ROOMS`, `SHORT`, `REPLY`) | `room.tsx:11` → `data.tsx:251-262`, `Workspace.tsx:180-182,572` | An immutable seed plus one store. The server assigns room ids and rejects duplicate slugs |
| Sending has no id, nonce, pending/failed state or seq. Agent replies are faked with `setTimeout` | `Workspace.tsx:223-233` | Client nonce → pending → server ack `{clientId,id,seq}`; mark failed with a retry |
| Approvals are local. Two approvers both "win", "Not now" isn't wired, and the countdown restarts on every remount | `Workspace.tsx:214,460,533`, `Chat.tsx:41-47` | `Ask {id,status,version,deadlineAt,decidedBy}`. Decisions are compare-and-set on `version`; the loser sees "Approved by X" |
| **XSS:** agent names go into `innerHTML` unescaped | `Agent.tsx:23`, `cast.ts:322-323` | Escape them, or render the SVG with React |
| Every keystroke re-renders the whole room. At about 600 messages: ~96 ms per keystroke, 42k DOM nodes, 254 MB heap | `Workspace.tsx:221` | Keep the draft inside `Composer`, wrap `Bubble` in `memo`, virtualize the list (anchored to the bottom) |
| Every avatar runs about 7 infinite animations plus a turbulence filter: 376 animations at idle, 776 after 40 replies | `cast.ts:324` | `still` sprites in lists; animate only the agent that's speaking |
| O(n²) reply counts. ⌘K search rebuilds its index on each keystroke and only searches the script. FindBar walks the DOM, which can't work once the list is virtualized | `Workspace.tsx:434,461,539`, `Overlays.tsx:21-32`, `FindBar.tsx:34-71` | Reply and unread counts become server fields. Search and find run on data; history search runs on the server |
| Every new message scrolls to the bottom, even while you're reading history | `Workspace.tsx:218` | Stick to the bottom only when already near it; otherwise show an "N new" pill |
| Typing is a single `who`, and it shows *you* typing | `Workspace.tsx:485` | `Map<userId, expiresAt>` per room, sends throttled, "several people are typing" |
| Mentions: only the first `@\w+` is parsed, by display name. `Salem-2` won't route; duplicate names collide | `Workspace.tsx:226-227` | Store mentions as id tokens |
| The session has no version. An old saved shape crashes. Tabs drift apart. The onboarding room is ignored | `lib/session.ts:43`, `data.tsx:252`, `Workspace.tsx:58` | Add `version` and migrate on load; listen for the `storage` event |
| Contact API: unbounded body, no rate limit, logs personal data | `app/api/contact/route.ts:3,10` | Cap the body size, rate-limit by IP, stop logging the payload |
| Accessibility: sidebar `<a>` tags have no href. Sheets have no dialog role, focus trap, focus restore or Esc. Chat has no `aria-live` | `Workspace.tsx:276-286,448` | Use buttons or links, a dialog pattern, and `role="log"` |
| Later: uncleared timeouts, `href={x.url}` not validated, slug can come out as `-`, the Cast generator is copied into about 8 route bundles, seed data is in a client file | various | GSAP cleanup is fine (0 leaked listeners after 150 room switches) |

**Store for tomorrow** (Zustand, or `useSyncExternalStore`), normalized:
- `rooms[id] {slug, topic, lastSeq, readSeq, unread}`
- `msgs[id] {roomId, threadRootId?, authorId, body, mentions[], seq, editedAt?, deletedAt?, replyCount, reactions{emoji:{count,mine}}}`
- `order[roomId|threadRootId]: msgId[]`, sorted by seq
- `asks[id] {status, version, deadlineAt, decidedBy}`
- `presence[roomId]: Map<userId,{typingUntil,lastSeen}>` in its own fast-changing slice
- `people/agents[id]`

How events apply:
- Dedupe by id and insert by seq.
- If there's a gap in seq, fetch `since(lastSeq)`. On reconnect, resume each room from its `lastSeq`.
- Edits, reactions and decisions are idempotent patches that carry a `version`.
- Components subscribe per row with selectors.

---

## 3. Layout under stress (verified in Chrome)

Passed: 500 messages, 60 rooms, 30 reaction chips, 50 approval cards, 200 Library rows, Arabic, CJK and emoji text,
toasts, the find bar, and the hover menus. No horizontal page scroll on any route from 320 to 2560px.

**Demo blockers**
1. **`/app` has a 1100px minimum width and clips instead of scrolling** (`Workspace.tsx:251` + `overflow-hidden` in `room.tsx`). At 1024px the send button is cut off; at 375px you only see the sidebar. → use `overflow-x-auto`, or a "best on desktop" screen below 1100px.
2. **The chat column grows over the inspector** (`.ws .main` uses an implicit `auto` column). It happens with default content at 1100–1200px, with a long room name, or with 40 faces in the header. → `.ws .main{grid-template-columns:minmax(0,1fr)}`; ellipsis plus `min-width:0` on `.head h1`; cap the face stack at 6 plus "+N".

**Should fix** (mostly `app/workspace.css`)

| Where | What breaks | Fix |
|---|---|---|
| `.m p`, `.inline-th p`, `.sm-hello p` | A 120-character word overflows. The thread panel scrolls to 723px inside a 359px panel | `overflow-wrap:anywhere`; `min-width:0` on `.inline-th .ir>div` |
| Approval card `.a-title`, `.a-top`, `.checks` | Text is clipped, and the countdown timer gets cut off | wrap rules; `flex-wrap` on `.a-top`; ellipsis on `.timer` and `.bellpill` |
| `.who small` | A summoned agent's whole job text becomes a tall column next to its name | ellipsis; truncate `job` (`Workspace.tsx:180`) |
| `.src b` (source chip) | Text spills 217px past the chip | `min-width:0` |
| `.sh2`, `.mdb`, `.pdfc .pm>div` | Long file paths and markdown get clipped | ellipsis span, `overflow-wrap:anywhere`, `min-width:0` |
| `.rxtip .rxfaces` | With 30 reactors the tooltip is about 600px tall and sits off the top of the screen | wrap; show 8 faces plus "and N others" |
| `.popup` (@ mentions) | Its top is off-screen at 1280×600; long names overflow | `max-height:min(320px,50vh);overflow:auto`; ellipsis |
| `.nav a` (sidebar) | Long names push the status dot out of view | label span with ellipsis |
| `.ih` (inspector header) | A long agent name hides the close button | `min-width:0` plus ellipsis |
| New room slug | No length limit; the preview scrolls sideways | cap at about 40 characters |
| `.gr b/small` (Bell, Library) | Long words run under the buttons | `overflow-wrap:anywhere` |
| `.agrid`, `.scopes`, `.nr-seeds`, `.sm-looks`, `.sm-runs`, `.vgrid`, `.gr.stats` | One long name made one column 463px and the others 162px | `minmax(0,1fr)` |
| `.answer p` (search), `.pk-h`, `.pk-link span` (source viewer) | Clipped, or scrolls sideways | `min-width:0` plus wrap rules |
| `.sel-menu` | No height or width cap | `max-height:50vh;overflow:auto;max-width:min(360px,90vw)` |
| Canvas `.agent .tag`, `.doing`, `.msg` | No-wrap labels overlap other nodes | `max-width:180px` with ellipsis |
| Hero at 375×560 | The speech bubble covers the command box | hide the bubble on short screens |

Rule for all new components tomorrow: every flex or grid child that holds text gets `min-width:0`. User text gets
`overflow-wrap:anywhere`. Single-line labels get ellipsis. Grids use `minmax(0,1fr)`. Popovers get `max-height` plus
`overflow:auto`.
