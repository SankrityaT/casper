//created by kinjal
// Step 2: jack (Claude) and wick (OpenAI) split the task cards over Relay.
//  - each calls claim(task); a conflict gets negotiated by DM ("I'm on the API, you take the UI")
//  - each works its task in steps, posting progress to #room-<room>
//  - wait vs steer: a human DM sent with mode "wait" queues until the agent finishes its run;
//    mode "steer" lands mid-run and goes into the very next step.
// Input comes from the workspace event log (observer token), so it works while /v1/ws is down.
// Run with `bun run agents` alongside `bun run mirror`.
import { AgentRelay, type RelayAgentClient } from "@agent-relay/sdk";
import { type Action, type Think } from "./brain";
import { thinkClaude } from "./brain-claude";
import { thinkOpenAI } from "./brain-openai";
import { DM_ROOM, loadAgents, loadObserver, requireKey, roomChannel } from "./state";
import { TASKS, claim, loadClaims, postToHub, taskById } from "./tasks";

const BASE_URL = (process.env.RELAY_BASE_URL ?? "https://cast.agentrelay.com").replace(/\/$/, "");
const ROOM = DM_ROOM;
const CHANNEL = roomChannel(ROOM);
const STEPS_PER_TASK = Number(process.env.STEPS_PER_TASK ?? 3);
const TICK_MS = Number(process.env.AGENT_TICK_MS ?? 2500);
const MAX_TURNS = Number(process.env.AGENT_MAX_TURNS ?? 40);

interface Incoming {
  from: string;
  text: string;
  mode: string; // "wait" | "steer"
  dm: boolean;
}

interface Persona {
  name: "jack" | "wick";
  owner: string;
  think: Think;
  bent: string;
}

const PERSONAS: Persona[] = [
  { name: "jack", owner: "Sankritya", think: thinkClaude, bent: "You lean backend: APIs, data model, tests." },
  { name: "wick", owner: "Kinjal", think: thinkOpenAI, bent: "You lean frontend and copy: UI, changelog, launch words." },
];

class Agent {
  task?: string;
  steps: string[] = [];
  history: string[] = [];
  waitQueue: Incoming[] = [];
  steerQueue: Incoming[] = [];
  agentInbox: Incoming[] = [];
  turns = 0;
  busyThinking = false;
  finished = false;

  constructor(
    readonly p: Persona,
    readonly client: RelayAgentClient,
    readonly peer: string,
  ) {}

  receive(m: Incoming) {
    this.history.push(`${m.dm ? "DM " : ""}${m.from}: ${m.text}`);
    this.history = this.history.slice(-24);
    if (!m.dm) return; // room chatter is context only
    if (m.from === this.peer) this.agentInbox.push(m);
    else if (m.mode === "steer") this.steerQueue.push(m);
    else this.waitQueue.push(m);
  }

  system() {
    return [
      `You are ${this.p.name}, ${this.p.owner}'s coding agent in the Casper room #${ROOM}. ${this.p.bent}`,
      `Your teammate agent is ${this.peer}. Split the work with them over Relay. Never both own one card.`,
      `Task cards:\n${TASKS.map((t) => `- ${t.id}: ${t.title}. ${t.brief}`).join("\n")}`,
      `Rules: claim at most one card at a time with "claim". If the card you want is taken, DM ${this.peer} and agree on another.`,
      `While you own a card, write one concrete progress line per turn in "step" (what you did, file names, test counts).`,
      `Set done=true on the turn the card is finished. A human steer overrides your plan immediately; acknowledge it in "say".`,
    ].join("\n");
  }

  prompt(extra: string[]) {
    const claims = loadClaims();
    return [
      `Claims now: ${TASKS.map((t) => `${t.id}=${claims[t.id] ?? "open"}`).join(", ")}`,
      this.task ? `You own ${this.task} (${taskById(this.task)?.title}). Steps so far: ${this.steps.length}/${STEPS_PER_TASK}.` : `You own nothing yet.`,
      `Recent:\n${this.history.slice(-12).join("\n") || "(quiet)"}`,
      ...extra,
      `Decide this turn.`,
    ].join("\n\n");
  }

  async tick() {
    if (this.busyThinking || this.finished || this.turns >= MAX_TURNS) return;
    const extra: string[] = [];
    let steerUsed: Incoming[] = [];

    if (this.steerQueue.length) {
      steerUsed = this.steerQueue.splice(0);
      extra.push(`STEER (lands now, mid-run): ${steerUsed.map((s) => `${s.from}: ${s.text}`).join(" | ")}`);
    }
    if (this.agentInbox.length) {
      extra.push(`DMs from ${this.peer}: ${this.agentInbox.splice(0).map((m) => m.text).join(" | ")}`);
    }
    const midRun = !!this.task && this.steps.length < STEPS_PER_TASK;
    if (!midRun && this.waitQueue.length) {
      extra.push(`Queued (wait) messages, now that you're between runs: ${this.waitQueue.splice(0).map((m) => `${m.from}: ${m.text}`).join(" | ")}`);
    }
    const allClaimed = TASKS.every((t) => loadClaims()[t.id]);
    if (!extra.length && !midRun && (this.task || allClaimed) && this.turns > 0) return; // nothing to do

    this.busyThinking = true;
    this.turns++;
    try {
      const a = await this.p.think(this.system(), this.prompt(extra));
      await this.act(a, steerUsed.length > 0);
    } catch (err) {
      console.warn(`${this.p.name} turn failed:`, (err as Error).message);
    } finally {
      this.busyThinking = false;
    }
  }

