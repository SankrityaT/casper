//created by kinjal
// Hub -> agents: when a human posts in the web room, the hub stores
//   {kind:"msg", from:"kinjal"|"sankritya", text, meta:{to:"jack"|"batty"|"wick", mode:"steer"|"wait"}}
// This forwards each one to the named agent over Relay, as casper with "<Human>: " prefix and the
// same mode, so "@jack ..." with Steer in the app lands on jack's next step.
//   bun run bridge
import { AgentRelay } from "@agent-relay/sdk";
import { DM_ROOM, HUB_URL, loadAgents, readJson, recordConv, requireKey, writeJson } from "./state";

if (!HUB_URL) {
  console.error("HUB_URL not set");
  process.exit(1);
}
const HUMANS = new Set((process.env.CASPER_HUMANS ?? "kinjal,sankritya").split(","));
const AGENTS = new Set(["jack", "batty", "wick"]);
const tokens = loadAgents();
if (!tokens.casper) {
  console.error("casper not registered, run `bun run setup`");
  process.exit(1);
}
const relay = new AgentRelay({ workspaceKey: requireKey() });
const casper = await relay.workspace.reconnect({ apiToken: tokens.casper.token });

// Start at the hub's head so old messages don't replay; the cursor survives restarts.
let since = readJson<{ seq: number }>("bridge-cursor.json")?.seq;
if (since === undefined) {
  const summary = (await (await fetch(`${HUB_URL}/room/${DM_ROOM}/summary`)).json()) as { lastSeq?: number };
  since = summary.lastSeq ?? 0;
}
console.log(`bridge: hub ${HUB_URL} room ${DM_ROOM} from seq ${since}`);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let ticks = 0;
async function tick() {
  try {
    // If the hub's log was migrated or reset its head can drop below our cursor; rewind so nothing is skipped.
    if (++ticks % 10 === 1) {
      const head = ((await (await fetch(`${HUB_URL}/room/${DM_ROOM}/summary`)).json()) as { lastSeq?: number }).lastSeq;
      if (typeof head === "number" && head < since!) {
        console.log(`hub head ${head} < cursor ${since}; rewinding`);
        since = head;
        writeJson("bridge-cursor.json", { seq: since });
      }
    }
    const res = await fetch(`${HUB_URL}/room/${DM_ROOM}/events?since=${since}`);
    if (!res.ok) return;
    const events = (await res.json()) as { seq: number; kind: string; from: string; text: string; meta?: { to?: string; mode?: string } }[];
    for (const e of events) {
      since = Math.max(since!, e.seq);
      writeJson("bridge-cursor.json", { seq: since });
      const to = e.meta?.to?.replace(/^@/, "");
      if (e.kind !== "msg" || !HUMANS.has(e.from) || !to || !AGENTS.has(to)) continue;
      const mode = e.meta?.mode === "steer" ? "steer" : "wait";
      const sent = await casper.sendMessage({
        to: `@${to}`,
        text: `${cap(e.from)}: ${e.text}`,
        mode,
        metadata: { to, human: e.from, hubSeq: e.seq },
      });
      recordConv(sent.conversationId, "casper", to);
      console.log(`#${e.seq} ${e.from} -> ${to} (${mode}): ${e.text}`);
    }
  } catch (err) {
    console.warn("bridge:", (err as Error).message);
  }
}

setInterval(tick, 1500);
