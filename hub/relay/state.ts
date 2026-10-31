//created by kinjal
// Shared config + on-disk state for the Casper relay mirror.
// State lives in hub/relay/.state/ (gitignored): agent tokens, observer token, seq cursor.
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dir;
export const STATE_DIR = join(HERE, ".state");
export const OUT_FILE = join(HERE, "out.jsonl");
mkdirSync(STATE_DIR, { recursive: true });

export const WORKSPACE_KEY = process.env.RELAY_WORKSPACE_KEY ?? "";
export const ROOMS = (process.env.CASPER_ROOMS ?? "autopay")
  .split(",")
  .map((r) => r.trim())
  .filter(Boolean);
export const DM_ROOM = process.env.CASPER_DM_ROOM ?? ROOMS[0] ?? "autopay";
export const HUB_URL = (process.env.HUB_URL ?? "").replace(/\/$/, "");

/** Product agents and which harness drives them. */
// Cast (matches web/components/ws/data.tsx): jack = Sankritya's coder (Claude), batty = Kinjal's
// coder (OpenAI), wick = growth/launch agent on the cloud computer (step 3), casper = room host
// (relays human words, e.g. a steer typed in the Casper UI).
export const PRODUCT_AGENTS = [
  { name: "jack", harness: "claude-code" },
  { name: "batty", harness: "codex" },
  { name: "wick", harness: "computer" },
  { name: "casper", harness: "host" },
] as const;

export const roomChannel = (room: string) => `room-${room}`;
export const channelRoom = (channel?: string) =>
  channel?.startsWith("room-") ? channel.slice("room-".length) : undefined;

export function requireKey(): string {
  if (!WORKSPACE_KEY) {
    console.error("RELAY_WORKSPACE_KEY is not set (product workspace key, see .env.example)");
    process.exit(1);
  }
  return WORKSPACE_KEY;
}

type Json = Record<string, unknown>;
const file = (name: string) => join(STATE_DIR, name);

export function readJson<T = Json>(name: string): T | undefined {
  const p = file(name);
  if (!existsSync(p)) return undefined;
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

export function writeJson(name: string, value: unknown) {
  writeFileSync(file(name), JSON.stringify(value, null, 2));
}

export type AgentTokens = Record<string, { id: string; token: string }>;
export const loadAgents = () => readJson<AgentTokens>("agents.json") ?? {};
export const loadObserver = () => readJson<{ token: string; id: string }>("observer.json");
export const loadCursor = () => readJson<{ seq: number }>("cursor.json")?.seq ?? 0;
export const saveCursor = (seq: number) => writeJson("cursor.json", { seq });

/** The event shape shared with the hub (POST /relay/mirror). */
export interface CasperEvent {
  seq?: number;
  room: string;
  kind: "msg" | "claim" | "bell" | "hush" | "relay" | "computer" | "approve";
  from: string;
  text: string;
  ts: string;
  meta: Json;
}

export function appendOut(event: CasperEvent) {
  appendFileSync(OUT_FILE, JSON.stringify(event) + "\n");
}

/** Append to out.jsonl, and when HUB_URL is set POST to the hub: /room/:room/post {from,text,kind,meta,...}. */
export async function publish(event: CasperEvent) {
  appendOut(event);
  if (!HUB_URL) return;
  try {
    const res = await fetch(`${HUB_URL}/room/${encodeURIComponent(event.room)}/post`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) console.warn(`hub post ${res.status}`);
  } catch (err) {
    console.warn("hub post failed:", (err as Error).message);
  }
}

/** DM conversation participants, recorded by whoever sends (the event log drops DM recipients). */
type Convs = Record<string, string[]>;
export function recordConv(conversationId: string | undefined, a: string, b: string) {
  if (!conversationId) return;
  const convs = readJson<Convs>("convs.json") ?? {};
  convs[conversationId] = [...new Set([...(convs[conversationId] ?? []), a, b])];
  writeJson("convs.json", convs);
}
export function convPeer(conversationId: string | undefined, from: string): string | undefined {
  if (!conversationId) return undefined;
  return (readJson<Convs>("convs.json") ?? {})[conversationId]?.find((n) => n !== from);
}
