"use client";

import { useMemo, useState } from "react";
import Agent from "@/components/Agent";
import Brand, { type BrandName } from "@/components/ui/Brand";
import { P, AGENTS, CREW, FILES, Ic } from "@/components/ws/data";
import type { Id, Msg } from "@/components/ws/data";
import { Bubble } from "@/components/ws/Chat";

/* Making a room: say what it's for, where it starts from, who's in it, its rules and what it knows.
   The right side is the room as it will open. */

export type NewRoomData = { slug: string; topic: string; msgs: Msg[]; cards: { k: string; t: string; by?: Id }[]; agents: Id[] };

type Seed = "blank" | "call" | "linear" | "github" | "slack";
const SEEDS: { id: Seed; t: string; d: string; brand?: BrandName; tasks: string[] }[] = [
  { id: "blank", t: "Blank", d: "Start empty", tasks: [] },
  { id: "call", t: "A call", d: "Thursday sync · Zoom · 18 min", brand: "zoom", tasks: ["Write the migration for refund_limits", "Add a second yes over $500", "Update the refunds runbook"] },
  { id: "linear", t: "A Linear issue", d: "ENG-230 Refunds over $500", brand: "linear", tasks: ["ENG-230 Second approval for large refunds", "ENG-231 Notify finance on approval"] },
  { id: "github", t: "A GitHub PR", d: "#424 refund_limits table", brand: "github", tasks: ["Review #424", "Write release notes for #424"] },
  { id: "slack", t: "A Slack thread", d: "#finance · “can refunds need two yeses?”", brand: "slack", tasks: ["Decide the limit with finance", "Draft the policy for the Library"] },
];
const MODES = [
  { id: "quiet", t: "Quiet", d: "Agents only answer when @mentioned" },
  { id: "normal", t: "Normal", d: "Stretch routes untargeted asks to one agent" },
  { id: "eager", t: "Eager", d: "Agents chip in when they’re confident it helps" },
] as const;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().split(/\s+/).filter((w) => !["the", "a", "an", "and", "with", "for", "to", "of"].includes(w)).slice(0, 4).join("-");

