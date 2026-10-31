//created by kinjal
// Done-check for step 1: jack DMs batty, batty replies. With `bun run mirror` running,
// both should show up as kind:"relay" lines in out.jsonl.
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, requireKey } from "./state";

const relay = new AgentRelay({ workspaceKey: requireKey() });
const tokens = loadAgents();
if (!tokens.jack || !tokens.batty) {
  console.error("jack/batty not registered, run `bun run setup` first");
  process.exit(1);
}

const jack = await relay.workspace.reconnect({ apiToken: tokens.jack.token });
const batty = await relay.workspace.reconnect({ apiToken: tokens.batty.token });

await jack.sendMessage({ to: "@batty", text: "batty, I'm on api/autopay. You take the UI?" });
await batty.sendMessage({ to: "@jack", text: "jack, deal. I've got the UI." });
console.log("sent jack -> batty and batty -> jack");
process.exit(0);
