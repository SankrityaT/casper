"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { Bubble, Composer, type Mentionable } from "@/components/ws/Chat";
import { P, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { HUB, me, kindFor, answer, derive, hookSetup, hush, liveMode, mcpCommand, post, shareCall, useLive, type LiveEv } from "@/lib/live";

/* A live room: what the hub (or the Relay mirror) says happened, in seq order.
   Agents argue on Relay; only what needs a person reaches the room. Hush holds an agent's lines without stopping its work. */

const ME_DEFAULT = "sankritya";
/* agents that joined at runtime (summoned, or someone's own) get a seat in the cast so bubbles show them properly */
function meet(name: string) {
  const k = name.toLowerCase().split("#")[0] as Id;
  if (P[k] || ["sankritya", "kinjal", "you"].includes(k)) return;
  (P as Record<string, (typeof P)[Id]>)[k] = { name: k.charAt(0).toUpperCase() + k.slice(1), kind: kindFor(k) as never, sub: "agent" } as (typeof P)[Id];
}
const idOf = (name: string): Id | null => {
  const k = name.toLowerCase().split("#")[0] as Id;
  return P[k] ? k : null;
};
const nameOf = (name: string) => { const id = idOf(name); return id ? P[id].name : name; };
const AGENTS_HERE = ["jack", "batty", "wick"] as const;

function Face({ who, size = 22 }: { who: string; size?: number }) {
  const id = idOf(who);
  if (id && P[id].kind) return <span className="lv-face" style={{ width: size, height: size }}><Agent kind={P[id].kind!} crop="head" still className="size-full" /></span>;
  if (!id && !["sankritya", "kinjal", "you"].includes(who.toLowerCase())) return <span className="lv-face" style={{ width: size, height: size }}><Agent kind={kindFor(who.toLowerCase().split("#")[0]) as never} crop="head" still className="size-full" /></span>;
  const c = id ? P[id].color : "#6f8fc7";
  return <span className="lv-face human" style={{ width: size, height: size, background: c }}>{nameOf(who)[0]?.toUpperCase()}</span>;
}

function Sys({ who, children, tone }: { who: string; children: React.ReactNode; tone?: "warn" | "ok" | "quiet" }) {
  return <div className={`lv-sys ${tone ?? ""}`}><Face who={who} size={18} /><span>{children}</span></div>;
}

function BellCard({ ev, done, room }: { ev: LiveEv; done?: { yes: boolean; by: string }; room: string }) {
  const [busy, setBusy] = useState(false);
  const files = (ev.meta?.files as string[] | undefined) ?? [];
  const forWho = String(ev.meta?.for ?? me());
  const go = async (yes: boolean) => { setBusy(true); try { await answer(room, String(ev.meta?.askId), yes, me()); } finally { setBusy(false); } };
  return (
    <div className={`lv-bell ${done ? (done.yes ? "yes" : "no") : ""}`}>
      <div className="lv-bell-k">{done ? (done.yes ? `Approved by ${nameOf(done.by)}` : `${nameOf(done.by)} said not now`) : `Needs ${nameOf(forWho)}`}</div>
      <div className="lv-bell-t">{String(ev.meta?.title ?? ev.text)}</div>
      {files.length > 0 && <div className="lv-files">{files.map((f) => <code key={f}>{f}</code>)}</div>}
      {!done && (
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="pill white" disabled={busy} onClick={() => go(true)}>{files.length ? "Approve and push" : "Approve"}</button>
          <button className="pill" disabled={busy} onClick={() => go(false)}>Not now</button>
        </div>
      )}
    </div>
  );
}


/* An agent's computer, live: JPEG frames over a WebSocket from agent-browser in the VM. Take over hands you the
   mouse and keyboard; the agent's own clicks wait until you hand it back. */
function Computer({ stream, agent }: { stream: string; agent: string }) {
  const img = useRef<HTMLImageElement>(null);
  const sock = useRef<WebSocket | null>(null);
  const [st, setSt] = useState<"connecting" | "live" | "down">("connecting");
  const [url, setUrl] = useState("");
  const [mine, setMine] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let dead = false, t: ReturnType<typeof setTimeout>;
    const go = () => {
      if (dead) return;
      const ws = new WebSocket(stream.replace(/^http/, "ws"));
      sock.current = ws;
      ws.onopen = () => setSt("live");
      ws.onmessage = (m) => {
        try {
          const d = JSON.parse(String(m.data));
          if (d.type === "frame" && img.current) img.current.src = `data:image/jpeg;base64,${d.data}`;
          else if (d.url || d.type === "url") setUrl(String(d.url ?? ""));
          else if (d.type === "takeover") setMine(!!d.on && d.by === nameOf(me()));
        } catch { /* skip */ }
      };
      ws.onclose = () => { setSt("down"); t = setTimeout(go, 2000); };
    };
    go();
    return () => { dead = true; clearTimeout(t); sock.current?.close(); };
  }, [stream]);
  const send = (m: unknown) => { if (sock.current?.readyState === 1) sock.current.send(JSON.stringify(m)); };
  const take = (on: boolean) => { send({ type: "takeover", on, by: nameOf(me()) }); setMine(on); };
  const point = (e: React.MouseEvent<HTMLImageElement>, type: string) => {
    if (!mine || !img.current) return;
    const r = img.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * (img.current.naturalWidth || 1280));
    const y = Math.round(((e.clientY - r.top) / r.height) * (img.current.naturalHeight || 720));
    send({ type: "input_mouse", eventType: type, x, y, button: "left", clickCount: 1 });
  };
  return (
    <div className="lv-pc">
      <div className="lv-pc-h">
        <Face who={agent} size={18} /><b>{nameOf(agent)}’s computer</b>
        <span className={`lv-st ${st === "live" ? "live" : "offline"}`}><i />{st === "live" ? (mine ? "You have it" : "Live") : st === "down" ? "Reconnecting…" : "Connecting…"}</span>
        {url && <small className="lv-pc-url">{url}</small>}
        <span className="lv-grow" />
        {open && <button className={`pill ${mine ? "" : "white"}`} onClick={() => take(!mine)}>{mine ? "Hand it back" : "Take over"}</button>}
        <button className="pill" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <div className={`lv-pc-screen ${mine ? "mine" : ""}`} tabIndex={0}
          onKeyDown={(e) => { if (mine) { e.preventDefault(); send({ type: "input_keyboard", eventType: "keyDown", key: e.key, text: e.key.length === 1 ? e.key : undefined }); } }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={img} alt={`${nameOf(agent)}’s screen`} onMouseDown={(e) => point(e, "mousePressed")} onMouseUp={(e) => point(e, "mouseReleased")} draggable={false} />
          {st !== "live" && <div className="lv-pc-wait">Waiting for the screen…</div>}
        </div>
      )}
    </div>
  );
}

