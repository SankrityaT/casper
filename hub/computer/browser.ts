//created by kinjal
// Thin wrapper over the agent-browser CLI for one agent's computer.
// Every command runs with the same session + env, otherwise the daemon restarts and the page is lost.
//
// COMPUTER_BACKEND=local (default): agent-browser + Chrome on this machine.
// COMPUTER_BACKEND=boat: agent-browser on the boat VM in .state/boat.json (see boat-setup.ts); commands run
//   over boat's command API and the stream comes through the VM's published relay port.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BIN = join(import.meta.dir, "node_modules/.bin/agent-browser");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const BACKEND = (process.env.COMPUTER_BACKEND ?? "local") as "local" | "boat";

/** Categories that need approval. Non-risky ones get auto-approved by the server; risky ones ring the bell. */
export const CONFIRM_ACTIONS = process.env.COMPUTER_CONFIRM_ACTIONS ?? "click";

export interface AbResult<T = Record<string, unknown>> {
  success: boolean;
  data: T & { confirmation_required?: boolean; confirmation_id?: string; action?: string };
  error: string | null;
}

interface BoatState {
  id: string;
  streamUrl?: string;
}
const BOAT_API = "https://boat.dev/api/v1";
const boatStatePath = join(import.meta.dir, ".state/boat.json");
export const boatState = (): BoatState | undefined =>
  existsSync(boatStatePath) ? (JSON.parse(readFileSync(boatStatePath, "utf8")) as BoatState) : undefined;

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Run a shell command on the boat VM and return stdout. */
export async function boatExec(command: string, timeoutSeconds = 120): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const st = boatState();
  if (!st) throw new Error("no .state/boat.json, run `bun run boat-setup`");
  const res = await fetch(`${BOAT_API}/sandboxes/${st.id}/commands`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.BOAT_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ command, timeoutSeconds }),
  });
  const body = (await res.json()) as { exitCode?: number; stdout?: string; stderr?: string; error?: unknown };
  if (!res.ok) throw new Error(`boat ${res.status}: ${JSON.stringify(body.error ?? body)}`);
  return { exitCode: body.exitCode ?? -1, stdout: body.stdout ?? "", stderr: body.stderr ?? "" };
}

export class Browser {
  constructor(
    readonly session: string,
    readonly streamPort: number,
  ) {}

  env(): Record<string, string> {
    return {
      AGENT_BROWSER_EXECUTABLE_PATH: BACKEND === "boat" ? "/usr/bin/google-chrome" : process.env.AGENT_BROWSER_EXECUTABLE_PATH ?? CHROME,
      AGENT_BROWSER_STREAM_PORT: String(this.streamPort),
      AGENT_BROWSER_CONFIRM_ACTIONS: CONFIRM_ACTIONS,
      AGENT_BROWSER_STREAM_QUALITY: process.env.AGENT_BROWSER_STREAM_QUALITY ?? "60",
      AGENT_BROWSER_STREAM_MAX_WIDTH: process.env.AGENT_BROWSER_STREAM_MAX_WIDTH ?? "1280",
    };
  }

  /** WebSocket URL of the agent-browser frame stream, as reachable from this machine. */
  async streamUrl(): Promise<string> {
    if (BACKEND === "boat") {
      const u = new URL(boatState()?.streamUrl ?? "");
      u.protocol = "wss:";
      return u.toString();
    }
    const status = await this.streamStatus();
    return `ws://127.0.0.1:${status.data?.port ?? this.streamPort}`;
  }

  async run<T = Record<string, unknown>>(...args: string[]): Promise<AbResult<T>> {
    let out = "";
    let err = "";
    if (BACKEND === "boat") {
      const env = Object.entries(this.env())
        .map(([k, v]) => `${k}=${sq(v)}`)
        .join(" ");
      const cmd = `export PATH=$HOME/.local/bin:$PATH ${env}; agent-browser --session ${sq(this.session)} --json ${args.map(sq).join(" ")}`;
      try {
        ({ stdout: out, stderr: err } = await boatExec(cmd));
      } catch (e) {
        err = (e as Error).message;
      }
    } else {
      const proc = Bun.spawn([BIN, "--session", this.session, "--json", ...args], {
        env: { ...process.env, ...this.env() },
        stdout: "pipe",
        stderr: "pipe",
      });
      [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      await proc.exited;
    }
    try {
      return JSON.parse(out.trim().split("\n").pop() ?? "{}") as AbResult<T>;
    } catch {
      return { success: false, data: {} as AbResult<T>["data"], error: (err || out).trim() || "no output" };
    }
  }

  open = (url: string) => this.run("open", url);
  snapshot = () => this.run<{ snapshot: string; refs: Record<string, { role?: string; name?: string }> }>("snapshot", "-i");
  click = (sel: string) => this.run("click", sel);
  fill = (sel: string, text: string) => this.run("fill", sel, text);
  confirm = (id: string) => this.run("confirm", id);
  deny = (id: string) => this.run("deny", id);
  close = () => this.run("close");
  streamStatus = () => this.run<{ port: number; enabled: boolean; connected: boolean }>("stream", "status");
}
