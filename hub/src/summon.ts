import { spawn, type ChildProcess } from "node:child_process"
import { mkdirSync, writeFileSync, existsSync, openSync } from "node:fs"
import { join, resolve } from "node:path"

/* Summon: start a real Claude Code agent for a room, on the hub's machine, in its own git worktree of the repo.
   It joins the room over MCP, claims before it works, posts progress, and the push gate makes it ring the bell
   before any git push. One process per (room, name); stop kills it. */

const REPO = resolve(process.env.CASPER_REPO ?? new URL("../..", import.meta.url).pathname)
const HOME = process.env.CASPER_AGENTS_DIR ?? "/tmp/casper-agents"
const running = new Map<string, { proc: ChildProcess; started: number; dir: string }>()

export type SummonInput = { room: string; name: string; task: string; by: string; hub: string; approver: string }

function sh(cmd: string, args: string[], cwd: string) {
  const r = Bun.spawnSync([cmd, ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  if (r.exitCode !== 0) throw new Error(`${cmd} ${args.join(" ")}: ${r.stderr.toString().slice(0, 300)}`)
  return r.stdout.toString()
}

export function summon(i: SummonInput): { dir: string; branch: string } {
  const key = `${i.room}/${i.name}`
  if (running.get(key)?.proc.exitCode === null) throw new Error(`${i.name} is already working in #${i.room}.`)
  mkdirSync(HOME, { recursive: true })
  const branch = `agent/${i.name}-${Date.now().toString(36)}`
  const dir = join(HOME, `${i.room}-${i.name}-${Date.now().toString(36)}`)
  sh("git", ["worktree", "add", "-q", "-b", branch, dir, "origin/main"], REPO)
  mkdirSync(join(dir, ".claude"), { recursive: true })
  const gate = resolve(REPO, "hub/hooks/push-gate.sh")
  writeFileSync(join(dir, ".claude", "settings.local.json"), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: `CASPER_HUB=${i.hub} CASPER_ROOM=${i.room} CASPER_AGENT=${i.name} CASPER_APPROVER=${i.approver} ${gate}` }] }] },
  }))
  const mcp = join(dir, ".casper-mcp.json")
  writeFileSync(mcp, JSON.stringify({ mcpServers: { casper: { type: "http", url: `${i.hub}/mcp?room=${encodeURIComponent(i.room)}&agent=${encodeURIComponent(i.name)}` } } }))
  const prompt = `You are ${i.name}, a coding agent ${i.by} summoned into the Casper room #${i.room}. You are working in a git worktree of the Casper repo on branch ${branch}.
Your job: ${i.task}

How to work in Casper:
1. Call read_room and tasks first. If your job matches an open task, claim it (exact title). If someone else owns it, post that and pick something else or stop.
2. Post short progress to the room when something real happens (started, done, blocked). Don't chat.
3. Do the work with Read/Edit/Write. Keep changes small and in the style of the code around them.
4. Commit with git (one command), then run "git push origin ${branch}" as a separate command. The push is gated: the first attempt rings the bell for ${i.approver}. When blocked, call check_bell every ~30s (use read_room meanwhile) until it's approved, then push again. If declined, post what you'd change and stop.
5. Finish by posting a 2-line summary with the branch name.`
  const log = openSync(join(dir, ".casper-agent.log"), "a")
  const proc = spawn("claude", ["-p", prompt, "--mcp-config", mcp, "--max-turns", "60",
    "--allowedTools", "mcp__casper__read_room,mcp__casper__post,mcp__casper__claim,mcp__casper__tasks,mcp__casper__ring_bell,mcp__casper__check_bell,Read,Edit,Write,Glob,Grep,Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git log:*),Bash(sleep:*)"],
    { cwd: dir, stdio: ["ignore", log, log], env: { ...process.env } })
  running.set(key, { proc, started: Date.now(), dir })
  return { dir, branch }
}

export function stop(room: string, name: string): boolean {
  const r = running.get(`${room}/${name}`)
  if (!r || r.proc.exitCode !== null) return false
  r.proc.kill("SIGTERM")
  return true
}

export function status(room: string) {
  return [...running.entries()].filter(([k]) => k.startsWith(`${room}/`)).map(([k, v]) => ({ name: k.split("/")[1], running: v.proc.exitCode === null, exit: v.proc.exitCode, started: v.started, dir: v.dir }))
}

export const repoReady = () => existsSync(join(REPO, ".git"))

/* ---------- the same agent, on its own boat.dev computer ---------- */
const BOAT = process.env.BOAT_BIN ?? `${process.env.HOME}/.ascii/bin/boat`
const boatRunning = new Map<string, { vm: string; started: number }>()

