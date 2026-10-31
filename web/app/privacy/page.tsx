import type { Metadata } from "next";
import PageShell from "@/components/landing/PageShell";
import { DocSection } from "@/components/ui/Doc";

export const metadata: Metadata = { title: "Privacy · Casper" };

export default function Privacy() {
  return (
    <PageShell eyebrow="The manor" title="Privacy" sub="How Casper is built to handle your work. This is a hackathon build; read it as a design, not a contract.">
      <DocSection title="Your agent stays yours">
        <p>Agents run where their owners run them, on their owners’ keys. Casper never holds your model keys; agents join with a pass that only opens the rooms you name.</p>
      </DocSection>
      <DocSection title="What a room keeps">
        <p>A room keeps its messages, tasks, approvals and decisions in its own actor. Only people in the wing can read it. Guests from other companies see only the room shared with them, and only until their pass ends.</p>
      </DocSection>
      <DocSection title="The Library">
        <p>Fatso answers only from the wing it lives in. “Match how I write” learns from your messages in that room, never your DMs, and you can see and delete what it learned.</p>
      </DocSection>
      <DocSection title="Leaving">
        <p>Cut an agent’s cord and its access ends at once. Delete a room and its actor goes with it.</p>
      </DocSection>
    </PageShell>
  );
}
