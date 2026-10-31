//created by kinjal
// Step 3: an agent's computer (wick's browser) exposed to the Casper hub/web.
//
//   WS   /computer/:agent/stream   JPEG frames from agent-browser ({type:"frame", data:<b64 jpeg>, ...})
//                                  client -> {type:"takeover", on, by} to grab/release the computer;
//                                  input_mouse / input_keyboard / input_touch pass through only while taken over
//   POST /computer/:agent/open     {url}
//   POST /computer/:agent/act      {cmd:"click"|"fill"|"snapshot", sel?, text?, label?}
//                                  agent-browser runs with --confirm-actions; a confirmation on a risky
//                                  label (Post, Send, Delete, Pay...) rings the bell and waits for /answer,
//                                  anything else is auto-approved
//   POST /computer/:agent/answer   {askId, yes, by}   (or answer in the room: the hub's /room/:room/answer is polled)
//   GET  /computer/:agent/state
//   GET  /composer                 stand-in launch composer page (local backend; on boat it's a file on the VM)
//   COMPUTER_BACKEND=boat runs the browser on the boat VM (bun run boat-setup first)
//
// Events (kind "computer" | "bell" | "approve") go to out.jsonl + the hub via ../relay/state publish().
import { join } from "node:path";
import { HUB_URL, publish } from "../relay/state";
import { BACKEND, Browser, deskState } from "./browser";

const PORT = Number(process.env.COMPUTER_PORT ?? 8791); // the hub owns 8790
// How the room/web reaches this server (a tunnel URL in the demo); goes into meta.stream.
const PUBLIC = (process.env.COMPUTER_PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
const streamUrl = (agent: string) => `${PUBLIC.replace(/^http/, "ws")}/computer/${agent}/stream`;
const BELL_FOR = process.env.COMPUTER_BELL_FOR ?? "kinjal";
const ROOM = process.env.CASPER_DM_ROOM ?? "autopay";
const RISKY = /\b(post|publish|send|tweet|share|delete|remove|pay|buy|purchase|submit|merge|deploy)\b/i;
const ANSWER_TIMEOUT_MS = Number(process.env.COMPUTER_ANSWER_TIMEOUT_MS ?? 5 * 60_000);

interface Pending {
  askId: string;
  action: string;
  label: string;
  resolve: (yes: boolean) => void;
}

interface Computer {
  agent: string;
  browser: Browser;
  takeover: { on: boolean; by?: string };
  pending: Map<string, Pending>;
  url?: string;
}

const STREAM_PORTS: Record<string, number> = { wick: 9301, jack: 9302, batty: 9303 };
const computers = new Map<string, Computer>();

function computer(agent: string): Computer {
  let c = computers.get(agent);
  if (!c) {
    c = { agent, browser: new Browser(`casper-${agent}`, STREAM_PORTS[agent] ?? 9310), takeover: { on: false }, pending: new Map() };
    computers.set(agent, c);
  }
  return c;
}

const say = (kind: "computer" | "bell" | "approve", from: string, text: string, meta: Record<string, unknown>) =>
  publish({
    room: ROOM,
    kind,
    from,
    text,
    ts: new Date().toISOString(),
    meta: kind === "computer" ? { stream: streamUrl(String(meta.agent ?? from)), backend: BACKEND, ...meta } : meta,
  });

// The page wick drafts in: served here when local, written to the VM by boat-setup.ts when on boat.
const COMPOSER = BACKEND === "boat" ? "file:///home/user/composer.html" : `http://localhost:${PORT}/composer`;

async function act(c: Computer, body: { cmd: string; sel?: string; text?: string; label?: string }) {
  if (c.takeover.on) return { status: 423, json: { ok: false, error: `${c.takeover.by ?? "a human"} has the computer` } };
  const b = c.browser;
  let r;
  if (body.cmd === "click" && body.sel) r = await b.click(body.sel);
  else if (body.cmd === "fill" && body.sel) r = await b.fill(body.sel, body.text ?? "");
  else if (body.cmd === "snapshot") r = await b.snapshot();
  else return { status: 400, json: { ok: false, error: "unknown cmd" } };

  const askId = r.data?.confirmation_id;
  if (r.data?.confirmation_required && askId) {
    const label = body.label ?? body.sel ?? body.cmd;
    if (!RISKY.test(label)) {
      r = await b.confirm(askId);
    } else {
      // Risky: ring the bell and wait for a human.
      const title = /post/i.test(label) ? `${c.agent} wants to post the launch post` : `${c.agent} wants to ${body.cmd} "${label}"`;
      await say("bell", c.agent, `${title}. Approve?`, {
        askId,
        for: BELL_FOR,
        title,
        agent: c.agent,
        action: body.cmd,
        label,
      });
      const yes = await new Promise<boolean>((resolve) => {
        c.pending.set(askId, { askId, action: body.cmd, label, resolve });
        setTimeout(() => resolve(false), ANSWER_TIMEOUT_MS);
      });
      c.pending.delete(askId);
      r = yes ? await b.confirm(askId) : await b.deny(askId);
      if (!yes) return { status: 200, json: { ok: false, denied: true, askId } };
      if (r.success)
        await say("computer", c.agent, /post/i.test(label) ? `${c.agent} posted the launch post` : `${c.agent} did it: ${label}`, {
          agent: c.agent,
          askId,
          done: label,
        });
    }
  }
  return { status: r.success ? 200 : 500, json: { ok: r.success, data: r.data, error: r.error } };
}

/** Resolve a pending bell. emit=false when the hub already logged the answer. */
async function answer(c: Computer, askId: string, yes: boolean, by = "human", emit = true) {
  const p = c.pending.get(askId);
  if (!p) return false;
  if (emit)
    await say("approve", by, `${by} ${yes ? "approved" : "denied"}: ${p.action} "${p.label}"`, { askId, yes, agent: c.agent });
  p.resolve(yes);
  return true;
}

// With a hub, the room answers bells at POST /room/:room/answer; pick those answers up from its event log.
if (HUB_URL) {
  let since = 0;
  setInterval(async () => {
    if (![...computers.values()].some((c) => c.pending.size)) return;
    try {
      const res = await fetch(`${HUB_URL}/room/${encodeURIComponent(ROOM)}/events?since=${since}`);
      if (!res.ok) return;
      const body = (await res.json()) as any;
      const events: any[] = Array.isArray(body) ? body : body.events ?? body.data?.events ?? [];
      for (const e of events) {
        if (typeof e.seq === "number") since = Math.max(since, e.seq);
        const askId = e.meta?.askId;
        if (!askId || typeof e.meta?.yes !== "boolean") continue;
        for (const c of computers.values()) if (c.pending.has(askId)) await answer(c, askId, e.meta.yes, e.meta.by ?? e.from, false);
      }
    } catch {
      /* hub not up yet */
    }
  }, 1500);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });

