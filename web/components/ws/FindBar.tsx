"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { P, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";

/* Find inside a room or a thread. Works on any container of messages ([data-msg] with data-who / data-has):
   highlights matches in place with the CSS Highlight API, counts them, and steps through with ↑ ↓ / Enter. */

const HAS: [string, string, string[]][] = [
  ["code", "Code", ["code"]],
  ["file", "Files", ["file", "md"]],
  ["pdf", "PDFs", ["pdf"]],
  ["link", "Links", ["link", "github", "vercel", "linear", "notion", "figma", "drive", "x"]],
  ["card", "Approvals", ["card"]],
];

type Match = { range: Range; msg: HTMLElement };

export default function FindBar({ scope, onClose, label }: { scope: React.RefObject<HTMLElement | null>; onClose: () => void; label: string }) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Id | null>(null);
  const [has, setHas] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [hits, setHits] = useState<Match[]>([]);
  const [msgs, setMsgs] = useState(0);
  const [people, setPeople] = useState<Id[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  // who is in this room or thread, for the "From" filter
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    // reading the rendered messages is the point here, so state is set after layout
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeople([...new Set([...el.querySelectorAll<HTMLElement>("[data-msg]")].map((m) => m.dataset.who as Id))].filter((x) => P[x]));
  }, [scope]);

  // find every match
  useLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const needle = q.trim().toLowerCase();
    const want = has ? HAS.find(([k]) => k === has)![2] : null;
    const ms = [...el.querySelectorAll<HTMLElement>("[data-msg]")].filter((m) =>
      (!who || m.dataset.who === who) && (!want || want.some((w) => (m.dataset.has ?? "").split(" ").includes(w))));
    const out: Match[] = [];
    if (needle) {
      for (const m of ms) {
        const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) => (n.parentElement?.closest(".hb, .mtoast, .inline-th form, input") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
        });
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const t = (n.textContent ?? "").toLowerCase();
          for (let at = t.indexOf(needle); at >= 0; at = t.indexOf(needle, at + needle.length)) {
            const r = document.createRange();
            r.setStart(n, at); r.setEnd(n, at + needle.length);
            out.push({ range: r, msg: m });
          }
        }
      }
    }
    el.querySelectorAll("[data-msg]").forEach((m) => m.classList.toggle("find-dim", (!!who || !!has || !!needle) && !(needle ? out.some((o) => o.msg === m) : ms.includes(m as HTMLElement))));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHits(out);
    setMsgs(needle ? new Set(out.map((o) => o.msg)).size : ms.length);
    setI(0);
  }, [q, who, has, scope]);

  // paint highlights, scroll to the current one
  useEffect(() => {
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const H = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    if (reg && H) {
      reg.set("find", new H(...hits.map((h) => h.range)));
      if (hits[i]) reg.set("find-cur", new H(hits[i].range)); else reg.delete("find-cur");
    }
    hits[i]?.msg.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [hits, i]);

  // clean up when closed
  useEffect(() => () => {
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    reg?.delete("find"); reg?.delete("find-cur");
    scope.current?.querySelectorAll(".find-dim").forEach((m) => m.classList.remove("find-dim"));
  }, [scope]);

  const step = (d: number) => hits.length && setI((x) => (x + d + hits.length) % hits.length);

  return (
    <div className="findbar" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}>
      <div className="fr">
        <Ic d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M16 16l4 4" s={16} />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${label}`}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
            if (e.key === "ArrowDown") { e.preventDefault(); step(1); }
            if (e.key === "ArrowUp") { e.preventDefault(); step(-1); }
            if (e.key === "Escape") onClose();
          }} />
        <span className="cnt">{q.trim() ? (hits.length ? `${i + 1} of ${hits.length}` : "No matches") : who || has ? `${msgs} messages` : ""}</span>
        <button title="Previous (⇧Enter)" onClick={() => step(-1)} disabled={!hits.length}><Ic d="M6 15l6-6 6 6" s={16} /></button>
        <button title="Next (Enter)" onClick={() => step(1)} disabled={!hits.length}><Ic d="M6 9l6 6 6-6" s={16} /></button>
        <button title="Close (Esc)" onClick={onClose}><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button>
      </div>
      <div className="ff">
        <span className="fl">From</span>
        {people.map((id) => (
          <button key={id} className={`fchip ${who === id ? "on" : ""}`} onClick={() => setWho(who === id ? null : id)}>
            {P[id].kind ? <span className="fa"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span> : <span className="fa" style={{ background: P[id].color, color: "#fff" }}>{P[id].name[0]}</span>}
            {P[id].name}
          </button>
        ))}
        <span className="fl" style={{ marginLeft: 6 }}>Has</span>
        {HAS.map(([k, t]) => <button key={k} className={`fchip ${has === k ? "on" : ""}`} onClick={() => setHas(has === k ? null : k)}>{t}</button>)}
      </div>
    </div>
  );
}