/* A boat.dev VM's full desktop, embedded (view-only unless the agent hands it over). */
function Desktop({ url, agent, vm }: { url: string; agent: string; vm: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="lv-pc">
      <div className="lv-pc-h">
        <Face who={agent} size={18} /><b>{nameOf(agent)}’s computer</b>
        <span className="lv-st live"><i />Live</span>{vm && <small className="lv-pc-url">boat {vm}</small>}
        <span className="lv-grow" />
        <a className="pill" href={url} target="_blank" rel="noopener noreferrer">Open full screen ↗</a>
        <button className="pill" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && <div className="lv-pc-screen"><iframe src={url} title={`${nameOf(agent)}’s computer`} allow="clipboard-read; clipboard-write; fullscreen" style={{ width: "100%", height: "100%", border: 0 }} /></div>}
    </div>
  );
}

/* A call, right in the room: the browser transcribes as you talk; End call turns what you agreed into tasks. */
type SR = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; onresult: (e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void; onend: () => void; onerror: (e: { error: string }) => void };
function LiveCall({ room, onDone }: { room: string; onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [secs, setSecs] = useState(0);
  const rec = useRef<SR | null>(null);
  const want = useRef(false);
  useEffect(() => { if (!on) return; const t = setInterval(() => setSecs((x) => x + 1), 1000); return () => clearInterval(t); }, [on]);
  const start = () => {
    const C = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;
    if (!C) { setErr("This browser can't transcribe. Use Chrome, or paste the notes below."); return; }
    const r = new C(); r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) { if (t) setLines((x) => [...x, t]); } else tmp += t + " ";
      }
      setInterim(tmp);
    };
    r.onerror = (e) => { if (e.error !== "no-speech") setErr(`Microphone: ${e.error}`); };
    r.onend = () => { if (want.current) try { r.start(); } catch { /* restarting */ } };
    rec.current = r; want.current = true; r.start(); setOn(true); setErr("");
  };
  const end = async () => {
    want.current = false; rec.current?.stop(); setOn(false);
    const text = [...lines, interim].join("\n").trim();
    if (!text) { setErr("Nothing was said yet."); return; }
    setBusy(true);
    try { await shareCall(room, text, me()); onDone(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <div className="lv-call">
      <div className="lv-call-h">
        <span className={`lv-call-dot ${on ? "on" : ""}`} />
        <b>{on ? `On a call · ${mm}` : busy ? "Turning the call into tasks…" : "Start a call in this room"}</b>
        <span className="lv-grow" />
        {!on && !busy && <button className="pill white" onClick={start}>Start call</button>}
        {on && <button className="pill white" onClick={end}>End call</button>}
        <button className="pill" onClick={() => { want.current = false; rec.current?.stop(); onDone(); }}>Close</button>
      </div>
      <div className="lv-call-body">
        {lines.length === 0 && !interim && <small>{on ? "Listening. Talk about what to build; Casper writes it down." : "Everyone in the room sees the transcript live. When you end the call, Casper turns what you agreed into tasks, and Stretch puts agents on them."}</small>}
        {lines.map((l, i) => <p key={i}>{l}</p>)}
        {interim && <p className="interim">{interim}</p>}
      </div>
      {err && <small className="kerr">{err}</small>}
    </div>
  );
}

export default function LiveRoom({ room, onSummon }: { room: string; onSummon?: () => void }) {
  const s = useLive(room);
  const d = useMemo(() => { s.evs.forEach((e) => meet(e.from)); return derive(s.evs); }, [s.evs]);
  const [back, setBack] = useState(false);
  const [draft, setDraft] = useState("");
  const [steer, setSteer] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const near = useRef(true);
  useEffect(() => {
    const el = list.current?.closest(".chat") as HTMLElement | null;
    if (el && near.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [d.visible.length, back]);
  useEffect(() => {
    const el = list.current?.closest(".chat") as HTMLElement | null;
    if (!el) return;
    const on = () => { near.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160; };
    el.addEventListener("scroll", on);
    return () => el.removeEventListener("scroll", on);
  }, []);

  const mention = draft.match(/@([\w.-]+)/)?.[1]?.toLowerCase();
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    post(room, me(), t, mention ? { to: mention, mode: steer ? "steer" : "wait" } : undefined);
    setDraft(""); setSteer(false);
  };
  const digestAt = new Map(d.digests.map((g) => [g.at, g]));
  const empty = s.evs.every((e) => e.from === "casper" && !e.meta?.tasks);
  const titleOf = (task: string) => d.tasks.find((t) => t.id === task)?.title ?? task;
  const [panel, setPanel] = useState<null | "call" | "connect" | "live">(null);
  const [workers, setWorkers] = useState<{ name: string; running: boolean }[]>([]);
  useEffect(() => {
    if (!HUB.url) return;
    const load = () => fetch(`${HUB.url}/room/${encodeURIComponent(room)}/agents`).then((r) => r.json()).then((x) => Array.isArray(x) && setWorkers(x)).catch(() => {});
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, [room]);
  const stopWorker = (n: string) => fetch(`${HUB.url}/room/${encodeURIComponent(room)}/summon/${encodeURIComponent(n)}/stop`, { method: "POST" }).then(() => setWorkers((w) => w.map((x) => (x.name === n ? { ...x, running: false } : x))));
  const [call, setCall] = useState("");
  const [callBusy, setCallBusy] = useState(false);
  const [callErr, setCallErr] = useState("");
  const [callSrc, setCallSrc] = useState("Zoom");
  const [agentName, setAgentName] = useState("");
  const [copied, setCopied] = useState(false);
  const here = (() => {
    const seen = [...new Set(s.evs.map((e) => e.from.toLowerCase().split("#")[0]).filter((f) => !["sankritya", "kinjal", "you", "casper", "stretch"].includes(f)))];
    return seen.length ? seen.slice(0, 5) : s.status === "sim" ? [...AGENTS_HERE] : [];
  })();
  const mentionable: Mentionable[] = [
    ...here.map((n) => ({ handle: n, name: nameOf(n), sub: "agent in this room", face: <Agent kind={kindFor(n) as never} crop="head" className="size-full" /> })),
    { handle: "casper", name: "Casper", sub: "host · answers from this room's history", face: <Agent kind="casper" crop="head" className="size-full" /> },
    ...["sankritya", "kinjal"].filter((h) => h !== me()).map((h) => ({ handle: h, name: nameOf(h), sub: "person", color: P[h as Id]?.color, face: nameOf(h)[0] })),
  ];
  const sendCall = async () => {
    setCallBusy(true); setCallErr("");
    try { await shareCall(room, call, me(), callSrc); setCall(""); setPanel(null); }
    catch (e) { setCallErr((e as Error).message); } finally { setCallBusy(false); }
  };
  const status = s.status === "live" ? "Live" : s.status === "sim" ? "Simulated run" : s.status === "offline" ? "Reconnecting…" : "Connecting…";

  return (
    <div className="lv" ref={list}>
      {empty && (
        <div className="lv-blank">
          <div className="lv-blank-fig"><Agent kind="casper" mood="happy" className="size-full" /></div>
          <h2>#{room} is quiet</h2>
          <p>{(() => { const t = s.evs.find((e) => e.from === "casper")?.text.replace(/^Welcome to #[\w.-]+\.\s*/, "").trim() || "Nothing has happened here yet"; return /[.!?]$/.test(t) ? t : `${t}.`; })()} Start a call and Stretch puts agents to work on what you agree, each on its own computer. They report back here, and only what matters reaches you.</p>
          <div className="lv-blank-acts">
            <button className="primary" onClick={() => setPanel("live")}><b>Start a call</b><small>Talk it through here. Casper writes it down and turns it into tasks.</small></button>
            <button onClick={() => onSummon?.()}><b>Summon an agent</b><small>A Claude Code agent on its own boat.dev computer, working on a branch.</small></button>
            <button onClick={() => setPanel("connect")}><b>Connect your agent</b><small>One command joins your own Claude Code or Codex to this room.</small></button>
          </div>
        </div>
      )}
      {!empty && <div className="lv-strip">
        <span className={`lv-st ${s.status}`}><i />{status}</span>
        <span className="lv-count" title="Every message agents sent, on Relay and in the room, versus the ones that reached a person">
          <b>{d.agentTotal}</b> agent messages · <b>{d.reached}</b> reached you{d.quiet ? <> · Stretch kept <b>{d.quiet}</b> quiet</> : null}
        </span>
        <span className="lv-grow" />
        <button className={`lv-hush ${panel === "live" ? "on" : ""}`} onClick={() => setPanel(panel === "live" ? null : "live")} title="Start a call in this room">Start a call</button>
        <button className={`lv-hush ${panel === "call" ? "on" : ""}`} onClick={() => setPanel(panel === "call" ? null : "call")} title="Paste a call transcript; Casper turns what you agreed into tasks">
          <Ic d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" s={13} />Share a call</button>
        <button className={`lv-hush ${panel === "connect" ? "on" : ""}`} onClick={() => setPanel(panel === "connect" ? null : "connect")} title="Bring your own agent into this room">
          <Ic d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" s={13} />Connect an agent</button>
        {here.map((a) => {
          const on = d.hushed.has(a);
          const held = d.held[a]?.length ?? 0;
          return (
            <button key={a} className={`lv-hush ${on ? "on" : ""}`} onClick={() => hush(room, a, !on, me())} title={on ? `Let ${nameOf(a)} talk again` : `Hush ${nameOf(a)}: it keeps working, its messages wait`}>
              <Face who={a} size={18} />{on ? `Unhush ${nameOf(a)}${held ? ` · ${held} held` : ""}` : `Hush ${nameOf(a)}`}
            </button>
          );
        })}
      </div>}

      {workers.some((w) => w.running) && (
        <div className="lv-workers">
          {workers.filter((w) => w.running).map((w) => (
            <span key={w.name} className="lv-worker"><i />{nameOf(w.name)} is working on its own branch<button className="lv-link" onClick={() => stopWorker(w.name)}>Stop</button></span>
          ))}
        </div>
      )}
      {panel === "live" && <LiveCall room={room} onDone={() => setPanel(null)} />}
      {panel === "call" && (
        <div className="lv-panel">
          <b>Share a call</b>
          <small>Paste the transcript. Casper lists what you agreed as tasks, and Stretch puts agents on them.</small>
          <div className="chips">{["Zoom", "Google Meet", "Granola", "notes"].map((x) => <button key={x} className={`chip ${callSrc === x ? "on" : ""}`} onClick={() => setCallSrc(x)}>{x}</button>)}</div>
          <textarea value={call} onChange={(e) => setCall(e.target.value)} rows={6} placeholder="Sankritya: the last feature today is Hush…" aria-label="Call transcript" />
          {callErr && <small className="kerr">{callErr}</small>}
          <div className="row" style={{ gap: 8 }}>
            <button className="pill white" disabled={!call.trim() || callBusy} onClick={sendCall}>{callBusy ? "Reading the call…" : "Turn it into tasks"}</button>
            <button className="pill" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </div>
      )}
      {panel === "connect" && (
        <div className="lv-panel">
          <b>Connect an agent to #{room}</b>
          <small>Run this where your agent lives (Claude Code shown; any MCP client works). It can read the room, claim tasks, post, and ring the bell. It runs on your own keys.</small>
          <input value={agentName} onChange={(e) => setAgentName(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))} placeholder="Name your agent, e.g. jack" aria-label="Agent name" />
          <code className="lv-cmd">{mcpCommand(room, agentName)}</code>
          <small>Optional: make it ask before every <code>git push</code>. The first push rings the bell with the commits and files; once someone approves, the same push goes through. If the hub can't be reached, the push stays blocked.</small>
          <code className="lv-cmd">{hookSetup(room, agentName)}</code>
          <div className="row" style={{ gap: 8 }}>
            <button className="pill white" onClick={() => { navigator.clipboard?.writeText(mcpCommand(room, agentName)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy command"}</button>
            <button className="pill" onClick={() => setPanel(null)}>Done</button>
          </div>
        </div>
      )}

      {d.tasks.length > 0 && (
        <div className="lv-tasks">
          {d.tasks.map((t) => {
            const owner = (d.claims[t.title] ?? d.claims[t.id]);
            return (
              <div key={t.id} className={`lv-task ${owner ? "owned" : ""}`} title={t.why}>
                <span className="lv-task-k">{owner ? "Claimed" : "Open"}</span>
                <b>{t.title}</b>
                {owner ? <small><Face who={owner} size={14} />{nameOf(owner)}</small> : <small>claim it</small>}
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(d.claims).filter((t) => !d.tasks.some((x) => x.title === t)).length > 0 && (
        <div className="lv-claims">
          {Object.entries(d.claims).filter(([t]) => !d.tasks.some((x) => x.title === t || x.id === t)).map(([task, owner]) => (
            <span key={task} className="lv-claim"><Face who={owner} size={16} /><b>{task}</b><small>{nameOf(owner)}</small></span>
          ))}
        </div>
      )}

      {(() => {
        // one screen per agent: the latest stream (agent-browser frames) or boat desktop it announced
        const byAgent = new Map<string, LiveEv>();
        for (const e of s.evs) if (e.kind === "computer" && (typeof e.meta?.stream === "string" || typeof e.meta?.desktopUrl === "string")) byAgent.set(String(e.meta?.agent ?? e.from), e);
        return [...byAgent.entries()].map(([agent, e]) => typeof e.meta?.stream === "string"
          ? <Computer key={agent} stream={String(e.meta!.stream)} agent={agent} />
          : <Desktop key={agent} url={String(e.meta!.desktopUrl)} agent={agent} vm={String(e.meta?.vm ?? "")} />);
      })()}

      {!empty && d.visible.length === 0 && <div className="lv-empty">Waiting for the first event{liveMode() === "file" ? " from the Relay mirror" : ""}…</div>}

      {!empty && d.visible.map((e, i) => {
        const k = e.seq != null ? `s${e.seq}` : e.id ?? `i${i}`;
        const digest = digestAt.get(i);
        const node = (() => {
          if (e.kind === "claim") {
            const task = String(e.meta?.task ?? e.text);
            return e.meta?.ok === false
              ? <Sys who={e.from} tone="warn">{nameOf(e.from)} reached for <b>{titleOf(task)}</b>. {nameOf(String(e.meta?.owner ?? "someone"))} already has that one.</Sys>
              : <Sys who={e.from} tone="ok">{nameOf(e.from)} claimed <b>{titleOf(task)}</b></Sys>;
          }
          if (e.kind === "hush") {
            const t = nameOf(String(e.meta?.target ?? ""));
            return e.meta?.on
              ? <Sys who={e.from} tone="quiet">{nameOf(e.from)} hushed {t}. {t} keeps working; its messages wait here instead of pinging you.</Sys>
              : <Sys who={e.from} tone="quiet">{nameOf(e.from)} let {t} talk again.</Sys>;
          }
          if (e.kind === "approve") return null; // shown on the bell card itself
          if (e.kind === "computer") return <Sys who={e.from}><Ic d="M3 5h18v11H3z M8 20h8 M12 16v4" s={13} /> {e.text}</Sys>;
          if (e.kind === "bell") {
            const a = d.asks[String(e.meta?.askId)];
            return (
              <Bubble k={`${room}-${k}`} who={idOf(e.from) ?? "casper"} text={e.text} meta={`${nameOf(e.from)} · rang the bell`}>
                <BellCard ev={e} done={a?.done} room={room} />
              </Bubble>
            );
          }
          meet(e.from);
          const who = idOf(e.from) ?? "casper";
          const to = e.meta?.to ? idOf(String(e.meta.to)) ?? undefined : undefined;
          const steered = e.meta?.mode === "steer";
          return <Bubble k={`${room}-${k}`} who={who} to={to} text={idOf(e.from) ? e.text : `${e.from}: ${e.text}`} meta={`${P[who].kind ? P[who].sub : nameOf(e.from)}${steered ? " · steer" : ""}${e.kind === "relay" ? " · via Relay" : ""}${(e.meta?.triage as { act?: string } | undefined)?.act === "ask" ? " · Stretch: needs a decision" : ""}`} />;
        })();
        return (
          <div key={k}>
            {digest && digest.evs.length > 0 && (
              <div className="lv-digest">
                <div className="lv-digest-h"><Face who={digest.who} size={18} />While hushed, {nameOf(digest.who)} said {digest.evs.length} thing{digest.evs.length === 1 ? "" : "s"}</div>
                {digest.evs.map((x, j) => <div key={j} className="lv-digest-l">{x.text}</div>)}
              </div>
            )}
            {node}
          </div>
        );
      })}

      {!empty && d.typing.map((t) => (
        <div key={t} className="lv-typing"><Face who={t} size={22} /><span><b>{nameOf(t)}</b> is working on a reply</span><i /><i /><i /></div>
      ))}
      {!empty && <div className="lv-back">
        <button className="lv-back-b" onClick={() => setBack(!back)}>
          <Ic d={back ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} s={14} />{back ? "Hide" : "Show"} the agents’ backchannel on Relay ({d.backchannel.length})
        </button>
        {back && (
          <div className="lv-back-l">
            {d.backchannel.length === 0 && <small>Nothing yet.</small>}
            {d.backchannel.map((e, i) => (
              <div key={e.seq ?? i} className="lv-rl">
                <Face who={e.from} size={16} /><b>{nameOf(e.from)}</b><span>→ {e.meta?.to ? nameOf(String(e.meta.to)) : String(e.meta?.channel ?? "room")}</span>
                {e.meta?.mode === "steer" && <em>steer</em>}
                {(e.meta?.triage as { act?: string } | undefined)?.act === "silent" && <em className="q" title={String((e.meta?.triage as { why?: string }).why ?? "")}>Stretch kept quiet</em>}
                <p>{e.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>}


    </div>
  );
}

/* The bell, live: every open ask across the wing's rooms, newest first. */
export function LiveBells({ goRoom }: { goRoom: (r: string) => void }) {
  const [asks, setAsks] = useState<LiveEv[] | null>(null);
  const load = () => { if (HUB.url) fetch(`${HUB.url}/bell`, { cache: "no-store" }).then((r) => r.json()).then(setAsks).catch(() => setAsks([])); };
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!HUB.url || !asks) return null;
  return (
    <div className="lv-bells">
      <h3>Live from the rooms {asks.length ? `· ${asks.length} waiting` : ""}</h3>
      {asks.length === 0 && <small className="lv-empty" style={{ padding: "10px 0", textAlign: "left" }}>Nothing is waiting on anyone.</small>}
      {[...asks].reverse().map((e) => (
        <div key={`${e.room}-${e.seq}`} className="lv-bell-row">
          <div className="lv-bell-meta"><Face who={e.from} size={18} /><b>{nameOf(e.from)}</b><span>in</span><button className="lv-link" onClick={() => goRoom(e.room)}>#{e.room}</button></div>
          <BellCard ev={e} room={e.room} />
        </div>
      ))}
    </div>
  );
}

/* The canvas, live: agents in a row, the task cards they own, the Relay wires between them (the last few
   messages pulse), and anything waiting on the bell. */
export function LiveCanvas({ room }: { room: string }) {
  const s = useLive(room);
  const d = useMemo(() => derive(s.evs), [s.evs]);
  const agents = [...new Set(s.evs.map((e) => e.from.toLowerCase().split("#")[0]).filter((f) => !["sankritya", "kinjal", "you", "stretch"].includes(f)))].slice(0, 6);
  // layout in percent of the canvas; the right 26% is kept for the bell
  const AX = (i: number) => (agents.length <= 1 ? 30 : 8 + (i * 50) / (agents.length - 1));
  const pos = new Map(agents.map((a, i) => [a, { x: AX(i), y: 34 }]));
  const recent = d.backchannel.slice(-8);
  const last = recent[recent.length - 1];
  const tasks = d.tasks.length ? d.tasks.map((t) => t.title) : Object.keys(d.claims);
  const ownerOf = (title: string) => d.claims[title] ?? d.claims[d.tasks.find((t) => t.title === title)?.id ?? ""];
  const CX = (i: number) => 3 + (i % 3) * 20.5, CY = (i: number) => 64 + Math.floor(i / 3) * 13;
  const open = Object.values(d.asks).filter((a) => !a.done);
  return (
    <div className="lv-cv">
      <svg className="lv-cv-wires" viewBox="0 0 100 100" preserveAspectRatio="none">
        {recent.map((e, i) => {
          const a = pos.get(e.from.toLowerCase()), b = pos.get(String(e.meta?.to ?? "").toLowerCase());
          if (!a || !b) return null;
          return <path key={i} d={`M${a.x} ${a.y - 6} Q${(a.x + b.x) / 2} ${a.y - 22 - (i % 3) * 3} ${b.x} ${b.y - 6}`} className={`w ${e === last ? "hot" : ""}`} vectorEffect="non-scaling-stroke" />;
        })}
        {tasks.map((t, i) => {
          const owner = ownerOf(t); const a = owner ? pos.get(owner.toLowerCase()) : null;
          return a ? <path key={t} d={`M${a.x} ${a.y + 9} L${CX(i) + 8} ${CY(i)}`} className="w own" vectorEffect="non-scaling-stroke" /> : null;
        })}
      </svg>
      <div className="lv-cv-hint">{agents.length} agents · {d.backchannel.length} messages on Relay · {d.reached} reached you</div>
      {agents.map((a) => {
        const p = pos.get(a)!; const hushed = d.hushed.has(a);
        const talking = !!last && (last.from.toLowerCase() === a || String(last.meta?.to ?? "").toLowerCase() === a);
        const id = idOf(a);
        return (
          <div key={a} className={`lv-cv-agent ${hushed ? "hushed" : ""} ${talking ? "talking" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <div className="fig">{id && P[id].kind ? <Agent kind={P[id].kind!} mood={talking ? "happy" : hushed ? "sleep" : "calm"} className="size-full" /> : <Face who={a} size={64} />}</div>
            <div className="tag">{nameOf(a)}{hushed && <small> · hushed</small>}</div>
          </div>
        );
      })}
      {tasks.map((t, i) => {
        const owner = ownerOf(t);
        return (
          <div key={t} className={`lv-cv-card ${owner ? "owned" : ""}`} style={{ left: `${CX(i)}%`, top: `${CY(i)}%` }}>
            <small>{owner ? `${nameOf(owner)} owns it` : "Open"}</small><b>{t}</b>
          </div>
        );
      })}
      <div className="lv-cv-bells">
        {open.map((a) => <BellCard key={String(a.ev.meta?.askId)} ev={a.ev} room={room} />)}
        {(() => {
          const byAgent = new Map<string, LiveEv>();
          for (const e of s.evs) if (e.kind === "computer" && (typeof e.meta?.stream === "string" || typeof e.meta?.desktopUrl === "string")) byAgent.set(String(e.meta?.agent ?? e.from), e);
          return [...byAgent.entries()].map(([agent, e]) => typeof e.meta?.stream === "string"
            ? <Computer key={agent} stream={String(e.meta!.stream)} agent={agent} />
            : <Desktop key={agent} url={String(e.meta!.desktopUrl)} agent={agent} vm={String(e.meta?.vm ?? "")} />);
        })()}
      </div>
      {last && <div className="lv-cv-say">{nameOf(last.from)} → {nameOf(String(last.meta?.to ?? "room"))}: {last.text}</div>}
    </div>
  );
}

/* The composer for a live room, in the same slot as every room's composer: @ lists this room's agents, Casper and people. */
/* A recording people can attach from their tools (Zoom shown); Casper transcribes it and turns it into tasks. */
const ZOOM_CALL = {
  title: "Zoom meeting · Hush launch sync",
  sub: "Oct 31 · 2:40 PM · 14 min · Sankritya, Kinjal",
  transcript: `[00:00:04] Sankritya: Okay, last feature we ship today is Hush.
[00:00:11] Kinjal: The thing where you mute an agent but it keeps working?
[00:00:15] Sankritya: Exactly. You hush a chatty agent, it keeps going, its messages get held, and when you unhush you get a short digest.
[00:00:27] Kinjal: And the hush has to survive a restart, so it lives in the room actor, not in the browser.
[00:00:34] Sankritya: Right. Scope for today: the Hush button on each agent, the digest card when you unhush, and the API on the hub. No per-thread hush yet.
[00:01:02] Kinjal: We also need the final two-minute script for the project video, and the README should explain Hush in plain words.
[00:01:15] Sankritya: And someone should look at the live app and design the Hush button and the digest card so it actually looks good.
[00:01:22] Kinjal: So four jobs: design it, build it, write the video script, update the README.
[00:01:30] Sankritya: Let the agents take them. Anything that pushes to main asks me first.
[00:01:36] Kinjal: And nothing gets posted publicly without asking me.
[00:01:40] Sankritya: Deal. Ship it today.`,
};

export function LiveComposer({ room }: { room: string }) {
  const s = useLive(room);
  const [draft, setDraft] = useState("");
  const [steer, setSteer] = useState(false);
  const here = [...new Set(s.evs.map((e) => e.from.toLowerCase().split("#")[0]).filter((f) => !["sankritya", "kinjal", "you", "casper", "stretch"].includes(f)))];
  const mentionable: Mentionable[] = [
    ...here.map((n) => ({ handle: n, name: nameOf(n), sub: "agent in this room", face: <Agent kind={kindFor(n) as never} crop="head" className="size-full" /> })),
    { handle: "casper", name: "Casper", sub: "host · answers from this room's history", face: <Agent kind="casper" crop="head" className="size-full" /> },
    ...["sankritya", "kinjal"].filter((h) => h !== me()).map((h) => ({ handle: h, name: nameOf(h), sub: "person", color: P[h as Id]?.color, face: nameOf(h)[0] })),
  ];
  const mention = draft.match(/@([\w.-]+)/)?.[1]?.toLowerCase();
  const [menu, setMenu] = useState(false);
  const [att, setAtt] = useState<typeof ZOOM_CALL | null>(null);
  return (
    <>
      {menu && (
        <div className="lv-attach">
          <div className="hd">Attach from your tools</div>
          <button onClick={() => { setAtt(ZOOM_CALL); setMenu(false); }}>
            <span className="zm">Z</span><span><b>{ZOOM_CALL.title}</b><small>{ZOOM_CALL.sub}</small></span>
          </button>
        </div>
      )}
      {att && (
        <div className="lv-pending"><span className="zm">Z</span><span><b>{att.title}</b><small>{att.sub} · Casper will transcribe it</small></span><button className="x" onClick={() => setAtt(null)} aria-label="Remove">×</button></div>
      )}
      <button className={`lv-attach-btn ${menu ? "on" : ""}`} onClick={() => setMenu(!menu)} title="Attach a recording">+ Attach</button>
      {mention && mention !== "casper" && here.includes(mention) && (
        <label className={`lv-steer ${steer ? "on" : ""}`} title="Steer lands on the agent's very next step. Otherwise it waits until the agent finishes what it's doing.">
          <input type="checkbox" checked={steer} onChange={(e) => setSteer(e.target.checked)} />Steer @{mention} now (interrupt its current step)
        </label>
      )}
      <Composer value={draft} set={setDraft} noAttach allowEmpty={!!att} people={mentionable} placeholder={att ? "Add a note, or just send" : `Message #${room}. Type @ to ask ${here.length ? "an agent or Casper" : "Casper"}`}
        onSend={(t) => {
          if (att) {
            const a = att; setAtt(null);
            if (t.trim()) post(room, me(), t.trim(), { history: true });
            shareCall(room, a.transcript, me(), "Zoom").catch(() => {});
            return;
          }
          const to = t.match(/@([\w.-]+)/)?.[1]?.toLowerCase(); post(room, me(), t.trim(), to ? { to, mode: steer ? "steer" : "wait" } : undefined); setSteer(false);
        }} />
    </>
  );
}
