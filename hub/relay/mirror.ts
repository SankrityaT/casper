//created by kinjal
// Relay mirror: streams every product-workspace event through the observer plane,
// converts it to the Casper event shape (kind:"relay") and appends it to out.jsonl.
// If HUB_URL is set it also POSTs each event to ${HUB_URL}/room/:room/post.
// The seq cursor is persisted so a restart resumes with sinceSeq (no gaps, no dupes).
//
// Two sources, one cursor:
//  - live: SDK observer stream (relay.addListener) over /v1/ws
//  - poll: REST GET /v1/workspace/events?since=… (the same durable log the SDK backfills from)
// MIRROR_MODE=auto (default) starts live and drops to poll if the socket fails.
import { AgentRelay } from "@agent-relay/sdk";
import {
  DM_ROOM,
  convPeer,
  channelRoom,
  loadCursor,
  loadObserver,
  publish,
  readJson,
  saveCursor,
  writeJson,
  type CasperEvent,
} from "./state";

const observer = loadObserver();
if (!observer) {
  console.error("no observer token, run `bun run setup` first");
  process.exit(1);
}

const BASE_URL = (process.env.RELAY_BASE_URL ?? "https://cast.agentrelay.com").replace(/\/$/, "");
const MODE = (process.env.MIRROR_MODE ?? "auto") as "auto" | "live" | "poll";
const POLL_MS = Number(process.env.MIRROR_POLL_MS ?? 1500);
const HUMANS = new Set((process.env.CASPER_HUMANS ?? "kinjal,sankritya").split(","));

let seq = loadCursor();
const seen = new Set<string>();
const counters = readJson<{ total: number; toHuman: number }>("counters.json") ?? { total: 0, toHuman: 0 };

function advance(next: number) {
  if (next > seq) {
    seq = next;
    saveCursor(next);
  }
}

// Branch on event TYPE, not message.kind: DM readback kind is unreliable.
const MESSAGE_TYPES = ["message.created", "thread.reply", "dm.received", "group_dm.received"] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];
const isMessageType = (t: string): t is MessageType => (MESSAGE_TYPES as readonly string[]).includes(t);

interface Normalized {
  type: MessageType;
  seq?: number;
  messageId: string;
  from: string;
  text: string;
  ts?: string;
  channel?: string;
  conversationId?: string;
  to?: string;
  threadId?: string;
  mode?: string;
}

async function emit(n: Normalized) {
  if (seen.has(n.messageId)) return;
  seen.add(n.messageId);
  const isDm = n.type === "dm.received" || n.type === "group_dm.received";
  // DM events carry no recipient; senders record conversation participants (state.ts recordConv).
  // The sender writes the record right after its send returns, which can trail the event; wait briefly.
  for (let i = 0; isDm && !n.to && i < 16; i++) {
    n.to = convPeer(n.conversationId, n.from);
    if (!n.to) await Bun.sleep(500);
  }
  // casper relays humans as "Name: text"; credit the human on the room side.
  if (isDm && n.from === "casper") {
    const m = /^([A-Za-z][\w-]*):\s+([\s\S]*)$/.exec(n.text);
    if (m) [n.from, n.text] = [m[1].toLowerCase(), m[2]];
  }
  counters.total++;
  // "Reached a human": room posts (visible in the Casper room) and DMs to/from a human.
  // Agent<->agent DMs stay backstage. DM events carry no recipient, so metadata.to is best-effort.
  if (!isDm || HUMANS.has(n.from) || (n.to && HUMANS.has(n.to))) counters.toHuman++;
  writeJson("counters.json", counters); // survives restarts, like the cursor

  const event: CasperEvent = {
    seq: n.seq ?? seq,
    room: isDm ? DM_ROOM : channelRoom(n.channel) ?? n.channel ?? DM_ROOM,
    // Room posts show in the room (msg); DMs are the backstage channel (relay).
    kind: isDm ? "relay" : "msg",
    from: n.from,
    text: n.text,
    ts: n.ts ?? new Date().toISOString(),
    meta: {
      type: n.type,
      messageId: n.messageId,
      channel: isDm ? undefined : n.channel,
      conversationId: n.conversationId,
      to: n.to,
      threadId: n.threadId,
      mode: n.mode,
      counters: { ...counters },
    },
  };
  console.log(`[${event.room}] #${event.seq} ${event.from} -> ${n.to ?? n.channel ?? "dm"}: ${event.text.slice(0, 100)} (${counters.total} msgs / ${counters.toHuman} reached a human)`);
  await publish(event);
}

// ---------- poll source ----------
let polling = false;
async function startPolling() {
  if (polling) return;
  polling = true;
  console.log(`poll mode from seq ${seq} every ${POLL_MS}ms`);
  while (true) {
    try {
      const res = await fetch(`${BASE_URL}/v1/workspace/events?since=${seq}&limit=100`, {
        headers: { Authorization: `Bearer ${observer!.token}` },
      });
      if (res.ok) {
        const body = (await res.json()) as { data: { events: any[]; latest_seq: number } };
        for (const e of body.data.events) {
          if (isMessageType(e.type) && e.payload?.message) {
            const m = e.payload.message;
            const ch = e.payload.channel;
            await emit({
              type: e.type,
              seq: e.seq,
              messageId: m.id,
              from: m.agent_name ?? "unknown",
              text: m.text ?? "",
              ts: e.payload.created_at ?? e.created_at,
              channel: typeof ch === "string" ? ch : ch?.name,
              conversationId: e.payload.conversation_id,
              to: m.metadata?.to ?? e.payload.to?.agent_name ?? e.payload.recipient?.agent_name,
              threadId: e.payload.thread_id ?? e.payload.parent_id,
              mode: m.injection_mode,
            });
          }
          advance(e.seq);
        }
        if (body.data.events.length === 100) continue; // more pages waiting
      } else {
        console.warn(`poll HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("poll failed:", (err as Error).message);
    }
    await Bun.sleep(POLL_MS);
  }
}

// ---------- live source ----------
function startLive() {
  console.log(`live mode from seq ${seq}`);
  const relay = new AgentRelay({
    observerToken: observer!.token,
    sinceSeq: seq,
    onCursor: advance,
    onError: (err, ctx) => {
      console.error("relay error", ctx?.selector, (err as Error)?.message ?? err);
      if (ctx?.selector === "events.connect") {
        if (MODE === "auto") startPolling();
        else setTimeout(() => process.exit(1), 100); // run-mirror.sh restarts us
      }
    },
  });

  for (const type of MESSAGE_TYPES) {
    relay.addListener(type, async ({ message, envelope }) => {
      if (polling) return; // poll source owns emission once we've fallen back
      const target = envelope.to ?? message.target;
      await emit({
        type,
        messageId: message.messageId ?? message.id,
        from: envelope.from?.name ?? message.from?.name ?? "unknown",
        text: message.text ?? "",
        ts: message.createdAt,
        channel: envelope.channel?.name ?? message.channel?.name,
        conversationId: message.conversationId,
        to: target?.kind === "agent" ? String(target.agentName) : undefined,
        threadId: message.threadId ?? envelope.parent,
        mode: message.mode as string | undefined,
      });
    });
  }
}

if (MODE === "poll") startPolling();
else startLive();

setInterval(() => {}, 60_000); // keep alive between events

process.on("SIGINT", () => {
  saveCursor(seq);
  console.log(`\nstopped at seq ${seq} (${counters.total} relay msgs, ${counters.toHuman} to a human)`);
  process.exit(0);
});
