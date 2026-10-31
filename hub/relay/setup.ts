//created by kinjal
// One-time setup on the PRODUCT workspace:
//  - register jack + wick (tokens saved to .state/agents.json; reruns reconnect instead)
//  - create + join one channel per Casper room (room-<name>)
//  - mint an observer token with includeDms:true (saved to .state/observer.json)
import { AgentRelay, createObserverToken } from "@agent-relay/sdk";
import {
  PRODUCT_AGENTS,
  ROOMS,
  loadAgents,
  loadObserver,
  requireKey,
  roomChannel,
  writeJson,
} from "./state";

const workspaceKey = requireKey();
const relay = new AgentRelay({ workspaceKey });
const tokens = loadAgents();

for (const { name, harness } of PRODUCT_AGENTS) {
  let client;
  if (tokens[name]) {
    client = await relay.workspace.reconnect({ apiToken: tokens[name].token });
    console.log(`reconnected ${name}`);
  } else {
    client = await relay.workspace.register({
      name,
      type: "agent",
      metadata: { harness, product: "casper" },
    });
    if (!client.token) throw new Error(`register(${name}) returned no token`);
    tokens[name] = { id: client.id, token: client.token };
    writeJson("agents.json", tokens);
    console.log(`registered ${name} (${client.id})`);
  }

  for (const room of ROOMS) {
    const channel = roomChannel(room);
    try {
      await client.channels.create({ name: channel, topic: `Casper room: ${room}` });
      console.log(`created #${channel}`);
    } catch (err) {
      // already exists — fine
    }
    try {
      await client.channels.join(channel);
    } catch (err) {
      console.warn(`join #${channel} as ${name}:`, (err as Error).message);
    }
  }
}

if (!loadObserver()) {
  const observer = await createObserverToken({
    workspaceKey,
    name: `casper-mirror-${Date.now()}`,
    description: "Casper hub relay mirror",
    filters: { includeDms: true },
  });
  if (!observer.token) throw new Error("observer token missing from create response");
  writeJson("observer.json", { id: observer.id, token: observer.token });
  console.log(`minted observer token ${observer.id}`);
} else {
  console.log("observer token already minted");
}

console.log("setup done");
process.exit(0);
