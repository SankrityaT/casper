"use client";

import { useState } from "react";
import Image from "next/image";
import Agent, { type AgentKind } from "@/components/Agent";

/* An owner, their agent, and the cord between them. What's written on the cord is all the agent may do.
   Cut it and the access is gone; earn trust and the cord loosens. */

export type CordProps = {
  owner: { name: string; color: string; org?: string };
  agent: { name: string; kind: AgentKind; runsOn: string; logo: string };
  rights: string[];
  asks?: string[];
  guest?: string;
  trust?: { ask: string; grant: string };
};

export default function Cord({ owner, agent, rights, asks = [], guest, trust }: CordProps) {
  const [cut, setCut] = useState(false);
  const [earned, setEarned] = useState<null | boolean>(null);
  const pills = [...rights, ...(earned ? [trust!.grant] : []), ...asks.map((a) => `asks first: ${a}`)];

  return (
    <div className={`relative flex flex-col items-center rounded-[22px] border border-line bg-card px-5 pb-5 pt-6 transition-opacity ${cut ? "opacity-60" : ""}`}>
      {/* owner */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full text-[14px] font-bold text-white" style={{ background: owner.color }}>{owner.name[0]}</span>
        <div className="leading-tight"><b className="block text-[15px]">{owner.name}</b><small className="text-[12.5px] text-ink-3">{owner.org ?? "Acme"}{guest ? " · guest" : ""}</small></div>
      </div>

      {/* the cord, with its rights written on it */}
      <div className="relative my-2 flex min-h-[132px] w-full flex-col items-center justify-center">
        <svg aria-hidden className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
          {cut ? (
            <>
              <path d="M50 0 C46 18 54 30 50 42" fill="none" stroke="#5a5a55" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
              <path d="M50 58 C46 72 54 84 50 100" fill="none" stroke="#5a5a55" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
            </>
          ) : (
            <path d="M50 0 C40 25 60 50 50 75 C45 88 52 95 50 100" fill="none" stroke={earned ? "#58c47e" : "#9b87ff"} strokeWidth="2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" className="animate-[dash_1.2s_linear_infinite]" />
          )}
        </svg>
        <div className="relative z-10 flex max-w-full flex-wrap justify-center gap-1.5">
          {cut ? <span className="rounded-full border border-line bg-night px-2.5 py-0.5 text-[12px] text-ink-3">Access removed</span>
            : pills.map((p) => (
              <span key={p} className={`rounded-full border px-2.5 py-0.5 text-[12px] ${p.startsWith("asks") ? "border-pumpkin/40 bg-[#2a1d12] text-pumpkin-2" : p === trust?.grant ? "border-moss/50 bg-[#14261a] text-moss" : "border-violet/40 bg-[#1f1a33] text-[#cfc6ff]"}`}>{p}</span>
            ))}
          {guest && !cut && <span className="rounded-full border border-line bg-night px-2.5 py-0.5 text-[12px] text-ink-2">{guest}</span>}
        </div>
      </div>

      {/* agent */}
      <div className={`flex flex-col items-center ${cut ? "grayscale" : ""}`}>
        <Agent kind={agent.kind} mood={cut ? "sleep" : earned ? "happy" : "calm"} className="aspect-[5/6] w-[96px]" />
        <span className="-mt-1 flex items-center gap-1.5 rounded-full border border-line bg-night-2 py-0.5 pl-1 pr-2.5 text-[13px]">
          <span className="grid size-5 place-items-center rounded-full bg-[#f3efe6]"><Image src={`/logos/${agent.logo}.svg`} alt="" width={13} height={13} unoptimized /></span>
          {agent.name}<span className="text-ink-3">· {agent.runsOn}</span>
        </span>
      </div>

      {/* earned trust */}
      {trust && earned === null && !cut && (
        <div className="mt-4 w-full rounded-2xl border border-line bg-night-2 p-3 text-left">
          <p className="text-[13px] leading-snug text-ink-2">{trust.ask}</p>
          <div className="mt-2 flex gap-1.5">
            <button onClick={() => setEarned(true)} className="rounded-lg bg-ink px-2.5 py-1 text-[12.5px] font-bold text-night">Allow</button>
            <button onClick={() => setEarned(false)} className="rounded-lg border border-line px-2.5 py-1 text-[12.5px] font-bold">Not yet</button>
          </div>
        </div>
      )}

      <button onClick={() => setCut(!cut)} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-ink-3 hover:text-ink">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.1 8.1L20 20M14.5 14.5L20 4M8.1 15.9l3.4-3.4" /></svg>
        {cut ? "Reconnect" : "Cut the cord"}
      </button>
    </div>
  );
}
