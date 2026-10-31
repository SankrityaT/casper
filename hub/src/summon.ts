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
