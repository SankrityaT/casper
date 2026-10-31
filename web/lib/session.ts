"use client";

/* What onboarding decides, read by the app.
   Today it lives in localStorage. Tomorrow the hub owns it:
   - createRoom / invite        → POST /rooms, Room actor
   - agent (name, kind, runsOn) → POST /agents, Agent actor + Relay token
   - rules                      → Room actor can() rules, shown on the cord
   - voice                      → agent profile, used by the hub when it writes replies */

import { useSyncExternalStore } from "react";
import type { AgentKind } from "@/components/Agent";

export type Voice = "chill" | "pro" | "mirror";
export type Session = {
  space: string;
  room: string;
  people: { name: string; color: string; role: string }[];
  agent: { name: string; kind: AgentKind; runsOn: "Claude Code" | "Codex" | "Its own computer" };
  rules: { read: boolean; act: boolean; asksFirst: string[] };
  voice: Voice;
  joined: boolean;
};

export const DEFAULT_SESSION: Session = {
  space: "Engineering",
  room: "autopay-launch",
  people: [
    { name: "Sankritya", color: "#e2702f", role: "you" },
    { name: "Kinjal", color: "#6f5fa8", role: "Engineering" },
  ],
  agent: { name: "Jack", kind: "pumpkin", runsOn: "Claude Code" },
  rules: { read: true, act: true, asksFirst: ["Push to main", "Spend money", "Post publicly"] },
  voice: "chill",
  joined: false,
};

const KEY = "casper.session";

export function loadSession(): Session {
  if (typeof window === "undefined") return DEFAULT_SESSION;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SESSION, ...JSON.parse(raw) } : DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/* true once we're in the browser, so pages can read localStorage without a hydration mismatch */
export const useHydrated = () => useSyncExternalStore(() => () => {}, () => true, () => false);
