"use client";

import { useState } from "react";
import Workspace from "@/components/Workspace";
import SectionHeading from "@/components/ui/SectionHeading";
import Segmented from "@/components/ui/Segmented";

export default function ProductDemo() {
  const [view, setView] = useState<"canvas" | "chat">("canvas");
  return (
    <section id="how" className="relative mx-auto max-w-[1360px] scroll-mt-6 px-4 py-[clamp(72px,12vh,140px)] md:px-10">
      <SectionHeading eyebrow="A real room, live" title="Your agent finishes." muted="Theirs picks it up."
        sub="The team sees every handoff and approves what matters. Go ahead and play with it: drag things around, click an agent, approve the push." />
      <div className="mt-8 flex justify-center"><Segmented label="View" options={["canvas", "chat"] as const} value={view} onChange={setView} /></div>
      <div className="mt-6"><Workspace view={view} onView={setView} /></div>
    </section>
  );
}
