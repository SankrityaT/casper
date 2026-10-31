//created by kinjal
// Backup clip of an agent's computer: saves every stream frame, stops on SIGINT/SIGTERM (or after
// --seconds), then stitches an mp4 with ffmpeg at the real capture timing.
//   bun run record.ts --out /tmp/wick.mp4 [--agent wick] [--seconds 300]
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const arg = (name: string, dflt: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const agent = arg("agent", "wick");
const out = arg("out", `/tmp/${agent}-computer.mp4`);
const seconds = Number(arg("seconds", "600"));
const port = process.env.COMPUTER_PORT ?? "8791";

const dir = mkdtempSync(join(tmpdir(), `${agent}-frames-`));
const frames: { file: string; t: number }[] = [];
const ws = new WebSocket(`ws://localhost:${port}/computer/${agent}/stream`);
ws.onmessage = (e) => {
  const m = JSON.parse(String(e.data));
  if (m.type !== "frame") return;
  const file = join(dir, `${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(m.data, "base64"));
  frames.push({ file, t: m.metadata?.timestamp ?? Date.now() });
};
console.log(`recording ${agent} frames into ${dir}`);

let done = false;
async function finish() {
  if (done) return;
  done = true;
  ws.close();
  if (frames.length < 2) {
    console.log("not enough frames");
    process.exit(1);
  }
  // concat demuxer with per-frame durations keeps the real pacing (frames only arrive on change).
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1]?.t ?? f.t + 1000;
      return `file '${f.file}'\nduration ${Math.max(0.04, (next - f.t) / 1000).toFixed(3)}`;
    })
    .join("\n");
  writeFileSync(join(dir, "list.txt"), `${list}\nfile '${frames[frames.length - 1].file}'\n`);
  const p = Bun.spawn(
    ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf", "fps=25,format=yuv420p,scale=trunc(iw/2)*2:trunc(ih/2)*2", out],
    { stdout: "inherit", stderr: "inherit" },
  );
  await p.exited;
  console.log(`${frames.length} frames -> ${out}`);
  process.exit(0);
}
process.on("SIGINT", finish);
process.on("SIGTERM", finish);
setTimeout(finish, seconds * 1000);
