//created by kinjal
// Human -> agent message on the product workspace, for the wait-vs-steer demo.
//   bun run steer jack "use a column, not a new table"          (mode steer: lands mid-run)
//   bun run steer jack "when you're done, write the changelog" --wait
// Sends as the human identity HUMAN_NAME (default "kinjal"), registered on first use.
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, requireKey, writeJson } from "./state";

const [agent, text, flag] = process.argv.slice(2);
if (!agent || !text) {
  console.error('usage: bun run steer <agent> "<text>" [--wait]');
  process.exit(1);
}
const mode = flag === "--wait" ? "wait" : "steer";
const human = process.env.HUMAN_NAME ?? "kinjal";

const relay = new AgentRelay({ workspaceKey: requireKey() });
const tokens = loadAgents();
let client;
if (tokens[human]) {
  client = await relay.workspace.reconnect({ apiToken: tokens[human].token });
} else {
  client = await relay.workspace.register({ name: human, type: "human", metadata: { role: "human" } });
  if (!client.token) throw new Error("no token for human identity");
  tokens[human] = { id: client.id, token: client.token };
  writeJson("agents.json", tokens);
}

await client.sendMessage({ to: `@${agent}`, text, mode, metadata: { to: agent, human: true } });
console.log(`${human} -> @${agent} (${mode}): ${text}`);
process.exit(0);
