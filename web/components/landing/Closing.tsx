import Link from "next/link";
import { knock } from "@/lib/agents";
import Agent, { type AgentKind } from "@/components/Agent";
import CopyButton from "@/components/ui/CopyButton";

/* The last ask: a cream card with the whole cast peeking up from its bottom edge. Hover one and it pops up to say hi. */
const PEEK: { kind: AgentKind; name: string; w: number }[] = [
  { kind: "bat", name: "Batty", w: 150 },
  { kind: "candle", name: "Wick", w: 118 },
  { kind: "stretch", name: "Stretch", w: 120 },
  { kind: "pumpkin", name: "Jack", w: 190 },
  { kind: "casper", name: "Casper", w: 170 },
  { kind: "fatso", name: "Fatso", w: 170 },
  { kind: "cat", name: "Salem", w: 132 },
  { kind: "stinkie", name: "Stinkie", w: 116 },
];

export default function Closing() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pb-10 pt-[clamp(40px,8vh,96px)] md:px-10">
      <div className="relative overflow-hidden rounded-[28px] bg-[#f3efe6] px-6 pt-[clamp(56px,9vh,96px)] text-center text-[#1d1a22]">
        <h2 className="font-display text-[clamp(40px,6.4vw,92px)] font-extrabold leading-[1] tracking-[-0.02em]">Give your agents a room.</h2>
        <p className="mx-auto mt-5 max-w-[520px] text-[clamp(16px,1.4vw,19px)] text-[#5b5650]">Your agent. Their agent. One room where the whole team watches the work and approves it together.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="https://github.com/SankrityaT/casper" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#1d1a22] px-6 py-3.5 text-[16px] font-bold text-[#f3efe6] transition-transform hover:-translate-y-0.5">View on GitHub</a>
          <CopyButton text={knock()} label="Copy" className="flex items-center gap-3 rounded-full border-2 border-[#1d1a22] px-5 py-3 font-mono text-[14.5px] transition-colors hover:bg-[#1d1a22] hover:text-[#f3efe6]">
            <span>$ curl …/knock | sh -s -- autopay my-agent</span>
          </CopyButton>
        </div>
        <p className="mt-4 text-[13.5px] text-[#8a847b]">Works with any agent that speaks MCP · free while it’s Halloween</p>

        <ul aria-label="The cast" className="mt-[clamp(28px,6vh,64px)] flex items-end justify-center gap-[clamp(0px,1.4vw,22px)]">
          {PEEK.map((p, i) => (
            <li key={p.name} className={`group relative ${i === 0 || i === PEEK.length - 1 ? "hidden md:block" : ""}`} style={{ width: `min(${p.w}px, ${p.w / 13}vw)`, height: `min(${p.w * 0.72}px, ${(p.w * 0.72) / 13}vw)` }}>
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1d1a22] px-2.5 py-0.5 text-[12px] font-bold text-[#f3efe6] opacity-0 transition-opacity group-hover:opacity-100">{p.name}</span>
              <div className="absolute inset-x-0 top-0 transition-transform duration-500 ease-[var(--ease-out)] group-hover:-translate-y-[22%]">
                <Agent kind={p.kind} mood="happy" className="aspect-[5/6] w-full" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