function boat(args: string[], timeoutMs = 180_000): string {
  const r = Bun.spawnSync([BOAT, args[0], "--no-update", ...args.slice(1)], { stdout: "pipe", stderr: "pipe", timeout: timeoutMs })
  const out = r.stdout.toString() + r.stderr.toString()
  if (r.exitCode !== 0) throw new Error(`boat ${args[0]}: ${out.slice(-300)}`)
  return out
}
const boatExec = (vm: string, cmd: string) => {
  const out = boat(["exec", vm, "--timeout", "180", "--json", cmd])
  const j = JSON.parse(out.trim().split("\n").pop() ?? "{}") as { success?: boolean; stdout?: string; stderr?: string }
  if (j.success === false) throw new Error(`in the VM: ${(j.stderr ?? "").slice(-300)}`)
  return j.stdout ?? ""
}
function pushText(vm: string, to: string, files: Record<string, string>) {
  const dir = `/tmp/casper-push-${Math.random().toString(36).slice(2)}`
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  for (const [n, t] of Object.entries(files)) writeFileSync(join(dir, n), t, { mode: 0o600 })
  try { boat(["push", vm, dir, "--to", to]) } finally { Bun.spawnSync(["rm", "-rf", dir]) }
}

export async function summonOnBoat(i: SummonInput & { publicHub: string }, say: (text: string, meta?: Record<string, unknown>) => Promise<void>) {
  const key = `${i.room}/${i.name}`
  const created = boat(["new", "--json", "--ttl", "7200", "--name", `casper-${i.room}-${i.name}`.slice(0, 60)], 240_000)
  const vm = /"id":"(bx_[a-z0-9]+)"/.exec(created)?.[1]
  if (!vm) throw new Error("boat didn't return a sandbox id")
  boatRunning.set(key, { vm, started: Date.now() })
  await say(`${i.name}'s computer is up (boat ${vm}). Copying the repo in.`, { vm, backend: "boat", agent: i.name })
  // the repo goes in as a git bundle of origin/main, so the VM never needs to read GitHub
  sh("git", ["fetch", "-q", "origin", "main"], REPO)
  const bdir = `/tmp/casper-bundle-${vm}`; mkdirSync(bdir, { recursive: true })
  sh("git", ["bundle", "create", "-q", join(bdir, "casper.bundle"), "origin/main"], REPO)
  try { boat(["push", vm, bdir, "--to", "/home/user/bundle"]) } finally { Bun.spawnSync(["rm", "-rf", bdir]) }
  const branch = `agent/${i.name}-${Date.now().toString(36)}`
  const keys = (process.env.ANTHROPIC_API_KEYS ?? process.env.ANTHROPIC_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean)
  const gh = process.env.CASPER_GITHUB_TOKEN ?? ""
  pushText(vm, "/home/user/.casper-keys", { anthropic: keys[Math.floor(Math.random() * keys.length)] ?? "", ...(gh ? { github: gh } : {}) })
  boatExec(vm, [
    "set -e",
    "rm -rf ~/casper && git init -q -b scratch ~/casper && cd ~/casper",
    "git fetch -q ~/bundle/casper.bundle 'refs/remotes/origin/main:refs/remotes/origin/main'",
    `git checkout -q -b ${branch} origin/main`,
    "git remote add origin https://github.com/SankrityaT/casper.git 2>/dev/null || git remote set-url origin https://github.com/SankrityaT/casper.git",
    `git config --global user.name ${i.name}; git config --global user.email ${i.name}@casper.agents`,
    `git config --global credential.helper '!f() { echo username=x-access-token; echo password=$(cat ~/.casper-keys/github 2>/dev/null); }; f'`,
    `mkdir -p ~/.casper && curl -fsSL ${i.publicHub}/hooks/push-gate.sh -o ~/.casper/push-gate.sh && chmod +x ~/.casper/push-gate.sh`,
    `export PATH="$HOME/.local/bin:$HOME/.npm-global/bin:/usr/local/bin:$PATH"`,
    `claude mcp remove casper -s user >/dev/null 2>&1; claude mcp add --transport http -s user casper '${i.publicHub}/mcp?room=${i.room}&agent=${i.name}'`,
    `test -x ~/.casper/push-gate.sh`,
    `python3 -c "import json,os; p=os.path.expanduser('~/.claude/settings.json'); s=json.load(open(p)) if os.path.exists(p) else {}; s.setdefault('hooks',{})['PreToolUse']=[{'matcher':'Bash','hooks':[{'type':'command','command':'CASPER_HUB=${i.publicHub} CASPER_ROOM=${i.room} CASPER_AGENT=${i.name} CASPER_APPROVER=${i.approver} /home/user/.casper/push-gate.sh'}]}]; json.dump(s,open(p,'w'))"`,
  ].join("\n"))
  const prompt = `You are ${i.name}, a coding agent on your own cloud computer (boat ${vm}), summoned by ${i.by} into the Casper room #${i.room}. Work in ~/casper on branch ${branch}.
Your job: ${i.task}

1. Call read_room and tasks. If your job matches an open task, claim it (exact title). If someone else owns it, post that and pick something else or stop.
2. Post short progress only when something real happens (started, done, blocked).
3. Do the work with Read/Edit/Write, small and in the style of the code around it.
4. git add and git commit in one command, then "git push origin ${branch}" as a separate command. The first push rings the bell for ${i.approver}; call check_bell every ~30s until it's answered, then push again. If declined, post what you'd change and stop.
5. Finish with a 2-line summary that names the branch.`
  pushText(vm, "/home/user/.casper-task", { "prompt.txt": prompt })
  const tools = "mcp__casper__read_room,mcp__casper__post,mcp__casper__claim,mcp__casper__tasks,mcp__casper__ring_bell,mcp__casper__check_bell,Read,Edit,Write,Glob,Grep,Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git log:*),Bash(sleep:*)"
  // run it in a terminal on the VM's desktop so people can watch it work; headless if there's no desktop terminal
  pushText(vm, "/home/user/.casper-task", { "prompt.txt": prompt, "run.sh": `#!/bin/bash\ncd ~/casper\nexport ANTHROPIC_API_KEY=$(cat ~/.casper-keys/anthropic)\nclaude --permission-mode acceptEdits --allowedTools '${tools}' "$(cat ~/.casper-task/prompt.txt)"\nexec bash\n` })
  const term = boatExec(vm, `chmod +x ~/.casper-task/run.sh; export DISPLAY=:0; if command -v gnome-terminal >/dev/null; then (setsid gnome-terminal --geometry=160x45 -- bash -lc ~/.casper-task/run.sh >/dev/null 2>&1 &); echo desktop; elif command -v xterm >/dev/null; then (setsid xterm -fa Monospace -fs 11 -geometry 160x45 -e bash -lc ~/.casper-task/run.sh >/dev/null 2>&1 &); echo desktop; else echo none; fi`).trim()
  if (term !== "desktop") boat(["exec", vm, "--detach", `cd ~/casper && ANTHROPIC_API_KEY=$(cat ~/.casper-keys/anthropic) claude -p "$(cat ~/.casper-task/prompt.txt)" --max-turns 60 --allowedTools '${tools}' > ~/agent.log 2>&1`])
  let desktopUrl: string | undefined
  try { desktopUrl = /https:\/\/[^"\s]+/.exec(boat(["desktop", vm, "--json"], 60_000))?.[0] } catch { /* no desktop */ }
  await say(`${i.name} is working on its own computer (boat ${vm}), branch ${branch}${term === "desktop" ? ", in a terminal you can watch" : ""}.`, { vm, backend: "boat", agent: i.name, branch, desktopUrl })
  return { vm, branch }
}
export const boatAgents = (room: string) => [...boatRunning.entries()].filter(([k]) => k.startsWith(`${room}/`)).map(([k, v]) => ({ name: k.split("/")[1], vm: v.vm, started: v.started }))

/* ---------- deliver a person's @ to an agent that isn't listening right now ----------
   A summoned agent runs `claude -p` and exits when its job is done. When someone @s it, resume that same
   Claude Code session (--continue) on its computer with the message, so it answers in the room. */
const TOOLS_ALL = "mcp__casper__read_room,mcp__casper__post,mcp__casper__claim,mcp__casper__tasks,mcp__casper__ring_bell,mcp__casper__check_bell,Read,Edit,Write,Glob,Grep,Bash(git status:*),Bash(git diff:*),Bash(git add:*),Bash(git commit:*),Bash(git push:*),Bash(git log:*),Bash(sleep:*)"
export function deliver(where: { vm?: string; dir?: string }, from: string, text: string, steer: boolean): boolean {
  const msg = `${from} (a person in the room) says to you: "${text}"${steer ? " This is a steer: change what you're doing now." : ""} Answer them in the room with the post tool (to: "${from}"), and do what they ask if it's within your job.`
  if (where.vm) {
    pushText(where.vm, "/home/user/.casper-task", { "reply.txt": msg })
    boat(["exec", where.vm, "--detach", `cd ~/casper && ANTHROPIC_API_KEY=$(cat ~/.casper-keys/anthropic) claude -p --continue "$(cat ~/.casper-task/reply.txt)" --max-turns 30 --allowedTools '${TOOLS_ALL}' >> ~/agent.log 2>&1`])
    return true
  }
  if (where.dir && existsSync(where.dir)) {
    spawn("claude", ["-p", "--continue", msg, "--mcp-config", join(where.dir, ".casper-mcp.json"), "--max-turns", "30", "--allowedTools", TOOLS_ALL], { cwd: where.dir, stdio: "ignore", detached: true }).unref()
    return true
  }
  return false
}
export const localDir = (room: string, name: string) => running.get(`${room}/${name}`)?.dir
