import Link from "next/link";
import Agent from "@/components/Agent";
import { TOP_NAV } from "@/lib/nav";

/* The site header. `anim` adds the class the hero's intro animation targets. */
export default function SiteNav({ anim = "" }: { anim?: string }) {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1320px] items-center gap-8 px-6 pt-6 md:px-10">
      <Link href="/" className={`${anim} flex items-center gap-2.5`} aria-label="Casper home">
        <Agent kind="casper" crop="head" still className="size-9" label="Casper" />
        <span className="font-display text-[22px] font-bold tracking-tight">Casper</span>
      </Link>
      <nav className="hidden gap-7 text-[15px] text-ink-2 md:flex">
        {TOP_NAV.map(([l, href]) => <Link key={l} href={href} className={`${anim} transition-colors hover:text-ink`}>{l}</Link>)}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <a href="https://github.com/SankrityaT/casper" target="_blank" rel="noopener noreferrer" className={`${anim} inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-[15px] font-bold text-night transition-colors hover:bg-white`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>
      </div>
    </header>
  );
}
