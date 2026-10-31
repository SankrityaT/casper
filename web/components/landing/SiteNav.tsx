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
        <Link href="/app" className={`${anim} hidden rounded-xl px-4 py-2 text-[15px] text-ink-2 hover:text-ink sm:block`}>Sign in</Link>
        <Link href="/onboarding" className={`${anim} rounded-xl bg-ink px-4 py-2 text-[15px] font-bold text-night transition-colors hover:bg-white`}>Open a room</Link>
      </div>
    </header>
  );
}
