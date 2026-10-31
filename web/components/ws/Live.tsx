"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { Bubble } from "@/components/ws/Chat";
import { P, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { HUB, me, answer, derive, hookSetup, hush, liveMode, mcpCommand, post, shareCall, useLive, type LiveEv } from "@/lib/live";

/* A live room: what the hub (or the Relay mirror) says happened, in seq order.
   Agents argue on Relay; only what needs a person reaches the room. Hush holds an agent's lines without stopping its work. */

const ME_DEFAULT = "sankritya";
const idOf = (name: string): Id | null => {
  const k = name.toLowerCase().split("#")[0] as Id;
  return P[k] ? k : null;
};
const nameOf = (name: string) => { const id = idOf(name); return id ? P[id].name : name; };
const AGENTS_HERE = ["jack", "batty", "wick"] as const;

function Face({ who, size = 22 }: { who: string; size?: number }) {
  const id = idOf(who);
  if (id && P[id].kind) return <span className="lv-face" style={{ width: size, height: size }}><Agent kind={P[id].kind!} crop="head" still className="size-full" /></span>;
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

export default function LiveRoom({ room }: { room: string }) {
  const s = useLive(room);
  const d = useMemo(() => derive(s.evs), [s.evs]);
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

  const mention = draft.match(/@(\w+)/)?.[1]?.toLowerCase();
  const send = () => {
    const t = draft.trim();
    if (!t) return;
    post(room, me(), t, mention ? { to: mention, mode: steer ? "steer" : "wait" } : undefined);
    setDraft(""); setSteer(false);
  };
  const digestAt = new Map(d.digests.map((g) => [g.at, g]));
  const [panel, setPanel] = useState<null | "call" | "connect">(null);
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
  const [agentName, setAgentName] = useState("");
  const [copied, setCopied] = useState(false);
  const here = (() => {
    const seen = [...new Set(s.evs.map((e) => e.from.toLowerCase().split("#")[0]).filter((f) => !["sankritya", "kinjal", "you", "casper", "stretch"].includes(f)))];
    return seen.length ? seen.slice(0, 5) : s.status === "sim" ? [...AGENTS_HERE] : [];
  })();
  const sendCall = async () => {
    setCallBusy(true); setCallErr("");
    try { await shareCall(room, call, me()); setCall(""); setPanel(null); }
    catch (e) { setCallErr((e as Error).message); } finally { setCallBusy(false); }
  };
  const status = s.status === "live" ? "Live" : s.status === "sim" ? "Simulated run" : s.status === "offline" ? "Reconnecting…" : "Connecting…";

  return (
    <div className="lv" ref={list}>
      <div className="lv-strip">
        <span className={`lv-st ${s.status}`}><i />{status}</span>
        <span className="lv-count" title="Every message agents sent, on Relay and in the room, versus the ones that reached a person">
          <b>{d.agentTotal}</b> agent messages · <b>{d.reached}</b> reached you{d.quiet ? <> · Stretch kept <b>{d.quiet}</b> quiet</> : null}
        </span>
        <span className="lv-grow" />
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
      </div>

      {workers.some((w) => w.running) && (
        <div className="lv-workers">
          {workers.filter((w) => w.running).map((w) => (
            <span key={w.name} className="lv-worker"><i />{nameOf(w.name)} is working on its own branch<button className="lv-link" onClick={() => stopWorker(w.name)}>Stop</button></span>
          ))}
        </div>
      )}
      {panel === "call" && (
        <div className="lv-panel">
          <b>Share a call</b>
          <small>Paste the transcript (Zoom, Meet, Granola, or notes). Casper lists what you agreed as tasks, and the agents claim them.</small>
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
            const owner = d.claims[t.title];
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
          {Object.entries(d.claims).filter(([t]) => !d.tasks.some((x) => x.title === t)).map(([task, owner]) => (
            <span key={task} className="lv-claim"><Face who={owner} size={16} /><b>{task}</b><small>{nameOf(owner)}</small></span>
          ))}
        </div>
      )}

      {(() => {
        const pc = [...s.evs].reverse().find((e) => e.kind === "computer" && typeof e.meta?.stream === "string");
        return pc ? <Computer stream={String(pc.meta!.stream)} agent={String(pc.meta?.agent ?? pc.from)} /> : null;
      })()}

      {d.visible.length === 0 && <div className="lv-empty">Waiting for the first event{liveMode() === "file" ? " from the Relay mirror" : ""}…</div>}

      {d.visible.map((e, i) => {
        const k = e.seq != null ? `s${e.seq}` : e.id ?? `i${i}`;
        const digest = digestAt.get(i);
        const node = (() => {
          if (e.kind === "claim") {
            const task = String(e.meta?.task ?? e.text);
            return e.meta?.ok === false
              ? <Sys who={e.from} tone="warn">{nameOf(e.from)} reached for <b>{task}</b>. {nameOf(String(e.meta?.owner ?? "someone"))} already has that one.</Sys>
              : <Sys who={e.from} tone="ok">{nameOf(e.from)} claimed <b>{task}</b></Sys>;
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
          const who = idOf(e.from) ?? "casper";
          const to = e.meta?.to ? idOf(String(e.meta.to)) ?? undefined : undefined;
          const steered = e.meta?.mode === "steer";
          return <Bubble k={`${room}-${k}`} who={who} to={to} text={idOf(e.from) ? e.text : `${e.from}: ${e.text}`} meta={`${P[who].kind ? P[who].sub : nameOf(e.from)}${steered ? " · steer" : ""}${e.kind === "relay" ? " · via Relay" : ""}`} />;
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

      <div className="lv-back">
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
      </div>

      <form className="lv-compose" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message #${room}. @jack, @batty or @wick to ask an agent`} aria-label="Message" />
        {mention && (
          <label className={`lv-steer ${steer ? "on" : ""}`} title="Steer lands on the agent's very next step. Otherwise it waits until the agent finishes what it's doing.">
            <input type="checkbox" checked={steer} onChange={(e) => setSteer(e.target.checked)} />Steer now
          </label>
        )}
        <button className="pill white" type="submit" disabled={!draft.trim()}>Send</button>
      </form>
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
  const AX = (i: number) => (agents.length <= 1 ? 36 : 8 + (i * 56) / (agents.length - 1));
  const pos = new Map(agents.map((a, i) => [a, { x: AX(i), y: 34 }]));
  const recent = d.backchannel.slice(-8);
  const last = recent[recent.length - 1];
  const tasks = d.tasks.length ? d.tasks.map((t) => t.title) : Object.keys(d.claims);
  const CX = (i: number) => 3 + (i % 4) * 18.5, CY = (i: number) => 66 + Math.floor(i / 4) * 13;
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
          const owner = d.claims[t]; const a = owner ? pos.get(owner.toLowerCase()) : null;
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
        const owner = d.claims[t];
        return (
          <div key={t} className={`lv-cv-card ${owner ? "owned" : ""}`} style={{ left: `${CX(i)}%`, top: `${CY(i)}%` }}>
            <small>{owner ? `${nameOf(owner)} owns it` : "Open"}</small><b>{t}</b>
          </div>
        );
      })}
      <div className="lv-cv-bells">
        {open.map((a) => <BellCard key={String(a.ev.meta?.askId)} ev={a.ev} room={room} />)}
      </div>
      {last && <div className="lv-cv-say">{nameOf(last.from)} → {nameOf(String(last.meta?.to ?? "room"))}: {last.text}</div>}
    </div>
  );
}
