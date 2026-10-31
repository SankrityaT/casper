"use client";

import type { AgentKind } from "@/components/Agent";
import type { BrandName } from "@/components/ui/Brand";

export type Id = "casper" | "jack" | "batty" | "wick" | "stretch" | "fatso" | "stinkie" | "sankritya" | "kinjal" | "s1" | "s2" | "s3";
/* empty seats for agents you summon; filled in at runtime */
export const SLOTS: Id[] = ["s1", "s2", "s3"];
export type Human = "sankritya" | "kinjal";
export type TS = "open" | "claimed" | "waits" | "review" | "shipped" | "recording" | "posted";
/* what an agent asks a person to approve, with the evidence to decide on */
export type Ask = {
  for: Human; title: string; kind?: "push" | "post" | "spend";
  files?: [string, string][]; checks?: string; post?: string[];
};
export type Ev = {
  who: Id;
  text: string;
  to?: Id;
  task?: [string, TS, Id?];
  ask?: Ask;
  yes?: boolean;
  act?: string;
  ms?: number;
};

export const P: Record<Id, { name: string; sub: string; kind?: AgentKind; color?: string }> = {
  casper: { name: "Casper", sub: "host", kind: "casper" },
  jack: { name: "Jack", sub: "Sankritya’s Claude Code", kind: "pumpkin" },
  batty: { name: "Batty", sub: "Kinjal’s Codex", kind: "bat" },
  wick: { name: "Wick", sub: "Growth · launch agent", kind: "candle" },
  stretch: { name: "Stretch", sub: "dispatcher", kind: "stretch" },
  fatso: { name: "Fatso", sub: "the library", kind: "fatso" },
  stinkie: { name: "Stinkie", sub: "watchdog", kind: "stinkie" },
  sankritya: { name: "Sankritya", sub: "Owner", color: "#e2702f" },
  kinjal: { name: "Kinjal", sub: "Editor", color: "#6f5fa8" },
  s1: { name: "", sub: "", kind: "moon" }, s2: { name: "", sub: "", kind: "cat" }, s3: { name: "", sub: "", kind: "moon" },
};
export const AGENTS: Id[] = ["jack", "batty", "wick", "casper"];
export const SHORT: Partial<Record<Id, string>> = { jack: "Sankritya’s", batty: "Kinjal’s", wick: "Growth", casper: "host", stretch: "dispatch", fatso: "library", stinkie: "watchdog" };
export const CREW: Id[] = ["stretch", "fatso", "stinkie"];

export const TASKS: { id: string; title: string }[] = [
  { id: "tApi", title: "Autopay API" },
  { id: "tUi", title: "Autopay toggle UI" },
  { id: "tPost", title: "Launch clip + post" },
  { id: "tLog", title: "Changelog" },
];

export const SCRIPT: Ev[] = [
  { who: "casper", text: "Tuesday’s call became 4 tasks. Anyone’s agent can claim them.", act: "Turned the call into 4 tasks" },
  { who: "jack", text: "Taking the API.", task: ["tApi", "claimed", "jack"], act: "Claimed Autopay API" },
  { who: "batty", text: "I’ll take the API too.", to: "jack" },
  { who: "stretch", text: "Jack claimed it first. Batty, the toggle UI is yours.", to: "batty", task: ["tUi", "claimed", "batty"], act: "Gave the UI to Batty" },
  { who: "kinjal", text: "@Jack why a column, not a new table?", to: "jack" },
  { who: "jack", text: "One read per bill, so a column skips a join on the hot path.", to: "kinjal", act: "Answered Kinjal" },
  { who: "fatso", text: "Filed in the library: autopay is opt-in.", act: "Filed a decision" },
  { who: "batty", text: "UI’s done. It calls PATCH /autopay, that ok?", to: "jack", task: ["tUi", "shipped", "batty"], act: "Handed the UI to Jack" },
  { who: "jack", text: "Matches. Pulled your branch in, 6 tests pass.", to: "batty", act: "Merged Batty’s branch" },
  {
    who: "jack", text: "Ready to ship both. Ringing Sankritya.", task: ["tApi", "review", "jack"], act: "Asked for review", ms: 4200,
    ask: { for: "sankritya", kind: "push", title: "Review and push 3 files", files: [["api/autopay.ts", "+24 −9"], ["AutopayToggle.tsx", "+31"], ["api/autopay.test.ts", "+38"]], checks: "6 tests pass · lint clean · preview ready" },
  },
  { who: "sankritya", text: "approved, ship it", yes: true, task: ["tApi", "shipped", "jack"], act: "Pushed to main" },
  { who: "wick", text: "Both shipped. Recording the toggle on my computer.", task: ["tPost", "recording", "wick"], act: "Recording a clip", ms: 2800 },
  { who: "wick", text: "Clip and draft are ready.", ask: { for: "kinjal", kind: "post", title: "Post the launch thread on X?", post: ["Autopay is here. Turn it on once and every bill pays itself.", "It’s opt-in, always. Find it under Billing → Pay automatically.", "Built in a day by @sankritya, @kinjal and their agents."] }, act: "Asked Kinjal to post", ms: 4200 },
  { who: "kinjal", text: "go", yes: true, task: ["tPost", "posted", "wick"], act: "Posted the launch" },
  { who: "stinkie", text: "All quiet. Changelog is the only open task.", to: "casper", ms: 2800 },
];

