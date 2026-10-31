"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Agent, { type AgentKind, type Mood } from "@/components/Agent";
import { loadSession, saveSession, useHydrated, type Session, type Voice } from "@/lib/session";

const CAST: [AgentKind, string, string][] = [
  ["pumpkin", "Jack", "skeleton"], ["bat", "Batty", "witch"], ["casper", "Boo", "vampire"],
  ["candle", "Wick", "mummy"], ["moon", "Luna", "monster"], ["cat", "Salem", "devil"],
];
const NAMES = ["Jack", "Pip", "Moxie", "Gourd", "Hex", "Nox", "Bramble", "Mort"];
const ASKS = ["Push to main", "Spend money", "Post publicly", "Send email", "Delete anything"];
const COLORS = ["#3f8f8a", "#b5557a", "#6f8fc7", "#8a7a3c"];

const VOICES: { id: Voice; title: string; sub: string; review: string; answer: string }[] = [
  { id: "chill", title: "lowercase, low-key", sub: "Short, no caps, like texting a teammate.", review: "done. 6 tests pass, can u look before i push?", answer: "one setting per account, read on every bill. a column skips a join on the hot path" },
  { id: "pro", title: "Clear and professional", sub: "Full sentences, no filler. Good for client rooms.", review: "Done. All 6 tests pass. Could you review before I push?", answer: "It’s one setting per account and it’s read on every bill, so a column avoids a join on the hot path." },
  { id: "mirror", title: "Match how I write", sub: "Learns from your messages in the room.", review: "yeah 6 tests pass. look before i push? didnt commit anything else", answer: "yeah its one setting per account and we read it every bill, so a column skips the join" },
];

const STEPS = [
  { h: <>Start a room for <em>the work</em>, not the chat.</>, hint: "You can add more rooms later." },
  { h: <>Pick who shows up for <em>you</em>.</>, hint: "You can change the look anytime." },
  { h: <>Make it <em>yours</em>.</>, hint: "Agents keep their name across rooms." },
  { h: <>Pick how they <em>talk</em>.</>, hint: "Change it anytime in Wing settings." },
  { h: <>Set the <em>house rules</em>.</>, hint: "Rules are per room. Change them on the cord." },
  { h: null, hint: "The same command works for Codex." },
];

export default function Onboarding() {
  const hydrated = useHydrated();
  return hydrated ? <Flow /> : <main className="h-svh bg-night" />;
}

