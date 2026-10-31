import Link from "next/link";
import Agent from "@/components/Agent";
import { FOOTER_COLS, isExternal } from "@/lib/nav";

/* A night-sky footer: halftone dots in pumpkin, links, and the wordmark cut off at the bottom with the crew hiding behind it. */


export default function Footer() {
  return (
    <footer className="mx-auto max-w-[1360px] px-4 pb-4 md:px-10">
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-[#110f14]">
        {/* halftone: big dots near the bottom, fading to tiny ones up top */}
        <div aria-hidden className="absolute inset-0 [background:radial-gradient(circle,#f58a33_1.6px,transparent_1.8px)_0_0/9px_9px] opacity-60 [mask-image:linear-gradient(to_top,#000_0%,rgba(0,0,0,.55)_35%,transparent_80%)]" />
        <div aria-hidden className="absolute inset-0 [background:radial-gradient(circle,#9b87ff_1px,transparent_1.2px)_4px_4px/9px_9px] opacity-40 [mask-image:linear-gradient(to_top,transparent_10%,#000_60%,transparent_100%)]" />

        <div className="relative grid gap-10 px-[clamp(24px,5vw,64px)] pt-14 md:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2.5"><Agent kind="casper" crop="head" className="size-9" /><b className="font-display text-[24px] font-extrabold">Casper</b></div>
            <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-ink-2">The room where your team and every agent work in the open. Built in one night at Haunted Hacks.</p>
          </div>
          {FOOTER_COLS.map(([h, ls]) => (
            <div key={h}>
              <b className="text-[14px] text-ink-3">{h}</b>
              <ul className="mt-3 space-y-2">{ls.map(([t, href]) => <li key={t}>{isExternal(href) ? <a href={href} target="_blank" rel="noopener" className="text-[15px] text-ink-2 transition-colors hover:text-pumpkin">{t} ↗</a> : <Link href={href} className="text-[15px] text-ink-2 transition-colors hover:text-pumpkin">{t}</Link>}</li>)}</ul>
            </div>
          ))}
        </div>

        <div className="relative mx-[clamp(24px,5vw,64px)] mt-14 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5 font-mono text-[13px] text-ink-3">
          <span>© 2026 Casper · Acme Manor</span>
          <a href="#top" className="transition-colors hover:text-ink">Back to top ↑</a>
        </div>

        {/* the wordmark, cut off by the card edge, with the crew peeking from behind the letters */}
        <div className="relative mt-4 h-[clamp(110px,17vw,250px)] select-none overflow-hidden">
          <Peek kind="stretch" left="27%" bottom="50%" w="clamp(44px,6.4vw,96px)" rot={-8} />
          <Peek kind="fatso" left="50%" bottom="50%" w="clamp(52px,7.6vw,112px)" rot={4} />
          <Peek kind="stinkie" left="72%" bottom="50%" w="clamp(44px,6.2vw,92px)" rot={9} />
          <div aria-hidden className="absolute inset-x-0 -bottom-[0.24em] text-center font-display text-[clamp(72px,22.5vw,360px)] whitespace-nowrap font-extrabold leading-none tracking-[-0.045em] text-ink z-10 pointer-events-none">Casper</div>
          <Bats />
        </div>
      </div>
    </footer>
  );
}

function Peek({ kind, left, bottom, w, rot }: { kind: "stretch" | "fatso" | "stinkie"; left: string; bottom: string; w: string; rot: number }) {
  return (
    <div className="group absolute z-0" style={{ left, bottom, width: w, rotate: `${rot}deg` }}>
      <div className="translate-y-[34%] transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-y-[-6%]">
        <Agent kind={kind} mood="happy" className="aspect-[5/6] w-full" />
      </div>
    </div>
  );
}

function Bats() {
  return (
    <div aria-hidden className="pointer-events-none absolute left-0 top-[8%] animate-[fly_14s_linear_infinite]">
      {[0, 1, 2].map((i) => (
        <svg key={i} width={24 - i * 5} viewBox="0 0 26 14" className="absolute animate-[flap_0.32s_ease-in-out_infinite_alternate]" style={{ left: i * 30, top: i * 12, animationDelay: `${i * 0.1}s` }}>
          <path d="M13 4c1-2 2-2 2-2l1 2c3-3 7-4 10-3-2 1-3 3-3 6-2-1-4-1-5 1-1-1-2-1-3 0h-2c-1-1-2-1-3 0-1-2-3-2-5-1 0-3-1-5-3-6 3-1 7 0 10 3l1-2s1 0 2 2z" fill="#f3efe6" />
        </svg>
      ))}
    </div>
  );
}