/* reactions agents and people leave on messages, by message index */
export const SEED: Record<number, [string, number][]> = {
  0: [["eye", 2]], 1: [["pumpkin", 1]], 3: [["skull", 2]], 4: [["eye", 1]], 6: [["potion", 2]], 8: [["bat", 1]], 10: [["candy", 3], ["ghost", 1]], 13: [["bat", 4]],
};
export const QUICK = ["pumpkin", "ghost", "skull", "cauldron"];
export const LIBRARY = [
  { title: "Autopay is opt-in, never on by default", sub: "Decision · Kinjal on Tuesday’s call" },
  { title: "One autopay setting per account, stored as a column", sub: "Decision · Jack, approved by Sankritya" },
  { title: "Refund limit is $500 without a second yes", sub: "Decision · #refunds-v2 · Oct 22" },
];
/* every source the Library learned from: where it lives, a link back, and how to preview it */
export type Source = { title: string; sub: string; brand?: BrandName; where: string; url: string; att: Att };
export const FILES: Source[] = [
  { title: "api/autopay.ts", sub: "Jack · pushed to main", brand: "github", where: "acme/casper · PR #419", url: "https://github.com/acme/casper/pull/419/files", att: { t: "file", name: "api/billing/charge.ts", meta: "acme/casper · main" } },
  { title: "AutopayToggle.tsx", sub: "Batty · merged into Jack’s branch", brand: "github", where: "acme/casper · PR #418", url: "https://github.com/acme/casper/pull/418/files", att: { t: "app", app: "github", title: "#418 Autopay toggle on billing page", meta: "batty/autopay-toggle → main · +31", state: "Merged" } },
  { title: "Tuesday call transcript", sub: "31 min · Kinjal and Sankritya", brand: "zoom", where: "Zoom · Tue 1:30 PM · 12:04 “autopay is opt-in”", url: "https://zoom.us/rec/share/tuesday-sync", att: { t: "md", file: "tuesday-call.md", lines: ["## Autopay", "- Toggle on the billing page", "- **Opt-in**, never on by default (Kinjal, 12:04)", "- Announce Thursday, clip + thread"] } },
  { title: "Billing spec v3", sub: "Kinjal · edited Tuesday", brand: "notion", where: "Notion · Specs", url: "https://notion.so/acme/billing-spec-v3", att: { t: "pdf", name: "Billing spec v3.pdf", pages: 12, title: "Autopay and receipts", quote: "Customers must turn autopay on themselves. It is never enabled by default." } },
  { title: "ENG-212 Changelog for autopay", sub: "Unassigned · Todo", brand: "linear", where: "Linear · Engineering", url: "https://linear.app/acme/issue/ENG-212", att: { t: "app", app: "linear", title: "ENG-212 Changelog for autopay", meta: "Unassigned", state: "Todo" } },
  { title: "Launch thread", sub: "Wick · posted on X", brand: "x", where: "x.com/casper_demo", url: "https://x.com/casper_demo", att: { t: "app", app: "x", title: "Launch thread", meta: "3 posts · 1 clip", state: "Posted" } },
];


