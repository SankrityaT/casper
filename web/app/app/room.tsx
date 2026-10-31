"use client";

import Workspace from "@/components/Workspace";
import { applySession } from "@/components/ws/data";
import { loadSession, useHydrated } from "@/lib/session";

export default function Room() {
  const hydrated = useHydrated();
  if (!hydrated) return <main className="h-svh bg-night" />;
  // your onboarding choices become the room: your agent's name, look and voice (safe to repeat)
  applySession(loadSession());
  return <main className="h-svh overflow-x-auto overflow-y-hidden bg-night"><Workspace full /></main>;
}