type WsData = { agent: string; upstream?: WebSocket; who?: string };

const server = Bun.serve<WsData>({
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["computer", agent, op]

    if (url.pathname === "/composer") return new Response(Bun.file(join(import.meta.dir, "composer.html")));
    if (req.method === "OPTIONS") return json({}, 204);
    if (parts[0] !== "computer" || !parts[1]) return json({ error: "not found" }, 404);

    const c = computer(parts[1]);
    const op = parts[2];

    if (op === "stream") {
      if (srv.upgrade(req, { data: { agent: c.agent } })) return undefined;
      return json({ error: "expected websocket" }, 400);
    }
    if (op === "state") {
      return json({
        agent: c.agent,
        takeover: c.takeover,
        url: c.url,
        pending: [...c.pending.values()].map(({ askId, action, label }) => ({ askId, action, label })),
      });
    }
    if (op === "open" && req.method === "POST") {
      const { url: asked } = (await req.json()) as { url: string };
      const target = asked === "composer" ? COMPOSER : asked;
      const r = await c.browser.open(target);
      c.url = target;
      await say("computer", c.agent, `${c.agent} opened ${target}`, { url: target });
      return json({ ok: r.success, data: r.data, error: r.error }, r.success ? 200 : 500);
    }
    if (op === "announce" && req.method === "POST") {
      // Tell the room this agent's computer is live (desktop VMs have no browser "open" to trigger it).
      const { text } = (await req.json().catch(() => ({}))) as { text?: string };
      const desk = deskState(c.agent);
      await say("computer", c.agent, text ?? `${c.agent}'s computer is live`, { agent: c.agent, ...(desk ? { backend: "boat-desktop", vm: desk.id } : {}) });
      return json({ ok: true, stream: streamUrl(c.agent) });
    }
    if (op === "act" && req.method === "POST") {
      const r = await act(c, (await req.json()) as never);
      return json(r.json, r.status);
    }
    if (op === "answer" && req.method === "POST") {
      const { askId, yes, by } = (await req.json()) as { askId: string; yes: boolean; by?: string };
      const ok = await answer(c, askId, yes, by, true);
      return ok ? json({ ok: true }) : json({ ok: false, error: "no such ask" }, 404);
    }
    return json({ error: "not found" }, 404);
  },

  websocket: {
    async open(ws) {
      const c = computer(ws.data.agent);
      // Coding agents (batty...) stream their whole VM desktop (desk-setup.ts); wick streams its browser.
      const desk = deskState(c.agent)?.streamUrl;
      const upstream = new WebSocket(desk ? desk.replace(/^http/, "ws") : await c.browser.streamUrl());
      ws.data.upstream = upstream;
      upstream.onmessage = (e) => ws.send(typeof e.data === "string" ? e.data : new Uint8Array(e.data as ArrayBuffer));
      upstream.onclose = () => ws.close(1011, "browser stream closed");
      upstream.onerror = () => ws.send(JSON.stringify({ type: "error", error: "browser stream unavailable" }));
      ws.send(JSON.stringify({ type: "hello", agent: c.agent, takeover: c.takeover }));
    },
    async message(ws, raw) {
      const c = computer(ws.data.agent);
      let msg: { type?: string; on?: boolean; by?: string };
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (msg.type === "takeover") {
        c.takeover = { on: !!msg.on, by: msg.on ? msg.by ?? "human" : undefined };
        ws.data.who = msg.by;
        await say("computer", msg.by ?? "human", msg.on ? `${msg.by ?? "A human"} took over ${c.agent}'s computer` : `${msg.by ?? "The human"} handed the computer back to ${c.agent}`, {
          takeover: c.takeover.on,
          agent: c.agent,
        });
        return;
      }
      if (msg.type?.startsWith("input_") && !c.takeover.on) return; // watch-only until Take over
      if (ws.data.upstream?.readyState === WebSocket.OPEN) ws.data.upstream.send(String(raw));
    },
    close(ws) {
      ws.data.upstream?.close();
    },
  },
});

console.log(`computer server on http://localhost:${server.port} (stream: ws://localhost:${server.port}/computer/wick/stream)`);
