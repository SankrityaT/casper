//created by kinjal
// Human -> agent message on the product workspace, for the wait-vs-steer demo.
//   bun run steer jack "use a column, not a new table"          (mode steer: lands mid-run)
//   bun run steer jack "when you're done, write the changelog" --wait
// Only code lives in the product workspace, so the human's words go through the
// casper host agent as "<Human>: <text>" (what the Casper UI does); agents credit the human.
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, requireKey } from "./state";

const [agent, text, flag] = process.argv.slice(2);
if (!agent || !text) {
  console.error('usage: bun run steer <agent> "<text>" [--wait]');
  process.exit(1);
}
const mode = flag === "--wait" ? "wait" : "steer";
const human = process.env.HUMAN_NAME ?? "Kinjal";

const tokens = loadAgents();
if (!tokens.casper) {
  console.error("casper not registered, run `bun run setup` first");
  process.exit(1);
}
const relay = new AgentRelay({ workspaceKey: requireKey() });
const casper = await relay.workspace.reconnect({ apiToken: tokens.casper.token });
await casper.sendMessage({ to: `@${agent}`, text: `${human}: ${text}`, mode, metadata: { to: agent, human } });
console.log(`${human} (via casper) -> @${agent} (${mode}): ${text}`);
process.exit(0);
