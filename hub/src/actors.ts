import { Actor, type ActorContext, type ActorDatabase } from "durable-actors"

/* One Room actor per Casper room. Its single mailbox is the referee:
   - every event gets the next seq, in order, exactly once (dedupe by a client/relay key);
   - a task has one owner (claim-once), decided here so two agents can't both win;
   - a bell is answered once (compare-and-set on its version);
   - hush state lives here, so a restart doesn't unmute anyone.
   The log is SQLite inside the actor, so killing the hub loses nothing. */

export type RoomEvent = {
  seq?: number
  id?: string
  room: string
  kind: "msg" | "claim" | "bell" | "hush" | "relay" | "computer" | "approve"
  from: string
  text: string
  ts: number | string
  meta?: Record<string, unknown>
}

function schema(db: ActorDatabase) {
  db.exec(`CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY AUTOINCREMENT, ckey TEXT UNIQUE, ev TEXT NOT NULL)`)
  db.exec(`CREATE TABLE IF NOT EXISTS claims (task TEXT PRIMARY KEY, owner TEXT NOT NULL, seq INTEGER)`)
  db.exec(`CREATE TABLE IF NOT EXISTS asks (id TEXT PRIMARY KEY, status TEXT NOT NULL, version INTEGER NOT NULL, decided_by TEXT)`)
  db.exec(`CREATE TABLE IF NOT EXISTS hush (target TEXT PRIMARY KEY, is_on INTEGER NOT NULL)`)
}

function keyOf(ev: RoomEvent): string | null {
  const m = ev.meta ?? {}
  const k = (m.messageId as string | undefined) ?? ev.id ?? (m.clientId as string | undefined)
  return k ? `${ev.kind}:${k}` : null
}

const roomName = (id: string) => id.replace(/^room\./, "")

function put(db: ActorDatabase, room: string, ev: RoomEvent): RoomEvent {
  room = roomName(room)
  const ckey = keyOf(ev)
  if (ckey) {
    const dup = db.exec<{ seq: number; ev: string }>(`SELECT seq AS seq, ev AS ev FROM events WHERE ckey = ?`, ckey)
    if (dup.length) return JSON.parse(dup[0].ev) as RoomEvent
  }
  const clean: RoomEvent = { ...ev, room, ts: ev.ts ?? Date.now() }
  delete clean.seq
  const row = db.exec<{ seq: number }>(`INSERT INTO events (ckey, ev) VALUES (?, ?) RETURNING seq AS seq`, ckey, JSON.stringify(clean))
  const out = { ...clean, seq: row[0].seq }
  db.exec(`UPDATE events SET ev = ? WHERE seq = ?`, JSON.stringify(out), out.seq)
  return out
}

export class Room extends Actor {
  constructor(ctx: ActorContext) {
    super(ctx)
    schema(this.db)
  }

  /** Append any event (a message, a relay message, a computer update, a bell). Returns it with its seq. */
  async append(ev: RoomEvent): Promise<RoomEvent> {
    const out = put(this.db, this.id, ev)
    if (out.kind === "bell" && out.meta?.askId) {
      this.db.exec(`INSERT OR IGNORE INTO asks (id, status, version) VALUES (?, 'open', 0)`, String(out.meta.askId))
    }
    return out
  }

  /** Claim-once: the first agent to claim a task owns it. */
  async claim(task: string, agent: string): Promise<{ ok: boolean; owner: string; event: RoomEvent }> {
    const have = this.db.exec<{ owner: string }>(`SELECT owner AS owner FROM claims WHERE task = ?`, task)
    const ok = have.length === 0 || have[0].owner === agent
    const owner = ok ? agent : have[0].owner
    const event = put(this.db, this.id, { room: roomName(this.id), kind: "claim", from: agent, text: task, ts: Date.now(), meta: { task, ok, owner } })
    if (ok && !have.length) this.db.exec(`INSERT INTO claims (task, owner, seq) VALUES (?, ?, ?)`, task, agent, event.seq ?? 0)
    return { ok, owner, event }
  }

  /** Hush or unhush an agent. It keeps working; the room holds its messages. */
  async hush(target: string, on: boolean, by: string): Promise<RoomEvent> {
    this.db.exec(`INSERT INTO hush (target, is_on) VALUES (?, ?) ON CONFLICT(target) DO UPDATE SET is_on = excluded.is_on`, target, on ? 1 : 0)
    return put(this.db, this.id, { room: roomName(this.id), kind: "hush", from: by, text: on ? `hushed ${target}` : `unhushed ${target}`, ts: Date.now(), meta: { target, on } })
  }

  /** Answer a bell exactly once. A second answer loses and learns who decided. */
  async answer(askId: string, yes: boolean, by: string): Promise<{ ok: boolean; status: string; decidedBy: string | null; event?: RoomEvent }> {
    const row = this.db.exec<{ status: string; version: number; decided_by: string | null }>(
      `SELECT status AS status, version AS version, decided_by AS decided_by FROM asks WHERE id = ?`, askId)
    if (!row.length) this.db.exec(`INSERT INTO asks (id, status, version) VALUES (?, 'open', 0)`, askId)
    const cur = row[0] ?? { status: "open", version: 0, decided_by: null }
    if (cur.status !== "open") return { ok: false, status: cur.status, decidedBy: cur.decided_by }
    const status = yes ? "approved" : "declined"
    this.db.exec(`UPDATE asks SET status = ?, version = version + 1, decided_by = ? WHERE id = ? AND version = ?`, status, by, askId, cur.version)
    const event = put(this.db, this.id, { room: roomName(this.id), kind: "approve", from: by, text: yes ? "approved" : "not now", ts: Date.now(), meta: { askId, yes, by } })
    return { ok: true, status, decidedBy: by, event }
  }

  /** Everything after a seq, in order. Clients resume with since(lastSeq). */
  async since(seq: number, limit?: number): Promise<RoomEvent[]> {
    const rows = this.db.exec<{ ev: string }>(`SELECT ev AS ev FROM events WHERE seq > ? ORDER BY seq LIMIT ?`, seq, Math.min(limit ?? 500, 2000))
    return rows.map((r) => JSON.parse(r.ev) as RoomEvent)
  }

  /** The room at a glance: last seq, owners, hushed agents, open bells. */
  async summary(): Promise<{ lastSeq: number; claims: Record<string, string>; hushed: string[]; openAsks: string[] }> {
    const last = this.db.exec<{ s: number | null }>(`SELECT MAX(seq) AS s FROM events`)[0]?.s ?? 0
    const claims = Object.fromEntries(this.db.exec<{ task: string; owner: string }>(`SELECT task AS task, owner AS owner FROM claims`).map((r) => [r.task, r.owner]))
    const hushed = this.db.exec<{ target: string }>(`SELECT target AS target FROM hush WHERE is_on = 1`).map((r) => r.target)
    const openAsks = this.db.exec<{ id: string }>(`SELECT id AS id FROM asks WHERE status = 'open'`).map((r) => r.id)
    return { lastSeq: last, claims, hushed, openAsks }
  }
}
