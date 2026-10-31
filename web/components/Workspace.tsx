"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Agent, { type Mood } from "@/components/Agent";

/* The real room (same design as the app), scripted to play on its own and fully playable:
   drag the canvas, drag any card or agent, zoom, switch to Chat, click an agent, approve. */
import { P, AGENTS, SHORT, CREW, TASKS, SCRIPT, SEED, START, CURSOR_AT, liveAt, clock, TASK_LABEL, Ic } from "@/components/ws/data";
import type { Id, Human, TS, World } from "@/components/ws/data";
import { THREAD_OF, ROOMS, REPLY, ATT, REPLY_ATT, SLOTS } from "@/components/ws/data";
import type { Att } from "@/components/ws/data";
import { AskCard, Bubble, Replies, TypingBar, TakeOver, Composer, type Target } from "@/components/ws/Chat";
import { Search, GroupPhoto } from "@/components/ws/Overlays";
import FindBar from "@/components/ws/FindBar";
import NewRoom from "@/components/ws/NewRoom";
import Summon, { type Summoned } from "@/components/ws/Summon";
import { SourceCtx } from "@/components/ws/SourcePeek";
import { BellPage, AgentsPage, LibraryPage, SettingsPage, UsagePage } from "@/components/ws/Pages";

type Page = "room" | "bell" | "agents" | "library" | "settings" | "usage";
type Post = { room: string; who: Id; text: string; thread?: number; note?: string; att?: Att[] };

