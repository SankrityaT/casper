//created by kinjal
// Thin wrapper over the agent-browser CLI for one agent's computer.
// Every command runs with the same session + env, otherwise the daemon restarts and the page is lost.
import { join } from "node:path";

const BIN = join(import.meta.dir, "node_modules/.bin/agent-browser");
const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Categories that need approval. Non-risky ones get auto-approved by the server; risky ones ring the bell. */
export const CONFIRM_ACTIONS = process.env.COMPUTER_CONFIRM_ACTIONS ?? "click";

export interface AbResult<T = Record<string, unknown>> {
  success: boolean;
  data: T & { confirmation_required?: boolean; confirmation_id?: string; action?: string };
  error: string | null;
}

export class Browser {
  constructor(
    readonly session: string,
    readonly streamPort: number,
  ) {}

  env() {
    return {
      ...process.env,
      AGENT_BROWSER_EXECUTABLE_PATH: process.env.AGENT_BROWSER_EXECUTABLE_PATH ?? CHROME,
      AGENT_BROWSER_STREAM_PORT: String(this.streamPort),
      AGENT_BROWSER_CONFIRM_ACTIONS: CONFIRM_ACTIONS,
      AGENT_BROWSER_STREAM_QUALITY: process.env.AGENT_BROWSER_STREAM_QUALITY ?? "60",
      AGENT_BROWSER_STREAM_MAX_WIDTH: process.env.AGENT_BROWSER_STREAM_MAX_WIDTH ?? "1280",
    };
  }

  async run<T = Record<string, unknown>>(...args: string[]): Promise<AbResult<T>> {
    const proc = Bun.spawn([BIN, "--session", this.session, "--json", ...args], {
      env: this.env(),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
    await proc.exited;
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
