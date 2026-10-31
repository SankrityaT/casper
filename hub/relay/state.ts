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
export const PRODUCT_AGENTS = [
  { name: "jack", harness: "claude-code" },
  { name: "wick", harness: "codex" },
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
