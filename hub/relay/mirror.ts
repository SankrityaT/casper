//created by kinjal
// Relay mirror: streams every product-workspace event through the observer plane,
// converts it to the Casper event shape (kind:"relay") and appends it to out.jsonl.
// If HUB_URL is set it also POSTs each event to ${HUB_URL}/relay/mirror.
// The seq cursor is persisted so a restart resumes with sinceSeq (no gaps, no dupes).
import { AgentRelay } from "@agent-relay/sdk";
import {
  DM_ROOM,
  HUB_URL,
  appendOut,
  channelRoom,
  loadCursor,
  loadObserver,
  saveCursor,
  type CasperEvent,
} from "./state";

const observer = loadObserver();
if (!observer) {
  console.error("no observer token, run `bun run setup` first");
  process.exit(1);
}

let seq = loadCursor();
console.log(`mirror starting from seq ${seq}`);

const relay = new AgentRelay({
  observerToken: observer.token,
  sinceSeq: seq,
  onCursor: (next) => {
    seq = next;
    saveCursor(next);
  },
  onError: (err, ctx) => {
    console.error("relay error", ctx, (err as Error)?.message ?? err);
    // Stream connect/backfill failures kill the observer source. Exit non-zero so
    // run-mirror.sh restarts us; the persisted cursor means nothing is lost or duplicated.
    if (ctx?.selector === "events.connect") {
      saveCursor(seq);
      setTimeout(() => process.exit(1), 100);
    }
  },
});

// Keep the process alive between events.
setInterval(() => {}, 60_000);

const counters = { total: 0, toHuman: 0 };
const HUMANS = new Set((process.env.CASPER_HUMANS ?? "kinjal,sankritya").split(","));

async function emit(event: CasperEvent) {
  appendOut(event);
  counters.total++;
  if (event.meta.to && HUMANS.has(String(event.meta.to))) counters.toHuman++;
  console.log(`[${event.room}] ${event.from} -> ${event.meta.to ?? event.meta.channel}: ${event.text.slice(0, 120)}`);
  if (!HUB_URL) return;
  try {
    const res = await fetch(`${HUB_URL}/relay/mirror`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) console.warn(`hub POST ${res.status}`);
  } catch (err) {
    console.warn("hub POST failed:", (err as Error).message);
  }
}

// Branch on event TYPE, not message.kind: DM readback kind is unreliable.
const MESSAGE_TYPES = ["message.created", "thread.reply", "dm.received", "group_dm.received"] as const;

for (const type of MESSAGE_TYPES) {
  relay.addListener(type, async ({ message, envelope }) => {
    const from = envelope.from?.name ?? message.from?.name ?? "unknown";
    const isDm = type === "dm.received" || type === "group_dm.received";
    const channel = envelope.channel?.name ?? message.channel?.name;
    const target = envelope.to ?? message.target;
    const to =
      target?.kind === "agent" ? target.agentName : target?.kind === "channel" ? `#${target.channelName}` : undefined;

    await emit({
      seq,
      room: isDm ? DM_ROOM : channelRoom(channel) ?? channel ?? DM_ROOM,
      kind: "relay",
      from,
      text: message.text ?? "",
      ts: message.createdAt ?? new Date().toISOString(),
      meta: {
        type,
        messageId: message.messageId ?? message.id,
        channel: isDm ? undefined : channel,
        conversationId: message.conversationId,
        to,
        threadId: message.threadId ?? envelope.parent,
        mode: message.mode,
        counters: { ...counters },
      },
    });
  });
}

process.on("SIGINT", () => {
  saveCursor(seq);
  console.log(`\nstopped at seq ${seq} (${counters.total} relay msgs, ${counters.toHuman} to a human)`);
  process.exit(0);
});
