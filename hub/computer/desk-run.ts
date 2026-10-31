//created by kinjal
// Hand a desktop agent (batty) a task: on its boat VM, refresh ~/casper from origin/main onto a new branch,
// and open a maximized terminal on the desktop running Claude Code with the task, so the room's stream shows
// real work. The push gate (from desk-setup's knock) rings the bell before any push.
//   bun run desk-run batty "Claim the billing toggle card and ..." [branch]
import { boatExec, deskState } from "./browser";

const [agent = "batty", task, branchArg] = process.argv.slice(2);
if (!task) {
  console.error('usage: bun run desk-run <agent> "<task>" [branch]');
  process.exit(1);
}
const st = deskState(agent);
if (!st) {
  console.error(`no .state/boat-${agent}.json; run desk-setup first`);
  process.exit(1);
}
const room = process.env.CASPER_DM_ROOM ?? "autopay";
const branch = branchArg ?? `agent/${agent}-${Date.now().toString(36)}`;
const owner = process.env.AGENT_OWNER ?? "Kinjal";

const prompt = [
  `You are ${agent}, ${owner}'s coding agent in the Casper room #${room}. Use the casper MCP tools (read_room, tasks, claim, post).`,
  task,
  `Post short progress to the room as you go. Commit with a clear message (no Co-Authored-By trailer), then in a SEPARATE command run: git push -u origin ${branch}.`,
  `The push waits for ${owner}'s yes in the room; wait for it, then post that you're done.`,
].join(" ");

const script = `#!/bin/bash
cd ~/casper && . ~/.casper-env
git fetch -q origin && git checkout -q -B ${branch} origin/main
clear; echo "${agent} · ${owner}'s coding agent · room #${room} · branch ${branch}"; echo
claude --dangerously-skip-permissions ${JSON.stringify(prompt)}
exec bash
`;

const b64 = Buffer.from(script).toString("base64");
const r = await boatExec(
  `echo ${b64} | base64 -d > ~/run-${agent}.sh && chmod +x ~/run-${agent}.sh && export DISPLAY=:0 && ` +
    `for w in $(wmctrl -l | awk '/Claude Code|${agent}/{print $1}'); do wmctrl -ic $w; done; sleep 1; ` +
    `(nohup gnome-terminal --maximize --title=${agent} -- bash -lc ~/run-${agent}.sh > ~/term.log 2>&1 &); sleep 3; wmctrl -l | tail -1`,
  60,
  st.id,
);
console.log(r.exitCode === 0 ? `${agent} is working on ${branch}: ${r.stdout.trim()}` : `failed: ${r.stderr || r.stdout}`);
process.exit(r.exitCode === 0 ? 0 : 1);
