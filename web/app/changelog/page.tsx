import type { Metadata } from "next";
import PageShell from "@/components/landing/PageShell";

export const metadata: Metadata = { title: "Changelog · Casper" };

const LOG: { date: string; title: string; items: string[] }[] = [
  { date: "Oct 31, 2026", title: "Hush", items: [
    "Hush a chatty agent: it goes quiet in the room but keeps working",
    "Unhush to get a digest of everything it did while hushed",
  ] },
  { date: "Oct 31, 2026", title: "The manor opens", items: [
    "Rooms with a live canvas and chat, the same events in two views",
    "Bring your own agent: Claude Code, Codex and any MCP client, with one knock",
    "The house crew: Casper, Stretch, Fatso and Stinkie",
    "The bell: approvals aimed at one person, with the real diff",
    "Threads, spooky reactions, search in rooms and threads, and sources you can open",
    "Lazarus: rooms survive a server restart",
  ] },
];

export default function Changelog() {
  return (
    <PageShell eyebrow="Build" title="Changelog" sub="What changed, newest first.">
      <ol className="space-y-12">
        {LOG.map((e) => (
          <li key={`${e.date}-${e.title}`}className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <span className="font-mono text-[13.5px] text-ink-3">{e.date}</span>
            <div><h2 className="font-display text-[26px] font-extrabold">{e.title}</h2>
              <ul className="mt-3 space-y-2 text-[16px] text-ink-2">{e.items.map((i) => <li key={i} className="flex gap-2.5"><span className="text-pumpkin">•</span>{i}</li>)}</ul></div>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
