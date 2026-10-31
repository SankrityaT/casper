"use client";

import { useState } from "react";
import Agent from "@/components/Agent";
import SourcePeek from "@/components/ws/SourcePeek";
import Brand from "@/components/ui/Brand";
import { P, APPS, Ic } from "@/components/ws/data";
import type { Att } from "@/components/ws/data";

const FILE = "M7 3h7l4 4v14H7z M14 3v4h4";
const LINK = "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1";

/* inline markdown: **bold** and `code` */
function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) =>
    p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : p,
  );
}

/* very small TS highlighter, enough for snippets */
function tokens(line: string) {
  return line.split(/(\b(?:export|async|function|const|return|if|await|new)\b|"[^"]*"|'[^']*'|\/\/.*$|\b\d+\b)/).map((p, i) => {
    if (/^(export|async|function|const|return|if|await|new)$/.test(p)) return <span key={i} className="kw">{p}</span>;
    if (/^["']/.test(p)) return <span key={i} className="str">{p}</span>;
    if (/^\/\//.test(p)) return <span key={i} className="cm">{p}</span>;
    if (/^\d+$/.test(p)) return <span key={i} className="nm">{p}</span>;
    return p;
  });
}

export function Chip({ a, onRemove }: { a: Att; onRemove?: () => void }) {
  const x = onRemove && <button type="button" className="chip-x" onClick={onRemove} aria-label="Remove">×</button>;
  if (a.t === "agent")
    return <span className="src who"><span className="ic2"><Agent kind={P[a.id].kind!} crop="head" className="size-full" /></span><b>{P[a.id].name}</b>{a.note && <small>{a.note}</small>}{x}</span>;
  if (a.t === "file" || a.t === "pdf" || a.t === "md" || a.t === "code")
    return <span className="src"><span className={`ic2 ${a.t === "pdf" ? "pdf" : ""}`}>{a.t === "pdf" ? "PDF" : <Ic d={FILE} s={14} />}</span><b>{"name" in a ? a.name : a.file}</b>{"meta" in a && a.meta && <small>{a.meta}</small>}{x}</span>;
  if (a.t === "link")
    return <span className="src"><span className="ic2"><Ic d={LINK} s={14} /></span><b>{a.title}</b><small>{a.host}</small>{x}</span>;
  return <span className="src"><Brand name={a.app} size={20} radius={5} /><b>{a.title}</b>{a.state && <small>{a.state}</small>}{x}</span>;
}

function Block({ a }: { a: Att }) {
  if (a.t === "code")
    return (
      <div className="snip">
        <div className="sh2"><Ic d={FILE} s={13} />{a.file}<span>lines {a.start}–{a.start + a.lines.length - 1}</span></div>
        <pre>{a.lines.map((l, i) => <div key={i} className={a.hl?.includes(a.start + i) ? "hl" : ""}><i>{a.start + i}</i>{tokens(l)}</div>)}</pre>
      </div>
    );
  if (a.t === "md")
    return (
      <div className="snip md">
        <div className="sh2"><Ic d={FILE} s={13} />{a.file}<span>Markdown</span></div>
        <div className="mdb">{a.lines.map((l, i) => l.startsWith("## ") ? <h4 key={i}>{l.slice(3)}</h4> : l.startsWith("- ") ? <li key={i}>{inline(l.slice(2))}</li> : <p key={i}>{inline(l)}</p>)}</div>
      </div>
    );
  if (a.t === "pdf")
    return (
      <div className="pdfc">
        <div className="pg"><b>{a.title}</b>{[90, 100, 76, 96, 60].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}{a.quote && <mark>{a.quote}</mark>}{[84, 70].map((w, i) => <i key={`b${i}`} style={{ width: `${w}%` }} />)}</div>
        <div className="pm"><span className="ic2 pdf">PDF</span><div><b>{a.name}</b><small>{a.pages} pages{a.quote ? " · quoted on page 4" : ""}</small></div></div>
      </div>
    );
  if (a.t === "app") {
    const app = APPS[a.app];
    const tone = /review|draft|todo/i.test(a.state ?? "") ? "amber" : /ready|merged|open|working|page|file/i.test(a.state ?? "") ? "green" : "";
    return (
      <div className="appc">
        <Brand name={a.app} size={30} radius={8} />
        <div className="grow"><small>{app.name}</small><b>{a.title}</b><small>{a.meta}</small></div>
        {a.state && <span className={`state ${tone}`}>{a.state}</span>}
      </div>
    );
  }
  return null;
}

/* blocks (code, md, pdf, app cards) first, then a row of source chips. Everything opens in the source viewer. */
export default function Attachments({ list }: { list?: Att[] }) {
  // remember where to open the viewer (the nearest app scope) at click time
  const [peek, setPeek] = useState<{ a: Att; host: Element | null } | null>(null);
  if (!list?.length) return null;
  const blocks = list.filter((a) => a.t === "code" || a.t === "md" || a.t === "pdf" || a.t === "app");
  const chips = list.filter((a) => a.t === "agent" || a.t === "file" || a.t === "link");
  const open = (a: Att) => (e: React.MouseEvent | React.KeyboardEvent) => { if ((e.target as HTMLElement).closest("summary, .chip-x")) return; setPeek({ a, host: (e.currentTarget as HTMLElement).closest(".ws") }); };
  return (
    <div className="atts">
      {blocks.map((a, i) => <div key={i} className="openable" role="button" tabIndex={0} onClick={open(a)} onKeyDown={(e) => e.key === "Enter" && open(a)(e)} title="Open source"><Block a={a} /></div>)}
      {chips.length > 0 && <div className="srcs"><span className="lb">Sources</span>{chips.map((a, i) => <button type="button" key={i} className="chipbtn" onClick={open(a)} title="Open source"><Chip a={a} /></button>)}</div>}
      {peek && <SourcePeek a={peek.a} host={peek.host} onClose={() => setPeek(null)} />}
    </div>
  );
}
