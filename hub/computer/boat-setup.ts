//created by kinjal
// Prepare wick's computer on a boat VM (boat.dev): create the sandbox if needed, install agent-browser,
// start the browser, relay its stream port (agent-browser binds 127.0.0.1) to 0.0.0.0:9401, publish it,
// and drop the composer page on the VM. Writes .state/boat.json {id, streamUrl}.
//   bun run boat-setup              then: COMPUTER_BACKEND=boat bun run start
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { boatExec, boatState } from "./browser";

const API = "https://boat.dev/api/v1";
const KEY = process.env.BOAT_API_KEY;
if (!KEY) {
  console.error("BOAT_API_KEY missing");
  process.exit(1);
}
const headers = { authorization: `Bearer ${KEY}`, "content-type": "application/json" };
const save = (s: object) => {
  mkdirSync(join(import.meta.dir, ".state"), { recursive: true });
  writeFileSync(join(import.meta.dir, ".state/boat.json"), JSON.stringify(s, null, 2));
};

let state = boatState();
if (!state) {
  const res = await fetch(`${API}/sandboxes`, { method: "POST", headers, body: JSON.stringify({ ttlSeconds: 3 * 3600 }) });
  const body = (await res.json()) as { sandbox?: { id: string } };
  if (!body.sandbox) throw new Error(`create failed: ${JSON.stringify(body)}`);
  state = { id: body.sandbox.id };
  save(state);
  console.log(`created boat sandbox ${state.id}`);
}

const step = async (label: string, cmd: string, timeout = 300) => {
  const r = await boatExec(cmd, timeout);
  console.log(`${label}: exit ${r.exitCode}`);
  if (r.exitCode !== 0) console.log(r.stderr.slice(-400) || r.stdout.slice(-400));
};

await step("agent-browser", "test -x $HOME/.local/bin/agent-browser || npm i -g --prefix $HOME/.local agent-browser@0.41.0 >/dev/null 2>&1; test -x $HOME/.local/bin/agent-browser");
const composer = Buffer.from(await Bun.file(join(import.meta.dir, "composer.html")).text()).toString("base64");
await step("composer", `echo ${composer} | base64 -d > $HOME/composer.html`);
await step(
  "relay",
  `cat > $HOME/relay.js <<'EOF'
require("net").createServer((c) => { const u = require("net").connect(9301, "127.0.0.1"); c.pipe(u); u.pipe(c); u.on("error", () => c.destroy()); c.on("error", () => u.destroy()); }).listen(9401, "0.0.0.0");
EOF
pgrep -f relay.js >/dev/null || (nohup node $HOME/relay.js > $HOME/relay.log 2>&1 &); sleep 1; ss -ltn | grep -q 9401`,
);

const host = await fetch(`${API}/sandboxes/${state.id}/host`, { method: "POST", headers, body: JSON.stringify({ port: 9401 }) });
const hostBody = (await host.json()) as { url?: string };
if (!hostBody.url) throw new Error(`host failed: ${JSON.stringify(hostBody)}`);
save({ ...state, streamUrl: hostBody.url });
console.log(`stream published (token-gated) for sandbox ${state.id}`);
process.exit(0);
