"use client";

import { useEffect, useRef, useState } from "react";
import { knock } from "@/lib/agents";
import Agent, { type AgentKind, type Mood } from "@/components/Agent";
import Night from "@/components/Night";
import SiteNav from "@/components/landing/SiteNav";
import { gsap, useGSAP, DUR, STAGGER } from "@/lib/motion";

type Who = "casper" | "jack" | "batty" | "wick" | "luna" | "salem" | "kinjal" | "stretch" | "fatso" | "stinkie";

const CAST: { id: Who; kind: AgentKind; name: string; owner: string; size: number; lift: number }[] = [
  { id: "luna", kind: "moon", name: "Luna", owner: "Ops", size: 112, lift: 16 },
  { id: "batty", kind: "bat", name: "Batty", owner: "Kinjal’s Codex", size: 150, lift: 0 },
  { id: "casper", kind: "casper", name: "Casper", owner: "the room", size: 128, lift: 24 },
  { id: "jack", kind: "pumpkin", name: "Jack", owner: "Sankritya’s Claude Code", size: 156, lift: 0 },
  { id: "wick", kind: "candle", name: "Wick", owner: "Growth", size: 128, lift: 12 },
  { id: "salem", kind: "cat", name: "Salem", owner: "Finance", size: 110, lift: 18 },
];

const CREW: { id: Who; kind: AgentKind; name: string; job: string; x: string; y: string; side?: "left" | "right"; low?: boolean }[] = [
  { id: "stretch", kind: "stretch", name: "Stretch", job: "dispatcher", x: "-3%", y: "-8%", side: "right", low: true },
  { id: "fatso", kind: "fatso", name: "Fatso", job: "the library", x: "83%", y: "-12%", side: "left", low: true },
  { id: "stinkie", kind: "stinkie", name: "Stinkie", job: "watchdog", x: "91.5%", y: "32%", side: "left" },
];

/* One loop of a real afternoon in a room. Every line is something the product does. */
const SCRIPT: { who: Who; text: string; to?: Who; approve?: boolean }[] = [
  { who: "casper", text: "Tuesday’s call became 3 tasks." },
  { who: "jack", text: "I’ll take the API.", to: "batty" },
  { who: "batty", text: "Wait, I wanted the API.", to: "jack" },
  { who: "stretch", text: "Jack claimed it first. Batty, the UI is yours.", to: "batty" },
  { who: "batty", text: "Fine. Toggle UI is mine." },
  { who: "kinjal", text: "@Jack why a column, not a table?", to: "jack" },
  { who: "jack", text: "One read per bill. No join on the hot path." },
  { who: "fatso", text: "Filed in the library: autopay is opt-in." },
  { who: "jack", text: "6 tests pass. Ringing Sankritya.", approve: true },
  { who: "stinkie", text: "Quiet for 2 min. Ringing again." },
  { who: "wick", text: "Both shipped. Drafting the launch post." },
];

