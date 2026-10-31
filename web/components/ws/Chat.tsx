"use client";

/* Reusable chat pieces: a message, its reactions, threads, typing, approval cards and the composer.
   Wrap them in an element with class "ws" (or use <WsScope>) to get the app's styles. */

import { useEffect, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { P, QUICK, ATTACHABLE, Ic } from "@/components/ws/data";
import type { Id, Ask, Att } from "@/components/ws/data";
import Brand from "@/components/ui/Brand";
import Attachments, { Chip } from "@/components/ws/Attachments";
import { Emo, SPOOKY } from "@/components/ws/Spooky";
import MessageActions, { type Target, type MsgFlags } from "@/components/ws/MessageActions";
export type { Target } from "@/components/ws/MessageActions";

export function WsScope({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`ws ${className}`} style={style}>{children}</div>;
}

/* who left a reaction: stable per message, a mix of people and agents */
const POOL: Id[] = ["kinjal", "fatso", "jack", "batty", "stinkie", "casper", "wick", "stretch"];
function reactors(k: string, em: string, n: number): Id[] {
  let h = 0;
  for (const c of k + em) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out: Id[] = [];
  for (let i = 0; out.length < n && i < POOL.length * 2; i++) { const id = POOL[(h + i * 5) % POOL.length]; if (!out.includes(id)) out.push(id); }
  return out;
}
const listNames = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const RULE = { push: "push to main", post: "post publicly", spend: "spend money" } as const;
const VERB = { push: "Approve and push", post: "Approve and post", spend: "Approve payment" } as const;
const ALT = { push: "Open diff", post: "Edit draft", spend: "See charges" } as const;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* The bell's card: who's asking, what for, the evidence, and one tap to decide. Collapses once decided. */
export function AskCard({ ask, done, onYes, onNo, by }: { ask: Ask; done: boolean; onYes: () => void; onNo?: () => void; by?: Id }) {
  const kind = ask.kind ?? (ask.files ? "push" : "post");
  const from: Id = by ?? (kind === "push" ? "jack" : "wick");
  const next: Id = ask.for === "sankritya" ? "kinjal" : "sankritya";
  const [left, setLeft] = useState(600);
  const [no, setNo] = useState(false);
  useEffect(() => {
    if (done || no) return;
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
  }, [done, no]);
  const totals = (ask.files ?? []).reduce((a, [, d]) => { const p = d.match(/\+(\d+)/), m = d.match(/−(\d+)/); return [a[0] + (p ? +p[1] : 0), a[1] + (m ? +m[1] : 0)]; }, [0, 0]);

  if (done || no) {
    return (
      <div className={`ask2 decided ${no ? "declined" : ""}`}>
        <span className="tick">{no ? <Ic d="M6 6l12 12M18 6L6 18" s={14} /> : <Ic d="M5 12l5 5 9-10" s={14} />}</span>
        <div className="grow">
          <b>{ask.title.replace(/\?$/, "")}</b>
          <small>{no ? `Not now · ${P[ask.for].name}` : `Approved by ${P[ask.for].name} · just now`}{!no && kind === "push" && ` · +${totals[0]} −${totals[1]}`}{!no && kind === "post" && " · 3 posts, 1 clip"}</small>
        </div>
        {!no && <span className="kept"><Ic d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z" s={13} />Kept in the Library</span>}
      </div>
    );
  }

  return (
    <div className="ask2">
      <div className="a-top">
        <span className="bellpill"><Ic d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20a2 2 0 0 0 4 0" s={13} />Needs {P[ask.for].name}</span>
        <span className="timer" title="If nobody answers, the bell moves on">rings {P[next].name} in {mmss(left)}</span>
      </div>
      <div className="a-who">
        <span className="a-av"><Agent kind={P[from].kind!} mood="alert" crop="head" className="size-full" /></span>
        <span><b>{P[from].name}</b> asks first before it can <b>{RULE[kind]}</b></span>
      </div>
      <div className="a-title">{ask.title}</div>

      {kind === "push" && ask.files && (
        <div className="a-ev">
          {ask.files.map(([f, d]) => {
            const p = +(d.match(/\+(\d+)/)?.[1] ?? 0), m = +(d.match(/−(\d+)/)?.[1] ?? 0), tot = Math.max(1, p + m);
            return (
              <div key={f} className="frow">
                <Ic d="M7 3h7l4 4v14H7z M14 3v4h4" s={13} /><span className="fn">{f}</span>
                <span className="bars">{Array.from({ length: 5 }, (_, k) => <i key={k} className={k < Math.round((p / tot) * 5) ? "g" : k < Math.round(((p + m) / tot) * 5) ? "r" : ""} />)}</span>
                <span className="pm"><em>+{p}</em>{m > 0 && <s>−{m}</s>}</span>
              </div>
            );
          })}
          {ask.checks && <div className="checks"><Ic d="M5 12l5 5 9-10" s={13} />{ask.checks}</div>}
        </div>
      )}

      {kind === "post" && ask.post && (
        <div className="a-ev xpost">
          <div className="xh"><Brand name="x" size={20} radius={5} /><b>Casper</b><small>@casper_demo · draft · 1/{ask.post.length}</small></div>
          <p>{ask.post[0]}</p>
          <div className="clip"><span className="play">▶</span><span>autopay-toggle.mp4 · 0:10</span></div>
          <small className="more">+{ask.post.length - 1} more posts in the thread</small>
        </div>
      )}

      <div className="a-acts">
        <button className="pill white btn" onClick={onYes}>{VERB[kind]}</button>
        <button className="pill btn">{ALT[kind]}</button>
        <button className="pill btn ghost" onClick={() => { setNo(true); onNo?.(); }}>Not now</button>
        <span className="a-alt" title="Who else can approve">
          {(["sankritya", "kinjal"] as Id[]).map((h) => <span key={h} className={`pf ${h === ask.for ? "on" : ""}`} style={{ background: P[h].color }}>{P[h].name[0]}</span>)}
        </span>
      </div>
    </div>
  );
}


/* ---------- one chat message, with reactions and a hover bar ---------- */
export function Bubble({ k, who, text, meta, to, flash, rx = [], mine: mineProp, react: reactProp, onThread, att, room, onForward, onAsk, children }: {
  k: string; who: Id; text: string; meta: string; to?: Id; flash?: boolean; rx?: [string, number][]; att?: Att[];
  mine?: Record<string, boolean>; react?: (k: string, e: string) => void; onThread?: () => void;
  room?: string; onForward?: (t: Target, text: string) => void; onAsk?: (agent: Id, text: string) => void; children?: React.ReactNode;
}) {
  // works on its own too: without mine/react it keeps its own reactions
  const [own, setOwn] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<string[]>([]);
  const mine = mineProp ?? own;
  const react = reactProp ?? ((key: string, e: string) => { setOwn((m) => ({ ...m, [`${key}:${e}`]: !m[`${key}:${e}`] })); if (!rx.some(([x]) => x === e)) setAdded((a) => [...new Set([...a, e])]); });
  rx = reactProp ? rx : [...rx, ...added.map((x) => [x, 0] as [string, number])];
  const [flags, setFlags] = useState<MsgFlags>({});
  const [note, setNote] = useState<string | null>(null);
  const toast = (t: string) => { setNote(t); setTimeout(() => setNote((n) => (n === t ? null : n)), 1800); };
  // messages without a thread panel get an inline thread
  const [inline, setInline] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const p = P[who];
  const list = rx.filter(([em], i) => rx.findIndex(([x]) => x === em) === i);
  const tags = [flags.saved && "Saved", flags.pinned && "Pinned to canvas", flags.task && "Task · routed by Stretch", flags.remind && `Reminder · ${flags.remind.toLowerCase()}`, flags.follow && "Following", flags.flagged && "Flagged"].filter(Boolean) as string[];
  return (
    <div data-msg={k} data-who={who} data-has={[...(att ?? []).map((x) => (x.t === "app" ? x.app : x.t)), children ? "card" : ""].join(" ")} className={`m in hov ${flash ? "flash" : ""} ${flags.unread ? "unread" : ""} ${flags.flagged ? "flagged" : ""}`}>
      {p.kind ? <div className="av"><Agent kind={p.kind} crop="head" className="size-full" /></div> : <span className="pf" style={{ background: p.color }}>{p.name[0]}</span>}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="who"><b>{p.name}</b>{to && P[to].kind && p.kind && <small style={{ color: "#cfc6ff" }}>→ {P[to].name}</small>}<small>{meta}</small>{flags.unread && <span className="new">New</span>}</div>
        {tags.length > 0 && <div className="mtags">{tags.map((t) => <span key={t}>{t}</span>)}</div>}
        {text && <p>{text.split(/(@\w+)/).map((t, i) => (t.startsWith("@") ? <span key={i} className="mention">{t}</span> : t))}</p>}
        <Attachments list={att} />
        {children}
        {list.some(([em, n]) => n + (mine[`${k}:${em}`] ? 1 : 0) > 0) && (
          <div className="rx">
            {list.map(([em, n]) => {
              const me = !!mine[`${k}:${em}`];
              if (n + (me ? 1 : 0) <= 0) return null;
              const who = reactors(k, em, n);
              return (
                <span key={em} className="tipw rxw">
                  <button className={me ? "me" : ""} onClick={() => react(k, em)}><Emo name={em} size={20} />{n + (me ? 1 : 0)}</button>
                  <span className="tip rxtip" role="tooltip">
                    <span className="rxbig"><Emo name={em} size={30} /></span>
                    <span className="rxfaces">{[...(me ? (["sankritya"] as Id[]) : []), ...who].map((id) => P[id].kind
                      ? <span key={id} className="rf"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>
                      : <span key={id} className="rf pfx" style={{ background: P[id].color }}>{P[id].name[0]}</span>)}</span>
                    <span className="rxtext">{listNames([...(me ? ["You"] : []), ...who.map((id) => P[id].kind ? `${P[id].name} (agent)` : P[id].name)])} reacted with <b>{em in SPOOKY ? SPOOKY[em as keyof typeof SPOOKY].label.toLowerCase() : em}</b></span>
                  </span>
                </span>
              );
            })}
          </div>
        )}
        {!onThread && replies.length > 0 && !inline && <button className="replies" onClick={() => setInline(true)}><b>{replies.length} {replies.length === 1 ? "reply" : "replies"}</b><span>Last reply just now</span><em>View thread</em></button>}
        {inline && (
          <div className="inline-th">
            {replies.map((r, i) => <div key={i} className="ir"><span className="pf" style={{ background: P.sankritya.color }}>S</span><div><b>Sankritya</b> <small>now</small><p>{r}</p></div></div>)}
            <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setReplies([...replies, draft.trim()]); setDraft(""); } }}>
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply to ${p.name}…`} />
              <button type="button" className="pill" onClick={() => setInline(false)}>Close</button>
            </form>
          </div>
        )}
      </div>
      <MessageActions k={k} text={text} who={who} room={room} quick={QUICK.slice(0, 3)}
        onReact={(e) => react(k, e)} onThread={onThread ?? (() => setInline(true))}
        onForward={onForward && ((t) => onForward(t, text))} onAsk={onAsk && ((a) => onAsk(a, text))}
        flags={flags} setFlags={setFlags} toast={toast} />
      {note && <div className="mtoast">{note}</div>}
    </div>
  );
}

export function Replies({ n, who, onOpen }: { n: number; who: Id[]; onOpen: () => void }) {
  if (!n) return null;
  return (
    <button className="replies" onClick={onOpen}>
      <span className="faces">{[...new Set(who)].slice(0, 3).map((w) => P[w].kind ? <span key={w} className="a"><Agent kind={P[w].kind!} crop="head" className="size-full" /></span> : <span key={w} className="pf" style={{ background: P[w].color }}>{P[w].name[0]}</span>)}</span>
      <b>{n} {n === 1 ? "reply" : "replies"}</b><span>Last reply just now</span><em>View thread</em>
    </button>
  );
}

export function TypingBar({ who }: { who: Id | null }) {
  if (!who) return null;
  const p = P[who];
  return (
    <div className="typing-bar" style={{ ["--tint" as string]: p.kind ? "rgba(245,138,51,.13)" : `${p.color}33` }}>
      <span className={`peek ${p.kind ? "" : "human"}`}>{p.kind ? <Agent kind={p.kind} mood="happy" className="size-full" /> : <span className="pf" style={{ background: p.color }}>{p.name[0]}</span>}</span>
      <span><b>{p.name}</b> is {p.kind ? "working on a reply" : "typing"}</span><i /><i /><i />
    </div>
  );
}

export function TakeOver({ who }: { who: string }) {
  const [driving, setDriving] = useState(false);
  return (
    <div className="foot">
      <span style={driving ? { color: "#7fa6ee" } : undefined}><span className="dot" style={{ background: driving ? "#7fa6ee" : "var(--green)" }} />{driving ? `You’re driving · ${who} paused` : `Live · ${who}’s screen`}</span>
      <button className="pill white" style={{ height: 28 }} onClick={() => setDriving(!driving)}>{driving ? "Hand back" : "Take over"}</button>
    </div>
  );
}


/* ---------- the message box: @ opens a picker, + attaches from your tools ---------- */
export type Mentionable = { handle: string; name: string; sub: string; face: React.ReactNode; color?: string };
export function Composer({ value, set, onSend, placeholder, people, noAttach }: { value: string; set: (v: string) => void; onSend: (t: string, a?: Att[]) => void; placeholder: string; people?: Mentionable[]; noAttach?: boolean }) {
  const [att, setAtt] = useState<Att[]>([]);
  const [menu, setMenu] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const m = value.match(/@(\w*)$/);
  const all: Mentionable[] = people ?? (Object.keys(P) as Id[]).map((id) => ({ handle: P[id].name, name: P[id].name, sub: P[id].kind ? P[id].sub : "person", color: P[id].color, face: P[id].kind ? <Agent kind={P[id].kind!} crop="head" className="size-full" /> : P[id].name[0] }));
  const opts = m ? all.filter((x) => x.handle.toLowerCase().startsWith(m[1].toLowerCase()) || x.name.toLowerCase().startsWith(m[1].toLowerCase())) : [];
  const n = Math.min(sel, Math.max(0, opts.length - 1));
  const pick = (x: Mentionable) => { set(value.replace(/@(\w*)$/, `@${x.handle} `)); setSel(0); input.current?.focus(); };
  const submit = () => { if (!value.trim() && !att.length) return; onSend(value, att.length ? att : undefined); set(""); setAtt([]); setMenu(false); };
  return (
    <form className="box" onSubmit={(e) => { e.preventDefault(); if (opts.length) pick(opts[n]); else submit(); }}>
      {opts.length > 0 && (
        <div className="popup">
          <div className="hd">People and agents</div>
          {opts.map((x, k) => (
            <button type="button" key={x.handle} className={k === n ? "on" : ""} onMouseEnter={() => setSel(k)} onClick={() => pick(x)}>
              <span className="face" style={{ background: x.color ?? "var(--card-2)" }}>{x.face}</span>
              {x.name}<small>{x.sub}</small>
            </button>
          ))}
        </div>
      )}
      {menu && (
        <div className="popup">
          <div className="hd">Attach from your tools</div>
          {ATTACHABLE.map((a, k) => (
            <button type="button" key={k} onClick={() => { setAtt((x) => [...x, a]); setMenu(false); input.current?.focus(); }}><Chip a={a} /></button>
          ))}
        </div>
      )}
      {att.length > 0 && <div className="pend">{att.map((a, k) => <Chip key={k} a={a} onRemove={() => setAtt((x) => x.filter((_, j) => j !== k))} />)}</div>}
      <input ref={input} value={value} placeholder={placeholder}
        onChange={(e) => { set(e.target.value); setSel(0); }}
        onKeyDown={(e) => {
          if (!opts.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(x + 1, opts.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(x - 1, 0)); }
          if (e.key === "Tab") { e.preventDefault(); pick(opts[n]); }
          if (e.key === "Escape") set(value.replace(/@(\w*)$/, ""));
        }} />
      <div className="bt">
        <button type="button" className="tbtn" onClick={() => set(value + (value && !value.endsWith(" ") ? " @" : "@"))} title="Mention">@</button>
        {!noAttach && <button type="button" className={`tbtn ${menu ? "on" : ""}`} onClick={() => setMenu(!menu)} title="Attach">+</button>}
        <button type="submit" className="send" aria-label="Send"><Ic d="M12 19V5M6 11l6-6 6 6" s={16} /></button>
      </div>
    </form>
  );
}