export type World = Record<string, { x: number; y: number }>;
export const START: World = {
  call: { x: 40, y: 50 }, mem: { x: 40, y: 250 },
  tApi: { x: 300, y: 50 }, tUi: { x: 300, y: 210 }, tPost: { x: 300, y: 370 }, tLog: { x: 300, y: 530 },
  pcJ: { x: 560, y: 40 }, jack: { x: 618, y: 170 }, batty: { x: 630, y: 380 }, wick: { x: 560, y: 520 }, pcW: { x: 720, y: 560 },
  casper: { x: 860, y: 40 }, stretch: { x: 850, y: 290 }, fatso: { x: 1010, y: 120 }, stinkie: { x: 1000, y: 400 }, ask: { x: 40, y: 410 },
  s1: { x: 700, y: 700 }, s2: { x: 880, y: 640 }, s3: { x: 520, y: 760 },
};
export const CURSOR_AT: Record<Human, { x: number; y: number }> = { sankritya: { x: 120, y: 600 }, kinjal: { x: 1000, y: 600 } };

export type Live = { tasks: Record<string, { s: TS; by?: Id }>; ask: Ev["ask"] | null; log: { who: Id; text: string; n: number }[] };
export function liveAt(step: number): Live {
  const L: Live = { tasks: { tPost: { s: "waits", by: "wick" } }, ask: null, log: [] };
  for (let i = 0; i <= step && i < SCRIPT.length; i++) {
    const e = SCRIPT[i];
    if (e.task) L.tasks[e.task[0]] = { s: e.task[1], by: e.task[2] ?? L.tasks[e.task[0]]?.by };
    if (e.ask) L.ask = e.ask;
    if (e.yes) L.ask = null;
    if (e.act) L.log.push({ who: e.who, text: e.act, n: i });
  }
  return L;
}
export const clock = (i: number) => `2:${String(1 + i).padStart(2, "0")}`;

export const TASK_LABEL: Record<TS, [string, string]> = {
  open: ["Open", "var(--ink-3)"], claimed: ["Claimed", "var(--green)"], waits: ["Waits for both", "var(--ink-3)"],
  review: ["Needs Sankritya", "var(--pumpkin)"], shipped: ["Shipped", "var(--green)"], recording: ["Recording", "#ef6b6b"], posted: ["Posted", "var(--green)"],
};

export const Ic = ({ d, s = 18 }: { d: string; s?: number }) => (
  <svg className="ic" viewBox="0 0 24 24" style={{ width: s, height: s }}><path d={d} /></svg>
);

/* ---------- threads: these script messages are replies under another message ---------- */
export const THREAD_OF: Record<number, number> = { 5: 4, 6: 4 };

/* ---------- the other rooms in the wing ---------- */
export type Msg = { who: Id; text: string; at: string };
export const ROOMS: Record<string, { topic: string; msgs: Msg[]; cards: { k: string; t: string; by?: Id }[] }> = {
  "autopay-launch": { topic: "Ship autopay and announce it Thursday", msgs: [], cards: [] },
  "refunds-v2": {
    topic: "Faster refunds with a second yes over $500",
    msgs: [
      { who: "batty", text: "Migration for refund_limits is ready. Wants to run on staging.", at: "Mon 4:12 PM" },
      { who: "stinkie", text: "Heads up: Batty and Jack disagreed on the limit ($500 vs $1,000). Kinjal picked $500.", at: "Mon 4:20 PM" },
      { who: "fatso", text: "Filed: refund limit is $500 without a second yes.", at: "Mon 4:21 PM" },
      { who: "kinjal", text: "ship the migration tomorrow morning", at: "Mon 6:02 PM" },
    ],
    cards: [{ k: "Needs Kinjal", t: "Run migration on staging", by: "batty" }, { k: "Decision", t: "$500 limit without a second yes", by: "fatso" }],
  },
  incidents: {
    topic: "Anything on fire",
    msgs: [
      { who: "stinkie", text: "Billing webhook errors went from 0 to 14 in 5 minutes.", at: "Sun 2:40 AM" },
      { who: "jack", text: "Stripe rotated the signing secret. Updated it, errors back to 0.", at: "Sun 2:46 AM" },
      { who: "casper", text: "Summary: 6 min of failed webhooks, no charges lost. Nobody was woken up.", at: "Sun 2:47 AM" },
    ],
    cards: [{ k: "Resolved", t: "Billing webhook errors", by: "jack" }],
  },
};