export default function NewRoom({ onCreate, onClose }: { onCreate: (r: NewRoomData) => void; onClose: () => void }) {
  const [purpose, setPurpose] = useState("");
  const [name, setName] = useState("");
  const [seed, setSeed] = useState<Seed>("blank");
  const [tasks, setTasks] = useState<string[]>([]);
  const [people, setPeople] = useState<Id[]>(["sankritya", "kinjal"]);
  const [agents, setAgents] = useState<Record<string, "read" | "act" | null>>({ jack: "act", batty: "act", wick: null, casper: "read" });
  const [guests, setGuests] = useState(false);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("normal");
  const [knows, setKnows] = useState<string[]>(["Billing spec v3"]);

  const slug = (name || slugify(purpose) || "new-room").replace(/^#/, "");
  const seedOf = SEEDS.find((s) => s.id === seed)!;
  const pickSeed = (s: Seed) => { setSeed(s); setTasks(SEEDS.find((x) => x.id === s)!.tasks); };
  const invited = (Object.keys(agents) as Id[]).filter((id) => agents[id]);
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const welcome = useMemo(() => {
    const goal = purpose.trim() ? `Goal: ${purpose.trim().replace(/\.$/, "")}.` : "No goal yet, tell me what this room is for.";
    const from = tasks.length ? ` I made ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} from ${seedOf.d.split(" · ")[0]}; anyone’s agent can claim them.` : "";
    const how = mode === "quiet" ? " Agents here only answer when you @ them." : mode === "eager" ? " Agents here may chip in when they’re confident." : " Ask the room and Stretch will find the right agent.";
    return `Welcome to #${slug}. ${goal}${from}${how}`;
  }, [purpose, tasks, seedOf, mode, slug]);

  const create = () => {
    const msgs: Msg[] = [
      { who: "casper", text: welcome, at: "now" },
      ...invited.filter((id) => id !== "casper").map((id) => ({ who: id, text: agents[id] === "act" ? "Here. I can claim tasks; I’ll ask before I push, spend or post." : "Here, reading along. @ me if you want a hand.", at: "now" })),
    ];
    onCreate({ slug, topic: purpose.trim() || "A new room", msgs, cards: tasks.map((t) => ({ k: "Open", t })), agents: invited });
  };

  return (
    <div className="ov nr-ov" onPointerDown={onClose}>
      <div className="nr" onPointerDown={(e) => e.stopPropagation()}>
        {/* left: the form */}
        <div className="nr-form">
          <div className="nr-h"><b>New room</b><small>in the Engineering wing</small><button className="pk-x" onClick={onClose} aria-label="Close"><Ic d="M6 6l12 12M18 6L6 18" s={16} /></button></div>

          <section>
            <label className="nr-l"><span>1</span>What should this room get done?</label>
            <input autoFocus className="inp" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ship refunds over $500 with a second yes" />
            <div className="nr-name"><span>#</span><input value={name || slugify(purpose)} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))} placeholder="room-name" /><small>Name it after the outcome</small></div>
          </section>

          <section>
            <label className="nr-l"><span>2</span>Start from</label>
            <div className="nr-seeds">
              {SEEDS.map((s) => (
                <button key={s.id} className={`nr-seed ${seed === s.id ? "on" : ""}`} onClick={() => pickSeed(s.id)}>
                  {s.brand ? <Brand name={s.brand} size={24} radius={6} /> : <span className="nr-blank">+</span>}
                  <b>{s.t}</b><small>{s.d}</small>
                </button>
              ))}
            </div>
            {seedOf.tasks.length > 0 && (
              <div className="nr-tasks">
                <small>Casper found these. Untick any you don’t want.</small>
                {seedOf.tasks.map((t) => (
                  <label key={t} className="nr-task"><input type="checkbox" checked={tasks.includes(t)} onChange={() => setTasks(toggle(tasks, t))} />{t}</label>
                ))}
              </div>
            )}
          </section>

          <section>
            <label className="nr-l"><span>3</span>Who’s in it</label>
            <div className="nr-people">
              {(["sankritya", "kinjal"] as Id[]).map((id) => (
                <button key={id} className={`nr-chip ${people.includes(id) ? "on" : ""}`} onClick={() => id !== "sankritya" && setPeople(toggle(people, id))}>
                  <span className="pf" style={{ background: P[id].color }}>{P[id].name[0]}</span>{P[id].name}{id === "sankritya" && <small>you</small>}
                </button>
              ))}
              <button className="nr-chip add">+ Invite</button>
            </div>
            <div className="nr-agents">
              {AGENTS.map((id) => (
                <div key={id} className={`nr-agent ${agents[id] ? "on" : ""}`}>
                  <span className="nr-av"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>
                  <div className="grow"><b>{P[id].name}</b><small>{P[id].sub}</small></div>
                  <div className="seg3">
                    {([[null, "Off"], ["read", "Can read"], ["act", "Can act"]] as const).map(([v, t]) => (
                      <button key={t} className={agents[id] === v ? "on" : ""} onClick={() => setAgents({ ...agents, [id]: v })}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="nr-crew"><span className="faces">{CREW.map((id) => <span key={id} className="a"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>)}</span>Stretch, Fatso and Stinkie come with every room</div>
            </div>
          </section>

          <section>
            <label className="nr-l"><span>4</span>House rules</label>
            <div className="nr-rule"><div><b>Who can see it</b><small>{guests ? "The wing, plus guests you invite" : "Only the Engineering wing"}</small></div>
              <div className="seg3"><button className={!guests ? "on" : ""} onClick={() => setGuests(false)}>Wing only</button><button className={guests ? "on" : ""} onClick={() => setGuests(true)}>Allow guests</button></div></div>
            <div className="nr-rule"><div><b>How chatty agents are</b><small>{MODES.find((m) => m.id === mode)!.d}</small></div>
              <div className="seg3">{MODES.map((m) => <button key={m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>{m.t}</button>)}</div></div>
            <div className="nr-rule"><div><b>Approvals</b><small>Push, spend and post ask first, like the rest of the wing</small></div><span className="tag2">Wing rules</span></div>
          </section>

          <section>
            <label className="nr-l"><span>5</span>What it knows</label>
            <div className="nr-knows">
              <span className="nr-chip on fixed"><Agent kind="fatso" crop="head" className="size-[18px]" />Engineering Library</span>
              {FILES.filter((f) => f.brand && f.brand !== "x").map((f) => (
                <button key={f.title} className={`nr-chip ${knows.includes(f.title) ? "on" : ""}`} onClick={() => setKnows(toggle(knows, f.title))}>
                  <Brand name={f.brand!} size={18} radius={4} />{f.title}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* right: the room as it will open */}
        <div className="nr-prev">
          <div className="nr-ph">
            <span className="h"># </span><b>{slug}</b>
            <span className="faces">
              {people.map((id) => <span key={id} className="pf" style={{ background: P[id].color }}>{P[id].name[0]}</span>)}
              {[...invited, ...CREW].map((id) => <span key={id} className="a"><Agent kind={P[id].kind!} crop="head" className="size-full" /></span>)}
            </span>
          </div>
          <div className="nr-pbody">
            <small className="nr-cap">Preview · this is how the room opens</small>
            <Bubble k="nr-welcome" who="casper" text={welcome} meta="host · now" />
            {invited.filter((id) => id !== "casper").slice(0, 2).map((id) => (
              <Bubble key={id} k={`nr-${id}`} who={id} text={agents[id] === "act" ? "Here. I can claim tasks; I’ll ask before I push, spend or post." : "Here, reading along. @ me if you want a hand."} meta="now" />
            ))}
            {tasks.length > 0 && (
              <div className="nr-cards">{tasks.map((t) => <div key={t} className="n" style={{ position: "relative" }}><div className="k"><span className="dot" style={{ background: "var(--ink-3)" }} />Open</div><div className="t">{t}</div></div>)}</div>
            )}
            {knows.length > 0 && <div className="nr-knowsum"><Ic d="M4 5.5C6.5 4 9.5 4 12 6c2.5-2 5.5-2 8-.5V19c-2.5-1.5-5.5-1.5-8 .5-2.5-2-5.5-2-8-.5z" s={13} />Knows the Library plus {knows.length} {knows.length === 1 ? "source" : "sources"}</div>}
          </div>
          <div className="nr-foot">
            <span>{people.length} people · {invited.length} agents · {MODES.find((m) => m.id === mode)!.t.toLowerCase()}</span>
            <button className="pill" onClick={onClose}>Cancel</button>
            <button className="pill white" disabled={!purpose.trim() && !name} onClick={create}>Create room</button>
          </div>
        </div>
      </div>
    </div>
  );
}
