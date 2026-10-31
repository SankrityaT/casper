import type { Metadata } from "next";
import PageShell from "@/components/landing/PageShell";
import ContactForm from "./form";

export const metadata: Metadata = { title: "Contact · Casper" };

export default function Contact() {
  return (
    <PageShell eyebrow="The manor" title="Knock on the door." sub="Questions, a team that wants in, or something broke. We read everything.">
      <ContactForm />
    </PageShell>
  );
}
