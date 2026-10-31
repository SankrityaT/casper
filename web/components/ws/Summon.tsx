"use client";

import { useState } from "react";
import { knock } from "@/lib/agents";
import Image from "next/image";
import Agent, { type AgentKind } from "@/components/Agent";
import Brand from "@/components/ui/Brand";
import { P, FILES, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { Bubble } from "@/components/ws/Chat";

/* Summoning an agent into the room: the job, the look, where it runs, what the cord allows, what it knows.
   The right side is the agent as it will arrive. */

export type Summoned = { name: string; kind: AgentKind; job: string; runsOn: string; rights: "read" | "act"; asks: string[]; approver: Id; knows: string[] };

const LOOKS: [AgentKind, string, string][] = [["cat", "Salem", "devil"], ["moon", "Luna", "monster"], ["pumpkin", "Gourd", "skeleton"], ["bat", "Nox", "witch"], ["candle", "Taper", "mummy"], ["casper", "Boo", "vampire"]];
const RUNS = [
  { id: "computer", t: "Its own computer", d: "A cloud desktop. Anyone can watch, owners can take over." },
  { id: "claude", t: "Your Claude Code", d: "On your laptop, joins with one command." },
  { id: "codex", t: "Your Codex", d: "On your laptop, joins with one command." },
] as const;
const ASKS = ["Push to main", "Spend money", "Post publicly", "Send email", "Delete anything"];
const JOBS = ["Watch Stripe for new refunds", "Write the changelog for each release", "Triage new bug reports", "Draft replies to support emails"];

export default function Summon({ onSummon, onClose, room, open }: { onSummon: (s: Summoned) => void; onClose: () => void; room: string; open: string[] }) {
  const [job, setJob] = useState("");
  const [kind, setKind] = useState<AgentKind>("cat");
  const [name, setName] = useState("Salem");
  const [runs, setRuns] = useState<(typeof RUNS)[number]["id"]>("computer");
  const [rights, setRights] = useState<"read" | "act">("act");
  const [asks, setAsks] = useState<string[]>(["Spend money", "Post publicly"]);
  const [approver, setApprover] = useState<Id>("sankritya");
  const [knows, setKnows] = useState<string[]>([]);
  const [rolling, setRolling] = useState(false);
  const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const runT = RUNS.find((r) => r.id === runs)!.t.replace("Your ", "");
  const nm = name.trim() || "New agent";
  const jobT = job.trim().replace(/\.$/, "");

  const roll = () => {
    setRolling(true);
    let i = 0;
    const t = setInterval(() => { const [k, n] = LOOKS[i++ % LOOKS.length]; setKind(k); setName(n); }, 110);
    setTimeout(() => { clearInterval(t); setRolling(false); const [k, n] = LOOKS[Math.floor(Math.random() * LOOKS.length)]; setKind(k); setName(n); }, 1200);
  };
  const catchup = `${nm} just joined${jobT ? ` to ${jobT.charAt(0).toLowerCase() + jobT.slice(1)}` : ""}. Catch-up for ${nm}: ${open.length ? `${open.length} open ${open.length === 1 ? "task" : "tasks"} (${open.slice(0, 2).join(", ")})` : "nothing open right now"}; ask me anything about #${room}.`;
  const hello = rights === "act"
    ? `Hi all. ${jobT ? `I’m here to ${jobT.charAt(0).toLowerCase() + jobT.slice(1)}.` : "Ready when you are."} I’ll ask ${P[approver].name} before I ${asks.length ? asks.map((a) => a.toLowerCase().replace(" to main", "")).join(", ") : "do anything risky"}.`
    : `Hi all. ${jobT ? `I’ll ${jobT.charAt(0).toLowerCase() + jobT.slice(1)} and` : "I’ll"} read along; @ me if you want a hand.`;

  return (
    <div className="ov nr-ov" onPointerDown={onClose}>
      <div className="nr" onPointerDown={(e) => e.stopPropagation()}>
        <div className="nr-form">
          <div className="nr-h"><b>Summon an agent</b><small>into #{room}</small><button className="pk-x" onClick={onClose} aria-label="Close"><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button></div>

          <section>
            <label className="nr-l"><span>1</span>What’s the job?</label>
            <input autoFocus className="inp" value={job} onChange={(e) => setJob(e.target.value)} placeholder="Watch Stripe for new refunds" />
            <div className="sm-sugg">{JOBS.map((j) => <button key={j} onClick={() => setJob(j)}>{j}</button>)}</div>
          </section>

          <section>
            <label className="nr-l"><span>2</span>Its look and name</label>
            <div className="sm-looks">
              {LOOKS.map(([k, n, c]) => (
                <button key={k} className={`sm-look ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); setName(n); }} title={`${n} · ${c}`}>
                  <Agent kind={k} className="size-full" /><small>{c}</small>
                </button>
              ))}
              <button className={`sm-look trick ${rolling ? "spin" : ""}`} onClick={roll}><span>?</span><small>trick or treat</small></button>
            </div>
            <div className="nr-name"><span>@</span><input value={name} onChange={(e) => setName(e.target.value.replace(/[^A-Za-z0-9-]/g, ""))} placeholder="Name" /><small>Teammates will @ it by this name</small></div>
          </section>

          <section>
            <label className="nr-l"><span>3</span>Where it runs</label>
            <div className="sm-runs">
              {RUNS.map((r) => (
                <button key={r.id} className={`nr-seed ${runs === r.id ? "on" : ""}`} onClick={() => setRuns(r.id)}>
                  {r.id === "computer" ? <span className="nr-blank"><Ic d="M3.5 4.5h17v11.5h-17z M9 20h6M12 16v4" s={14} /></span> : <span className="sm-logo"><Image src={`/logos/${r.id === "claude" ? "claudecode-color" : "codex"}.svg`} alt="" width={16} height={16} unoptimized /></span>}
                  <b>{r.t}</b><small>{r.d}</small>
                </button>
              ))}
            </div>
            {runs !== "computer" && <div className="cmd" style={{ marginTop: 10 }}><span>{knock(room, nm.toLowerCase())}</span></div>}
          </section>

          <section>
            <label className="nr-l"><span>4</span>What the cord allows</label>
            <div className="nr-rule"><div><b>Rights in this room</b><small>{rights === "act" ? "Claims tasks, edits, uses its computer" : "Follows along and answers when asked"}</small></div>
              <div className="seg3"><button className={rights === "read" ? "on" : ""} onClick={() => setRights("read")}>Can read</button><button className={rights === "act" ? "on" : ""} onClick={() => setRights("act")}>Can act</button></div></div>
            {rights === "act" && (
              <div className="nr-rule" style={{ alignItems: "flex-start" }}><div><b>Asks first for</b><small>You get a card with the evidence</small></div>
                <div className="nr-people" style={{ justifyContent: "flex-end", maxWidth: 330 }}>{ASKS.map((a) => <button key={a} className={`nr-chip ${asks.includes(a) ? "on ask" : ""}`} style={{ paddingLeft: 11 }} onClick={() => setAsks(toggle(asks, a))}>{a}</button>)}</div></div>
            )}
            <div className="nr-rule"><div><b>Who approves</b><small>The bell rings for them first</small></div>
              <div className="seg3">{(["sankritya", "kinjal"] as Id[]).map((h) => <button key={h} className={approver === h ? "on" : ""} onClick={() => setApprover(h)}>{P[h].name}</button>)}</div></div>
          </section>

          <section>
            <label className="nr-l"><span>5</span>What it knows</label>
            <div className="nr-knows">
              <span className="nr-chip on fixed"><Agent kind="fatso" crop="head" className="size-[18px]" />Engineering Library</span>
              {FILES.filter((f) => f.brand).map((f) => (
                <button key={f.title} className={`nr-chip ${knows.includes(f.title) ? "on" : ""}`} onClick={() => setKnows(toggle(knows, f.title))}><Brand name={f.brand!} size={18} radius={4} />{f.title}</button>
              ))}
            </div>
          </section>
        </div>

        <div className="nr-prev">
          <div className="nr-ph"><span className="h"># </span><b>{room}</b><small style={{ marginLeft: "auto", color: "var(--ink-3)", fontWeight: 500, fontSize: 12.5 }}>arriving</small></div>
          <div className="nr-pbody">
            <div className="sm-stage">
              <div className="sm-owner"><span className="pf" style={{ background: P.sankritya.color }}>S</span>Sankritya</div>
              <div className="sm-cord">
                <span className={`c ${rights === "act" ? "" : "read"}`}>{rights === "act" ? "Can act" : "Can read"}</span>
                {rights === "act" && asks.map((a) => <span key={a} className="c ask">asks first: {a.toLowerCase()}</span>)}
              </div>
              <div key={kind} className="sm-fig"><span className="poof" /><Agent kind={kind} mood="happy" className="size-full" /></div>
              <div className="tag">{nm}<small>· {runT}</small></div>
              {runs === "computer" && <div className="sm-pc"><span className="dot" style={{ background: "var(--green)" }} />{nm}’s computer · starting</div>}
            </div>
            <Bubble k="sm-c" who="casper" text={catchup} meta="host · now" />
            <div className="sm-hello"><Agent kind={kind} crop="head" className="sm-hav" /><div><b>{nm}</b> <small>{runT} · now</small><p>{hello}</p></div></div>
          </div>
          <div className="nr-foot">
            <span>{rights === "act" ? `Can act · asks ${P[approver].name} first` : "Can read"}{knows.length ? ` · +${knows.length} sources` : ""}</span>
            <button className="pill" onClick={onClose}>Cancel</button>
            <button className="pill white" disabled={!name.trim()} onClick={() => onSummon({ name: nm, kind, job: jobT, runsOn: runT, rights, asks, approver, knows })}>Summon {nm}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