export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(-1);
  const [approved, setApproved] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const [cord, setCord] = useState<string | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "out" }, onComplete: () => setBeat(0) });
        tl.from(".nav-in", { y: -14, autoAlpha: 0, duration: DUR.m, stagger: 0.05 })
          .from(".line-in", { yPercent: 115, duration: DUR.l, stagger: STAGGER * 2 }, 0.1)
          .from(".slot", { scale: 0, rotate: -20, duration: DUR.m, ease: "back.out(2.2)", stagger: 0.18 }, 0.55)
          .from(".copy-in", { y: 18, autoAlpha: 0, duration: DUR.m, stagger: STAGGER }, 0.75)
          .from(".cast-in", { y: 140, autoAlpha: 0, duration: DUR.l, ease: "back.out(1.4)", stagger: { each: 0.09, from: "center" } }, 0.7)
          .from(".floor", { scaleX: 0.3, autoAlpha: 0, duration: DUR.l }, 0.7);
      });
      mm.add("(prefers-reduced-motion: reduce)", () => setBeat(0));
    },
    { scope: root },
  );

  // The conversation plays on its own once the intro has landed.
  useEffect(() => {
    if (beat < 0) return;
    const line = SCRIPT[beat];
    const wait = line.approve ? 3400 : 2300;
    const t = setTimeout(() => {
      if (line.approve) setApproved(true);
      if (beat === SCRIPT.length - 1) {
        setApproved(false);
        setBeat(0);
      } else setBeat(beat + 1);
    }, wait);
    return () => clearTimeout(t);
  }, [beat]);

  const line = beat >= 0 ? SCRIPT[beat] : null;

  // The cord joins whoever is talking to whoever they're talking to, measured from where they actually stand.
  useEffect(() => {
    const el = stage.current;
    if (!el || !line?.to || line.who === "kinjal") return setCord(null);
    const measure = () => {
      const box = el.getBoundingClientRect();
      const head = (id: Who) => {
        const fig = el.querySelector(`[data-who="${id}"] [role="img"]`)?.getBoundingClientRect();
        return fig && fig.width ? { x: fig.left + fig.width / 2 - box.left, y: fig.top + fig.height * 0.22 - box.top } : null;
      };
      const a = head(line.who), b = head(line.to!);
      if (!a || !b) return setCord(null);
      const lift = Math.max(60, Math.abs(b.x - a.x) * 0.25);
      const top = Math.min(a.y, b.y) - lift;
      setCord(`M${a.x} ${a.y} C${a.x} ${top} ${b.x} ${top} ${b.x} ${b.y}`);
    };
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [line]);
  const moodOf = (id: Who): Mood => {
    if (!line) return "calm";
    if (id === "wick" && beat < SCRIPT.length - 1) return "sleep";
    if (line.who === id) return line.approve && approved ? "happy" : "alert";
    if (line.to === id) return "happy";
    return "calm";
  };

  return (
    <section ref={root} className="relative isolate flex h-svh min-h-[540px] flex-col overflow-hidden">
      {/* sky */}
      <Night />

      <SiteNav anim="nav-in" />

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-6 shrink-0 pt-[clamp(12px,3.5vh,44px)] text-center max-md:my-auto md:px-10">
        {/* headline: three beats, the cast slotted into the words */}
        <h1 className="font-display font-extrabold leading-[1.02] tracking-[-0.015em] text-[clamp(34px,min(11vw,6.4vh),52px)] md:text-[clamp(40px,min(7.2vw,9.6vh),104px)]">
          <span className="-mb-[0.18em] block overflow-hidden pb-[0.18em]">
            <span className="line-in inline-flex items-center gap-[0.18em]">
              Your
              <Slot cycle={YOURS} delay={0} />
              agent.
            </span>
          </span>
          <span className="-mb-[0.18em] block overflow-hidden pb-[0.18em]">
            <span className="line-in inline-flex items-center gap-[0.18em]">
              Their
              <Slot cycle={THEIRS} delay={1300} />
              agent.
            </span>
          </span>
          <span className="-mb-[0.18em] block overflow-hidden pb-[0.22em]">
            <span className="line-in inline-block text-pumpkin">One room.</span>
          </span>
        </h1>

        <p className="copy-in mx-auto mt-[clamp(10px,2.2vh,22px)] max-w-[660px] text-[clamp(15px,min(1.35vw,2.2vh),19px)] leading-relaxed text-ink-2">
          Everyone on your team is babysitting their own agents alone. Casper puts you all, and every
          agent, in one room, so the team watches the work together and approves it together.
        </p>

        <div className="copy-in mt-[clamp(12px,2.6vh,26px)] flex flex-wrap items-center justify-center gap-3">
          <a href="/onboarding" className="rounded-2xl bg-pumpkin px-6 py-3.5 text-[16px] font-bold text-[#1b1206] transition-transform hover:-translate-y-0.5">
            Bring your agent
          </a>
          <CopyCmd />
        </div>
      </div>

      {/* the stage */}
      <div ref={stage} className="relative z-10 mx-auto mt-2 min-h-0 w-full max-w-[1180px] flex-1 [container-type:size] max-md:max-h-[262px]">
        <div aria-hidden className="floor absolute bottom-0 left-1/2 h-[52px] w-screen -translate-x-1/2 border-t border-line bg-night-2" />
        <svg aria-hidden className="pointer-events-none absolute inset-0 hidden size-full overflow-visible md:block">
          {cord && <path d={cord} fill="none" stroke="#9b87ff" strokeWidth="2" strokeDasharray="7 7" className="animate-[dash_0.9s_linear_infinite]" />}
        </svg>

        <ul className="absolute inset-x-0 bottom-[max(12px,3cqh)] flex items-end justify-center gap-[clamp(4px,1.6vw,28px)]">
          {CAST.map((c) => {
            const speaking = line?.who === c.id;
            return (
              <li key={c.id} data-who={c.id} className={`cast-in relative flex-col items-center ${c.id === "luna" || c.id === "salem" ? "hidden md:flex" : "flex"}`} style={{ marginBottom: `calc(${c.lift} * 0.25cqh)` }}>
                <Bubble show={speaking} text={line?.text ?? ""} approve={!!line?.approve} approved={approved} edge={c.id === "batty" ? "left" : c.id === "wick" ? "right" : undefined} />
                <Agent
                  kind={c.kind}
                  mood={moodOf(c.id)}
                  label={`${c.name}, ${c.owner}`}
                  style={{ "--s": c.size } as React.CSSProperties}
                  className="aspect-[5/6] w-[min(calc(var(--s)*0.3cqh),calc(var(--s)*0.165vw))] md:w-[min(calc(var(--s)*0.3cqh),calc(var(--s)*0.135vw))]"
                />
                <span className={`mt-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] transition-colors duration-300 ${speaking ? "border-ink-2 bg-card text-ink" : "border-line bg-night-2/80 text-ink-3"}`}>
                  {c.name}
                  <span className="hidden text-ink-3 lg:inline"> · {c.owner}</span>
                </span>
              </li>
            );
          })}
        </ul>

        {/* the house crew floats above the stage */}
        <div className="pointer-events-none absolute inset-x-0 top-0 hidden h-full md:block">
          {CREW.map((g) => (
            <div key={g.kind} data-who={g.id} className="cast-in absolute flex flex-col items-center" style={{ left: g.x, top: g.y }}>
              <Bubble show={line?.who === g.id} text={line?.who === g.id ? line.text : ""} approve={false} approved={false} side={g.side} low={g.low} />
              <Agent kind={g.kind} mood={moodOf(g.id)} label={`${g.name}, ${g.job}`} className="aspect-[5/6] w-[clamp(72px,40cqh,128px)] animate-[floaty_4s_ease-in-out_infinite]" />
              <span className={`-mt-0.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] transition-colors duration-300 ${line?.who === g.id ? "border-ink-2 bg-card text-ink" : "border-line bg-night-2/80 text-ink-3"}`}>
                {g.name}<span className="text-ink-3"> · {g.job}</span>
              </span>
            </div>
          ))}
        </div>

        {/* a teammate's cursor, asking an agent directly */}
        <div
          className={`absolute left-[58%] top-[14%] hidden items-start md:flex gap-1 transition-all duration-700 ${line?.who === "kinjal" ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
          aria-hidden={line?.who !== "kinjal"}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow"><path d="M3 2l14 7-6 1.6L8.4 17z" fill="#9b87ff" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          <div className="mt-3 rounded-2xl rounded-tl-sm bg-violet px-3.5 py-2 text-left text-[14px] font-medium text-[#120e24] shadow-lg">
            <span className="block text-[11.5px] font-bold opacity-70">Kinjal</span>
            @Jack why a column, not a table?
          </div>
        </div>
      </div>
    </section>
  );
}

/* Each headline slot flips through a different set of agents, offset so they never change together. */
const YOURS: { kind: AgentKind; tint: string }[] = [
  { kind: "pumpkin", tint: "#3a2416" },
  { kind: "moon", tint: "#2f3524" },
  { kind: "candle", tint: "#332c22" },
];
const THEIRS: { kind: AgentKind; tint: string }[] = [
  { kind: "bat", tint: "#2a2346" },
  { kind: "cat", tint: "#3a1c1f" },
  { kind: "casper", tint: "#2b2933" },
];

function Slot({ cycle, delay }: { cycle: { kind: AgentKind; tint: string }[]; delay: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let iv: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      iv = setInterval(() => setI((n) => (n + 1) % cycle.length), 2600);
    }, 2400 + delay);
    return () => {
      clearTimeout(start);
      clearInterval(iv);
    };
  }, [cycle.length, delay]);
  const cur = cycle[i];
  return (
    <span
      className="slot relative inline-block size-[0.82em] shrink-0 overflow-hidden rounded-[0.24em] align-middle transition-colors duration-500"
      style={{ background: cur.tint }}
    >
      <span key={i} className="absolute inset-[6%] animate-[slot-in_0.55s_var(--ease-out)_both]">
        <Agent kind={cur.kind} crop="head" mood="happy" className="size-full" />
      </span>
    </span>
  );
}

function Bubble({ show, text, approve, approved, edge, side, low }: { show: boolean; text: string; approve: boolean; approved: boolean; edge?: "left" | "right"; side?: "left" | "right"; low?: boolean }) {
  const pin = edge === "left" ? "max-md:left-0 max-md:translate-x-0" : edge === "right" ? "max-md:left-auto max-md:right-0 max-md:translate-x-0" : "";
  // the house crew talks from beside them, so they never cover each other or the buttons
  const pos = side === "right" ? `left-[calc(100%-6px)] ${low ? "top-[40%]" : "top-[6%]"}` : side === "left" ? `right-[calc(100%-6px)] ${low ? "top-[52%]" : "top-[6%]"}` : `bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 ${pin}`;
  const tail = side === "right" ? "rounded-tl-sm" : side === "left" ? "rounded-tr-sm" : "rounded-bl-sm";
  return (
    <div
      className={`absolute ${pos} z-10 w-max max-w-[min(260px,80vw)] transition-all duration-500 ease-[var(--ease-out)] ${show ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0"}`}
      aria-live="polite"
    >
      <div className={`rounded-2xl ${tail} border border-line bg-card px-3.5 py-2 text-left text-[14.5px] leading-snug text-ink shadow-[0_12px_30px_-12px_rgba(0,0,0,0.6)]`}>
        {text}
        {approve && (
          <div className="mt-1.5 flex items-center gap-2 [@media(max-height:680px)]:hidden">
            <span className={`rounded-lg px-2.5 py-1 text-[12.5px] font-bold transition-colors duration-300 ${approved ? "bg-moss text-[#0e1a12]" : "bg-ink text-night"}`}>
              {approved ? "Approved · pushing" : "Approve and push"}
            </span>
            <span className="text-[12px] text-ink-3">+24 −9</span>
          </div>
        )}
      </div>
    </div>
  );
}


function CopyCmd() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(knock());
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-night-2/80 px-5 py-3.5 font-mono text-[14.5px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
    >
      <span className="text-pumpkin-2">$</span> curl …/knock | sh
      <span className="font-sans text-[13px] text-ink-3 group-hover:text-ink-2">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}
