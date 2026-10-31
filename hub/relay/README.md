<!-- created by kinjal -->
# hub/relay and hub/computer: runbook

Kinjal's lane. Everything reads the root `.env`. Events use the shared shape
`{seq?, room, kind, from, text, ts, meta}`. They always go to `hub/relay/out.jsonl`, and when
`HUB_URL` is set they also go to the hub at `POST /room/:room/post`.

## Cast (product Relay workspace, `RELAY_WORKSPACE_KEY`)

| agent  | who                 | runs on                                                                 |
| ------ | ------------------- | ----------------------------------------------------------------------- |
| jack   | Sankritya's coder   | `agents.ts` (Claude loop) or a real Claude Code via the hub's summon     |
| batty  | Kinjal's coder      | `agents.ts` (OpenAI loop) or real Claude Code on its own boat VM desktop |
| wick   | growth / launch     | agent-browser on a boat VM (`hub/computer`)                             |
| casper | room host           | relays human words to agents ("Kinjal: ...")                            |

## One-time setup

```sh
cd hub/relay && bun install && bun run setup      # registers agents, room-<slug> channels, observer token
cd hub/computer && bun install && bun run boat-setup   # wick's VM: agent-browser + composer + stream relay
```

## Run (each in its own terminal)

```sh
cd hub/relay    && bun run mirror     # Relay -> out.jsonl + hub (kind msg for room posts, relay for DMs, meta.to)
cd hub/relay    && bun run bridge     # hub -> agents: human room msgs with meta.to/mode become Relay DMs
cd hub/computer && bun run start:boat # :8791, WS /computer/:agent/stream, Take over, bell on risky clicks
cloudflared --config /tmp/empty.yml tunnel --url http://127.0.0.1:8791   # put the URL in COMPUTER_PUBLIC_URL
```

## Demo beats

```sh
cd hub/relay    && bun run agents     # jack + batty claim the hub's meeting cards, negotiate, post steps
cd hub/relay    && bun run steer jack "keep autopay off by default"   # or type @jack in the web room (Steer)
cd hub/computer && bun run wick       # wick drafts the launch post on its VM, Post rings the bell
cd hub/computer && bun run approve <askId>   # or Approve in the web room as ?me=kinjal
```

## Real Claude Code on a VM desktop (batty)

1. Create the VM: `POST https://boat.dev/api/v1/sandboxes {"ttlSeconds":14400}`, then save `{id}` to
   `hub/computer/.state/boat-batty.json`.
2. Clone the repo in the VM with git credentials.
3. Run `bun run desk-setup batty`. It starts `vm/screen.js` (the whole desktop as JPEG frames on :9402, xdotool
   input), publishes the port, writes `~/.casper-env` and knocks `~/casper` into the room (MCP + push gate, approver kinjal).
4. Open a terminal on the desktop that runs Claude Code with the task (`~/run-batty.sh`), then
   `curl -X POST localhost:8791/computer/batty/announce` so the room shows the stream.

## Backup clips

`bun run record.ts --agent wick --out /tmp/wick.mp4` (in hub/computer) saves an agent's computer stream as an mp4.

## Gotchas

- The Relay observer WebSocket (`/v1/ws`) fails with 1006, so the mirror falls back to polling `GET /v1/workspace/events?since=N`.
  The parameter is `since`, not `since_seq`.
- The Relay event log drops DM recipients and metadata. Senders call `recordConv()`, and the mirror and agents read `.state/convs.json`.
- agent-browser binds its stream to 127.0.0.1, so on boat `relay.js` forwards it to 0.0.0.0:9401 before it's published.
- If `pkill -f <name>` appears inside a boat command, it matches its own shell, so use pidfiles.
- ANTHROPIC key 1 returns "Credit balance too low" inside Claude Code; use key 2.
