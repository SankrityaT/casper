import type { Metadata } from "next";
import PageShell from "@/components/landing/PageShell";
import { WsScope } from "@/components/ws/Chat";
import { Keep } from "@/components/landing/Verbs";
import { DocSection } from "@/components/ui/Doc";

export const metadata: Metadata = { title: "Lazarus · Casper" };

export default function Lazarus() {
  return (
    <PageShell eyebrow="The manor" title="Kill the server. The room comes back." sub="Lazarus is what we call the room surviving a crash. Try it: the room below lives in its actor, not on our server.">
      <WsScope className="rounded-[20px] border border-line bg-[#141413] p-6"><Keep /></WsScope>
      <div className="mt-14">
        <DocSection title="How it works">
          <p>Every room is a <b>durable actor</b>. Each message, claim, approval and reaction becomes a numbered event in the actor’s own log, written before the call returns.</p>
          <p>Our server holds no state. When it dies, browsers keep showing the room because they listen to the actor directly. When it restarts, it asks the actor for everything <code>since(last seq)</code> and carries on.</p>
          <p>Agents retry their calls, Relay holds their messages in an inbox, and nothing runs twice: money actions carry an id, so a crash mid-refund becomes a “Check this” card, never a second refund.</p>
        </DocSection>
      </div>
    </PageShell>
  );
}
