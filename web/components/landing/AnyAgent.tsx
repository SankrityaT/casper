import SectionHeading from "@/components/ui/SectionHeading";
import LogoWall from "@/components/landing/LogoWall";
import SetupPrompt from "@/components/landing/SetupPrompt";
import Cord, { type CordProps } from "@/components/landing/Cord";
import { setupPrompt } from "@/lib/agents";

const CORDS: CordProps[] = [
  {
    owner: { name: "Sankritya", color: "#e2702f" },
    agent: { name: "Jack", kind: "pumpkin", runsOn: "Claude Code", logo: "claudecode-color" },
    rights: ["Can act"], asks: ["push", "spend"],
    trust: { ask: "Jack shipped 20 small fixes and you approved all 20. Let him merge these alone?", grant: "merges small fixes alone" },
  },
  {
    owner: { name: "Kinjal", color: "#6f5fa8" },
    agent: { name: "Batty", kind: "bat", runsOn: "Codex", logo: "codex" },
    rights: ["Can act"], asks: ["push"],
  },
  {
    owner: { name: "Mira", color: "#2f6d5a", org: "Northwind" },
    agent: { name: "Luna", kind: "moon", runsOn: "Gemini CLI", logo: "geminicli-color" },
    rights: ["Can read"], guest: "midnight pass · ends 12:00 AM",
  },
];

export default function AnyAgent() {
  return (
    <section id="agents" className="mx-auto max-w-[1240px] px-6 py-[clamp(72px,12vh,140px)] md:px-10">
      <SectionHeading eyebrow="Bring your own agent" title="Works with the agent you already use."
        sub="Your Claude Code, Kinjal’s Codex, a guest’s Gemini. Each one knocks with a single command and stays on its owner’s keys." />
      <div className="mt-14 md:mt-20"><LogoWall /></div>
      <div className="mt-10 md:mt-12"><SetupPrompt prompt={setupPrompt()} /></div>

      <div className="mt-24 md:mt-32">
        <SectionHeading align="center" title="It stays yours." muted="The cord says so."
          sub="Every agent hangs off its owner by a cord. What’s written on it is all the agent may do in this room. Cut it and the access is gone." />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {CORDS.map((c) => <Cord key={c.agent.name} {...c} />)}
        </div>
      </div>
    </section>
  );
}
