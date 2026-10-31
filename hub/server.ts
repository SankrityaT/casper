import { Hono } from "hono"
import { cors } from "hono/cors"
import { createBunWebSocket } from "hono/bun"
import type { ServerWebSocket } from "bun"
import { actors } from "./generated/index.js"
import type { RoomEvent } from "./src/actors.ts"

/* The Casper hub: stateless. Every write goes to the room's Terse actor (the source of truth, in order), then fans
   out to the browsers watching that room. Kill this process and restart it: the actor still has the log, the claims,
   the bell and hush, and every browser resumes with since(lastSeq).

   POST /room/:room/claim   {task, agent}            -> 200 {ok:true, owner} | 409 {ok:false, owner}
   POST /room/:room/post    {from, text, kind, meta}  -> 200 event (any kind; relay events too)
   POST /room/:room/hush    {target, on, by}          -> 200 event
   POST /room/:room/answer  {askId, yes, by}          -> 200 {ok, status, decidedBy} | 409 when already decided
   GET  /room/:room/events?since=N                    -> event[]
   GET  /room/:room/summary                           -> {lastSeq, claims, hushed, openAsks}
   WS   /room/:room/socket?since=N                    -> backlog, then each event as it happens */

const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>()
const app = new Hono()
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"], allowHeaders: ["content-type", "authorization"] }))

const ROOM_ID = /^[A-Za-z0-9._-]{1,64}$/
const room = (r: string) => {
  if (!ROOM_ID.test(r)) throw new HTTPError(400, "Bad room name.")
  return actors.Room.get(`room.${r}`)
}
class HTTPError extends Error { constructor(public status: number, msg: string) { super(msg) } }
app.onError((e, c) => c.json({ error: e.message }, (e instanceof HTTPError ? e.status : 500) as 400 | 500))

// who is watching which room
const watchers = new Map<string, Set<{ send: (s: string) => void }>>()
const fanout = (r: string, ev: RoomEvent | undefined) => {
  if (!ev) return
  const s = JSON.stringify(ev)
  watchers.get(r)?.forEach((w) => { try { w.send(s) } catch { /* closed */ } })
}

const body = async (c: { req: { json: () => Promise<unknown> } }) => {
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b || typeof b !== "object") throw new HTTPError(400, "Send a JSON body.")
  return b
}
const str = (v: unknown, name: string, max = 4000) => {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new HTTPError(400, `${name} is required.`)
  return v
}
const KINDS = new Set(["msg", "claim", "bell", "hush", "relay", "computer", "approve"])

app.get("/", (c) => c.json({ ok: true, service: "casper-hub", rooms: [...watchers.keys()] }))
app.get("/health", (c) => c.json({ ok: true }))

app.post("/room/:room/claim", async (c) => {
  const r = c.req.param("room"), b = await body(c)
  const res = await room(r).claim(str(b.task, "task", 200), str(b.agent, "agent", 64))
  fanout(r, res.event)
  return c.json({ ok: res.ok, owner: res.owner, event: res.event }, res.ok ? 200 : 409)
})

app.post("/room/:room/post", async (c) => {
  const r = c.req.param("room"), b = await body(c)
  const kind = typeof b.kind === "string" && KINDS.has(b.kind) ? (b.kind as RoomEvent["kind"]) : "msg"
  if (kind === "claim" || kind === "approve" || kind === "hush") throw new HTTPError(400, `Use /${kind === "approve" ? "answer" : kind} for ${kind}.`)
  const ev: RoomEvent = {
    room: r, kind, from: str(b.from, "from", 64), text: typeof b.text === "string" ? b.text.slice(0, 8000) : "",
    ts: typeof b.ts === "number" || typeof b.ts === "string" ? b.ts : Date.now(),
    id: typeof b.id === "string" ? b.id : undefined,
    meta: b.meta && typeof b.meta === "object" ? (b.meta as Record<string, unknown>) : undefined,
  }
  const out = await room(r).append(ev)
  fanout(r, out)
  return c.json(out)
})

app.post("/room/:room/hush", async (c) => {
  const r = c.req.param("room"), b = await body(c)
  const out = await room(r).hush(str(b.target, "target", 64), !!b.on, typeof b.by === "string" ? b.by : "someone")
  fanout(r, out)
  return c.json(out)
})

app.post("/room/:room/answer", async (c) => {
  const r = c.req.param("room"), b = await body(c)
  const res = await room(r).answer(str(b.askId, "askId", 128), !!b.yes, typeof b.by === "string" ? b.by : "someone")
  fanout(r, res.event)
  return c.json(res, res.ok ? 200 : 409)
})

app.get("/room/:room/events", async (c) => c.json(await room(c.req.param("room")).since(Number(c.req.query("since") ?? 0) || 0)))
app.get("/room/:room/summary", async (c) => c.json(await room(c.req.param("room")).summary()))

app.get("/room/:room/socket", upgradeWebSocket((c) => {
  const r = c.req.param("room")
  const since = Number(c.req.query("since") ?? 0) || 0
  let me: { send: (s: string) => void } | null = null
  return {
    async onOpen(_e, ws) {
      me = { send: (s) => ws.send(s) }
      const set = watchers.get(r) ?? new Set(); set.add(me); watchers.set(r, set)
      try {
        const backlog = await room(r).since(since, 2000)
        if (backlog.length) ws.send(JSON.stringify({ events: backlog }))
      } catch (e) { ws.send(JSON.stringify({ error: String(e) })) }
    },
    onMessage(e, ws) { if (String(e.data) === "ping") ws.send("pong") },
    onClose() { if (me) watchers.get(r)?.delete(me) },
  }
}))

const port = Number(process.env.PORT ?? 8790)
Bun.serve({ port, fetch: app.fetch, websocket })
console.log(`casper hub on http://localhost:${port}`)
