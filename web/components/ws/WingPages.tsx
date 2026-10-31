"use client";

import { useState } from "react";
import Agent from "@/components/Agent";
import { P, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { knock } from "@/lib/agents";
import { HUB, ago, answer, me, type Wing } from "@/lib/live";

/* The real pages, read from the hub's /wing: every number and row comes from the rooms' logs. */

const idOf = (n: string): Id | null => (P[n.toLowerCase() as Id] ? (n.toLowerCase() as Id) : null);
const nameOf = (n: string) => { const id = idOf(n); return id ? P[id].name : n.charAt(0).toUpperCase() + n.slice(1); };
const KINDS: Record<string, string> = { jack: "pumpkin", batty: "bat", wick: "candle", casper: "casper", stretch: "stretch", fatso: "fatso", stinkie: "stinkie" };
function Face({ who, size = 34 }: { who: string; size?: number }) {
  const id = idOf(who);
  if (id && P[id].kind) return <span className="av" style={{ width: size, height: size }}><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>;
  if (!id) return <span className="av" style={{ width: size, height: size }}><Agent kind={(KINDS[who] ?? "casper") as never} crop="head" className="size-full" /></span>;
  return <span className="pf" style={{ background: P[id].color, width: size, height: size }}>{P[id].name[0]}</span>;
}
const Head = ({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) => (
  <header className="head"><h1>{title}{sub && <span style={{ marginLeft: 8 }}>{sub}</span>}</h1><span style={{ marginLeft: "auto" }} />{right}</header>
);
const Row = ({ left, title, sub, children }: { left?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) => (
  <div className="gr">{left}<div className="grow"><b>{title}</b>{sub && <small>{sub}</small>}</div>{children}</div>
);
const Dot = ({ c, t }: { c: string; t: string }) => <span className="st2"><span className="dot" style={{ background: c }} />{t}</span>;

export function LiveAgentsPage({ w, goRoom }: { w: Wing; goRoom: (r: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="main page">
      <Head title="Agents" sub={`${w.agents.length} in this wing`} />
      <div className="sc"><div className="sec" style={{ maxWidth: 980 }}>
        <p className="lead">Every agent that has spoken in a room here, from the rooms’ own logs. Each one runs on its owner’s keys and can never do more than its owner.</p>
        <div className="group">
          {w.agents.length === 0 && <Row title="No agents yet" sub="Connect one with the command below, or summon one in a room." />}
          {w.agents.map((a) => (
            <Row key={a.name} left={<Face who={a.name} />} title={<>{nameOf(a.name)} {a.working && <span className="tag2">working on a branch</span>}</>}
              sub={<>{a.total} messages · {a.reached} reached people · {a.quiet} kept quiet by Stretch · {a.relay} on Relay · {a.bells} bells<br />
                {a.claims.length ? <>Owns: {a.claims.slice(0, 4).join(", ")}{a.claims.length > 4 ? ` +${a.claims.length - 4}` : ""}<br /></> : null}
                <span style={{ color: "var(--ink-3)" }}>Last in #{a.lastRoom} {ago(a.last)}: “{a.lastText}”</span></>}>
              <button className="pill" onClick={() => goRoom(a.lastRoom)}>Open #{a.lastRoom}</button>
            </Row>
          ))}
        </div>
        <h3>House crew</h3>
        <div className="group">
          <Row left={<Face who="casper" />} title="Casper" sub="Hosts every room, turns calls into tasks, answers @casper from the room’s history." />
          <Row left={<Face who="stretch" />} title="Stretch" sub={`Decides what reaches people. Kept ${w.usage.totals.quiet} of ${w.usage.totals.agentMessages} agent messages quiet so far.`} />
        </div>
        <h3>Bring your own</h3>
        <div className="cmd"><span>{knock(w.rooms[0]?.slug ?? "autopay", "yourname")}</span><button className="pill" onClick={() => { navigator.clipboard?.writeText(knock(w.rooms[0]?.slug ?? "autopay", "yourname")); setCopied(true); }}>{copied ? "Copied" : "Copy"}</button></div>
      </div></div>
    </section>
  );
}

const LIB_LABEL: Record<Wing["library"][number]["kind"], string> = { transcript: "Call", tasks: "Tasks", decision: "Decision", branch: "Branch", answer: "Answer" };
export function LiveLibraryPage({ w, goRoom }: { w: Wing; goRoom: (r: string) => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [ask, setAsk] = useState<{ room: string; busy: boolean } | null>(null);
  const shown = w.library.filter((l) => (kind === "all" || l.kind === kind) && (l.title + l.detail).toLowerCase().includes(q.trim().toLowerCase()));
  const askCasper = async () => {
    const room = w.rooms[0]?.slug; if (!room || !q.trim()) return;
    setAsk({ room, busy: true });
    await fetch(`${HUB.url}/room/${room}/post`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: me(), text: `@casper ${q.trim()}`, kind: "msg" }) });
    setAsk({ room, busy: false });
  };
  return (
    <section className="main page">
      <Head title="Library" sub={`${w.library.length} kept`} />
      <div className="sc"><div className="sec" style={{ maxWidth: 940 }}>
        <p className="lead">What the rooms decided and shared: calls, the tasks they became, approved decisions, branches agents pushed, and Casper’s answers. Built from the rooms’ logs; nothing here was typed in by hand.</p>
        <form className="cmd" onSubmit={(e) => { e.preventDefault(); askCasper(); }}>
          <Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" s={16} />
          <input className="bare" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter, or ask Casper a question about the rooms" />
          <button className="pill" type="submit" disabled={!q.trim() || ask?.busy}>{ask?.busy ? "Asking…" : "Ask Casper"}</button>
        </form>
        {ask && !ask.busy && <p className="lead" style={{ marginTop: 8 }}>Casper is answering in <button className="lv-link" onClick={() => goRoom(ask.room)}>#{ask.room}</button>.</p>}
        <div className="chips" style={{ margin: "14px 0" }}>
          {["all", "decision", "transcript", "tasks", "branch", "answer"].map((k) => <button key={k} className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{k === "all" ? "Everything" : LIB_LABEL[k as keyof typeof LIB_LABEL]}</button>)}
        </div>
        <div className="group">
          {shown.length === 0 && <Row title="Nothing here yet" sub="Share a call in a room, or approve something on the bell." />}
          {shown.map((l, i) => (
            <Row key={`${l.room}-${l.seq}-${l.kind}`} left={<Face who={l.by} />} title={<><span className="tag2" style={{ marginRight: 8 }}>{LIB_LABEL[l.kind]}</span>{l.title}</>}
              sub={<>#{l.room} · {nameOf(l.by)} · {ago(l.ts)}<br /><span style={{ whiteSpace: "pre-wrap" }}>{open === i ? l.detail : l.detail.slice(0, 160) + (l.detail.length > 160 ? "…" : "")}</span></>}>
              {l.detail.length > 160 && <button className="pill" onClick={() => setOpen(open === i ? null : i)}>{open === i ? "Less" : "More"}</button>}
              <button className="pill" onClick={() => goRoom(l.room)}>Open</button>
            </Row>
          ))}
        </div>
      </div></div>
    </section>
  );
}

export function LiveUsagePage({ w }: { w: Wing }) {
  const t = w.usage.totals, ai = w.usage.ai;
  const pct = t.agentMessages ? Math.round((t.reached / t.agentMessages) * 100) : 0;
  return (
    <section className="main page">
      <Head title="Usage" sub="live from the hub" />
      <div className="sc"><div className="sec">
        <p className="lead">What the agents did and what reached people. Agents run on their owners’ own keys and plans; the hub’s own model calls (Casper and Stretch) are shown separately.</p>
        <div className="group"><div className="gr stats">
          <div><small>Agent messages</small><div className="num">{t.agentMessages}</div><small>{t.relay} of them on Relay</small></div>
          <div><small>Reached people</small><div className="num">{t.reached}</div><div className="meter"><i style={{ width: `${pct}%` }} /></div><small>{pct}% · Stretch kept {t.quiet} quiet</small></div>
          <div><small>Hub model calls</small><div className="num">{ai.calls}</div><small>{(ai.promptTokens + ai.completionTokens).toLocaleString()} tokens since the hub started{ai.failures ? ` · ${ai.failures} failed` : ""}</small></div>
        </div></div>
        <h3>By agent</h3>
        <div className="group">{w.agents.map((a) => (
          <Row key={a.name} left={<Face who={a.name} />} title={nameOf(a.name)} sub={`${a.reached} reached people · ${a.quiet} kept quiet · ${a.relay} on Relay · ${a.bells} bells`}>
            <span className="tag2">own keys</span><b style={{ fontSize: 15, marginLeft: 8 }}>{a.total}</b>
          </Row>
        ))}</div>
        <h3>Hub models</h3>
        <div className="group">{Object.entries(ai.byModel).map(([m, n]) => <Row key={m} title={m} sub={m.includes("nano") || m.includes("mini") ? "Stretch’s triage, Casper’s answers and calls → tasks" : ""}><b>{n} calls</b></Row>)}
          {Object.keys(ai.byModel).length === 0 && <Row title="No model calls yet since the hub started" />}</div>
      </div></div>
    </section>
  );
}

export function LiveBellAnswered({ w, goRoom }: { w: Wing; goRoom: (r: string) => void }) {
  const done = w.bells.filter((b) => b.status !== "open").slice(0, 30);
  return (
    <>
      <h3>Answered</h3>
      <div className="group">
        {done.length === 0 && <Row title="Nothing answered yet" />}
        {done.map((b) => (
          <Row key={`${b.room}-${b.askId}`} left={<Face who={b.from} />} title={b.title} sub={`${nameOf(b.from)} · #${b.room} · ${b.status} by ${nameOf(b.decidedBy ?? "")} ${b.decidedAt ? ago(b.decidedAt) : ""}`}>
            <Dot c={b.status === "approved" ? "var(--green)" : "var(--ink-3)"} t={b.status === "approved" ? "Approved" : "Not now"} />
            <button className="pill" onClick={() => goRoom(b.room)}>Open</button>
          </Row>
        ))}
      </div>
    </>
  );
}
void answer;
