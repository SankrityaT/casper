"use client";

import { createContext, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import Agent from "@/components/Agent";
import { P, APPS, LIBRARY, Ic } from "@/components/ws/data";
import Brand from "@/components/ui/Brand";
import type { Att, Id } from "@/components/ws/data";

/* What opens when you click any source: a chip, a snippet, a PDF, an integration card.
   The room can plug in actions (ask an agent, open the Library); without them the buttons just copy or close. */

export const SourceCtx = createContext<{ ask?: (id: Id, text: string) => void; library?: () => void }>({});

const CODE: Record<string, { start: number; lines: string[]; hl: number[]; by: string; when: string }> = {
  "api/billing/charge.ts": {
    start: 36, hl: [43], by: "Jack", when: "edited 2:08 PM",
    lines: ["import { stripe } from \"../stripe\";", "import { plans } from \"../plans\";", "", "// called once per account per billing cycle", "", "export async function charge(account: Account) {", "  const plan = await plans.get(account.planId);", "  if (account.autopay) {", "    return stripe.charge(account, plan.price);", "  }", "  return notify(account, \"invoice_due\");", "}"],
  },
};
const GENERIC = (name: string) => ({ start: 1, hl: [] as number[], by: "Jack", when: "today", lines: [`// ${name}`, "export const autopay = {", "  enabled: false, // opt-in only", "};"] });

const DETAIL: Record<string, { rows: [string, string, "ok" | "warn" | "plain"][]; files?: [string, string][] }> = {
  github: { rows: [["Tests", "6 passed", "ok"], ["Lint", "clean", "ok"], ["Preview", "deployed", "ok"], ["Review", "waiting on Sankritya", "warn"]], files: [["api/autopay.ts", "+24 −9"], ["AutopayToggle.tsx", "+31"], ["api/autopay.test.ts", "+38"]] },
  vercel: { rows: [["Status", "Ready", "ok"], ["Built in", "41 s", "plain"], ["Branch", "jack/autopay", "plain"], ["Commit", "a3f9c21 autopay api + toggle", "plain"]] },
  linear: { rows: [["Status", "Todo", "warn"], ["Assignee", "nobody yet", "plain"], ["Team", "Engineering", "plain"], ["Linked room", "#autopay-launch", "plain"]] },
  x: { rows: [["Posts", "3 in the thread", "plain"], ["Clip", "autopay-toggle.mp4 · 10 s", "plain"], ["Account", "@casper_demo", "plain"], ["Needs", "Kinjal’s yes before posting", "warn"]] },
  notion: { rows: [["Space", "Specs", "plain"], ["Edited", "Tuesday by Kinjal", "plain"], ["Read by", "Fatso, 2 days ago", "plain"]] },
  figma: { rows: [["File", "Billing page", "plain"], ["Frame", "Autopay toggle", "plain"], ["Edited", "yesterday", "plain"]] },
  drive: { rows: [["Owner", "Kinjal", "plain"], ["Size", "14 KB", "plain"]] },
  slack: { rows: [["Channel", "#eng-alerts", "plain"]] },
};

function Code({ file }: { file: string }) {
  const c = CODE[file] ?? GENERIC(file);
  return (
    <div className="snip">
      <div className="sh2"><Ic d="M7 3h7l4 4v14H7z M14 3v4h4" s={13} />{file}<span>{c.by} · {c.when}</span></div>
      <pre>{c.lines.map((l, i) => <div key={i} className={c.hl.includes(c.start + i) ? "hl" : ""}><i>{c.start + i}</i>{l}</div>)}</pre>
    </div>
  );
}

function Body({ a, close }: { a: Att; close: () => void }) {
  const ctx = useContext(SourceCtx);
  const btn = (label: string, f: () => void, primary = false) => <button className={`pill ${primary ? "white" : ""}`} onClick={() => { f(); close(); }}>{label}</button>;
  const copy = (s: string) => navigator.clipboard?.writeText(s).catch(() => {});

  if (a.t === "agent") {
    const dec = LIBRARY.find((l) => a.note && l.title.toLowerCase().includes(a.note.toLowerCase().split(" ")[0])) ?? LIBRARY[0];
    return (
      <>
        <div className="pk-h"><span className="pk-av"><Agent kind={P[a.id].kind!} mood="happy" className="size-full" /></span>
          <div><small>Source</small><b>{P[a.id].name}</b><span>{P[a.id].sub}</span></div></div>
        <div className="pk-sec"><small>What {P[a.id].name} contributed</small><blockquote>“{a.note ?? "answered from the Library"}”</blockquote></div>
        <div className="pk-sec"><small>Backed by</small>
          <div className="dec"><span className="k">Decision · Library</span><b>{dec.title}</b><small>{dec.sub}</small></div></div>
        <div className="pk-acts">{btn(`Ask ${P[a.id].name}`, () => ctx.ask?.(a.id, a.note ?? ""), true)}{btn("Open in Library", () => ctx.library?.())}</div>
      </>
    );
  }
  if (a.t === "file" || a.t === "code" || a.t === "md") {
    const name = "name" in a ? a.name : a.file;
    const isVideo = /\.mp4$/.test(name);
    return (
      <>
        <div className="pk-h"><span className="ic2 big"><Ic d="M7 3h7l4 4v14H7z M14 3v4h4" s={18} /></span><div><small>File</small><b>{name}</b><span>{"meta" in a && a.meta ? a.meta : "acme/casper"}</span></div></div>
        {isVideo ? <div className="pk-video"><span>▶</span>10 s clip · recorded on Wick’s computer</div>
          : a.t === "md" ? <div className="snip md"><div className="mdb">{a.lines.map((l, i) => <p key={i}>{l.replace(/\*\*/g, "")}</p>)}</div></div>
          : <Code file={name} />}
        <div className="pk-acts">{btn("Open in GitHub", () => {}, true)}{btn("Copy path", () => copy(name))}</div>
      </>
    );
  }
  if (a.t === "pdf") {
    return (
      <>
        <div className="pk-h"><span className="ic2 pdf big">PDF</span><div><small>Document</small><b>{a.name}</b><span>{a.pages} pages · page 4 of {a.pages}</span></div></div>
        <div className="pk-page">
          <b>{a.title}</b>
          {[96, 88, 100, 72].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}
          {a.quote && <mark>{a.quote}</mark>}
          {[90, 100, 84, 60, 94, 70].map((w, i) => <i key={`b${i}`} style={{ width: `${w}%` }} />)}
          <span className="pg-n">4</span>
        </div>
        <div className="pk-acts">{btn("Open PDF", () => {}, true)}{btn("Copy quote", () => copy(a.quote ?? a.title))}</div>
      </>
    );
  }
  if (a.t === "link") {
    return (
      <>
        <div className="pk-h"><span className="ic2 big"><Ic d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" s={18} /></span><div><small>Link</small><b>{a.title}</b><span>{a.host}</span></div></div>
        <div className="pk-link"><b>{a.title}</b><span>https://{a.host}/rec/tuesday-sync</span></div>
        <div className="pk-acts">{btn("Open link", () => {}, true)}{btn("Copy link", () => copy(`https://${a.host}/rec/tuesday-sync`))}</div>
      </>
    );
  }
  const app = APPS[a.app];
  const d = DETAIL[a.app] ?? { rows: [] };
  return (
    <>
      <div className="pk-h"><Brand name={a.app} size={40} radius={10} /><div><small>{app.name}</small><b>{a.title}</b><span>{a.meta}</span></div>{a.state && <span className="state">{a.state}</span>}</div>
      <div className="pk-rows">{d.rows.map(([k, v, tone]) => <div key={k}><small>{k}</small><span className={tone}>{tone === "ok" ? "✓ " : tone === "warn" ? "● " : ""}{v}</span></div>)}</div>
      {d.files && <div className="pk-sec"><small>Files changed</small><div className="files">{d.files.map(([f, n]) => <div key={f}>{f}<span className="p">{n}</span></div>)}</div></div>}
      <div className="pk-acts">{btn(`Open in ${app.name}`, () => {}, true)}{btn("Copy link", () => copy(a.meta))}</div>
    </>
  );
}

export default function SourcePeek({ a, host, onClose }: { a: Att; host: Element | null; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  if (!host) return null;
  return createPortal(
    <div className="ov peek-ov" onPointerDown={onClose}>
      <div className="peek" onPointerDown={(e) => e.stopPropagation()}>
        <button className="pk-x" onClick={onClose} aria-label="Close"><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button>
        <Body a={a} close={onClose} />
      </div>
    </div>,
    host,
  );
}
