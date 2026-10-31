"use client";

import { useState } from "react";
import Agent from "@/components/Agent";
import { P, LIBRARY, FILES, clock, Ic } from "@/components/ws/data";
import type { Id, Ev } from "@/components/ws/data";

/* ---------- ⌘K: search rooms, people, agents, messages, the Library and files ---------- */
type Hit = { group: string; title: string; sub?: string; icon: React.ReactNode; go: () => void; hint?: string };
export function Search({ onClose, shown, goMsg, pin }: { onClose: () => void; shown: Ev[]; goMsg: (i: number) => void; pin: (id: Id) => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const hash = <span className="sq">#</span>;
  const face = (id: Id) => P[id].kind ? <span className="sq img"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span> : <span className="sq" style={{ background: P[id].color, color: "#fff", fontWeight: 700 }}>{P[id].name[0]}</span>;
  const doc = <span className="sq"><Ic d="M7 3h7l4 4v14H7z M14 3v4h4" s={16} /></span>;
  const book = <span className="sq"><Ic d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z" s={16} /></span>;
  const msgIcon = <span className="sq"><Ic d="M4 5h16v11H9l-5 4z" s={16} /></span>;
  const done = (f: () => void) => () => { f(); onClose(); };

  const all: Hit[] = [
    ...["autopay-launch", "refunds-v2", "incidents"].map((r) => ({ group: "Rooms", title: r, sub: "Engineering wing", icon: hash, go: done(() => {}) })),
    ...(Object.keys(P) as Id[]).map((id) => ({ group: "People and agents", title: P[id].name, sub: P[id].sub, icon: face(id), go: done(() => P[id].kind && pin(id)) })),
    ...shown.map((e, i) => ({ group: "Messages", title: e.text, sub: `${P[e.who].name} · #autopay-launch · ${clock(i)} PM`, icon: msgIcon, go: done(() => goMsg(i)) })),
    ...LIBRARY.map((l) => ({ group: "Library", title: l.title, sub: l.sub, icon: book, go: done(() => {}) })),
    ...FILES.map((f) => ({ group: "Files", title: f.title, sub: f.sub, icon: doc, go: done(() => {}) })),
  ];
  const needle = q.trim().toLowerCase();
  const hits: Hit[] = needle
    ? [
        { group: "Ask", title: `Ask Fatso: “${q.trim()}”`, sub: "Answers from the Library, with sources", icon: face("fatso"), go: () => setAnswer(q.trim()), hint: "Tab" },
        ...all.filter((h) => `${h.title} ${h.sub}`.toLowerCase().includes(needle)).slice(0, 12),
      ]
    : [
        { group: "Unreads", title: "autopay-launch", sub: "The bell is ringing for you", icon: hash, go: done(() => {}), hint: "Enter" },
        { group: "Unreads", title: "refunds-v2", sub: "2 new", icon: hash, go: done(() => {}) },
        { group: "Recent places", title: "Jack", sub: P.jack.sub, icon: face("jack"), go: done(() => pin("jack")) },
        { group: "Recent places", title: "Kinjal", sub: "Editor · Engineering", icon: face("kinjal"), go: done(() => {}) },
        { group: "Recent places", title: LIBRARY[0].title, sub: "Library", icon: book, go: done(() => {}) },
      ];
  const n = Math.min(sel, Math.max(0, hits.length - 1));
  const mark = (t: string) => {
    if (!needle) return t;
    const k = t.toLowerCase().indexOf(needle);
    return k < 0 ? t : <>{t.slice(0, k)}<mark>{t.slice(k, k + needle.length)}</mark>{t.slice(k + needle.length)}</>;
  };
  const ans = answer && (/autopay|column|table|opt/i.test(answer)
    ? { text: "Autopay is opt-in and stored as one column per account. Kinjal set the opt-in rule on Tuesday’s call; Jack chose the column because billing reads it on every charge.", src: [LIBRARY[0].title, LIBRARY[1].title] }
    : { text: "Nothing in the Library about that yet. Want me to ask Kinjal in #autopay-launch?", src: [] });

  return (
    <div className="ov" onPointerDown={onClose}>
      <div className="search" onPointerDown={(e) => e.stopPropagation()}>
        <div className="sh">
          <Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" s={20} />
          <input autoFocus value={q} placeholder="Search rooms, people, agents, messages, the Library and files"
            onChange={(e) => { setQ(e.target.value); setSel(0); setAnswer(null); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(x + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(x - 1, 0)); }
              if (e.key === "Enter") hits[n]?.go();
              if (e.key === "Tab" && needle) { e.preventDefault(); setAnswer(q.trim()); }
              if (e.key === "Escape") onClose();
            }} />
          <kbd>esc</kbd>
        </div>
        {ans && (
          <div className="answer">
            <span className="sq img"><Agent kind="fatso" crop="head" mood="happy" className="size-full" /></span>
            <div><b>Fatso</b><p>{ans.text}</p>{ans.src.length > 0 && <div className="src">{ans.src.map((x) => <span key={x}>{x}</span>)}</div>}</div>
          </div>
        )}
        <div className="res">
          {hits.map((h, k) => (
            <div key={k}>
              {(k === 0 || hits[k - 1].group !== h.group) && <div className="grp">{h.group}</div>}
              <button className={`hit ${k === n ? "on" : ""}`} onMouseEnter={() => setSel(k)} onClick={h.go}>
                {h.icon}
                <span className="tx"><span className="tt">{mark(h.title)}</span>{h.sub && <span className="ss">{h.sub}</span>}</span>
                {k === n && <kbd>{h.hint ?? "Enter"}</kbd>}
              </button>
            </div>
          ))}
          {needle && hits.length === 1 && <div className="none">No matches. Ask Fatso instead.</div>}
        </div>
        <div className="sf"><span><kbd>↑</kbd><kbd>↓</kbd> Select</span><span><kbd>Enter</kbd> Open</span>{needle && <span><kbd>Tab</kbd> Ask Fatso</span>}<span className="r">Searches this wing only</span></div>
      </div>
    </div>
  );
}

/* ---------- the crew's group photo ---------- */
export function GroupPhoto({ onClose }: { onClose: () => void }) {
  const [shared, setShared] = useState(false);
  return (
    <div className="ov photo" onPointerDown={onClose}>
      <div className="frame" onPointerDown={(e) => e.stopPropagation()}>
        <div className="row-c">
          {(["batty", "jack", "casper", "fatso", "wick", "stretch", "stinkie"] as Id[]).map((id, k) => (
            <span key={id} className="cm" style={{ ["--h" as string]: `${[130, 150, 140, 150, 128, 156, 120][k]}px` }}><Agent kind={P[id].kind!} mood="happy" className="size-full" /></span>
          ))}
        </div>
        <h3>Jack, Batty &amp; the crew</h3>
        <p>Engineering wing · Acme Manor</p>
        <div className="acts2">
          <button className="pill dark" onClick={() => setShared(true)}><Ic d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" s={16} />{shared ? "Link copied" : "Share"}</button>
          <button className="pill round" onClick={onClose} aria-label="Close">×</button>
        </div>
      </div>
    </div>
  );
}

