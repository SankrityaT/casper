//created by kinjal
// Give a coding agent (batty by default) a real desktop computer on its own boat VM:
//  - starts vm/screen.js in the VM (whole desktop -> JPEG frames on :9402, xdotool input) and publishes it
//  - writes ~/.casper-env (model key, hub, room, agent) and knocks the repo checkout into the room
//    (Casper MCP + push gate, approver = APPROVER)
// The VM must already have ~/casper cloned with git credentials. Writes .state/boat-<agent>.json {id, streamUrl}.
//   bun run desk-setup batty
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { boatExec, deskState } from "./browser";

const agent = process.argv[2] ?? "batty";
const approver = process.env.APPROVER ?? "kinjal";
const room = process.env.CASPER_DM_ROOM ?? "autopay";
const HUB = (process.env.HUB_URL ?? "").replace(/\/$/, "");
const st = deskState(agent);
if (!st) {
  console.error(`no .state/boat-${agent}.json {id}; create the VM first`);
  process.exit(1);
}
const id = st.id;
const b64 = async (file: string) => Buffer.from(await Bun.file(join(import.meta.dir, file)).text()).toString("base64");
const step = async (label: string, cmd: string, timeout = 300) => {
  const r = await boatExec(cmd, timeout, id);
  console.log(`${label}: exit ${r.exitCode}${r.exitCode ? ` ${(r.stderr || r.stdout).slice(-300)}` : ""}`);
  return r;
};

await step("screen deps", `mkdir -p ~/screen && cd ~/screen && (test -d node_modules/ws || npm i --silent ws@8 >/dev/null 2>&1) && echo ${await b64("vm/screen.js")} | base64 -d > screen.js`);
const label =
  process.env.SCREEN_LABEL ??
  `● LIVE   ${agent}'s computer  ·  boat.dev VM ${id}  ·  $(. /etc/os-release; echo $PRETTY_NAME)  ·  $(nproc) vCPU`;
await step("screen start", `cd ~/screen && (test -f screen.pid && kill $(cat screen.pid) 2>/dev/null; true) && export SCREEN_LABEL="${label}" && (DISPLAY=:0 nohup node screen.js > screen.log 2>&1 & echo $! > screen.pid) && sleep 3 && cat screen.log && ss -ltn | grep -q 9402`);

const key = (process.env.ANTHROPIC_API_KEYS ?? process.env.ANTHROPIC_API_KEY ?? "").split(",")[0].trim();
const envFile = [
  `export ANTHROPIC_API_KEY='${key}'`,
  `export CASPER_HUB='${HUB}'`,
  `export CASPER_ROOM='${room}'`,
  `export CASPER_AGENT='${agent}'`,
].join("\n");
await step("env", `echo ${Buffer.from(envFile + "\n").toString("base64")} | base64 -d > ~/.casper-env && chmod 600 ~/.casper-env && grep -q casper-env ~/.bashrc || echo '. ~/.casper-env' >> ~/.bashrc`);
if (HUB) await step("knock", `cd ~/casper && . ~/.casper-env && curl -fsSL ${HUB}/knock | sh -s -- ${room} ${agent} ${approver}`);

const host = await fetch(`https://boat.dev/api/v1/sandboxes/${id}/host`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.BOAT_API_KEY}`, "content-type": "application/json" },
  body: JSON.stringify({ port: 9402 }),
});
const body = (await host.json()) as { url?: string };
if (!body.url) throw new Error(`host failed: ${JSON.stringify(body)}`);
writeFileSync(join(import.meta.dir, `.state/boat-${agent}.json`), JSON.stringify({ id, streamUrl: body.url }, null, 2));
console.log(`${agent}'s desktop is published (token-gated) for sandbox ${id}`);
process.exit(0);
