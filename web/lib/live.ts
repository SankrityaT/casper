"use client";

import { useEffect, useSyncExternalStore } from "react";

/* The live room: events from the hub (Terse Room actor) or from Kinjal's Relay mirror, in the shared shape.
   Ordered by seq, deduped by seq/id, and resumable with since(lastSeq). With no hub configured, a built-in
   simulator plays the demo story so the UI (and a backup run) always works. */

export type LiveKind = "msg" | "claim" | "bell" | "hush" | "relay" | "computer" | "approve";
export type LiveEv = {
  id?: string;
  seq?: number;
  room: string;
  kind: LiveKind;
  from: string;
  text: string;
  ts: number | string;
  meta?: Record<string, unknown> & {
    to?: string; mode?: "wait" | "steer"; task?: string; ok?: boolean; owner?: string;
    askId?: string; for?: string; title?: string; files?: string[]; yes?: boolean; by?: string;
    target?: string; on?: boolean; counters?: { total: number; toHuman: number };
  };
};

type RoomState = { evs: LiveEv[]; keys: Set<string>; lastSeq: number; status: "connecting" | "live" | "sim" | "offline" };
const rooms = new Map<string, RoomState>();
const subs = new Map<string, Set<() => void>>();
const snap = new Map<string, RoomState>();

const keyOf = (e: LiveEv) => (e.seq != null ? `s${e.seq}` : e.id ?? `${e.kind}|${e.from}|${e.ts}|${e.text}`);
const tsOf = (e: LiveEv) => (typeof e.ts === "number" ? e.ts : Date.parse(e.ts) || 0);

function state(room: string): RoomState {
  let s = rooms.get(room);
  if (!s) { s = { evs: [], keys: new Set(), lastSeq: 0, status: "connecting" }; rooms.set(room, s); snap.set(room, { ...s }); }
  return s;
}
function emit(room: string) {
  const s = state(room);
  snap.set(room, { ...s, evs: s.evs.slice() });
  subs.get(room)?.forEach((f) => f());
}
export function ingest(room: string, list: LiveEv[]) {
  const s = state(room);
  let changed = false;
  for (const e of list) {
    if (!e || typeof e.kind !== "string") continue;
    const k = keyOf(e);
    if (s.keys.has(k)) continue;
    s.keys.add(k);
    s.evs.push(e);
    if (e.seq != null && e.seq > s.lastSeq) s.lastSeq = e.seq;
    changed = true;
  }
  if (!changed) return;
  s.evs.sort((a, b) => (a.seq != null && b.seq != null ? a.seq - b.seq : tsOf(a) - tsOf(b)));
  emit(room);
}
function setStatus(room: string, st: RoomState["status"]) { const s = state(room); if (s.status !== st) { s.status = st; emit(room); } }

/* The hub's address: ?hub=<url> (remembered in this browser) beats the build-time NEXT_PUBLIC_HUB_URL,
   because a tunnel URL changes when the hub restarts. ?hub=off forgets it. */
