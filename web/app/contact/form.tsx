"use client";

import { useState } from "react";
import Agent from "@/components/Agent";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  const [f, setF] = useState({ name: "", email: "", message: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) setState("sent");
    else { setErr(j?.error ?? "That didn’t go through. Try again?"); setState("error"); }
  }

  if (state === "sent") {
    return (
      <div className="flex items-center gap-5 rounded-[24px] border border-line bg-card p-6">
        <Agent kind="casper" mood="happy" className="aspect-[5/6] w-[90px] shrink-0" />
        <div><h2 className="font-display text-[28px] font-extrabold">Got it, {f.name.split(" ")[0]}.</h2><p className="mt-1 text-ink-2">Casper left it on the doorstep. We’ll write back to {f.email}.</p></div>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4 rounded-[24px] border border-line bg-card p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><b className="mb-1.5 block text-[14px]">Name</b><input required className="inp" value={f.name} onChange={set("name")} /></label>
        <label className="block"><b className="mb-1.5 block text-[14px]">Email</b><input required type="email" className="inp" value={f.email} onChange={set("email")} /></label>
      </div>
      <label className="block"><b className="mb-1.5 block text-[14px]">What’s on your mind</b><textarea required minLength={5} className="inp h-36 resize-none py-2.5" value={f.message} onChange={set("message")} placeholder="Bringing your team’s agents in, a bug, a ghost sighting…" /></label>
      {state === "error" && <p className="text-[14px] text-[#ef8a8a]">{err}</p>}
      <button disabled={state === "sending"} className="h-[44px] rounded-xl bg-pumpkin px-6 text-[15px] font-bold text-[#1b1206] disabled:opacity-60">{state === "sending" ? "Sending…" : "Send"}</button>
    </form>
  );
}
