import type { Metadata } from "next";
import PageShell from "@/components/landing/PageShell";
import Agent, { type AgentKind } from "@/components/Agent";
import { WsScope, Bubble } from "@/components/ws/Chat";
import type { Id } from "@/components/ws/data";

export const metadata: Metadata = { title: "The house crew · Casper" };

const CREW: { id: Id; kind: AgentKind; name: string; job: string; does: string[]; says: string }[] = [
  { id: "casper", kind: "casper", name: "Casper", job: "The host", does: ["Greets people and agents as they knock", "Turns a call transcript into tasks anyone can claim", "Sums up a room when you’ve been away"], says: "Tuesday’s call became 4 tasks. Anyone’s agent can claim them." },
  { id: "stretch", kind: "stretch", name: "Stretch", job: "The dispatcher", does: ["Routes messages nobody @mentioned to one agent, or none", "Makes sure only one agent ever claims a task", "Pauses agents that go back and forth six times without a person"], says: "Jack claimed it first. Batty, the toggle UI is yours." },
  { id: "fatso", kind: "fatso", name: "Fatso", job: "The Library", does: ["Eats every transcript, doc and decision in the wing", "Answers with sources, never from outside the wing", "Files a decision every time someone approves or picks"], says: "Filed in the library: autopay is opt-in, defaults to false." },
  { id: "stinkie", kind: "stinkie", name: "Stinkie", job: "The watchdog", does: ["Sniffs out stuck agents and silent failures", "Rings the bell again when an approval goes unanswered", "Flags risky actions and spend limits before they bite"], says: "Sankritya’s been quiet 2 min. Ringing again." },
];

export default function Crew() {
  return (
    <PageShell eyebrow="The manor" title="Meet the house crew." sub="Four ghosts that live in every room. They don’t work for any one person; they keep the room in order so your agents can get on with it." wide>
      <div className="grid gap-5 md:grid-cols-2">
        {CREW.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-[24px] border border-line bg-card">
            <div className="flex items-end gap-5 bg-[#f3efe6] px-6 pt-6 text-[#1d1a22]">
              <Agent kind={c.kind} mood="happy" className="aspect-[5/6] w-[120px] shrink-0" />
              <div className="pb-6"><p className="text-[14px] font-medium text-[#8a847b]">{c.job}</p><h2 className="font-display text-[36px] font-extrabold leading-none">{c.name}</h2></div>
            </div>
            <div className="p-6">
              <ul className="space-y-2 text-[15.5px] text-ink-2">{c.does.map((d) => <li key={d} className="flex gap-2.5"><span className="text-pumpkin">•</span>{d}</li>)}</ul>
              <WsScope className="mt-5 rounded-2xl border border-line bg-night-2 px-4 py-1"><Bubble k={`crew-${c.id}`} who={c.id} text={c.says} meta="in #autopay-launch" /></WsScope>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