/* ---------- how agents answer when you @ them in the demo ---------- */
export const REPLY: Partial<Record<Id, (q: string) => string>> = {
  jack: () => "On it. I’ll reply in this thread when there’s a diff to look at.",
  batty: () => "Got it. I’ll check with Jack first so we don’t touch the same files.",
  wick: () => "Noted. I only post after Kinjal says yes.",
  casper: () => "Here’s where things stand: API and UI shipped, launch posted, changelog still open.",
  stretch: () => "Nobody owns that yet. Jack, it’s yours if you want it.",
  fatso: (q) => (/autopay|column|opt/i.test(q) ? "Autopay is opt-in and stored as one column per account. Source: Tuesday’s call, Jack’s answer." : "Nothing in the Library about that yet. I’ll file it once someone decides."),
  stinkie: () => "All quiet. No stuck agents, no loops, nobody waiting on the bell.",
};

/* ---------- the bell's history ---------- */
export const BELL_PAST = [
  { who: "batty" as Id, title: "Run migration on staging", room: "refunds-v2", for: "Kinjal", at: "Mon 4:12 PM" },
  { who: "jack" as Id, title: "Merge small fix: typo in receipt email", room: "autopay-launch", for: "Sankritya", at: "Mon 11:03 AM", done: "Approved" },
  { who: "wick" as Id, title: "Post the incident summary in #status", room: "incidents", for: "Kinjal", at: "Sun 2:48 AM", done: "Not now" },
];

/* ---------- usage this month ---------- */
export const USAGE: { id: Id; what: string; cost: number | null }[] = [
  { id: "fatso", what: "Reading 212 docs and transcripts", cost: 71 },
  { id: "jack", what: "Computer 31 h · on Sankritya’s Claude plan", cost: 48 },
  { id: "wick", what: "Computer 10 h · model calls", cost: 39 },
  { id: "stinkie", what: "Watching 3 rooms", cost: 14 },
  { id: "stretch", what: "Routing 318 messages", cost: 12 },
  { id: "batty", what: "On Kinjal’s own Codex plan", cost: null },
];

/* ---------- attachments and sources on messages ---------- */
export type App = "github" | "linear" | "vercel" | "notion" | "slack" | "figma" | "drive" | "x";
export type Att =
  | { t: "agent"; id: Id; note?: string }
  | { t: "file"; name: string; meta?: string }
  | { t: "link"; title: string; host: string }
  | { t: "code"; file: string; start: number; lines: string[]; hl?: number[] }
  | { t: "md"; file: string; lines: string[] }
  | { t: "pdf"; name: string; pages: number; title: string; quote?: string }
  | { t: "app"; app: App; title: string; meta: string; state?: string };

export const APPS: Record<App, { name: string; color: string; letter: string }> = {
  github: { name: "GitHub", color: "#24292f", letter: "GH" },
  linear: { name: "Linear", color: "#5e6ad2", letter: "L" },
  vercel: { name: "Vercel", color: "#000000", letter: "▲" },
  notion: { name: "Notion", color: "#2f2f2f", letter: "N" },
  slack: { name: "Slack", color: "#4a154b", letter: "#" },
  figma: { name: "Figma", color: "#a259ff", letter: "F" },
  drive: { name: "Drive", color: "#1a73e8", letter: "D" },
  x: { name: "X", color: "#000000", letter: "𝕏" },
};

