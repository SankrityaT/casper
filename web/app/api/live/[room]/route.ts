import { open, stat } from "node:fs/promises";
import path from "node:path";

/* GET /api/live/:room?since=<seq>: streams the local Relay mirror's out.jsonl (hub/relay/out.jsonl) as
   server-sent events, one event per line, for the room asked for. For running the demo on one laptop next
   to the mirror; with a hub, the browser talks to the hub's socket instead. Dev only. */

const FILE = process.env.LIVE_EVENTS_FILE ?? path.resolve(process.cwd(), "../hub/relay/out.jsonl");

export async function GET(req: Request, { params }: { params: Promise<{ room: string }> }) {
  if (process.env.NODE_ENV === "production" && !process.env.LIVE_EVENTS_FILE) return new Response("Not here.", { status: 404 });
  const { room } = await params;
  const since = Number(new URL(req.url).searchParams.get("since") ?? 0) || 0;
  const enc = new TextEncoder();
  let pos = 0, buf = "", timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(ctl) {
      const send = (s: string) => ctl.enqueue(enc.encode(s));
      const pump = async () => {
        try {
          const st = await stat(FILE);
          if (st.size < pos) pos = 0; // the file was reset
          if (st.size === pos) return;
          const fh = await open(FILE, "r");
          const { buffer } = await fh.read({ buffer: Buffer.alloc(st.size - pos), position: pos });
          await fh.close();
          pos = st.size;
          buf += buffer.toString("utf8");
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const ev = JSON.parse(line);
              if (ev.room !== room || (typeof ev.seq === "number" && ev.seq <= since)) continue;
              send(`data: ${JSON.stringify(ev)}\n\n`);
            } catch { /* a half-written line */ }
          }
        } catch { send(": waiting for the mirror\n\n"); }
      };
      send(": connected\n\n");
      await pump();
      timer = setInterval(pump, 700);
      req.signal.addEventListener("abort", () => { if (timer) clearInterval(timer); try { ctl.close(); } catch {} });
    },
    cancel() { if (timer) clearInterval(timer); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" } });
}
