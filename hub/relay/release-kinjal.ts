//created by kinjal
// One-off: remove the stray human "kinjal" identity from the PRODUCT workspace
// (only code agents live there: jack, batty, wick, casper).
import { AgentRelay } from "@agent-relay/sdk";
import { loadAgents, requireKey, writeJson } from "./state";

const relay = new AgentRelay({ workspaceKey: requireKey() });
const result = await relay.workspace.release({ name: "kinjal", reason: "humans stay out of the product workspace", deleteAgent: true });
console.log("released kinjal", result);
const tokens = loadAgents();
delete tokens.kinjal;
writeJson("agents.json", tokens);
process.exit(0);