// by script message index
export const ATT: Record<number, Att[]> = {
  0: [
    { t: "md", file: "tuesday-call.md", lines: ["## Autopay", "- Toggle on the billing page", "- **Opt-in**, never on by default (Kinjal)", "- Announce Thursday, clip + thread"] },
    { t: "link", title: "Tuesday sync · 31 min recording", host: "zoom.us" },
  ],
  5: [
    { t: "code", file: "api/billing/charge.ts", start: 41, hl: [43], lines: ["export async function charge(account: Account) {", "  const plan = await plans.get(account.planId);", "  if (account.autopay) {", "    return stripe.charge(account, plan.price);", "  }"] },
    { t: "agent", id: "fatso", note: "autopay is opt-in" },
    { t: "file", name: "api/billing/charge.ts", meta: "line 43" },
  ],
  6: [{ t: "pdf", name: "Billing spec v3.pdf", pages: 12, title: "Autopay and receipts", quote: "Customers must turn autopay on themselves. It is never enabled by default." }],
  7: [{ t: "app", app: "github", title: "#418 Autopay toggle on billing page", meta: "batty/autopay-toggle → main · +31", state: "Open" }],
  9: [
    { t: "app", app: "vercel", title: "Preview: autopay-launch", meta: "casper-git-autopay.vercel.app", state: "Ready" },
    { t: "app", app: "github", title: "#419 Autopay API + toggle", meta: "jack/autopay → main · +62 −9", state: "Needs review" },
  ],
  11: [{ t: "file", name: "autopay-toggle.mp4", meta: "10 s · recorded on Wick’s computer" }],
  12: [{ t: "app", app: "x", title: "Launch thread draft", meta: "3 posts · 1 clip", state: "Draft" }],
  14: [{ t: "app", app: "linear", title: "ENG-212 Changelog for autopay", meta: "Unassigned", state: "Todo" }],
};

// sources agents attach when you @ them in the demo
export const REPLY_ATT: Partial<Record<Id, Att[]>> = {
  fatso: [{ t: "agent", id: "fatso", note: "Library" }, { t: "pdf", name: "Billing spec v3.pdf", pages: 12, title: "Autopay and receipts", quote: "It is never enabled by default." }],
  jack: [{ t: "app", app: "github", title: "jack/autopay", meta: "2 commits ahead of main", state: "Working" }],
  casper: [{ t: "agent", id: "jack" }, { t: "agent", id: "batty" }, { t: "agent", id: "wick" }],
  stinkie: [{ t: "app", app: "linear", title: "ENG-212 Changelog for autopay", meta: "Unassigned", state: "Todo" }],
};

// what you can attach from the + menu
export const ATTACHABLE: Att[] = [
  { t: "app", app: "github", title: "#419 Autopay API + toggle", meta: "acme/casper", state: "Open" },
  { t: "app", app: "linear", title: "ENG-212 Changelog for autopay", meta: "Engineering", state: "Todo" },
  { t: "app", app: "notion", title: "Billing spec v3", meta: "Specs", state: "Page" },
  { t: "app", app: "figma", title: "Billing page · autopay", meta: "Design", state: "File" },
  { t: "pdf", name: "Billing spec v3.pdf", pages: 12, title: "Autopay and receipts" },
  { t: "file", name: "refund-limits.csv", meta: "Drive · 14 KB" },
];

/* ---------- your onboarding choices, applied to the room ---------- */
const ORIG = { name: P.jack.name, kind: P.jack.kind, script: SCRIPT.map((e) => e.text), rooms: Object.fromEntries(Object.entries(ROOMS).map(([k, r]) => [k, r.msgs.map((m) => m.text)])) };
function inVoice(t: string, voice: string) {
  if (voice === "pro") return t;
  const low = t.replace(/\.$/, "").replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/\bI\b/g, "i");
  return voice === "mirror" ? `yeah ${low}` : low;
}
export function applySession(s: { agent: { name: string; kind: AgentKind; runsOn: string }; voice: string; people: { name: string }[] }) {
  const name = s.agent.name.trim() || "Jack";
  P.jack.name = name;
  P.jack.kind = s.agent.kind;
  P.jack.sub = `Sankritya’s ${s.agent.runsOn}`;
  const swap = (t: string) => t.replace(/\bJack\b/g, name).replace(/@Jack\b/g, `@${name}`);
  SCRIPT.forEach((e, i) => {
    const t = swap(ORIG.script[i]);
    e.text = e.who === "jack" ? inVoice(t, s.voice) : t;
  });
  Object.entries(ROOMS).forEach(([k, r]) => r.msgs.forEach((m, i) => (m.text = swap(ORIG.rooms[k][i]))));
  void ORIG.name;
  void ORIG.kind;
}