function hubUrl(): string {
  if (typeof window !== "undefined") {
    const q = new URLSearchParams(location.search).get("hub");
    if (q === "off") localStorage.removeItem("casper.hub");
    else if (q && /^https?:\/\//.test(q)) localStorage.setItem("casper.hub", q);
    const saved = localStorage.getItem("casper.hub");
    if (saved) return saved.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_HUB_URL?.replace(/\/$/, "") || "";
}
export const HUB = { get url() { return hubUrl(); } };

/* ---------- sources ---------- */
function connectHub(room: string) {
  let ws: WebSocket | null = null, dead = false, wait = 500;
  const open = () => {
    if (dead) return;
    const url = `${HUB.url.replace(/^http/, "ws")}/room/${encodeURIComponent(room)}/socket?since=${state(room).lastSeq}`;
    ws = new WebSocket(url);
    ws.onopen = () => { wait = 500; setStatus(room, "live"); };
    ws.onmessage = (m) => {
      try { const d = JSON.parse(String(m.data)); ingest(room, Array.isArray(d) ? d : Array.isArray(d?.events) ? d.events : [d]); } catch { /* ignore a bad frame */ }
    };
    ws.onclose = () => { if (dead) return; setStatus(room, "offline"); setTimeout(open, (wait = Math.min(wait * 2, 8000))); };
  };
  open();
  return () => { dead = true; ws?.close(); };
}
function connectFile(room: string) {
  // the local Relay mirror's out.jsonl, streamed by /api/live/[room] (same machine as Kinjal's mirror)
  let es: EventSource | null = null, dead = false;
  const open = () => {
    if (dead) return;
    es = new EventSource(`/api/live/${encodeURIComponent(room)}?since=${state(room).lastSeq}`);
    es.onopen = () => setStatus(room, "live");
    es.onmessage = (m) => { try { ingest(room, [JSON.parse(m.data)]); } catch { /* skip */ } };
    es.onerror = () => { setStatus(room, "offline"); es?.close(); setTimeout(open, 2000); };
  };
  open();
  return () => { dead = true; es?.close(); };
}

const conns = new Map<string, { n: number; stop: () => void }>();
function attach(room: string, mode: "hub" | "file" | "sim") {
  const c = conns.get(room);
  if (c) { c.n++; return; }
  const stop = mode === "hub" ? connectHub(room) : mode === "file" ? connectFile(room) : (setStatus(room, "sim"), runSim(room));
  conns.set(room, { n: 1, stop });
}
function detach(room: string) {
  const c = conns.get(room);
  if (!c) return;
  if (--c.n <= 0) { c.stop(); conns.delete(room); }
}

export function liveMode(): "hub" | "file" | "sim" {
  if (typeof location !== "undefined") {
    const q = new URLSearchParams(location.search).get("live");
    if (q === "sim" || q === "file" || q === "hub") return q;
  }
  return HUB.url ? "hub" : "sim";
}

export function useLive(room: string) {
  const s = useSyncExternalStore(
    (f) => { const set = subs.get(room) ?? new Set(); set.add(f); subs.set(room, set); return () => set.delete(f); },
    () => { state(room); return snap.get(room)!; },
    () => { state(room); return snap.get(room)!; },
  );
  useEffect(() => { const m = liveMode(); attach(room, m); return () => detach(room); }, [room]);
  return s;
}

/* ---------- actions: go to the hub when there is one, otherwise apply locally ---------- */
async function hubPost(room: string, path: string, body: unknown) {
  const r = await fetch(`${HUB.url}/room/${encodeURIComponent(room)}/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok && r.status !== 409) throw new Error(`hub ${path} ${r.status}`);
  return r.json().catch(() => ({}));
}
const nextSeq = (room: string) => state(room).lastSeq + 1;
const local = (room: string, e: Omit<LiveEv, "room" | "ts">) => ingest(room, [{ ...e, room, ts: Date.now(), ...(liveMode() === "hub" ? { id: `local-${Math.random().toString(36).slice(2)}` } : { seq: nextSeq(room) }) }]);
const useHub = () => liveMode() === "hub";

export async function post(room: string, from: string, text: string, meta?: LiveEv["meta"]) {
  if (useHub()) return hubPost(room, "post", { from, text, kind: "msg", meta });
  local(room, { kind: "msg", from, text, meta });
  simHear(room, text, meta);
}
export async function hush(room: string, target: string, on: boolean, by: string) {
  if (useHub()) return hubPost(room, "hush", { target, on, by });
  local(room, { kind: "hush", from: by, text: on ? `hushed ${target}` : `unhushed ${target}`, meta: { target, on } });
}
export async function answer(room: string, askId: string, yes: boolean, by: string) {
  if (useHub()) return hubPost(room, "answer", { askId, yes, by });
  local(room, { kind: "approve", from: by, text: yes ? "approved" : "not now", meta: { askId, yes, by } });
  simAnswered(room, askId, yes);
}

/* ---------- derived view of a room ---------- */
export type Derived = {
  visible: LiveEv[];               // what reaches people (hushed agents' lines held back)
  backchannel: LiveEv[];           // agent ↔ agent traffic on Relay
  claims: Record<string, string>;  // task → owner
  hushed: Set<string>;
  held: Record<string, LiveEv[]>;  // what a hushed agent said while hushed
  digests: { at: number; who: string; evs: LiveEv[] }[];
  asks: Record<string, { ev: LiveEv; done?: { yes: boolean; by: string } }>;
  tasks: { id: string; title: string; why?: string }[]; // the latest task cards (from a call)
  quiet: number;                   // agent messages Stretch kept out of the room
  agentTotal: number;              // every agent message, both channels
  reached: number;                 // agent messages that reached a human
};
const HUMANS = new Set(["sankritya", "kinjal", "you"]);
export function derive(evs: LiveEv[]): Derived {
  const d: Derived = { visible: [], backchannel: [], claims: {}, hushed: new Set(), held: {}, digests: [], asks: {}, tasks: [], quiet: 0, agentTotal: 0, reached: 0 };
  for (const e of evs) {
    const from = e.from.toLowerCase();
    const agent = !HUMANS.has(from);
    if (e.kind === "hush") {
      const t = String(e.meta?.target ?? "").toLowerCase();
      if (e.meta?.on) { d.hushed.add(t); d.held[t] = []; }
      else if (d.hushed.has(t)) { d.hushed.delete(t); d.digests.push({ at: d.visible.length, who: t, evs: d.held[t] ?? [] }); }
      d.visible.push(e);
      continue;
    }
    if (e.kind === "relay") {
      d.backchannel.push(e);
      if (agent) d.agentTotal++;
      const to = String(e.meta?.to ?? "").toLowerCase();
      if (HUMANS.has(to) && !d.hushed.has(from)) { d.reached++; d.visible.push(e); }
      continue;
    }
    if (e.kind === "claim") {
      const task = String(e.meta?.task ?? e.text);
      if (e.meta?.ok !== false && !d.claims[task]) d.claims[task] = e.meta?.owner ?? e.from;
    }
    if (e.kind === "approve" && e.meta?.askId && d.asks[e.meta.askId]) d.asks[e.meta.askId].done = { yes: !!e.meta.yes, by: e.meta.by ?? e.from };
    if (e.kind === "bell" && e.meta?.askId) d.asks[e.meta.askId] = { ev: e };
    if (Array.isArray(e.meta?.tasks)) for (const t of e.meta!.tasks as Derived["tasks"]) if (!d.tasks.some((x) => x.title === t.title)) d.tasks = [...d.tasks, t];
    if (agent && e.kind === "msg" && (e.meta?.triage as { act?: string } | undefined)?.act === "silent" && !d.hushed.has(from)) {
      d.agentTotal++; d.quiet++; d.backchannel.push(e);
      continue;
    }
    if (agent) {
      d.agentTotal++;
      if (d.hushed.has(from) && e.kind !== "bell") { (d.held[from] ??= []).push(e); continue; }
      d.reached++;
    }
    d.visible.push(e);
  }
  return d;
}

/* ---------- the simulator: the demo story, in the shared shape ---------- */
type Step = { ms: number; e: Omit<LiveEv, "room" | "ts" | "seq">; gate?: string };
const RELAY = (from: string, to: string, text: string, mode: "wait" | "steer" = "wait"): Step => ({ ms: 260, e: { kind: "relay", from, text, meta: { to, mode } } });
const STORY: Step[] = [
  { ms: 600, e: { kind: "msg", from: "casper", text: "From the call: three tasks. Autopay API, the autopay toggle, and the launch post. Claim one." } },
  { ms: 900, e: { kind: "claim", from: "jack", text: "Autopay API", meta: { task: "Autopay API", ok: true, owner: "jack" } } },
  { ms: 500, e: { kind: "claim", from: "batty", text: "Autopay API", meta: { task: "Autopay API", ok: false, owner: "jack" } } },
  { ms: 700, e: { kind: "claim", from: "batty", text: "Autopay toggle", meta: { task: "Autopay toggle", ok: true, owner: "batty" } } },
  { ms: 500, e: { kind: "claim", from: "wick", text: "Launch post", meta: { task: "Launch post", ok: true, owner: "wick" } } },
  RELAY("jack", "batty", "I'm on api/autopay.ts. Contract: PATCH /bills/:id/autopay {enabled} → 200 {id, autopay}."),
  RELAY("batty", "jack", "Got it. 400 on a bad body?"),
  RELAY("jack", "batty", "400 bad body, 404 unknown bill."),
  RELAY("batty", "jack", "Toggle calls it optimistically, rolls back on error."),
  RELAY("jack", "batty", "Good. I'll add the column, not a new table."),
  RELAY("batty", "jack", "Need the field name for the bill row."),
  RELAY("jack", "batty", "bills.autopay boolean, default false."),
  RELAY("wick", "jack", "Ping me when it's on staging, I'll record the clip."),
  RELAY("jack", "wick", "Will do."),
  RELAY("batty", "wick", "Toggle lives on /billing, top right."),
  RELAY("wick", "batty", "Thanks."),
  { ms: 900, e: { kind: "msg", from: "jack", text: "Migration and endpoint are in. 6 tests pass." } },
  RELAY("batty", "jack", "Pulled your branch, the toggle works against it."),
  RELAY("batty", "jack", "Small thing: should the toggle show the next charge date?"),
  RELAY("jack", "batty", "Yes, it's on the bill row."),
  RELAY("batty", "jack", "Adding it."),
  RELAY("batty", "jack", "Also a loading state."),
  RELAY("batty", "jack", "And an error toast."),
  { ms: 800, e: { kind: "msg", from: "batty", text: "Toggle is done, with the next charge date, a loading state and an error toast. Want me to restyle the whole billing page while I'm here?" } },
  { ms: 700, e: { kind: "msg", from: "batty", text: "I could also redo the invoice table." } },
  { ms: 700, e: { kind: "msg", from: "batty", text: "And the empty state." } },
  { ms: 1200, e: { kind: "bell", from: "jack", text: "Ready to ship both changes. Push to main?", meta: { askId: "push-1", for: "sankritya", title: "Push 2 changes to main", files: ["api/autopay.ts", "web/billing/AutopayToggle.tsx"] } }, gate: "push-1" },
  { ms: 800, e: { kind: "msg", from: "jack", text: "Pushed and deployed. Autopay is live on staging." } },
  RELAY("jack", "wick", "It's on staging."),
  { ms: 800, e: { kind: "computer", from: "wick", text: "Recording a 10-second clip of the toggle on my computer.", meta: { agent: "wick" } } },
  { ms: 1400, e: { kind: "bell", from: "wick", text: "Clip and draft are ready.", meta: { askId: "post-1", for: "kinjal", title: "Post the launch thread on X?" } }, gate: "post-1" },
  { ms: 700, e: { kind: "msg", from: "wick", text: "Posted. Link is in the Library." } },
];
const sims = new Map<string, { i: number; t: ReturnType<typeof setTimeout> | null; waiting: string | null; seq: number }>();
function runSim(room: string) {
  const s = { i: 0, t: null as ReturnType<typeof setTimeout> | null, waiting: null as string | null, seq: 0 };
  sims.set(room, s);
  const tick = () => {
    if (s.i >= STORY.length) return;
    const st = STORY[s.i];
    s.t = setTimeout(() => {
      ingest(room, [{ ...st.e, room, ts: Date.now(), seq: nextSeq(room) }]);
      s.i++;
      if (st.gate) { s.waiting = st.gate; return; }
      tick();
    }, st.ms);
  };
  tick();
  (s as { resume?: () => void }).resume = tick;
  return () => { if (s.t) clearTimeout(s.t); sims.delete(room); };
}
function simAnswered(room: string, askId: string, yes: boolean) {
  const s = sims.get(room) as (ReturnType<typeof sims.get> & { resume?: () => void }) | undefined;
  if (!s || s.waiting !== askId) return;
  s.waiting = null;
  if (yes) s.resume?.();
  else ingest(room, [{ room, kind: "msg", from: askId.startsWith("push") ? "jack" : "wick", text: "Okay, holding. Tell me what to change.", ts: Date.now(), seq: nextSeq(room) }]);
}
function simHear(room: string, text: string, meta?: LiveEv["meta"]) {
  const s = sims.get(room);
  const m = text.match(/@(\w+)/);
  if (!s || !m) return;
  const who = m[1].toLowerCase();
  if (!["jack", "batty", "wick", "casper"].includes(who)) return;
  const steer = meta?.mode === "steer";
  setTimeout(() => ingest(room, [{ room, kind: "msg", from: who, ts: Date.now(), seq: nextSeq(room),
    text: steer ? "Got it mid-run. Changing course now." : "On it. I'll pick that up after this step." }]), steer ? 700 : 1600);
}

/* ---------- the wing: rooms, calls ---------- */
export type HubRoom = { slug: string; topic: string; createdAt: number; createdBy: string };
export async function listRooms(): Promise<HubRoom[]> {
  if (!HUB.url) return [];
  const r = await fetch(`${HUB.url}/rooms`, { cache: "no-store" });
  return r.ok ? r.json() : [];
}
export async function createRoom(slug: string, topic: string, by: string): Promise<HubRoom> {
  const r = await fetch(`${HUB.url}/rooms`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, topic, by }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't create the room.");
  return r.json();
}
export async function shareCall(room: string, transcript: string, by: string) {
  if (!HUB.url) {
    local(room, { kind: "msg", from: "casper", text: "From the call: three tasks are open. Claim one.", meta: { tasks: [{ id: "t1", title: "Build the API" }, { id: "t2", title: "Build the UI" }, { id: "t3", title: "Draft the launch post" }] } });
    return;
  }
  const r = await fetch(`${HUB.url}/room/${encodeURIComponent(room)}/meeting`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript, by }) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't read that call.");
}
export const mcpCommand = (room: string, agent: string) =>
  `claude mcp add --transport http casper "${HUB.url || "<hub-url>"}/mcp?room=${encodeURIComponent(room)}&agent=${encodeURIComponent(agent || "my-agent")}"`;
export const hookSetup = (room: string, agent: string) => {
  const hub = HUB.url || "<hub-url>";
  return `curl -s ${hub}/hooks/push-gate.sh -o ~/.casper-push-gate.sh && chmod +x ~/.casper-push-gate.sh
# then in .claude/settings.json of the repo the agent works in:
{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"CASPER_HUB=${hub} CASPER_ROOM=${room} CASPER_AGENT=${agent || "my-agent"} ~/.casper-push-gate.sh"}]}]}}`;
};
