"use client";

import { useEffect, useState } from "react";
import Agent from "@/components/Agent";
import Brand, { type BrandName } from "@/components/ui/Brand";
import Select from "@/components/ws/Select";
import SourcePeek from "@/components/ws/SourcePeek";
import type { Att, Source } from "@/components/ws/data";
import { P, AGENTS, CREW, FILES, BELL_PAST, USAGE, REPLY, Ic } from "@/components/ws/data";
import type { Id, Ev } from "@/components/ws/data";

const G = "var(--green)", O = "var(--pumpkin)", A = "var(--ink-3)";
const Face = ({ id }: { id: Id }) =>
  P[id].kind ? <span className="av"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>
    : <span className="pf" style={{ background: P[id].color, width: 34, height: 34 }}>{P[id].name[0]}</span>;
const Row = ({ left, title, sub, children }: { left?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) => (
  <div className="gr">{left}<div className="grow"><b>{title}</b>{sub && <small>{sub}</small>}</div>{children}</div>
);
const Dot = ({ c, t }: { c: string; t: string }) => <span className="st2"><span className="dot" style={{ background: c }} />{t}</span>;
const Sw = ({ on: start = false }: { on?: boolean }) => { const [on, set] = useState(start); return <button className={`sw ${on ? "on" : ""}`} onClick={() => set(!on)} aria-pressed={on} />; };
const Chips = ({ opts, multi, start }: { opts: string[]; multi?: boolean; start: string[] }) => {
  const [sel, setSel] = useState(start);
  return <div className="chips">{opts.map((o) => <button key={o} className={`chip ${sel.includes(o) ? "on" : ""}`} onClick={() => setSel(multi ? (sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]) : [o])}>{o}</button>)}</div>;
};
const Head = ({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) => (
  <header className="head"><h1>{title}{sub && <span style={{ marginLeft: 8 }}>{sub}</span>}</h1><span style={{ marginLeft: "auto" }} />{right}</header>
);

/* ---------- the bell ---------- */
export function BellPage({ ask, onApprove, goRoom, live }: { ask: Ev["ask"] | null; onApprove: () => void; goRoom: (r: string) => void; live?: React.ReactNode }) {
  const [past, setPast] = useState(BELL_PAST);
  const answer = (i: number, done: string) => setPast((p) => p.map((x, k) => (k === i ? { ...x, done } : x)));
  const open = past.filter((p) => !p.done);
  return (
    <section className="main page">
      <Head title="The bell" sub={`${(ask ? 1 : 0) + open.length} waiting`} />
      <div className="sc"><div className="sec">
        <p className="lead">Everything an agent is waiting on a person for. Oldest first, each with the evidence.</p>
        {live}
        <h3>Waiting</h3>
        <div className="group">
          {ask && (
            <Row left={<Face id={ask.for === "sankritya" ? "jack" : "wick"} />} title={ask.title}
              sub={`${ask.for === "sankritya" ? "Jack" : "Wick"} · #autopay-launch · needs ${P[ask.for].name} · now`}>
              <button className="pill white" onClick={onApprove}>Approve</button>
              <button className="pill" onClick={() => goRoom("autopay-launch")}>Open</button>
            </Row>
          )}
          {open.map((p) => { const i = past.indexOf(p); return (
            <Row key={p.title} left={<Face id={p.who} />} title={p.title} sub={`${P[p.who].name} · #${p.room} · needs ${p.for} · ${p.at}`}>
              <button className="pill white" onClick={() => answer(i, "Approved")}>Approve</button>
              <button className="pill" onClick={() => answer(i, "Not now")}>Not now</button>
            </Row>
          ); })}
          {!ask && open.length === 0 && <Row title="Nothing is waiting on you" sub="Stinkie rings the bell when an agent needs a yes." />}
        </div>
        <h3>Answered</h3>
        <div className="group">
          {past.filter((p) => p.done).map((p) => (
            <Row key={p.title} left={<Face id={p.who} />} title={p.title} sub={`#${p.room} · ${p.at}`}><Dot c={p.done === "Approved" ? G : A} t={p.done!} /></Row>
          ))}
        </div>
      </div></div>
    </section>
  );
}

/* ---------- agents ---------- */
export function AgentsPage({ open, speaking }: { open: (id: Id) => void; speaking?: Id }) {
  const card = (id: Id, rights: string) => (
    <button key={id} className="acard" onClick={() => open(id)}>
      <span className="fig"><Agent kind={P[id].kind!} mood={speaking === id ? "alert" : "calm"} className="size-full" /></span>
      <b>{P[id].name}</b><small>{P[id].sub}</small>
      <span className="tag2">{rights}</span>
      <Dot c={speaking === id ? O : id === "wick" ? A : G} t={speaking === id ? "Talking" : id === "wick" ? "Asleep" : "Working"} />
    </button>
  );
  return (
    <section className="main page">
      <Head title="Agents" sub="Engineering wing" right={<button className="pill"><Ic d="M12 5v14M5 12h14" s={15} />Bring an agent</button>} />
      <div className="sc"><div className="sec" style={{ maxWidth: 980 }}>
        <p className="lead">Every agent belongs to a person and can never do more than its owner can here. Click one to see it at work.</p>
        <h3>In this wing <span>{AGENTS.length}</span></h3>
        <div className="agrid">{AGENTS.map((id) => card(id, id === "wick" ? "Can read" : id === "casper" ? "Host" : "Can act"))}</div>
        <h3>House crew <span>{CREW.length}</span></h3>
        <div className="agrid">{CREW.map((id) => card(id, id === "stretch" ? "Dispatch" : id === "fatso" ? "Library" : "Watch"))}</div>
        <h3>Bring your own</h3>
        <div className="cmd"><span>npx casper knock engineering --as yourname</span><button className="pill" onClick={(e) => ((e.target as HTMLElement).textContent = "Copied")}>Copy</button></div>
      </div></div>
    </section>
  );
}

/* ---------- library: memory, and who can see which part of it ---------- */
type Scope = "mine" | "notebook" | "room" | "wing" | "manor";
const SCOPES: { id: Scope; t: string; d: string; who: Id[]; write: string }[] = [
  { id: "mine", t: "Yours", d: "Your notes, preferences and how you write.", who: ["sankritya", "jack"], write: "You, or your agents with your OK" },
  { id: "notebook", t: "Agent notebooks", d: "Each agent’s working notes from its own runs.", who: ["jack", "sankritya"], write: "The agent. Its owner can inspect" },
  { id: "room", t: "This room", d: "Threads, files and decisions in #autopay-launch.", who: ["sankritya", "kinjal", "jack", "batty", "wick", "casper"], write: "Anyone in the room" },
  { id: "wing", t: "Wing Library", d: "Settled decisions and team knowledge for Engineering.", who: ["sankritya", "kinjal", "jack", "batty", "fatso"], write: "Fatso files; people confirm" },
  { id: "manor", t: "Acme Manor", d: "Promoted by an owner for the whole company.", who: ["sankritya", "kinjal", "fatso"], write: "Owners promote from a wing" },
];
const MEM: { t: string; sub: string; scope: Scope; reads: string; src: string[] }[] = [
  { t: "Autopay is opt-in, never on by default", sub: "Decision · Kinjal on Tuesday’s call", scope: "wing", reads: "Read by Jack 2:06 · Batty 2:08 · Wick 2:12", src: ["Tuesday call transcript", "Billing spec v3"] },
  { t: "One autopay setting per account, stored as a column", sub: "Decision · Jack, approved by Sankritya", scope: "wing", reads: "Read by Batty 2:08", src: ["api/autopay.ts"] },
  { t: "Refund limit is $500 without a second yes", sub: "Decision · #refunds-v2 · Oct 22", scope: "manor", reads: "Read by Stinkie today", src: ["Billing spec v3"] },
  { t: "Tuesday call transcript", sub: "Zoom · 31 min", scope: "room", reads: "Read by Casper, Fatso", src: ["Tuesday call transcript"] },
  { t: "Sankritya writes lowercase and short", sub: "Learned from your messages here, never DMs", scope: "mine", reads: "Used by Jack in 14 replies", src: [] },
  { t: "charge.ts reads autopay on every bill", sub: "Jack’s notebook · from its run at 2:06", scope: "notebook", reads: "Only Jack · Sankritya can inspect", src: ["api/autopay.ts"] },
];

export function LibraryPage() {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope | "all">("all");
  const [mem, setMem] = useState(MEM);
  const [peek, setPeek] = useState<{ a: Att; host: Element | null } | null>(null);
  const open = (src: Source) => (e: React.MouseEvent) => setPeek({ a: src.att, host: (e.currentTarget as HTMLElement).closest(".ws") });
  const srcOf = (t: string) => FILES.find((f) => f.title === t);
  const f = (t: string) => t.toLowerCase().includes(q.trim().toLowerCase());
  const shown = mem.filter((m) => (scope === "all" || m.scope === scope) && f(m.t + m.sub));
  const move = (t: string, to: Scope) => setMem((xs) => xs.map((m) => (m.t === t ? { ...m, scope: to } : m)));
  const forget = (t: string) => setMem((xs) => xs.filter((m) => m.t !== t));
  return (
    <section className="main page">
      <Head title="Library" sub="kept by Fatso" />
      <div className="sc"><div className="sec" style={{ maxWidth: 940 }}>
        <p className="lead">Everything the team and its agents remember, and who can see each part. An agent never reads more than its owner could, and every read is logged.</p>
        <form className="cmd" onSubmit={(e) => { e.preventDefault(); if (q.trim()) setAns(REPLY.fatso!(q)); }}>
          <Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" s={16} />
          <input className="bare" value={q} onChange={(e) => { setQ(e.target.value); setAns(null); }} placeholder="Search memory, or ask Fatso a question" />
          <button className="pill" type="submit">Ask Fatso</button>
        </form>
        {ans && <div className="answer" style={{ margin: "12px 0 0" }}><span className="sq img"><Agent kind="fatso" crop="head" mood="happy" className="size-full" /></span><div><b>Fatso</b><p>{ans}</p></div></div>}

        <h3>Who can see what</h3>
        <div className="scopes">
          {SCOPES.map((sc, k) => (
            <button key={sc.id} className={`scope ${scope === sc.id ? "on" : ""}`} onClick={() => setScope(scope === sc.id ? "all" : sc.id)}>
              <span className="lv">{k + 1}</span>
              <b>{sc.t}</b><small>{sc.d}</small>
              <span className="who">{sc.who.map((id) => P[id].kind ? <span key={id} className="rf"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span> : <span key={id} className="rf pfx" style={{ background: P[id].color }}>{P[id].name[0]}</span>)}</span>
              <span className="wr">Writes: {sc.write}</span>
            </button>
          ))}
        </div>
        <div className="mrules">
          <span>Agents never read each other’s notebooks. They ask in the room, so the answer is visible.</span>
          <span>DMs between people never enter the Library.</span>
          <span>Memory belongs to the room, not the agent. Switch agents, keep the memory.</span>
        </div>

        <h3>{scope === "all" ? "Everything" : SCOPES.find((x) => x.id === scope)!.t} <span>{shown.length}</span></h3>
        <div className="group">
          {shown.map((m) => (
            <Row key={m.t} left={<Face id={m.scope === "notebook" ? "jack" : m.scope === "mine" ? "sankritya" : "fatso"} />} title={m.t} sub={<>{m.sub}<br /><span style={{ color: "#c3b8ff" }}>{m.reads}</span>
              {m.src.length > 0 && <span className="msrc">{m.src.map((t) => { const f = srcOf(t); return f ? <button key={t} className="srcbtn" onClick={open(f)} title={f.where}>{f.brand ? <Brand name={f.brand} size={16} radius={4} /> : null}{f.title}</button> : null; })}</span>}</>}>
              <Select label="Who can see this" value={m.scope} onChange={(v) => move(m.t, v)}
                options={SCOPES.map((sc) => ({ value: sc.id, label: sc.t, desc: sc.d }))} />
              <button className="pill" onClick={() => forget(m.t)}>Forget</button>
            </Row>
          ))}
          {shown.length === 0 && <Row title="Nothing here" sub="Try another layer, or ask Fatso." />}
        </div>
        <h3>Sources Fatso reads <span>{FILES.length}</span></h3>
        <div className="group">{FILES.map((x) => (
          <Row key={x.title} left={x.brand ? <Brand name={x.brand} size={36} radius={10} /> : <span className="sq2"><Ic d="M7 3h7l4 4v14H7z M14 3v4h4" s={16} /></span>}
            title={<button className="srctitle" onClick={open(x)}>{x.title}</button>} sub={<>{x.sub}<br /><span className="where">{x.where}</span></>}>
            <button className="pill" onClick={open(x)}>Preview</button>
            <a className="pill white" href={x.url} target="_blank" rel="noopener noreferrer">Open ↗</a>
          </Row>
        ))}</div>
        {peek && <SourcePeek a={peek.a} host={peek.host} onClose={() => setPeek(null)} />}
</div></div>
    </section>
  );
}

/* ---------- usage ---------- */
export function UsagePage() {
  const total = USAGE.reduce((a, u) => a + (u.cost ?? 0), 0);
  const [limit, setLimit] = useState(500);
  return (
    <section className="main page">
      <Head title="Usage and spend" sub="October" />
      <div className="sc"><div className="sec">
        <p className="lead">Agents people bring on their own plan are shown but not billed to the manor.</p>
        <div className="group"><div className="gr stats">
          <div><small>This wing</small><div className="num">${total}</div><div className="meter"><i style={{ width: `${Math.min(100, (total / limit) * 100)}%` }} /></div><small>of a ${limit} monthly limit</small></div>
          <div><small>Model calls</small><div className="num">${total - 63}</div><small>Casper and the house crew</small></div>
          <div><small>Computers</small><div className="num">$63</div><small>41 hours across 2 computers</small></div>
        </div></div>
        <h3>By agent</h3>
        <div className="group">{USAGE.map((u) => <Row key={u.id} left={<Face id={u.id} />} title={P[u.id].name} sub={u.what}>{u.cost === null ? <span className="tag2">not billed</span> : <b style={{ fontSize: 15 }}>${u.cost}</b>}</Row>)}</div>
        <h3>Limits</h3>
        <div className="group">
          <Row title="Monthly limit for this wing" sub="Only owners can change it"><div className="chips">{[250, 500, 1000].map((v) => <button key={v} className={`chip ${limit === v ? "on" : ""}`} onClick={() => setLimit(v)}>${v}</button>)}</div></Row>
          <Row title="Warn me at" sub="Stinkie rings the bell at each step"><Chips multi opts={["50%", "80%", "90%"]} start={["50%", "80%"]} /></Row>
          <Row title="When the limit is hit" sub="The current step finishes first, so nothing stops halfway"><Chips opts={["Pause and ask", "Just warn"]} start={["Pause and ask"]} /></Row>
        </div>
      </div></div>
    </section>
  );
}

/* ---------- wing settings ---------- */
const VOICES = [
  { id: "chill", t: "lowercase, low-key", s: "Short, no caps, like texting.", line: "done. 6 tests pass, can u look before i push?" },
  { id: "pro", t: "Clear and professional", s: "Full sentences, no filler.", line: "Done. All 6 tests pass. Could you review before I push?" },
  { id: "mirror", t: "Match how I write", s: "Learns from your messages here.", line: "yeah 6 tests pass. look before i push? didnt commit anything else" },
];
export function SettingsPage() {
  const [sec, setSec] = useState("agents");
  const [voice, setVoice] = useState("chill");
  const nav = [["general", "General"], ["members", "Members"], ["agents", "Agents"], ["ai", "Your AI"], ["rules", "Rules and approvals"], ["connections", "Connections"], ["computers", "Computers"], ["sharing", "Sharing"]];
  return (
    <section className="main page">
      <Head title="Wing settings" sub="Engineering wing" right={<span style={{ color: "var(--ink-3)", fontSize: 13 }}>You’re an Owner</span>} />
      <div className="sbody">
        <nav className="snav">
          <div className="hd">Engineering wing</div>
          {nav.map(([k, t]) => <button key={k} className={sec === k ? "on" : ""} onClick={() => setSec(k)}>{t}</button>)}
        </nav>
        <div className="sc"><div className="sec">
          {sec === "general" && <>
            <h2>General</h2><p className="lead">The basics for this wing of the manor.</p>
            <div className="field"><label>Name</label><input className="inp" defaultValue="Engineering" /></div>
            <div className="field"><label>What this wing is for</label><textarea className="inp" defaultValue="Product and platform work. Agents here can touch code and computers." /></div>
            <div className="field"><label>Who can join</label><Chips opts={["Invite only", "Anyone in Acme Manor can ask"]} start={["Invite only"]} /></div>
            <SaveButton />
          </>}
          {sec === "members" && <>
            <h2>Members</h2><p className="lead">People in this wing see every room in it. Owners and editors can approve.</p>
            <Invite />
          </>}
          {sec === "agents" && <>
            <h2>Agents</h2><p className="lead">Who’s here, and how they talk to you.</p>
            <div className="group">{[...AGENTS, ...CREW].map((id) => <Row key={id} left={<Face id={id} />} title={P[id].name} sub={P[id].sub}><Sw on /></Row>)}</div>
            <h3>How agents talk</h3>
            <div className="vgrid">{VOICES.map((v) => <button key={v.id} className={`vopt ${voice === v.id ? "on" : ""}`} onClick={() => setVoice(v.id)}><b>{v.t}</b><small>{v.s}</small><q>{v.line}</q></button>)}</div>
            <div className="group" style={{ marginTop: 12 }}><Row left={<Face id="jack" />} title={<>Jack <small style={{ display: "inline", marginLeft: 6 }}>preview</small></>} sub={VOICES.find((v) => v.id === voice)!.line} /></div>
          </>}
          {sec === "ai" && <YourAI />}
          {sec === "rules" && <>
            <h2>Rules and approvals</h2><p className="lead">These show on the cord between each agent and the room, so everyone can see them.</p>
            <div className="group">
              <Row title="Push to main" sub="Needs a yes from the agent’s owner, with the diff"><Sw on /></Row>
              <Row title="Spend money" sub="Refunds, purchases, anything with a charge id"><Sw on /></Row>
              <Row title="Post publicly" sub="X, LinkedIn, the blog"><Sw on /></Row>
              <Row title="Send email outside Acme"><Sw /></Row>
              <Row title="Delete anything" sub="Files, branches, records"><Sw on /></Row>
            </div>
            <h3>Who gets to talk</h3>
            <div className="group">
              <Row title="Agents only hear @mentions and their own threads" sub="Untargeted messages go to Stretch, who picks one agent or none"><Sw on /></Row>
              <Row title="Agents talking in circles" sub="Stretch pauses both and rings the bell"><Chips opts={["after 4", "after 6", "after 10"]} start={["after 6"]} /></Row>
              <Row title="Ring the next person after" sub="The bell moves down the approver list"><Chips opts={["5 min", "10 min", "30 min"]} start={["10 min"]} /></Row>
            </div>
          </>}
          {sec === "connections" && <>
            <h2>Connections</h2><p className="lead">Tools agents in this wing can use, still limited by each agent’s rules.</p>
            <div className="group">{([
              ["github", "GitHub", "acme/casper · push needs an approval", true], ["vercel", "Vercel", "Deploys on push to main", true],
              ["linear", "Linear", "ENG team · read and comment", true], ["slack", "Slack", "#eng-alerts · the bell posts here", true],
              ["notion", "Notion", "Specs and runbooks, read only", true], ["figma", "Figma", "Billing page designs, read only", false],
              ["google", "Google Workspace", "Calendar, Docs and Drive", false], ["stripe", "Stripe", "Refunds need a second yes over $500", false],
            ] as [BrandName, string, string, boolean][]).map(([b, n, sub, on]) => <Connect key={n} brand={b} name={n} sub={sub} start={on} />)}</div>
          </>}
          {sec === "computers" && <>
            <h2>Computers</h2><p className="lead">Cloud desktops agents work on. Anyone in the wing can watch; owners can take over.</p>
            <div className="group">
              <Row left={<Face id="jack" />} title="Jack’s laptop" sub="Claude Code · running"><Dot c={G} t="Live" /></Row>
              <Row left={<Face id="wick" />} title="Wick’s computer" sub="Chrome, demo X account"><Wake /></Row>
            </div>
            <h3>Defaults</h3>
            <div className="group"><Row title="Sleep after" sub="Logins survive, open apps don’t"><Chips opts={["10 min", "1 hour", "Never"]} start={["10 min"]} /></Row></div>
          </>}
          {sec === "sharing" && <>
            <h2>Sharing</h2><p className="lead">Rooms shared with other companies. Guests only see the shared room.</p>
            <div className="group"><Row left={<span className="pf" style={{ background: "#2f6d5a", width: 34, height: 34, borderRadius: 9 }}>NW</span>} title="Acme · Northwind" sub="#integration · guest actions need an Acme yes"><span className="tag2">Midnight pass</span></Row></div>
          </>}
        </div></div>
      </div>
    </section>
  );
}
/* ---------- your AI: bring your own keys ---------- */
type Prov = "anthropic" | "openai";
const PROV: Record<Prov, { name: string; sub: string; logo: string; prefix: string; ph: string }> = {
  anthropic: { name: "Anthropic", sub: "Claude Code and Claude models", logo: "/logos/claude.svg", prefix: "sk-ant-", ph: "sk-ant-…" },
  openai: { name: "OpenAI", sub: "Codex, GPT models and meeting transcripts", logo: "/logos/openai.svg", prefix: "sk-", ph: "sk-…" },
};
function KeyRow({ prov, saved, onSave }: { prov: Prov; saved: string | null; onSave: (masked: string | null) => void }) {
  const c = PROV[prov];
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  const [checking, setChecking] = useState(false);
  const save = () => {
    const k = val.trim();
    if (!k.startsWith(c.prefix) || k.length < 20) { setErr(`That doesn’t look like an ${c.name} key. It starts with ${c.prefix}`); return; }
    setChecking(true); setErr("");
    // The key itself is never kept in the page: only a masked tail. The hub stores it encrypted (CASPER_SECRETS_KEY).
    setTimeout(() => { onSave(`${c.prefix}…${k.slice(-4)}`); setVal(""); setOpen(false); setChecking(false); }, 700);
  };
  return (
    <div className="gr" style={{ flexWrap: "wrap" }}>
      <span className="kl"><img src={c.logo} alt="" /></span>
      <div className="grow"><b>{c.name}</b><small>{saved ? <span className="mono">{saved}</span> : c.sub}</small></div>
      {saved ? <><Dot c={G} t="Working" /><button className="pill" onClick={() => onSave(null)}>Remove</button></>
        : !open && <button className="pill white" onClick={() => setOpen(true)}>Add key</button>}
      {open && !saved && (
        <form className="keyin" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input autoFocus className="inp" type="password" autoComplete="off" spellCheck={false} placeholder={c.ph} value={val} onChange={(e) => { setVal(e.target.value); setErr(""); }} aria-label={`${c.name} API key`} />
          <button type="button" className="pill" onClick={() => { setOpen(false); setVal(""); setErr(""); }}>Cancel</button>
          <button type="submit" className="pill white" disabled={!val.trim() || checking}>{checking ? "Checking…" : "Save"}</button>
          {err && <small className="kerr">{err}</small>}
        </form>
      )}
    </div>
  );
}
function ClaudeSubRow({ onChange }: { onChange: (on: boolean) => void }) {
  const [st, setSt] = useState<{ connected: boolean; expires?: number } | null>(null);
  const [step, setStep] = useState<"idle" | "paste">("idle");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (v: { connected: boolean; expires?: number }) => { setSt(v); onChange(v.connected); };
  useEffect(() => {
    fetch("/api/claude/status").then((r) => r.json()).then((j) => { setSt(j); onChange(!!j.connected); }).catch(() => setSt({ connected: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const call = async (action: string, body?: unknown) => {
    const r = await fetch(`/api/claude/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Something went wrong. Try again.");
    return j;
  };
  const start = async () => {
    setErr(""); setBusy(true);
    try { const { url } = await call("start"); window.open(url, "_blank", "noopener"); setStep("paste"); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const finish = async () => {
    setErr(""); setBusy(true);
    try { set(await call("exchange", { code: code.trim() })); setCode(""); setStep("idle"); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const out = async () => { setBusy(true); try { set(await call("disconnect")); } finally { setBusy(false); } };
  const until = st?.expires ? new Date(st.expires).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  return (
    <div className="gr" style={{ flexWrap: "wrap" }}>
      <span className="kl"><img src="/logos/claude.svg" alt="" /></span>
      <div className="grow"><b>Claude subscription</b><small>{st?.connected ? `Signed in · renews itself${until ? ` (token good until ${until})` : ""}` : "Use your Claude Pro or Max plan instead of a key"}</small></div>
      {st === null ? <small>Checking…</small>
        : st.connected ? <><Dot c={G} t="Signed in" /><button className="pill" disabled={busy} onClick={out}>Sign out</button></>
        : step === "idle" && <button className="pill white" disabled={busy} onClick={start}>{busy ? "Opening…" : "Sign in with Claude"}</button>}
      {!st?.connected && step === "paste" && (
        <form className="keyin" onSubmit={(e) => { e.preventDefault(); if (code.trim()) finish(); }}>
          <input autoFocus className="inp" type="password" autoComplete="off" spellCheck={false} placeholder="Paste the code Claude shows you" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} aria-label="Code from Claude" />
          <button type="button" className="pill" onClick={() => { setStep("idle"); setCode(""); setErr(""); }}>Cancel</button>
          <button type="submit" className="pill white" disabled={!code.trim() || busy}>{busy ? "Checking…" : "Connect"}</button>
        </form>
      )}
      {err && <small className="kerr" style={{ flexBasis: "100%", paddingLeft: 48 }}>{err}</small>}
    </div>
  );
}
function YourAI() {
  const [keys, setKeys] = useState<Record<Prov, string | null>>({ anthropic: null, openai: null });
  const [jack, setJack] = useState("laptop");
  const [wick, setWick] = useState("anthropic");
  const [sub, setSub] = useState(false);
  const subOpt = { value: "sub", label: "Your Claude subscription", desc: sub ? "Signed in" : "Not signed in yet", icon: <img src="/logos/claude.svg" alt="" width={16} height={16} /> };
  const has = (p: Prov) => !!keys[p];
  const keyOpt = (p: Prov) => ({ value: p, label: `Your ${PROV[p].name} key`, desc: has(p) ? keys[p]! : "Not added yet", icon: <img src={PROV[p].logo} alt="" width={16} height={16} /> });
  return <>
    <h2>Your AI</h2>
    <p className="lead">Your agents run on your own API keys, so their usage is billed to you, not the wing. Keys are stored encrypted on the hub and only ever handed to your own agents. Nobody else can see them, including owners.</p>
    <div className="group">{(["anthropic", "openai"] as Prov[]).map((p) => <KeyRow key={p} prov={p} saved={keys[p]} onSave={(m) => setKeys({ ...keys, [p]: m })} />)}<ClaudeSubRow onChange={setSub} /></div>
    <h3>Who runs on what</h3>
    <div className="group">
      <Row left={<Face id="jack" />} title="Jack" sub="Claude Code on your laptop">
        <Select label="Jack runs on" value={jack} onChange={setJack} options={[{ value: "laptop", label: "Its own login", desc: "Whatever Claude Code uses on your laptop" }, subOpt, keyOpt("anthropic")]} />
      </Row>
      <Row left={<Face id="wick" />} title="Wick" sub="Its own computer (boat)">
        <Select label="Wick runs on" value={wick} onChange={setWick} options={[subOpt, keyOpt("anthropic"), keyOpt("openai")]} />
      </Row>
      <Row left={<Face id="batty" />} title="Batty" sub="Kinjal’s Codex · runs on Kinjal’s keys"><span className="tag2">Kinjal’s</span></Row>
      <Row left={<span className="faces">{CREW.map((id) => <Face key={id} id={id} />)}</span>} title="The house crew" sub="Casper, Stretch, Fatso and Stinkie run on the wing’s key"><span className="tag2">Wing key</span></Row>
    </div>
  </>;
}

function SaveButton() { const [s, set] = useState(false); return <button className="pill white" onClick={() => set(true)}>{s ? "Saved" : "Save"}</button>; }
function Wake() { const [on, set] = useState(false); return on ? <Dot c={G} t="Awake" /> : <button className="pill" onClick={() => set(true)}>Wake</button>; }
function Connect({ brand, name, sub, start }: { brand: BrandName; name: string; sub: string; start: boolean }) {
  const [on, set] = useState(start);
  return <Row left={<Brand name={brand} size={36} radius={10} />} title={name} sub={sub}>{on ? <><Dot c={G} t="Connected" /><button className="pill" onClick={() => set(false)}>Disconnect</button></> : <button className="pill white" onClick={() => set(true)}>Connect</button>}</Row>;
}
function Invite() {
  const [people, setPeople] = useState<[string, string, string][]>([["Sankritya", "#e2702f", "Owner"], ["Kinjal", "#6f5fa8", "Editor"], ["Priya", "#3f8f8a", "Editor"], ["Dana", "#b5557a", "Viewer"]]);
  const [v, setV] = useState("");
  return (
    <>
      <form className="cmd" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { setPeople([...people, [v.split("@")[0], "#6f8fc7", "Invited"]]); setV(""); } }}>
        <input className="bare" value={v} onChange={(e) => setV(e.target.value)} placeholder="Name or email" /><button className="pill white" type="submit">Invite</button>
      </form>
      <h3>In this wing <span>{people.length}</span></h3>
      <div className="group">{people.map(([n, c, r]) => <Row key={n} left={<span className="pf" style={{ background: c, width: 34, height: 34 }}>{n[0].toUpperCase()}</span>} title={n} sub={r === "Owner" ? "you" : ""}><span className="tag2">{r}</span></Row>)}</div>
    </>
  );
}
