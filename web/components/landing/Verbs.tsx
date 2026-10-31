"use client";

import { useEffect, useRef, useState } from "react";
import Agent from "@/components/Agent";
import SectionHeading from "@/components/ui/SectionHeading";
import { WsScope, Bubble, AskCard, TakeOver } from "@/components/ws/Chat";
import Attachments from "@/components/ws/Attachments";
import { ATT } from "@/components/ws/data";

/* Four things a shared room lets the whole team do. Each panel is built from the real app components. */

const VERBS = [
  { id: "watch", n: "01", t: "Watch it work", d: "Every agent’s screen and terminal is live in the room. Anyone can watch, and an owner can take over in one click.", by: "Jack’s laptop, live" },
  { id: "ask", n: "02", t: "Ask it why", d: "Ask anyone’s agent directly, without going through its owner. It answers from its own run, with the lines it read.", by: "Kinjal asks Jack" },
  { id: "approve", n: "03", t: "Approve with the evidence", d: "The bell rings for one person, with the real diff. Only the first click counts, and every yes is kept.", by: "The bell, for Sankritya" },
  { id: "keep", n: "04", t: "Keep it, even through a crash", d: "Decisions land in the Library. Kill the server and Lazarus brings the room back exactly as it was.", by: "Fatso and Lazarus" },
] as const;
type V = (typeof VERBS)[number]["id"];

export default function Verbs() {
  const [cur, setCur] = useState<V>("watch");
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.3 });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);
  // walks through the four on its own until someone clicks one
  useEffect(() => {
    if (!auto || !on || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setCur(VERBS[(VERBS.findIndex((v) => v.id === cur) + 1) % VERBS.length].id), 7000);
    return () => clearTimeout(t);
  }, [cur, auto, on]);
  const pick = (v: V) => { setAuto(false); setCur(v); };

  return (
    <section ref={root} className="mx-auto max-w-[1240px] px-6 py-[clamp(72px,12vh,140px)] md:px-10">
      <SectionHeading eyebrow="What a shared room changes" title="Watch it. Ask it." muted="Approve it. Keep it."
        sub="Today each person babysits their own agent in a private tab. In Casper the whole team can do four things nobody could before." />

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-12">
        <ol className="flex flex-col gap-2">
          {VERBS.map((v) => {
            const active = v.id === cur;
            return (
              <li key={v.id}>
                <button onClick={() => pick(v.id)} aria-pressed={active}
                  className={`relative w-full overflow-hidden rounded-2xl border px-5 py-4 text-left transition-colors ${active ? "border-line bg-card" : "border-transparent hover:bg-card/50"}`}>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-mono text-[13px] ${active ? "text-pumpkin" : "text-ink-3"}`}>{v.n}</span>
                    <b className={`font-display text-[22px] font-extrabold tracking-[-0.01em] ${active ? "text-ink" : "text-ink-2"}`}>{v.t}</b>
                  </div>
                  <div className={`grid transition-all duration-500 ${active ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <p className="overflow-hidden pl-8 text-[15.5px] leading-relaxed text-ink-2">{v.d}</p>
                  </div>
                  {active && auto && on && <span key={cur} className="absolute bottom-0 left-0 h-0.5 animate-[grow_7s_linear_forwards] bg-pumpkin" />}
                </button>
              </li>
            );
          })}
        </ol>

        <WsScope className="relative min-h-[460px] overflow-hidden rounded-[20px] border border-line [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_1.3px)_0_0/22px_22px,#141413]">
          <div className="flex h-11 items-center gap-2 border-b border-line px-4 text-[13px] text-ink-3">
            <span className="flex gap-1.5">{[0, 1, 2].map((i) => <i key={i} className="size-2.5 rounded-full bg-[#33332f]" />)}</span>
            <span className="ml-2 text-ink-2"># autopay-launch</span><span>· {VERBS.find((v) => v.id === cur)!.by}</span>
          </div>
          <div key={cur} className="animate-[msg-in_0.45s_var(--ease-out)_both] p-[clamp(16px,3vw,32px)]">
            {cur === "watch" && <Watch />}
            {cur === "ask" && <Ask />}
            {cur === "approve" && <Approve />}
            {cur === "keep" && <Keep />}
          </div>
        </WsScope>
      </div>
    </section>
  );
}

