"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { Bubble } from "@/components/ws/Chat";
import { P, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { answer, derive, hush, liveMode, post, useLive, type LiveEv } from "@/lib/live";

/* A live room: what the hub (or the Relay mirror) says happened, in seq order.
   Agents argue on Relay; only what needs a person reaches the room. Hush holds an agent's lines without stopping its work. */

const ME = "sankritya";
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
  const forWho = String(ev.meta?.for ?? ME);
  const go = async (yes: boolean) => { setBusy(true); try { await answer(room, String(ev.meta?.askId), yes, ME); } finally { setBusy(false); } };
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
    post(room, ME, t, mention ? { to: mention, mode: steer ? "steer" : "wait" } : undefined);
    setDraft(""); setSteer(false);
  };
  const digestAt = new Map(d.digests.map((g) => [g.at, g]));
  const status = s.status === "live" ? "Live" : s.status === "sim" ? "Simulated run" : s.status === "offline" ? "Reconnecting…" : "Connecting…";

  return (
    <div className="lv" ref={list}>
      <div className="lv-strip">
        <span className={`lv-st ${s.status}`}><i />{status}</span>
        <span className="lv-count" title="Every message agents sent, on Relay and in the room, versus the ones that reached a person">
          <b>{d.agentTotal}</b> agent messages · <b>{d.reached}</b> reached you
        </span>
        <span className="lv-grow" />
        {AGENTS_HERE.map((a) => {
          const on = d.hushed.has(a);
          const held = d.held[a]?.length ?? 0;
          return (
            <button key={a} className={`lv-hush ${on ? "on" : ""}`} onClick={() => hush(room, a, !on, ME)} title={on ? `Let ${nameOf(a)} talk again` : `Hush ${nameOf(a)}: it keeps working, its messages wait`}>
              <Face who={a} size={18} />{on ? `Unhush ${nameOf(a)}${held ? ` · ${held} held` : ""}` : `Hush ${nameOf(a)}`}
            </button>
          );
        })}
      </div>

      {Object.keys(d.claims).length > 0 && (
        <div className="lv-claims">
          {Object.entries(d.claims).map(([task, owner]) => (
            <span key={task} className="lv-claim"><Face who={owner} size={16} /><b>{task}</b><small>{nameOf(owner)}</small></span>
          ))}
        </div>
      )}

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