function Flow() {
  const router = useRouter();
  const [s, setS] = useState<Session>(() => ({ ...loadSession(), joined: false }));
  const [step, setStep] = useState(0);
  const [joinedAt, setJoinedAt] = useState(0); // 0..3 checks done
  const [reveal, setReveal] = useState(false);
  const [invite, setInvite] = useState("");
  const [rolling, setRolling] = useState(false);

  const up = (p: Partial<Session>) => setS((x) => ({ ...x, ...p }));
  const agent = (p: Partial<Session["agent"]>) => setS((x) => ({ ...x, agent: { ...x.agent, ...p } }));

  // last step: the join checks tick through on their own (the hub will drive this for real)
  useEffect(() => {
    if (step !== 5 || joinedAt >= 3) return;
    const t = setTimeout(() => setJoinedAt((n) => n + 1), joinedAt === 0 ? 1400 : 900);
    return () => clearTimeout(t);
  }, [step, joinedAt]);
  const joined = joinedAt >= 3;

  const finish = () => {
    const done = { ...s, joined: true };
    saveSession(done);
    setReveal(true);
  };

  const mood: Mood = step === 5 ? (joined ? "happy" : "sleep") : step === 4 ? "alert" : step === 3 ? "happy" : "calm";
  const voice = VOICES.find((v) => v.id === s.voice)!;
  const cmd = s.agent.runsOn === "Its own computer"
    ? `# Nothing to run. Casper is starting ${s.agent.name}’s computer…`
    : `npx casper knock ${s.room} --as ${s.agent.name.toLowerCase()}`;

  return (
    <main className="grid h-svh min-h-[700px] grid-cols-1 overflow-hidden bg-night md:grid-cols-[minmax(460px,46%)_1fr]">
      {/* stage */}
      <section className="relative hidden overflow-hidden border-r border-line md:block [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_1.4px)_0_0/22px_22px]">
        <h1 className="relative z-10 m-0 max-w-[440px] px-11 pt-10 font-display text-[44px] font-extrabold leading-[1.08] tracking-[-0.015em] [&_em]:not-italic [&_em]:text-pumpkin">
          {STEPS[step].h ?? <>Bring <em>{s.agent.name}</em> into the room.</>}
        </h1>
        <div className="absolute left-1/2 top-[34%] -translate-x-1/2 whitespace-nowrap rounded-full border border-dashed border-line bg-card/90 px-3.5 py-1 font-mono text-[13px] text-ink-2">
          acme manor / {s.space.toLowerCase()} wing / <b className="font-medium text-ink">#{s.room || "…"}</b>
        </div>
        <div className="absolute left-1/2 top-[calc(34%+40px)] flex -translate-x-1/2">
          {s.people.map((p, i) => <span key={p.name + i} className="-ml-1.5 grid size-7 place-items-center rounded-full border-2 border-night text-[11px] font-bold text-white first:ml-0" style={{ background: p.color }}>{p.name[0]}</span>)}
        </div>
        {step === 4 && (
          <div className="absolute bottom-[400px] left-1/2 flex max-w-[420px] -translate-x-1/2 flex-wrap justify-center gap-1.5">
            {s.rules.read && <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-0.5 text-[12px] text-[#c3b8ff]">Can read</span>}
            {s.rules.act && <span className="rounded-full border border-violet/40 bg-violet/10 px-2.5 py-0.5 text-[12px] text-[#c3b8ff]">Can act</span>}
            {s.rules.asksFirst.map((a) => <span key={a} className="rounded-full border border-pumpkin/40 bg-pumpkin/10 px-2.5 py-0.5 text-[12px] text-pumpkin-2">Asks first: {a.toLowerCase()}</span>)}
          </div>
        )}
        {step === 3 && (
          <div className="absolute bottom-[380px] left-1/2 max-w-[300px] -translate-x-1/2 rounded-2xl rounded-bl-sm border border-line bg-card px-3.5 py-2 text-[14px]">{voice.review}</div>
        )}
        <div className={`absolute bottom-[78px] left-1/2 h-[290px] w-[240px] -translate-x-1/2 transition-all duration-500 ${step === 0 ? "translate-y-10 opacity-0" : "opacity-100"} ${step === 5 && !joined ? "brightness-75 saturate-50" : ""}`}>
          {step >= 2 && (
            <div className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-line bg-card px-3 py-1 text-[13px] font-bold">
              {s.agent.name}<small className="font-medium text-ink-3">· {s.agent.runsOn}</small>
            </div>
          )}
          <Agent key={s.agent.kind + mood} kind={s.agent.kind} mood={mood} className="size-full" />
        </div>
        <div className={`absolute bottom-9 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[13px] ${step === 5 ? (joined ? "text-moss" : "text-ink-2") : "text-ink-2"}`}>
          <i className={`size-2 rounded-full ${step === 5 ? (joined ? "bg-moss" : "animate-pulse bg-[#e9b949]") : "bg-ink-3"}`} />
          {step === 5 ? (joined ? `${s.agent.name} joined #${s.room}` : `Waiting for ${s.agent.name}…`) : `${s.people.length} people${step >= 1 ? " · 1 agent" : ""}`}
        </div>
        <Link href="/" className="absolute bottom-7 left-11 flex items-center gap-2 text-[13px] text-ink-3"><Agent kind="casper" crop="head" className="size-6" />Casper</Link>
      </section>

      {/* panel */}
      <section className="grid min-h-0 grid-rows-[64px_minmax(0,1fr)_76px] bg-[#17161a]">
        <div className="flex items-center justify-between px-8">
          <button onClick={() => setStep(Math.max(0, step - 1))} className={`grid size-8 place-items-center rounded-lg text-ink-2 hover:bg-card ${step ? "" : "invisible"}`} aria-label="Back">←</button>
          <div className="flex items-center gap-1.5">{STEPS.map((_, i) => <i key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-pumpkin" : i < step ? "w-1.5 bg-ink-3" : "w-1.5 bg-line"}`} />)}</div>
          <button onClick={finish} className="text-[13px] text-ink-3 hover:text-ink-2">Skip setup</button>
        </div>

        <div className="overflow-auto px-[clamp(20px,5vw,56px)] pb-10 pt-5">
          <div key={step} className="max-w-[660px] animate-[msg-in_0.35s_var(--ease-out)_both]">
            {step === 0 && <>
              <Title t="Your first room" sub="A room is one project: its canvas, threads, and every agent working on it. People and agents you add here can see each other work." />
              <Field label="Wing" sub="Every team gets a wing of the manor. Only its members see inside its rooms.">
                <Seg value={s.space} set={(v) => up({ space: v })} opts={[["Engineering", "4 people"], ["Growth", "3 people"], ["New wing", "for another team"]]} />
              </Field>
              <Field label="Room name" sub="Name it after the outcome.">
                <input className="inp font-mono" value={s.room} onChange={(e) => up({ room: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
              </Field>
              <Field label="Who’s in it" sub="They’ll bring their own agents in too.">
                <div className="flex flex-wrap gap-2">{s.people.map((p, i) => (
                  <span key={p.name + i} className="inline-flex items-center gap-2 rounded-full border border-line bg-night py-1 pl-1 pr-3 text-[13px]">
                    <span className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: p.color }}>{p.name[0]}</span>{p.name}<small className="text-ink-3">{p.role}</small>
                  </span>))}
                </div>
                <form className="mt-2.5 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = invite.trim(); if (!v) return; const n = v.split("@")[0]; up({ people: [...s.people, { name: n[0].toUpperCase() + n.slice(1), color: COLORS[s.people.length % 4], role: "invited" }] }); setInvite(""); }}>
                  <input className="inp flex-1" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="Name or email" />
                  <button className="btn-ghost">Invite</button>
                </form>
              </Field>
            </>}

            {step === 1 && <>
              <Title t="Choose your agent’s look" sub="This is how your agent appears on the canvas. Its face shows how it’s doing: calm, stuck, waiting on you, asleep." />
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {CAST.map(([k, n, c]) => (
                  <button key={k} onClick={() => agent({ kind: k, name: n })} className={`relative aspect-[1/1.12] overflow-hidden rounded-2xl border-[1.5px] px-1.5 pb-7 pt-2 transition-colors ${s.agent.kind === k ? "border-pumpkin bg-pumpkin/5" : "border-line bg-card hover:bg-[#26252b]"}`}>
                    <Agent kind={k} className="size-full" />
                    <b className="absolute inset-x-0 bottom-2 text-center text-[12.5px]">{n} <small className="font-medium text-ink-3">· {c}</small></b>
                  </button>
                ))}
                <button onClick={() => { setRolling(true); let i = 0; const t = setInterval(() => { const [k, n] = CAST[i++ % CAST.length]; agent({ kind: k, name: n }); }, 120); setTimeout(() => { clearInterval(t); setRolling(false); const [k, n] = CAST[Math.floor(Math.random() * CAST.length)]; agent({ kind: k, name: n }); }, 1300); }}
                  className="grid aspect-[1/1.12] place-items-center rounded-2xl border-[1.5px] border-dashed border-line bg-card">
                  <span className={`font-display text-[54px] font-extrabold text-pumpkin ${rolling ? "animate-pulse" : ""}`}>?</span>
                  <b className="-mt-6 text-[12.5px]">Trick or treat</b>
                </button>
              </div>
            </>}

            {step === 2 && <>
              <Title t="Name it, and say what it runs on" sub="Bring the agent you already use, or let Casper run one for you on its own computer." />
              <Field label="Name" sub="Teammates will @mention it.">
                <div className="flex gap-2"><input className="inp flex-1" value={s.agent.name} onChange={(e) => agent({ name: e.target.value })} />
                  <button className="btn-ghost" onClick={() => agent({ name: NAMES[Math.floor(Math.random() * NAMES.length)] })}>↻ Shuffle</button></div>
              </Field>
              <Field label="Runs on" sub="You can bring more later.">
                <Seg value={s.agent.runsOn} set={(v) => agent({ runsOn: v as Session["agent"]["runsOn"] })} opts={[["Claude Code", "On your laptop, joins with one command"], ["Codex", "On your laptop, joins with one command"], ["Its own computer", "A cloud desktop anyone can watch and take over"]]} />
              </Field>
            </>}

            {step === 3 && <>
              <Title t="How should your agents talk to you?" sub={`Casper and ${s.agent.name} write in this voice in threads and review cards. Teammates pick their own.`} />
              <div className="grid gap-2.5 sm:grid-cols-3">
                {VOICES.map((v) => (
                  <button key={v.id} onClick={() => up({ voice: v.id })} className={`flex flex-col rounded-2xl border-[1.5px] p-3.5 text-left ${s.voice === v.id ? "border-pumpkin bg-pumpkin/5" : "border-line bg-card"}`}>
                    <b className="text-[14px]">{v.title}</b><span className="mb-2.5 mt-0.5 text-[12.5px] leading-snug text-ink-3">{v.sub}</span>
                    <q className="mt-auto rounded-[10px_10px_10px_3px] bg-[#26252b] px-2.5 py-1.5 text-[12.5px] text-ink-2 [quotes:none]">{v.review}</q>
                  </button>
                ))}
              </div>
              <ThreadPreview key={s.voice + s.agent.name} name={s.agent.name} kind={s.agent.kind} v={voice} />
            </>}

            {step === 4 && <>
              <Title t="What it can do in this room" sub="These show on the cord between you and your agent, so everyone can see them. It can never do more than you can." />
              <div className="mb-3 rounded-2xl border border-line bg-card px-4">
                <Toggle t="Can read" sub="Follows the room and answers questions, including from Kinjal" on={s.rules.read} set={(v) => up({ rules: { ...s.rules, read: v } })} />
                <Toggle t="Can act" sub="Claims tasks, edits code, uses its computer" on={s.rules.act} set={(v) => up({ rules: { ...s.rules, act: v } })} />
              </div>
              <Field label="Asks first for" sub="You get a card with the real evidence and one tap to approve.">
                <div className="flex flex-wrap gap-2">{ASKS.map((a) => {
                  const on = s.rules.asksFirst.includes(a);
                  return <button key={a} onClick={() => up({ rules: { ...s.rules, asksFirst: on ? s.rules.asksFirst.filter((x) => x !== a) : [...s.rules.asksFirst, a] } })} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${on ? "border-pumpkin bg-pumpkin/10 text-pumpkin-2" : "border-line text-ink-2"}`}>{a}</button>;
                })}</div>
              </Field>
            </>}

            {step === 5 && <>
              <Title t="Run this once in your terminal" sub="It connects your agent to Casper, so it can see the room, claim tasks and get messages. The pass only works in this room." />
              <div className="rounded-2xl border border-line bg-card p-4">
                <div className="relative overflow-x-auto rounded-xl border border-line bg-night px-4 py-3 pr-20 font-mono text-[13px] text-ink-2"><span className="text-pumpkin-2">$</span> {cmd}
                  <CopyBtn text={cmd} /></div>
                <div className="mt-3.5 grid gap-2">
                  {["Casper tools added", "Messages connected (Relay)", "Activity shows on the canvas"].map((t, i) => (
                    <div key={t} className={`flex items-center gap-2.5 text-[13.5px] ${joinedAt > i ? "text-ink" : "text-ink-3"}`}>
                      <i className={`grid size-[18px] place-items-center rounded-full border-[1.5px] text-[11px] not-italic ${joinedAt > i ? "border-moss bg-moss text-[#0e1a12]" : joinedAt === i ? "animate-spin border-[#e9b949] border-t-transparent" : "border-line"}`}>{joinedAt > i ? "✓" : ""}</i>{t}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[13px] text-ink-3">Waiting for your agent. This page notices on its own.</p>
            </>}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-8">
          <span className="text-[13px] text-ink-3">{STEPS[step].hint}</span>
          <button disabled={step === 5 && !joined} onClick={() => (step === 5 ? finish() : setStep(step + 1))}
            className="h-[42px] rounded-xl bg-ink px-5 text-[14px] font-bold text-night transition-colors hover:bg-white disabled:opacity-40">
            {step === 5 ? (joined ? `Meet ${s.agent.name} →` : "Waiting…") : "Continue →"}
          </button>
        </div>
      </section>

      {reveal && (
        <div className="fixed inset-0 z-50 animate-[msg-in_0.5s_ease-out_both] overflow-hidden bg-[#100f12]">
          <div className="absolute inset-x-0 top-[9vh] z-10 text-center">
            <small className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3.5 py-1 text-[13px] text-ink-2"><i className="size-2 rounded-full bg-moss" />acme manor / {s.space.toLowerCase()} wing / #{s.room}</small>
            <h3 className="mb-1.5 mt-4 font-display text-[40px] font-extrabold tracking-[-0.015em]">{s.agent.name} is in the room.</h3>
            <p className="text-[16px] text-ink-2">Kinjal can see it, ask it why, and approve its work. It already sees 3 open tasks.</p>
          </div>
          <div className="absolute inset-x-0 bottom-[150px] text-center font-display text-[min(24vw,300px)] font-extrabold leading-[0.9] tracking-[-0.04em] text-ink/10">{s.agent.name}</div>
          <div className="absolute bottom-[120px] left-1/2 h-[min(54vh,520px)] w-[min(44vh,430px)] -translate-x-1/2 animate-[slot-in_0.9s_var(--ease-out)_both]">
            <Agent kind={s.agent.kind} mood="happy" className="size-full" />
          </div>
          <div className="absolute inset-x-0 bottom-11 flex justify-center gap-2.5">
            <button className="btn-ghost" onClick={(e) => ((e.target as HTMLElement).textContent = "Invite link copied")}>Invite Kinjal’s agent</button>
            <button className="h-[42px] rounded-xl bg-pumpkin px-5 text-[14px] font-bold text-[#1b1206]" onClick={() => router.push("/app")}>Enter the room →</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Title({ t, sub }: { t: string; sub: string }) {
  return <><h2 className="mb-1.5 text-[28px] font-bold leading-tight tracking-[-0.015em]">{t}</h2><p className="mb-6 max-w-[560px] text-[15px] text-ink-2">{sub}</p></>;
}
function Field({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return <div className="mb-3 rounded-2xl border border-line bg-card px-[18px] py-4"><b className="block text-[14px]">{label}</b><div className="mb-2.5 text-[13px] text-ink-3">{sub}</div>{children}</div>;
}
function Seg({ value, set, opts }: { value: string; set: (v: string) => void; opts: [string, string][] }) {
  return <div className="grid gap-2 sm:grid-cols-3">{opts.map(([v, d]) => (
    <button key={v} onClick={() => set(v)} className={`rounded-xl border p-3 text-left ${value === v ? "border-pumpkin bg-pumpkin/10" : "border-line bg-night"}`}>
      <b className="block text-[14px]">{v}</b><span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{d}</span>
    </button>))}</div>;
}
function Toggle({ t, sub, on, set }: { t: string; sub: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <div className="flex-1"><b className="block text-[14px]">{t}</b><span className="text-[12.5px] text-ink-3">{sub}</span></div>
      <button onClick={() => set(!on)} aria-pressed={on} className={`relative h-[23px] w-10 rounded-full transition-colors ${on ? "bg-pumpkin" : "bg-line"}`}>
        <span className={`absolute left-[3px] top-[3px] size-[17px] rounded-full bg-white transition-transform ${on ? "translate-x-[17px]" : ""}`} />
      </button>
    </div>
  );
}
function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return <button onClick={() => { navigator.clipboard?.writeText(text); setC(true); }} className="absolute right-2.5 top-2 h-[30px] rounded-lg border border-line bg-card px-2.5 font-sans text-[12px]">{c ? "Copied" : "Copy"}</button>;
}

/* the same thread, typed out in the chosen voice */
function ThreadPreview({ name, kind, v }: { name: string; kind: AgentKind; v: (typeof VOICES)[number] }) {
  const msgs = useMemo(() => [
    { who: "Kinjal", color: "#6f5fa8", text: `@${name} why a column, not a table?` },
    { who: name, kind, text: v.answer },
    { who: name, kind, text: v.review, card: true },
  ], [name, kind, v]);
  const [n, setN] = useState(0);
  const total = msgs.reduce((a, m) => a + m.text.length, 0);
  useEffect(() => {
    if (n >= total) return;
    const t = setTimeout(() => setN((x) => Math.min(total, x + 3)), 16);
    return () => clearTimeout(t);
  }, [n, total]);
  let left = n;
  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl border border-line bg-[#141317]">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5 text-[13px] text-ink-2"><span>#</span><b className="text-ink">autopay-launch</b><span>· preview</span><span className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-3"><i className="size-[7px] rounded-full bg-moss" />how it’ll sound</span></div>
      <div className="px-3.5 pb-3.5 pt-1.5">
        {msgs.map((m, i) => {
          const shown = m.text.slice(0, Math.max(0, left));
          left -= m.text.length;
          if (!shown && i > 0) return null;
          return (
            <div key={i} className="flex gap-2.5 py-2">
              {m.kind ? <Agent kind={m.kind} crop="head" className="size-[30px] shrink-0" /> : <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] text-[12px] font-bold text-white" style={{ background: m.color }}>{m.who[0]}</span>}
              <div className="min-w-0 flex-1">
                <b className="text-[13px]">{m.who}</b>
                <div className="text-[13.5px] leading-relaxed text-ink-2">{shown}{shown.length < m.text.length && <span className="ml-px inline-block h-3.5 w-[7px] animate-pulse bg-pumpkin align-[-2px]" />}</div>
                {m.card && shown.length === m.text.length && (
                  <div className="mt-2 animate-[msg-in_0.35s_ease-out_both] rounded-xl border border-pumpkin/50 bg-card px-3 py-2.5">
                    <div className="text-[12px] font-medium text-pumpkin">Needs you</div><b className="text-[14px]">Review and push 2 files</b>
                    <div className="mt-2 flex gap-1.5 text-[12.5px] font-bold"><span className="rounded-lg bg-ink px-2.5 py-1 text-night">Approve and push</span><span className="rounded-lg border border-line px-2.5 py-1">Open diff</span></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
