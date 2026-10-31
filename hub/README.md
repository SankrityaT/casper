# Casper hub

Stateless Bun + Hono server in front of one Terse durable actor per room (`src/actors.ts`).

```
bun install
bunx durable-actors dev          # local Terse runtime on :7100, state in .durable-actors/
bunx durable-actors generate     # typed client in generated/
bun server.ts                    # hub on :8790
cloudflared --config /tmp/empty.yml tunnel --url http://127.0.0.1:8790   # public URL
```

`.env`: `DURABLE_ACTORS_CONTROL_PLANE_URL=http://127.0.0.1:7100`, `PORT=8790`.
Routes are listed at the top of `server.ts`.
