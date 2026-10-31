//created by kinjal
// wick (growth agent) on its computer: drafts the autopay launch post in the composer and
// clicks Post. Post is a risky click, so the computer server rings the bell and waits for a human.
//   bun run wick            (server must be running: bun run start)
//   bun run approve <askId> [no]
import Anthropic from "@anthropic-ai/sdk";
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, roomChannel } from "../relay/state";

const BASE = `http://localhost:${process.env.COMPUTER_PORT ?? 8790}`;
const AGENT = "wick";
const ROOM = process.env.CASPER_DM_ROOM ?? "autopay";

async function call(op: string, body?: unknown) {
  const res = await fetch(`${BASE}/computer/${AGENT}/${op}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return (await res.json()) as any;
}

// Tell the room over Relay (mirrored into Casper) when the product workspace is available.
let relayPost = async (_text: string) => {};
try {
  const tokens = loadAgents();
  if (process.env.RELAY_WORKSPACE_KEY && tokens.wick) {
    const relay = new AgentRelay({ workspaceKey: process.env.RELAY_WORKSPACE_KEY });
    const wick = await relay.workspace.reconnect({ apiToken: tokens.wick.token });
    relayPost = async (text) => {
      await wick.sendMessage({ to: `#${roomChannel(ROOM)}`, text, metadata: { room: ROOM, computer: true } }).catch(() => {});
    };
  }
} catch (err) {
  console.warn("relay unavailable, continuing without room posts:", (err as Error).message);
}

async function draft(): Promise<string> {
  const keys = (process.env.ANTHROPIC_API_KEYS ?? process.env.ANTHROPIC_API_KEY ?? "").split(",").filter(Boolean);
  const fallback = "Autopay is live. Flip one toggle on any bill and it pays itself on the due date. Off by default, yours to turn on.";
  if (!keys.length) return fallback;
  const client = new Anthropic({ apiKey: keys[Math.floor(Math.random() * keys.length)] });
  const res = await client.messages.create({
    model: process.env.WICK_MODEL_CLAUDE ?? "claude-opus-5-5",
    max_tokens: 1000,
    output_config: { effort: "low" },
    system: "You are wick, the growth agent. Write launch posts that are plain, specific and human. No hashtags, no emoji, no hype words.",
    messages: [
      {
        role: "user",
        content:
          "Write one launch post (under 240 characters) for a new feature: Autopay. A toggle on each bill; it's opt-in and off by default; PATCH /bills/:id/autopay powers it. Reply with only the post text.",
      },
    ],
  });
  if (res.stop_reason === "refusal") return fallback;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
  return text || fallback;
}

const findRef = (refs: Record<string, { role?: string; name?: string }>, role: string, name?: RegExp) =>
  Object.entries(refs).find(([, r]) => r.role === role && (!name || name.test(r.name ?? "")))?.[0];

const text = await draft();
console.log(`draft: ${text}`);

await call("open", { url: `${BASE}/composer` });
await relayPost("On my computer: drafting the autopay launch post.");

const snap = await call("act", { cmd: "snapshot" });
const refs = snap.data?.refs ?? {};
const box = findRef(refs, "textbox");
const post = findRef(refs, "button", /post/i);
if (!box || !post) {
  console.error("couldn't find the composer controls", refs);
  process.exit(1);
}

await call("act", { cmd: "fill", sel: `@${box}`, text, label: "draft" });
await relayPost(`Drafted: "${text}" Ringing the bell before I post.`);

console.log("clicking Post (rings the bell, waiting for approval)...");
const r = await call("act", { cmd: "click", sel: `@${post}`, label: "Post" });
if (r.denied) {
  await relayPost("Post denied. Leaving the draft in the composer.");
  console.log("denied");
} else {
  await relayPost("Approved and posted the launch post.");
  console.log("posted", r.ok);
}
process.exit(0);