/* ---------- 01 watch ---------- */
const TERM = ["~/acme claude", "● reading api/billing/charge.ts", "● editing api/autopay.ts", "✓ 6 tests pass", "● waiting for Sankritya"];
function Watch() {
  const [n, setN] = useState(1);
  useEffect(() => { if (n < TERM.length) { const t = setTimeout(() => setN(n + 1), 900); return () => clearTimeout(t); } }, [n]);
  return (
    <div className="grid items-end gap-6 sm:grid-cols-[150px_1fr]">
      <div className="flex flex-col items-center">
        <Agent kind="pumpkin" mood={n >= TERM.length ? "alert" : "happy"} className="aspect-[5/6] w-[140px]" />
        <span className="-mt-1 rounded-full border border-[#33332f] bg-[#1e1e1c] px-2.5 py-0.5 text-[12.5px]">Jack <span className="text-ink-3">· Claude Code</span></span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="pc" style={{ position: "relative" }}>
          <div className="bar"><i /><i /><i />Jack’s laptop<span className="live"><span className="dot" style={{ background: "var(--green)" }} />live</span></div>
          <pre style={{ minHeight: 112 }}>{TERM.slice(0, n).map((l, i) => <div key={i}>{i === 0 ? <><b>~/acme</b> claude</> : l.startsWith("✓") ? <em>{l}</em> : l}</div>)}</pre>
        </div>
        <div className="screen">
          <div className="site"><b>Billing</b><div className="r">Pay automatically each month<span className="tg" /></div><div className="r" style={{ color: "#999" }}>Email receipts</div></div>
          <TakeOver who="Jack" />
        </div>
      </div>
    </div>
  );
}

/* ---------- 02 ask ---------- */
function Ask() {
  const [step, setStep] = useState(0);
  useEffect(() => { if (step < 2) { const t = setTimeout(() => setStep(step + 1), 1100); return () => clearTimeout(t); } }, [step]);
  return (
    <div className="max-w-[620px]">
      <Bubble k="v-ask-1" who="kinjal" text="@Jack why a column, not a new table?" meta="2:05 PM" />
      {step === 1 && <div className="typing"><span className="av"><Agent kind="pumpkin" crop="head" className="size-full" /></span>Jack is reading its own run<i /><i /><i /></div>}
      {step >= 2 && (
        <Bubble k="v-ask-2" who="jack" text="One read per bill, so a column skips a join on the hot path. Autopay is opt-in, so it defaults to false." meta="Sankritya’s Claude Code · 2:06 PM" att={ATT[5]} rx={[["eye", 1]]}>
          <details className="why"><summary>How Jack got here <span>from its own run · 3 steps</span></summary>
            <ol><li><code>read</code> api/billing/charge.ts</li><li><code>ran</code> explain on the billing query <span>a join added 38 ms</span></li><li><code>asked</code> Fatso <span>“autopay is opt-in”</span></li></ol></details>
        </Bubble>
      )}
    </div>
  );
}

/* ---------- 03 approve ---------- */
const FILES: [string, string][] = [["api/autopay.ts", "+24 −9"], ["AutopayToggle.tsx", "+31"], ["api/autopay.test.ts", "+38"]];
function Approve() {
  const [yes, setYes] = useState(false);
  return (
    <div className="max-w-[620px]">
      <Bubble k="v-ap-1" who="jack" text="Ready to ship both. Ringing Sankritya." meta="2:10 PM" att={ATT[9]?.slice(0, 1)}>
        <AskCard ask={{ for: "sankritya", title: "Review and push 3 files", files: FILES }} done={yes} onYes={() => setYes(true)} />
      </Bubble>
      {yes && (
        <>
          <Bubble k="v-ap-2" who="sankritya" text="ship it" meta="now" />
          <Bubble k="v-ap-3" who="fatso" text="Kept: Sankritya approved autopay with 3 files, 6 tests passing." meta="the library · now" rx={[["candy", 3], ["bat", 1]]} />
        </>
      )}
      {!yes && <p className="mt-2 pl-12 text-[13px] text-ink-3">Go on, press Approve.</p>}
    </div>
  );
}

/* ---------- 04 keep ---------- */
export function Keep() {
  const [state, setState] = useState<"up" | "down" | "back">("up");
  const kill = () => { setState("down"); setTimeout(() => setState("back"), 1800); };
  return (
    <div className="max-w-[620px]">
      <div className={`transition-all duration-500 ${state === "down" ? "opacity-30 blur-[1px] grayscale" : ""}`}>
        <Bubble k="v-k-1" who="fatso" text="Filed it." meta="the library · 2:07 PM">
          <div className="dec"><span className="k">Decision · Library</span><b>Autopay is opt-in, stored as one column</b><small>Asked by Kinjal · answered by Jack · approved by Sankritya</small></div>
          <Attachments list={ATT[6]} />
        </Bubble>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 pl-12">
        {state === "up" && <button className="pill white" onClick={kill}>Kill the server</button>}
        {state === "down" && <span className="st2" style={{ color: "#ef6b6b" }}><span className="dot" style={{ background: "#ef6b6b" }} />Server down · the room lives in the actor, not the server</span>}
        {state === "back" && (
          <>
            <span className="st2" style={{ color: "var(--green)" }}><span className="dot" style={{ background: "var(--green)" }} />Lazarus: room restored at event 87, nothing lost</span>
            <button className="pill" onClick={() => setState("up")}>Again</button>
          </>
        )}
      </div>
    </div>
  );
}
