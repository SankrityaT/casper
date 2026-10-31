# Vercel Labs: agent-browser and agent-desktop (Oct 31)

Read from the READMEs only; nothing tested. Both are Apache-2.0, Rust CLIs, installed with npm, and pushed today.

## agent-browser (~45k stars): use it
A browser CLI for agents. `snapshot` returns the accessibility tree with refs (`@e2`); the agent acts on a ref, then
snapshots again. It also ships an MCP server (`agent-browser mcp`) whose typed tools show clear approval prompts.

What maps onto Casper:
| agent-browser | Casper |
|---|---|
| Every session streams its viewport over a WebSocket (JPEG frames with a `seq`) **and accepts input events** ("pair browsing") | The live view on an agent's card, and **Take over**. Any number of viewers. 640×360 at quality 20 is ~9 KB a frame |
| `--confirm-actions`, `--action-policy policy.json`, `confirm` / `deny` | The cord: risky browser actions wait for the bell |
| `--allowed-domains` (also blocks WebSockets, beacons, WebRTC) | Per-agent "where it may go", set on the cord |
| Auth vault (encrypted; the model never sees passwords), `state save/load`, persistent profiles | Secrets module: log the demo X account in once, reuse it |
| `record start demo.webm` | Wick's "record 10 s" beat; a recording for the Devpost backup |
| `--content-boundaries`, `--max-output` | Page text is marked untrusted; prompt-injection hygiene |
| Dashboard (live view + activity feed, port 4848) | A reference for the agent card. Don't ship theirs |
| `@agent-browser/sandbox` on `@vercel/sandbox` | Another Runner option later |

Plan: install it in the boat snapshot next to Chrome. The agent drives the browser through its MCP. The hub relays the
stream into the room (the session port stays inside the VM). This could replace boat's 60fps desktop embed for
browser-only work, and it removes the "two viewers" risk.

## agent-desktop (~2.9k stars): skip this weekend
The same snapshot/ref loop for native desktop apps, through the OS accessibility tree (macOS, Windows, Linux with
at-spi2). Our agents work in a browser and a terminal, so we don't need it.

Worth knowing: it ships a **`jev-desktop` skill built on TypeSafe/Jev** (one operation plus a target per turn, with a
confidence score, `api.typesafe.ai`, `TYPESAFE_API_KEY`). Two lessons for Stretch:
- Jev is used for fast "which one, how sure" decisions, the same shape as our triage.
- Their privacy note: every call sends what's on screen to TypeSafe. Our triage sends message text the same way, so send
  only the message plus agent names and territory lines. Never send DM or private-room content outside its scope
  (origin sticks).

## Rule check
Both are outside libraries. Add them to the organizer question alongside gbrain and Jev.