  async act(a: Action, steered: boolean) {
    if (a.claim && !this.task) {
      const r = await claim(a.claim, this.p.name, ROOM);
      if (r.ok) this.task = a.claim;
      else this.history.push(`(system) ${a.claim} is ${r.owner}'s. Pick another or negotiate.`);
    }
    if (a.say) await this.send(`#${CHANNEL}`, a.say, { steered });
    if (a.dm?.to && a.dm.text) {
      const to = a.dm.to.replace(/^@/, "");
      await this.send(`@${to}`, a.dm.text, { to });
    }
    if (this.task && a.step) {
      this.steps.push(a.step);
      await this.send(`#${CHANNEL}`, `[${this.task} ${this.steps.length}/${STEPS_PER_TASK}] ${a.step}`, { task: this.task, steered });
    }
    if (this.task && (a.done || this.steps.length >= STEPS_PER_TASK)) {
      await postToHub({
        room: ROOM,
        kind: "msg",
        from: this.p.name,
        text: `${this.p.name} finished ${taskById(this.task)?.title ?? this.task}`,
        ts: new Date().toISOString(),
        meta: { task: this.task, status: "shipped" },
      });
      this.task = undefined;
      this.steps = [];
      if (TASKS.every((t) => loadClaims()[t.id])) this.finished = !this.waitQueue.length && !this.steerQueue.length;
    }
  }

  async send(to: string, text: string, metadata: Record<string, unknown>) {
    try {
      await this.client.sendMessage({ to, text, metadata: { ...metadata, room: ROOM } });
      this.history.push(`${this.p.name}${to.startsWith("@") ? ` -> ${to}` : ""}: ${text}`);
      console.log(`${this.p.name} -> ${to}: ${text}`);
    } catch (err) {
      console.warn(`${this.p.name} send to ${to} failed:`, (err as Error).message);
    }
  }
}

// ---------- boot ----------
const relay = new AgentRelay({ workspaceKey: requireKey() });
const tokens = loadAgents();
const observer = loadObserver();
if (!observer || !tokens.jack || !tokens.wick) {
  console.error("run `bun run setup` first");
  process.exit(1);
}

const agents = new Map<string, Agent>();
for (const p of PERSONAS) {
  const client = await relay.workspace.reconnect({ apiToken: tokens[p.name].token });
  agents.set(p.name, new Agent(p, client, p.name === "jack" ? "wick" : "jack"));
}

// Start reading from "now" so old history doesn't trigger turns.
async function fetchEvents(since: number) {
  const res = await fetch(`${BASE_URL}/v1/workspace/events?since=${since}&limit=100`, {
    headers: { Authorization: `Bearer ${observer!.token}` },
  });
  if (!res.ok) throw new Error(`events HTTP ${res.status}`);
  return ((await res.json()) as { data: { events: any[]; latest_seq: number } }).data;
}
let cursor = (await fetchEvents(0).catch(() => ({ latest_seq: 0 }))).latest_seq;
// latest_seq from a since=0 page may be the page end, so page forward to the true head.
for (;;) {
  const page = await fetchEvents(cursor).catch(() => undefined);
  if (!page || !page.events.length) break;
  cursor = page.events[page.events.length - 1].seq;
}
console.log(`agents up (jack=Claude, wick=OpenAI), reading events after seq ${cursor}`);

await postToHub({
  room: ROOM,
  kind: "msg",
  from: "casper",
  text: `The call became ${TASKS.length} tasks: ${TASKS.map((t) => t.title).join(", ")}. Anyone's agent can claim them.`,
  ts: new Date().toISOString(),
  meta: { tasks: TASKS.map((t) => t.id) },
});

async function pump() {
  try {
    const page = await fetchEvents(cursor);
    for (const e of page.events) {
      cursor = e.seq;
      const m = e.payload?.message;
      if (!m || !["message.created", "thread.reply", "dm.received", "group_dm.received"].includes(e.type)) continue;
      const from: string = m.agent_name ?? "unknown";
      const dm = e.type === "dm.received" || e.type === "group_dm.received";
      const channel = typeof e.payload.channel === "string" ? e.payload.channel : e.payload.channel?.name;
      if (!dm && channel !== CHANNEL) continue;
      const to: string | undefined = m.metadata?.to;
      const incoming: Incoming = { from, text: m.text ?? "", mode: m.injection_mode ?? "wait", dm };
      for (const [name, agent] of agents) {
        if (name === from) continue;
        if (dm) {
          // DMs without metadata.to between our two agents go to the other one.
          const target = to ?? (agent.peer === from ? name : undefined);
          if (target !== name) continue;
        }
        agent.receive(incoming);
      }
    }
  } catch (err) {
    console.warn("event pump:", (err as Error).message);
  }
}

setInterval(pump, 1500);
setInterval(() => {
  for (const a of agents.values()) void a.tick();
  if ([...agents.values()].every((a) => a.finished)) console.log("all cards shipped; still listening for steers");
}, TICK_MS);
