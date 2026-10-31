import { Hono } from "hono"
import { cors } from "hono/cors"
import { createBunWebSocket } from "hono/bun"
import type { ServerWebSocket } from "bun"
import { actors } from "./generated/index.js"
import type { RoomEvent } from "./src/actors.ts"
import { meetingToTasks, triage } from "./src/ai.ts"

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

const wing = actors.Wing.get("wing.main")
const HUMANS = new Set(["sankritya", "kinjal", "you"])
const known = new Set<string>()
const listed = async (r: string) => { if (known.has(r)) return; await wing.ensure(r, "A room agents started"); known.add(r) }

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
  {
    await listed(r)
    if (ev.kind === "msg" && !HUMANS.has(ev.from.toLowerCase()) && ev.text && !(ev.meta && "triage" in ev.meta)) {
      const recent = (await room(r).since(Math.max(0, (await room(r).summary()).lastSeq - 6))).map((e) => `${e.from}: ${e.text}`)
      const v = await triage(ev.from, ev.text, recent)
      ev.meta = { ...(ev.meta ?? {}), triage: v }
    }
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

/* rooms in the wing */
app.get("/rooms", async (c) => c.json(await wing.list()))
app.post("/rooms", async (c) => {
  const b = await body(c)
  const info = await wing.create(str(b.slug, "slug", 80), typeof b.topic === "string" ? b.topic : "A new room", typeof b.by === "string" ? b.by : "someone")
  known.add(info.slug)
  const hello = await room(info.slug).append({ room: info.slug, kind: "msg", from: "casper", text: `Welcome to #${info.slug}. ${info.topic}`, ts: Date.now(), meta: { triage: { act: "show", why: "room opened" } } })
  fanout(info.slug, hello)
  return c.json(info)
})

/* a call becomes task cards */
app.post("/room/:room/meeting", async (c) => {
  const r = c.req.param("room"), b = await body(c)
  const transcript = str(b.transcript, "transcript", 40000)
  const by = typeof b.by === "string" ? b.by : "someone"
  await listed(r)
  const heard = await room(r).append({ room: r, kind: "msg", from: by, text: `Shared a call transcript (${transcript.split(/\s+/).length} words).`, ts: Date.now(), meta: { transcript: transcript.slice(0, 4000) } })
  fanout(r, heard)
  const { summary, tasks } = await meetingToTasks(transcript)
  if (!tasks.length) throw new HTTPError(502, "Couldn't find any agreed tasks in that call.")
  const out = await room(r).append({ room: r, kind: "msg", from: "casper", text: `From the call: ${summary} ${tasks.length} tasks are open. Claim one.`, ts: Date.now(), meta: { tasks, triage: { act: "show", why: "tasks from the call" } } })
  fanout(r, out)
  return c.json(out)
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


/* MCP: any agent joins a room with
   claude mcp add --transport http casper "<HUB>/mcp?room=<slug>&agent=<name>"
   Stateless JSON-RPC over HTTP (initialize, tools/list, tools/call). */
const TOOLS = [
  { name: "read_room", description: "Read the room since a seq (0 for everything recent). Returns lines like '#12 jack: text'. Check this before you start and after each step.", inputSchema: { type: "object", properties: { since: { type: "number" } } } },
  { name: "post", description: "Post to the room. Use `to` to address a person or agent. Keep it short; agent chatter goes to the backchannel anyway.", inputSchema: { type: "object", properties: { text: { type: "string" }, to: { type: "string" } }, required: ["text"] } },
  { name: "claim", description: "Claim a task before you work on it. Only one agent can own a task; if someone has it you'll be told who.", inputSchema: { type: "object", properties: { task: { type: "string" } }, required: ["task"] } },
  { name: "tasks", description: "Open tasks in this room and who owns each.", inputSchema: { type: "object", properties: {} } },
  { name: "ring_bell", description: "Ask a person for a yes before anything risky: pushing to main, spending, posting publicly. Returns an askId; poll check_bell.", inputSchema: { type: "object", properties: { title: { type: "string" }, for: { type: "string" }, files: { type: "array", items: { type: "string" } } }, required: ["title"] } },
  { name: "check_bell", description: "Has the person answered your bell? Returns open, approved or declined.", inputSchema: { type: "object", properties: { askId: { type: "string" } }, required: ["askId"] } },
]
const text = (t: string) => ({ content: [{ type: "text", text: t }] })

async function callTool(r: string, agent: string, name: string, a: Record<string, unknown>) {
  const R = room(r)
  await listed(r)
  switch (name) {
    case "read_room": {
      const evs = await R.since(Number(a.since ?? 0) || 0, 200)
      const hushed = (await R.summary()).hushed.includes(agent)
      const lines = evs.slice(-80).map((e) => `#${e.seq} ${e.from}${e.meta?.to ? ` → ${e.meta.to}` : ""} [${e.kind}]: ${e.text}`)
      return text((hushed ? "NOTE: you are hushed in this room. Keep working; your messages are held for a digest.\n" : "") + (lines.join("\n") || "Nothing yet."))
    }
    case "post": {
      const ev: RoomEvent = { room: r, kind: "msg", from: agent, text: str(a.text, "text", 8000), ts: Date.now(), meta: a.to ? { to: String(a.to) } : undefined }
      if (!HUMANS.has(agent)) {
        const recent = (await R.since(Math.max(0, (await R.summary()).lastSeq - 6))).map((e) => `${e.from}: ${e.text}`)
        ev.meta = { ...(ev.meta ?? {}), triage: await triage(agent, ev.text, recent) }
      }
      const out = await R.append(ev); fanout(r, out)
      return text(`Posted as #${out.seq}.`)
    }
    case "claim": {
      const res = await R.claim(str(a.task, "task", 200), agent); fanout(r, res.event)
      return text(res.ok ? `You own "${a.task}".` : `${res.owner} already has "${a.task}". Pick another task.`)
    }
    case "tasks": {
      const sum = await R.summary()
      const evs = await R.since(0, 2000)
      const tasks: { title: string }[] = []
      for (const e of evs) for (const t of (Array.isArray(e.meta?.tasks) ? (e.meta!.tasks as { title: string }[]) : [])) if (!tasks.some((x) => x.title === t.title)) tasks.push(t)
      const rows = tasks.map((t) => `- ${t.title}: ${sum.claims[t.title] ? `owned by ${sum.claims[t.title]}` : "open"}`)
      const extra = Object.entries(sum.claims).filter(([t]) => !tasks.some((x) => x.title === t)).map(([t, o]) => `- ${t}: owned by ${o}`)
      return text([...rows, ...extra].join("\n") || "No tasks yet.")
    }
    case "ring_bell": {
      const askId = `ask-${Date.now().toString(36)}`
      const out = await R.append({ room: r, kind: "bell", from: agent, text: str(a.title, "title", 300), ts: Date.now(), meta: { askId, for: typeof a.for === "string" ? a.for : "sankritya", title: a.title, files: Array.isArray(a.files) ? a.files.slice(0, 20) : undefined } })
      fanout(r, out)
      return text(`Rang the bell. askId=${askId}. Poll check_bell until it's answered; don't do the risky thing before.`)
    }
    case "check_bell": {
      const s = await R.ask(str(a.askId, "askId", 128))
      return text(s ? (s.status === "open" ? "Still open." : `${s.status} by ${s.decidedBy}`) : "No such bell.")
    }
  }
  throw new HTTPError(400, `Unknown tool ${name}.`)
}

app.post("/mcp", async (c) => {
  const r = c.req.query("room") ?? "", agent = (c.req.query("agent") ?? c.req.header("x-casper-agent") ?? "").toLowerCase()
  if (!ROOM_ID.test(r) || !/^[a-z0-9._-]{1,40}$/.test(agent)) return c.json({ jsonrpc: "2.0", id: null, error: { code: -32602, message: "Add ?room=<slug>&agent=<name> to the MCP URL." } }, 400)
  const msg = (await c.req.json().catch(() => null)) as { id?: number | string; method?: string; params?: Record<string, unknown> } | null
  if (!msg?.method) return c.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Bad request" } }, 400)
  const reply = (result: unknown) => c.json({ jsonrpc: "2.0", id: msg.id ?? null, result })
  if (msg.id === undefined) return c.body(null, 202) // a notification
  try {
    if (msg.method === "initialize") return reply({ protocolVersion: (msg.params?.protocolVersion as string) ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "casper", version: "0.1.0" }, instructions: `You are ${agent} in the Casper room #${r}. Read the room, claim a task before working on it, post short progress, and ring the bell before anything risky.` })
    if (msg.method === "ping") return reply({})
    if (msg.method === "tools/list") return reply({ tools: TOOLS })
    if (msg.method === "tools/call") {
      const p = msg.params ?? {}
      return reply(await callTool(r, agent, String(p.name), (p.arguments as Record<string, unknown>) ?? {}))
    }
    return c.json({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `No method ${msg.method}` } })
  } catch (e) {
    return reply({ content: [{ type: "text", text: (e as Error).message }], isError: true })
  }
})
app.get("/mcp", (c) => c.body(null, 405))

const port = Number(process.env.PORT ?? 8790)
Bun.serve({ port, fetch: app.fetch, websocket })
console.log(`casper hub on http://localhost:${port}`)
