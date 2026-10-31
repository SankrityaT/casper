//created by kinjal
// Done-check for step 1: jack DMs wick, wick replies. With `bun run mirror` running,
// both should show up as kind:"relay" lines in out.jsonl.
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, requireKey } from "./state";

const relay = new AgentRelay({ workspaceKey: requireKey() });
const tokens = loadAgents();
if (!tokens.jack || !tokens.wick) {
  console.error("jack/wick not registered, run `bun run setup` first");
  process.exit(1);
}

const jack = await relay.workspace.reconnect({ apiToken: tokens.jack.token });
const wick = await relay.workspace.reconnect({ apiToken: tokens.wick.token });

await jack.sendMessage({ to: "@wick", text: "wick, I'm on api/autopay. You take the UI?" });
await wick.sendMessage({ to: "@jack", text: "jack, deal. I've got the UI." });
console.log("sent jack -> wick and wick -> jack");
process.exit(0);