export default function Workspace({ view: viewProp, onView: onViewProp, full = false }: { view?: "canvas" | "chat"; onView?: (v: "canvas" | "chat") => void; full?: boolean }) {
  // full = the real app: fills the screen, history already there, nothing auto-plays
  const [ownView, setOwnView] = useState<"canvas" | "chat">("chat");
  const view = viewProp ?? ownView;
  const onView = onViewProp ?? setOwnView;
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [step, setStep] = useState(full ? SCRIPT.length - 1 : -1);
  const [on, setOn] = useState(false);
  const [pinned, setPinned] = useState<Id | null>(null);
  // agents summoned into the room this session fill the empty seats (s1..s3)
  const [summoned, setSummoned] = useState<Id[]>([]);
  const [summonOpen, setSummonOpen] = useState(false);
  const here: Id[] = [...AGENTS, ...summoned];
  const [tab, setTab] = useState<"work" | "screen" | "rules">("work");
  const [insp, setInsp] = useState(false);
  const [pos, setPos] = useState<World>(START);
  const [cam, setCam] = useState({ x: 0, y: 0, z: 0.8 });

  const W = 1280, H = 760;
  useLayoutEffect(() => {
    const fit = () => frame.current && setScale(full ? 1 : Math.min(1, frame.current.clientWidth / W));
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [full]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.25 });
    if (frame.current) io.observe(frame.current);
    return () => io.disconnect();
  }, []);

  const [done, setDone] = useState(full);
  const [page, setPage] = useState<Page>("room");
  const [room, setRoom] = useState("autopay-launch");
  const [posts, setPosts] = useState<Post[]>([]);
  const [replying, setReplying] = useState<Id | null>(null);
  const [threadOf, setThreadOf] = useState<number | null>(null);
  // the story plays once, then the room is yours to poke at
  useEffect(() => {
    if (!on || done) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = still ? 0 : step < 0 ? 900 : SCRIPT[step].ms ?? 2600;
    const t = setTimeout(() => (step >= SCRIPT.length - 1 ? setDone(true) : setStep(step + 1)), ms);
    return () => clearTimeout(t);
  }, [step, on, done]);
  const replay = () => { setPosts([]); setThreadOf(null); setPage("room"); setRoom("autopay-launch"); setDone(false); setStep(-1); };

  const cur = step >= 0 ? Math.min(step, SCRIPT.length - 1) : -1;
  const ev = cur >= 0 && !done ? SCRIPT[cur] : null;
  const L = liveAt(cur);
  const speaker = ev?.who;
  const focus: Id = pinned ?? (speaker && P[speaker].kind && here.includes(speaker) ? speaker : "jack");

  const mood = (id: Id): Mood => {
    if (id === "wick" && !["recording", "posted"].includes(L.tasks.tPost?.s ?? "") && speaker !== "wick") return "sleep";
    if (speaker === id) return ev?.ask ? "alert" : "happy";
    if (ev?.to === id) return "alert";
    return "calm";
  };

  /* ---------- pan, zoom, drag ---------- */
  const drag = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const down = (e: React.PointerEvent, id?: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = id
      ? { kind: "node", id, sx: e.clientX, sy: e.clientY, ox: pos[id].x, oy: pos[id].y }
      : { kind: "pan", sx: e.clientX, sy: e.clientY, ox: cam.x, oy: cam.y };
    setDragging(id ?? "pan");
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
    if (d.kind === "pan") setCam((c) => ({ ...c, x: d.ox + dx, y: d.oy + dy }));
    else setPos((p) => ({ ...p, [d.id!]: { x: d.ox + dx / cam.z, y: d.oy + dy / cam.z } }));
  };
  const up = () => { drag.current = null; setDragging(null); };
  const zoomBy = (f: number) => setCam((c) => ({ ...c, z: Math.min(1.6, Math.max(0.45, +(c.z * f).toFixed(2))) }));
  const cvRef = useRef<HTMLDivElement>(null);
  // frame the whole room in view
  const fit = useCallback(() => {
    const el = cvRef.current;
    // a hidden canvas (the app opens on Chat) has no size yet: fit it once it's shown
    if (!el || el.clientWidth < 200 || el.clientHeight < 200) return false;
    fitted.current = true;
    const bw = 1160, bh = 680, pad = 24;
    const z = Math.min(1, (el.clientWidth - pad * 2) / bw, (el.clientHeight - 90) / bh);
    setCam({ z: +z.toFixed(2), x: (el.clientWidth - bw * z) / 2 - 20 * z, y: 34 });
    return true;
  }, []);
  const fitted = useRef(false);
  useLayoutEffect(() => { fit(); }, [fit]);
  useEffect(() => { if (view === "canvas" && !fitted.current) requestAnimationFrame(() => fit()); }, [view, fit, room, page]);
  useEffect(() => {
    const el = cvRef.current;
    if (!el) return;
    // pinch or ctrl+scroll zooms the canvas; plain scrolling still scrolls the page
    const wheel = (e: WheelEvent) => { if (!e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.08 : 0.92); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  /* ---------- wires, measured from the cards ---------- */
  const world = useRef<HTMLDivElement>(null);
  const [wires, setWires] = useState<{ d: string; c: string; dash?: boolean; pulse?: boolean }[]>([]);
  useLayoutEffect(() => {
    const w = world.current;
    if (!w) return;
    const r = (id: string) => {
      const el = w.querySelector<HTMLElement>(`[data-id="${id}"]`);
      return el ? { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null;
    };
    const link = (a: string, b: string) => {
      const A = r(a), B = r(b);
      if (!A || !B) return "";
      const ax = A.l + A.w <= B.l ? A.l + A.w : A.l, bx = A.l + A.w <= B.l ? B.l : B.l + B.w;
      const ay = A.t + A.h / 2, by = B.t + Math.min(B.h / 2, 46);
      const dx = Math.max(40, Math.abs(bx - ax) / 2) * (bx > ax ? 1 : -1);
      return `M${ax} ${ay} C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`;
    };
    const out: typeof wires = [];
    TASKS.forEach((t) => out.push({ d: link("call", t.id), c: "#3a3a36", dash: true }));
    TASKS.forEach((t) => {
      const s = L.tasks[t.id];
      if (s?.by) out.push({ d: link(t.id, s.by), c: s.s === "waits" ? "#3a3a36" : "#58c47e", dash: s.s === "waits" });
    });
    out.push({ d: link("jack", "pcJ"), c: "#58c47e" });
    out.push({ d: link("wick", "pcW"), c: L.tasks.tPost?.s === "recording" ? "#ef6b6b" : "#3a3a36", dash: L.tasks.tPost?.s !== "recording" });
    if (ev?.to && P[ev.who].kind && P[ev.to].kind) out.push({ d: link(ev.who, ev.to), c: "#9b87ff", pulse: true });
    setWires(out);
  }, [pos, cur, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const human = speaker === "sankritya" || speaker === "kinjal" ? speaker : null;
  const cursorAt = (h: Human) => {
    if (human === h && ev?.to && pos[ev.to]) return { x: pos[ev.to].x + 70, y: pos[ev.to].y + 20 };
    if (L.ask?.for === h || (human === h && ev?.yes)) return { x: pos.ask.x + 150, y: pos.ask.y + 120 };
    return CURSOR_AT[h];
  };

  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState<Record<string, string[]>>({});
  const seed = (key: string): [string, number][] => (/^\d+$/.test(key) ? SEED[+key] ?? [] : []);
  const react = (key: string, e: string) => {
    const k = `${key}:${e}`;
    setMine((m) => ({ ...m, [k]: !m[k] }));
    if (!seed(key).some(([x]) => x === e)) setExtra((x) => ({ ...x, [key]: [...new Set([...(x[key] ?? []), e])] }));
  };
  const [search, setSearch] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [newRoom, setNewRoom] = useState(false);
  const summon = (a: Summoned) => {
    const seat = SLOTS.find((x) => !summoned.includes(x));
    if (!seat) return;
    P[seat] = { name: a.name, kind: a.kind, sub: `${a.job || "summoned"} · ${a.runsOn}` };
    SHORT[seat] = a.runsOn === "Its own computer" ? "own computer" : a.runsOn;
    REPLY[seat] = () => (a.job ? `On it. That’s my job here: ${a.job.charAt(0).toLowerCase() + a.job.slice(1)}.` : "On it.");
    const open = ROOMS[room]?.cards.filter((c) => c.k === "Open").map((c) => c.t) ?? [];
    setPosts((p) => [...p,
      { room, who: "casper", text: `${a.name} just joined${a.job ? ` to ${a.job.charAt(0).toLowerCase() + a.job.slice(1)}` : ""}. Catch-up for ${a.name}: ${open.length ? `${open.length} open tasks` : "nothing open right now"}; ask me anything about #${room}.` },
      { room, who: seat, text: a.rights === "act" ? `Hi all. ${a.job ? `I’m here to ${a.job.charAt(0).toLowerCase() + a.job.slice(1)}. ` : ""}I’ll ask ${P[a.approver].name} before I ${a.asks.length ? a.asks.map((x) => x.toLowerCase().replace(" to main", "")).join(", ") : "do anything risky"}.` : `Hi all. Reading along; @ me if you want a hand.` },
    ]);
    setSummoned((x) => [...x, seat]);
    setSummonOpen(false);
    setPinned(seat); setInsp(true);
  };
  const [card, setCard] = useState(true);
  const [flash, setFlash] = useState<number | null>(null);
  const [findRoom, setFindRoom] = useState(false);
  const [findThread, setFindThread] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!on || !(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
      // ⌘F finds in the thread if one is open, otherwise in the room's chat
      if (e.key.toLowerCase() === "f") { e.preventDefault(); if (threadOf !== null && insp) setFindThread(true); else { onView("chat"); setFindRoom(true); } }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [on, threadOf, insp, onView]);
  const goMsg = (i: number) => {
    onView("chat");
    setFlash(i);
    setTimeout(() => chatRef.current?.querySelector(`[data-msg="${i}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
    setTimeout(() => setFlash(null), 2200);
  };

  const approve = () => { if (L.ask && cur >= 0 && SCRIPT[cur + 1]?.yes) setStep(cur + 1); };

  const shown = cur < 0 ? [] : SCRIPT.slice(0, cur + 1);
  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [cur, view, posts.length, room, replying]);

  /* ---------- you can talk in the room: @ an agent and it answers; @ nobody and nobody answers ---------- */
  const [draft, setDraft] = useState("");
  const [tdraft, setTdraft] = useState("");
  const send = (text: string, thread?: number, att?: Att[]) => {
    const t = text.trim();
    if (!t && !att?.length) return;
    const m = t.match(/@(\w+)/);
    const id = m && (Object.keys(P) as Id[]).find((k) => P[k].name.toLowerCase() === m[1].toLowerCase() && P[k].kind);
    setPosts((p) => [...p, { room, who: "sankritya", text: t, thread, att, note: !/@\w/.test(t) && thread === undefined ? "No agent was addressed, so none replied. @ one, or let Stretch route it." : undefined }]);
    if (id && REPLY[id]) {
      setReplying(id);
      setTimeout(() => { setPosts((p) => [...p, { room, who: id, text: REPLY[id]!(t), thread, att: REPLY_ATT[id] }]); setReplying(null); }, 1700);
    }
  };
  const openRoom = (r: string) => { setRoom(r); setPage("room"); setThreadOf(null); setFindThread(false); };
  const openThread = (i: number) => { setThreadOf(i); setInsp(true); };
  // forward a message into another room (or a DM, which we show as a note here)
  const forward = (t: Target, text: string) => {
    if (t.kind === "room") setPosts((p) => [...p, { room: t.id, who: "sankritya", text: `Forwarded from #${room}: “${text}”` }]);
  };
  // hand a message to an agent: it gets an @ with the message quoted, and answers like any other @
  const askAbout = (id: Id, text: string) => send(`@${P[id].name} can you look at this: “${text.slice(0, 80)}${text.length > 80 ? "…" : ""}”`);
  const actions = { room, onForward: forward, onAsk: askAbout };

  const ask = L.ask;
  const focusLog = L.log.filter((l) => l.who === focus).slice(-6);
  const pending = ask ? 1 : 0;

  return (
    <div ref={frame} className="w-full" style={{ height: full ? "100svh" : H * scale }}>
      <div className={`ws origin-top-left overflow-hidden ${full ? "" : "rounded-[20px] border border-line shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)]"}`}
        style={full ? { width: "100%", height: "100%", minWidth: 1100 } : { width: W, height: H, transform: `scale(${scale})` }}>
        <SourceCtx.Provider value={{ ask: (id, t) => { setPage("room"); onView("chat"); send(`@${P[id].name} tell me more about “${t}”`); }, library: () => setPage("library") }}>
        <div className={`app ${insp && page === "room" ? "" : "noinsp"}`}>
          {/* rail */}
          <nav className="rail">
            <div className="logo"><Agent kind="casper" crop="head" className="size-full" /></div>
            <button className={page === "room" ? "on" : ""} title="Rooms" onClick={() => setPage("room")}><Ic d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /></button>
            <button className={page === "bell" ? "on" : ""} title="The bell" onClick={() => setPage("bell")}><Ic d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20a2 2 0 0 0 4 0" />{pending > 0 && <span className="dot" />}</button>
            <button className={page === "agents" ? "on" : ""} title="Agents" onClick={() => setPage("agents")}><Ic d="M6 20v-8a6 6 0 0 1 12 0v8l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5z" /></button>
            <button className={page === "library" ? "on" : ""} title="Library" onClick={() => setPage("library")}><Ic d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z M12 6v13.5" /></button>
            <button className={page === "settings" ? "on" : ""} title="Wing settings" onClick={() => setPage("settings")}><Ic d="M3.5 7h17v12h-17z M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7 M3.5 12h17" /></button>
            <button className={page === "usage" ? "on" : ""} title="Usage" onClick={() => setPage("usage")}><Ic d="M5 19V11 M10 19V6 M15 19v-5 M20 19V9" /></button>
            <span className="grow" />
            <button title="Search  ⌘K" onClick={() => setSearch(true)}><Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" /></button>
          </nav>

          {/* sidebar */}
          <aside className="side">
            <div className="side-top">
              <button className="space"><span className="sq">E</span>Engineering wing<Ic d="M7 10l5 5 5-5" s={14} /></button>
            <div className="acts">
              <button className="pill" onClick={() => setNewRoom(true)}><Ic d="M12 5v14M5 12h14" s={15} />New room</button>
              <button className="pill" onClick={() => setSummonOpen(true)} disabled={summoned.length >= SLOTS.length} title={summoned.length >= SLOTS.length ? "This room is full" : "Summon an agent"}><Ic d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z M12 9v6M9 12h6" s={15} />Summon</button>
            </div>
            </div>
            <div className="nav"><a className={page === "bell" ? "on" : ""} onClick={() => setPage("bell")}><Ic d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" s={16} />The bell{pending > 0 && <span className="badge">{pending}</span>}</a></div>
            <div className="lbl">Rooms in this wing</div>
            <div className="nav">
              {Object.keys(ROOMS).map((r) => (
                <a key={r} className={page === "room" && room === r ? "on" : ""} onClick={() => openRoom(r)}><span className="h">#</span>{r}</a>
              ))}
            </div>
            <div className="lbl"><span>Agents here</span><span>{here.length}</span></div>
            <div className="nav">
              {here.map((id) => (
                <a key={id} className={page === "room" && focus === id && insp ? "on" : ""} onClick={() => { setPage("room"); setThreadOf(null); setPinned(id); setInsp(true); }}>
                  <span className="av"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>
                  {P[id].name} <small>{id === "jack" ? "Claude Code" : id === "batty" ? "Codex · Kinjal" : id === "wick" ? "Growth" : id === "casper" ? "host" : SHORT[id]}</small>
                  <span className="st" style={{ background: speaker === id ? "var(--pumpkin)" : mood(id) === "sleep" ? "var(--ink-3)" : "var(--green)" }} />
                </a>
              ))}
            </div>
            <div className="lbl"><span>House crew</span><span>3</span></div>
            <div className="nav">
              {CREW.map((id) => (
                <a key={id}><span className="av"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>{P[id].name} <small>{P[id].sub}</small>
                  {speaker === id && <span className="st" style={{ background: "var(--pumpkin)" }} />}</a>
              ))}
            </div>
            {card && (
              <div className="crew-card">
                <button className="x" onClick={() => setCard(false)} aria-label="Dismiss">×</button>
                <div className="pic">{(["jack", "batty", "fatso"] as Id[]).map((id) => <span key={id}><Agent kind={P[id].kind!} mood="happy" className="size-full" /></span>)}</div>
                <b>Quite the manor you’ve got</b>
                <small>Share your crew photo with the team.</small>
                <button className="pill" onClick={() => setPhoto(true)}>View group photo</button>
              </div>
            )}
            <div className="me"><span className="pf" style={{ background: "#e2702f" }}>S</span><div><b>Sankritya</b><small>Owner</small></div></div>
          </aside>

          {/* main */}
          <section className={`main ${view === "chat" ? "chatmode" : ""} ${page !== "room" ? "hide" : ""}`}>
            <header className="head">
              <h1><span>#</span>{room}</h1>
              <div className="faces">
                <span className="pf" style={{ background: "#e2702f" }}>S</span><span className="pf" style={{ background: "#6f5fa8" }}>K</span>
                {here.map((id) => <span key={id} className="a"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>)}
              </div>
              <div className="seg">
                <button className={view === "canvas" ? "on" : ""} onClick={() => onView("canvas")}>Canvas</button>
                <button className={view === "chat" ? "on" : ""} onClick={() => onView("chat")}>Chat</button>
              </div>
              <button className={`icb ${findRoom ? "on" : ""}`} title="Search in this room  ⌘F" onClick={() => { onView("chat"); setFindRoom(!findRoom); }}><Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" /></button>
              <button className="pill">Share</button>
              <button className="icb" onClick={() => setInsp((v) => !v)} title="Toggle panel"><Ic d="M3.5 4.5h17v15h-17z M15 4.5v15" /></button>
            </header>

            {/* canvas */}
            <div ref={cvRef} className={`cv ${dragging === "pan" ? "panning" : ""} ${room !== "autopay-launch" ? "hide" : ""}`} onPointerDown={(e) => down(e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ backgroundPosition: `${cam.x}px ${cam.y}px`, backgroundSize: `${24 * cam.z}px ${24 * cam.z}px` }}>
              <div ref={world} className="world" style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})` }}>
                <svg className="wires" style={{ position: "absolute", inset: 0, width: 1600, height: 1000, overflow: "visible", pointerEvents: "none" }}>
                  {wires.map((w, i) => w.d && (
                    <path key={i} d={w.d} fill="none" stroke={w.c} strokeWidth={w.pulse ? 2 : 1.6} strokeDasharray={w.dash ? "4 5" : w.pulse ? "6 6" : undefined}
                      style={w.pulse ? { animation: "dash 0.9s linear infinite" } : undefined} />
                  ))}
                </svg>

                <div data-id="call" className={`n ${dragging === "call" ? "drag" : ""}`} style={{ left: pos.call.x, top: pos.call.y, width: 210 }} onPointerDown={(e) => down(e, "call")}>
                  <div className="k">From Tuesday’s call</div>
                  <ul><li>Autopay toggle on billing</li><li>API saves the setting</li><li>Launch clip and post</li><li>Changelog</li></ul>
                </div>
                <div data-id="mem" className={`n ${dragging === "mem" ? "drag" : ""}`} style={{ left: pos.mem.x, top: pos.mem.y, width: 210 }} onPointerDown={(e) => down(e, "mem")}>
                  <div className="k">Fatso remembered</div>
                  <div style={{ color: "var(--ink-2)", fontSize: 13, marginTop: 4 }}>“Autopay is opt-in, never on by default.” · Kinjal</div>
                </div>

                {TASKS.map((t) => {
                  const s = L.tasks[t.id] ?? { s: "open" as TS };
                  const [label, color] = TASK_LABEL[s.s];
                  return (
                    <div key={t.id} data-id={t.id} className={`n ${s.s === "review" ? "need" : ""} ${dragging === t.id ? "drag" : ""}`} style={{ left: pos[t.id].x, top: pos[t.id].y, width: 200 }} onPointerDown={(e) => down(e, t.id)}>
                      <div className="k" style={{ color }}><span className="dot" style={{ background: color }} />{label}</div>
                      <div className="t">{t.title}</div>
                      {s.by && <div className="by"><span className="av"><Agent kind={P[s.by].kind!} crop="head" className="size-full" /></span>{P[s.by].name}</div>}
                    </div>
                  );
                })}

                <div data-id="pcJ" className={`pc ${dragging === "pcJ" ? "drag" : ""}`} style={{ left: pos.pcJ.x, top: pos.pcJ.y, width: 240 }} onPointerDown={(e) => down(e, "pcJ")}>
                  <div className="bar"><i /><i /><i />Jack’s laptop<span className="live"><span className="dot" style={{ background: "var(--green)" }} />live</span></div>
                  <pre>
                    <b>~/acme</b> claude{"\n"}
                    {cur < 1 ? "● reading the call notes" : cur < 8 ? "● editing api/autopay.ts" : "✓ 6 tests pass"}{"\n"}
                    {cur >= 8 && cur < 10 ? "● merged batty/autopay-toggle\n" : ""}
                    {L.tasks.tApi?.s === "review" ? "● waiting for Sankritya" : L.tasks.tApi?.s === "shipped" ? "✓ pushed to main" : "● running tests"}
                  </pre>
                </div>
                <div data-id="pcW" className={`pc ${dragging === "pcW" ? "drag" : ""}`} style={{ left: pos.pcW.x, top: pos.pcW.y, width: 230, borderColor: L.tasks.tPost?.s === "recording" ? "rgba(239,107,107,.6)" : undefined }} onPointerDown={(e) => down(e, "pcW")}>
                  <div className="bar"><i /><i /><i />Wick’s computer
                    {L.tasks.tPost?.s === "recording" ? <span className="rec"><i />REC</span> : L.tasks.tPost?.s === "posted" ? <span className="live">posted</span> : <span className="live" style={{ color: "var(--ink-3)" }}>asleep</span>}
                  </div>
                  <div style={{ margin: 10, background: "#f6f5f2", borderRadius: 7, padding: "8px 10px", color: "#222", fontSize: 11, opacity: ["recording", "posted"].includes(L.tasks.tPost?.s ?? "") ? 1 : 0.3 }}>
                    <b>Billing</b>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e3e1dc", borderRadius: 6, padding: "5px 8px", marginTop: 5, background: "#fff" }}>
                      Pay automatically each month<span style={{ width: 22, height: 12, borderRadius: 99, background: "var(--pumpkin)" }} />
                    </div>
                  </div>
                </div>

                {[...here, ...CREW].map((id) => (
                  <div key={id} data-id={id} className={`agent ${focus === id ? "sel" : ""} ${dragging === id ? "drag" : ""} ${summoned.includes(id) ? "rise" : ""}`} style={{ left: pos[id].x, top: pos[id].y }}
                    onPointerDown={(e) => down(e, id)} onClick={() => { if (here.includes(id)) { setPinned(id); setInsp(true); } }}>
                    <div className={`say ${speaker === id ? "on" : ""}`}>{speaker === id ? ev?.text : ""}</div>
                    <div className="fig" style={CREW.includes(id) ? { width: 76, height: 92 } : undefined}><Agent kind={P[id].kind!} mood={mood(id)} className="size-full" /></div>
                    <div className="tag">{P[id].name}<small>· {speaker === id ? "talking" : mood(id) === "sleep" ? "waiting" : SHORT[id]}</small>
                      {speaker === id && <span className="dot" style={{ background: "var(--pumpkin)" }} />}</div>
                  </div>
                ))}

                {ask && (
                  <div data-id="ask" className={`n need ${dragging === "ask" ? "drag" : ""}`} style={{ left: pos.ask.x, top: pos.ask.y, width: 256 }} onPointerDown={(e) => down(e, "ask")}>
                    <div className="k">Needs {P[ask.for].name}</div>
                    <div className="t">{ask.title}</div>
                    <div className="by"><span className="av"><Agent kind={P[ask.for === "sankritya" ? "jack" : "wick"].kind!} crop="head" className="size-full" /></span>from {ask.for === "sankritya" ? "Jack" : "Wick"} · now</div>
                    <div className="row" style={{ marginTop: 10 }} onPointerDown={(e) => e.stopPropagation()}>
                      <button className="pill white" onClick={approve}>{ask.files ? "Approve and push" : "Approve"}</button>
                      <button className="pill" onClick={() => { setPinned(ask.for === "sankritya" ? "jack" : "wick"); setInsp(true); }}>Details</button>
                    </div>
                  </div>
                )}

                {(["sankritya", "kinjal"] as Human[]).map((h) => {
                  const at = cursorAt(h);
                  return (
                    <div key={h} className="cursor" style={{ left: at.x, top: at.y }}>
                      <svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 2l14 7-6 1.6L8.4 17z" fill={P[h].color} stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                      <div className="lb" style={{ background: P[h].color }}><b>{P[h].name}</b>{human === h && ev?.text}</div>
                    </div>
                  );
                })}
              </div>

              <div className="hint">Drag to move around · drag any card · pinch to zoom</div>
              <div className="wall"><Ic d="M5 11h14v9H5z M8 11V8a4 4 0 0 1 8 0v3" s={14} />Engineering wing only</div>
              <div className="zoom" onPointerDown={(e) => e.stopPropagation()}>
                <button onClick={() => zoomBy(0.88)}>−</button><span>{Math.round(cam.z * 100)}%</span><button onClick={() => zoomBy(1.12)}>+</button><button onClick={fit} style={{ width: "auto", padding: "0 8px" }}>Fit</button>
              </div>
              <div className="tools" onPointerDown={(e) => e.stopPropagation()}>
                <button className="on">Move <kbd>V</kbd></button><button onClick={() => setSummonOpen(true)}>Summon <kbd>O</kbd></button><button>Computer <kbd>F</kbd></button><button>Connect <kbd>C</kbd></button>
              </div>
            </div>

            {room !== "autopay-launch" && view === "canvas" && (
              <div className="cv">
                <div className="hint">#{room} · {ROOMS[room].topic}</div>
                {ROOMS[room].cards.map((c, k) => (
                  <div key={k} className={`n ${c.k.startsWith("Needs") ? "need" : ""}`} style={{ left: 60 + k * 260, top: 90, width: 230 }}>
                    <div className="k">{c.k}</div><div className="t">{c.t}</div>
                    {c.by && <div className="by"><span className="av"><Agent kind={P[c.by].kind!} crop="head" className="size-full" /></span>{P[c.by].name}</div>}
                  </div>
                ))}
                {[...new Set([...ROOMS[room].msgs.map((m) => m.who), ...posts.filter((x) => x.room === room).map((x) => x.who)])].filter((w) => P[w].kind).map((w, k) => (
                  <div key={w} className="agent" style={{ left: 80 + k * 150, top: 300 }}>
                    <div className="fig"><Agent kind={P[w].kind!} className="size-full" /></div><div className="tag">{P[w].name}</div>
                  </div>
                ))}
              </div>
            )}

            {page === "room" && done && !full && room === "autopay-launch" && (
              <button className="replay" onClick={replay}><Ic d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5" s={15} />Replay the demo</button>
            )}

            {/* chat */}
            {findRoom && view === "chat" && <div className="find-room"><FindBar key={room} scope={chatRef} label={`#${room}`} onClose={() => setFindRoom(false)} /></div>}
            <div ref={chatRef} className="chat" style={{ userSelect: "text" }}>
              <div className="thread">
                <div className="intro">
                  <span>This is #{room}, in the Engineering wing.</span>
                  <span>Agents here only answer when you @ them, and ask first before they <b>push, spend or post</b>.</span>
                </div>
                {room === "autopay-launch" ? (
                  <>
                    <div className="day">Tuesday</div>
                    {shown.map((e, i) => THREAD_OF[i] === undefined && (
                      <Bubble key={i} {...actions} k={String(i)} who={e.who} text={e.text} meta={`${P[e.who].kind ? P[e.who].sub + " · " : ""}${clock(i)} PM`} to={e.to}
                        flash={flash === i} att={ATT[i]} rx={[...seed(String(i)), ...(extra[String(i)] ?? []).map((x) => [x, 0] as [string, number])]} mine={mine} react={react} onThread={() => openThread(i)}>
                        {e.ask && <AskCard ask={e.ask} by={e.who} done={cur > i} onYes={approve} />}
                        <Replies n={shown.filter((_, k) => THREAD_OF[k] === i).length + posts.filter((p) => p.room === room && p.thread === i).length} who={[...shown.filter((_, k) => THREAD_OF[k] === i).map((x) => x.who), ...posts.filter((p) => p.room === room && p.thread === i).map((p) => p.who)]} onOpen={() => openThread(i)} />
                      </Bubble>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="day">{ROOMS[room].msgs[0]?.at === "now" ? "Today" : "Earlier"}</div>
                    {ROOMS[room].msgs.map((m, k) => (
                      <Bubble key={k} {...actions} k={`${room}-${k}`} who={m.who} text={m.text} meta={`${P[m.who].kind ? P[m.who].sub + " · " : ""}${m.at}`} rx={(extra[`${room}-${k}`] ?? []).map((x) => [x, 0] as [string, number])} mine={mine} react={react}>
                        {k === 0 && m.who === "casper" && ROOMS[room].cards.some((c) => c.k === "Open") && (
                          <div className="tasks">{ROOMS[room].cards.filter((c) => c.k === "Open").map((c) => <div key={c.t}><span className="dot" style={{ background: "var(--ink-3)" }} />{c.t}<small>open · claim it</small></div>)}</div>
                        )}
                      </Bubble>
                    ))}
                  </>
                )}
                {posts.map((p, k) => p.room === room && p.thread === undefined && (
                  <Bubble key={`p${k}`} {...actions} k={`p${k}`} who={p.who} text={p.text} meta={`${P[p.who].kind ? P[p.who].sub + " · " : ""}now`} att={p.att} rx={(extra[`p${k}`] ?? []).map((x) => [x, 0] as [string, number])} mine={mine} react={react}>
                    {p.note && <div className="note-sys" style={{ textAlign: "left" }}>{p.note}</div>}
                  </Bubble>
                ))}
              </div>
            </div>
            <div className="compose">
              <TypingBar who={replying && threadOf === null ? replying : !done && room === "autopay-launch" && cur >= 0 && cur < SCRIPT.length - 1 ? SCRIPT[cur + 1].who : draft ? "sankritya" : null} />
              <Composer value={draft} set={setDraft} onSend={(t, a) => send(t, undefined, a)} placeholder={`Message #${room}, @ an agent to get an answer`} />
            </div>
          </section>

          {page === "bell" && <BellPage ask={ask} onApprove={approve} goRoom={openRoom} />}
          {page === "agents" && <AgentsPage speaking={speaker} open={(id) => { setPage("room"); setPinned(id); setThreadOf(null); setInsp(true); onView("canvas"); }} />}
          {page === "library" && <LibraryPage />}
          {page === "settings" && <SettingsPage />}
          {page === "usage" && <UsagePage />}

          {/* inspector: an agent, or a thread */}
          {threadOf !== null && page === "room" ? (
            <aside className={`insp ${insp ? "" : "hide"}`} style={{ gridTemplateRows: "auto minmax(0,1fr) auto" }}>
              <div className="th-h"><div><b>Thread</b><small>#{room}</small></div><span style={{ flex: 1 }} /><button className={`x ${findThread ? "on" : ""}`} title="Search in this thread  ⌘F" onClick={() => setFindThread(!findThread)}><Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" s={16} /></button><button className="x" onClick={() => { setThreadOf(null); setFindThread(false); }}><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button></div>
              {findThread && <FindBar key={`t${threadOf}`} scope={threadRef} label="this thread" onClose={() => setFindThread(false)} />}
              <div ref={threadRef} className="ib th">
                <Bubble {...actions} k={String(threadOf)} who={SCRIPT[threadOf].who} text={SCRIPT[threadOf].text} meta={`${clock(threadOf)} PM`} rx={[]} mine={mine} react={react} />
                <div className="rule-line"><span>Replies</span></div>
                {shown.map((e, k) => THREAD_OF[k] === threadOf && (
                  <Bubble key={k} {...actions} k={String(k)} who={e.who} text={e.text} meta={`${P[e.who].kind ? P[e.who].sub + " · " : ""}${clock(k)} PM`} att={ATT[k]} rx={seed(String(k))} mine={mine} react={react}>
                    {k === 5 && (
                      <details className="why" open><summary>How Jack got here <span>from its own run · 3 steps</span></summary>
                        <ol><li><code>read</code> api/billing/charge.ts <span>reads autopay on every bill</span></li><li><code>ran</code> explain on the billing query <span>a join added 38 ms</span></li><li><code>asked</code> Fatso <span>“autopay is opt-in”</span></li></ol></details>
                    )}
                    {k === 6 && <div className="dec"><span className="k">Decision · Library</span><b>Autopay is opt-in, stored as one column</b><small>Asked by Kinjal · answered by Jack</small></div>}
                  </Bubble>
                ))}
                {posts.map((p, k) => p.room === room && p.thread === threadOf && (
                  <Bubble key={`t${k}`} {...actions} k={`p${k}`} who={p.who} text={p.text} meta="now" att={p.att} rx={[]} mine={mine} react={react} />
                ))}
                {replying && <div className="typing"><span className="av"><Agent kind={P[replying].kind!} crop="head" className="size-full" /></span>{P[replying].name} is replying<i /><i /><i /></div>}
              </div>
              <div className="ask"><Composer value={tdraft} set={setTdraft} onSend={(t, a) => send(t, threadOf, a)} placeholder="Reply in the thread, @ an agent" /></div>
            </aside>
          ) : (
          <aside className={`insp ${insp && page === "room" ? "" : "hide"}`}>
            <div className="ih">
              <span className="av"><Agent kind={P[focus].kind!} crop="head" mood={mood(focus)} className="size-full" /></span>
              <div><b>{P[focus].name}</b><small>{P[focus].sub} · {focus === "wick" ? "can read" : "can act"}</small></div>
              <button className="x" onClick={() => setInsp(false)}><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button>
            </div>
            <div className="itabs">
              {(["work", "screen", "rules"] as const).map((t) => <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>{t}</button>)}
            </div>
            <div className="ib">
              {tab === "work" && (
                <>
                  {ask && ((ask.for === "sankritya" && focus === "jack") || (ask.for === "kinjal" && focus === "wick")) && <div style={{ marginBottom: 6 }}><AskCard ask={ask} done={false} onYes={approve} /></div>}
                  <div className="act">
                    {focusLog.length === 0 && !posts.some((p) => p.who === focus) && <div>Nothing yet in this room.</div>}
                    {focusLog.map((l) => (
                      <div key={l.n}><span className="av"><Agent kind={P[l.who].kind!} crop="head" className="size-full" /></span><span>{l.text}</span><small>{clock(l.n)}</small></div>
                    ))}
                    {posts.filter((p) => p.who === focus).map((p, k) => (
                      <div key={`a${k}`}><span className="av"><Agent kind={P[focus].kind!} crop="head" className="size-full" /></span><span>{summoned.includes(focus) && k === 0 ? `Joined #${p.room}` : p.text.length > 42 ? p.text.slice(0, 42) + "…" : p.text}</span><small>now</small></div>
                    ))}
                  </div>
                </>
              )}
              {tab === "screen" && (
                <div className="screen">
                  <div className="site"><b>Billing</b><div className="r">Pay automatically each month<span className="tg" /></div><div className="r" style={{ color: "#999" }}>Email receipts</div></div>
                  <TakeOver who={P[focus].name} />
                </div>
              )}
              {tab === "rules" && (
                <>
                  <div className="rule">Can read<span>yes</span></div>
                  <div className="rule">Can act<span>{focus === "wick" ? "no" : "yes"}</span></div>
                  <div className="rule">Asks first for<span>push, spend, post</span></div>
                  <div className="rule">Approver<span>{focus === "batty" ? "Kinjal" : "Sankritya, then Kinjal"}</span></div>
                </>
              )}
            </div>
            <form className="ask" onSubmit={(e) => { e.preventDefault(); if (tdraft.trim()) { send(`@${P[focus].name} ${tdraft}`); setTdraft(""); onView("chat"); } }}>
              <div className="box"><input className="bare" value={tdraft} onChange={(e) => setTdraft(e.target.value)} placeholder={`Ask ${P[focus].name} why…`} />
                <div className="bt"><span>@</span><span style={{ fontSize: 12 }}>{focus === "batty" ? "Codex" : summoned.includes(focus) ? SHORT[focus] : "Claude Code"}</span><button type="submit" className="send" aria-label="Send"><Ic d="M12 19V5M6 11l6-6 6 6" s={16} /></button></div></div>
            </form>
          </aside>
          )}
        </div>
        </SourceCtx.Provider>
        {search && <Search onClose={() => setSearch(false)} shown={shown} goMsg={goMsg} pin={(id) => { setPinned(id); setInsp(true); onView("canvas"); }} />}
        {photo && <GroupPhoto onClose={() => setPhoto(false)} />}
        {summonOpen && <Summon room={room} open={ROOMS[room]?.cards.filter((c) => c.k === "Open").map((c) => c.t) ?? []} onClose={() => setSummonOpen(false)} onSummon={summon} />}
        {newRoom && <NewRoom onClose={() => setNewRoom(false)} onCreate={(r) => {
          ROOMS[r.slug] = { topic: r.topic, msgs: r.msgs, cards: r.cards };
          setNewRoom(false); openRoom(r.slug); onView("chat");
        }} />}
      </div>
    </div>
  );
}
