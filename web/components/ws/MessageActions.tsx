"use client";

import { useEffect, useRef, useState } from "react";
import Agent from "@/components/Agent";
import { P, AGENTS, ROOMS, Ic } from "@/components/ws/data";
import type { Id } from "@/components/ws/data";
import { Emo, SPOOKY, SPOOKY_NAMES } from "@/components/ws/Spooky";

/* The hover bar on every message: quick spooky reactions, react, reply in thread, forward,
   ask an agent, and a "more" menu. Every action works; anything the room needs to know comes back out through props. */

export type Target = { kind: "room"; id: string } | { kind: "person"; id: Id };
export type MsgFlags = { saved?: boolean; unread?: boolean; pinned?: boolean; task?: boolean; flagged?: boolean; remind?: string; follow?: boolean };

const ICON = {
  react: "M12 3.5a8.5 8.5 0 1 0 8.5 8.5 M9 10h.01M15 10h.01M8.5 14.5c2 2 5 2 7 0 M19 2.5v5M16.5 5h5",
  reply: "M4 5h16v11H9l-5 4z",
  fwd: "M14 5l6 6-6 6 M20 11H9a5 5 0 0 0-5 5v2",
  ask: "M12 3l1.8 4.6L18.5 9l-4.7 1.6L12 15l-1.8-4.4L5.5 9l4.7-1.4z M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
  more: "M12 5h.01M12 12h.01M12 19h.01",
  unread: "M4 6h12v12H4z M18.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4",
  save: "M7 3h10v18l-5-4-5 4z",
  remind: "M12 6v6l3 2 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
  follow: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20a2 2 0 0 0 4 0",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  copy: "M8 8h11v12H8z M5 16V4h11",
  pin: "M9 4h6l-1 5 3 3H7l3-3z M12 12v8",
  task: "M5 5h14v14H5z M9 12l2 2 4-4",
  flag: "M5 21V4 M5 4h12l-2 4 2 4H5",
};

function Tip({ label, kbd, children }: { label: string; kbd?: string; children: React.ReactNode }) {
  return (
    <span className="tipw">
      {children}
      <span className="tip" role="tooltip">{label}{kbd && <kbd>{kbd}</kbd>}</span>
    </span>
  );
}

export default function MessageActions({ k, text, who, room, quick, onReact, onThread, onForward, onAsk, flags, setFlags, toast }: {
  k: string; text: string; who: Id; room?: string; quick: string[];
  onReact: (e: string) => void; onThread: () => void; onForward?: (t: Target) => void; onAsk?: (agent: Id) => void;
  flags: MsgFlags; setFlags: (f: MsgFlags) => void; toast: (t: string) => void;
}) {
  const [open, setOpen] = useState<null | "react" | "fwd" | "ask" | "more" | "remind">(null);
  const [down, setDown] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // close menus on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    addEventListener("pointerdown", down);
    addEventListener("keydown", key);
    return () => { removeEventListener("pointerdown", down); removeEventListener("keydown", key); };
  }, [open]);
  // open menus toward whichever side of the scroll area has more room
  const place = () => {
    const bar = box.current?.getBoundingClientRect();
    const area = box.current?.closest(".chat, .ib, .atts-scope")?.getBoundingClientRect();
    if (bar && area) setDown(bar.top - area.top < area.bottom - bar.bottom);
  };
  const toggle = (m: NonNullable<typeof open>) => { place(); setOpen(open === m ? null : m); };
  const done = (t: string) => { setOpen(null); toast(t); };
  const copy = (s: string, t: string) => { navigator.clipboard?.writeText(s).catch(() => {}); done(t); };
  const link = `https://casper.dev/acme/${room ?? "autopay-launch"}/m/${k}`;

  return (
    <div ref={box} className={`hb ${open ? "open" : ""} ${down ? "down" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
      {quick.map((em) => (
        <Tip key={em} label={SPOOKY[em as keyof typeof SPOOKY]?.label ?? em}><button onClick={() => onReact(em)}><Emo name={em} size={22} /></button></Tip>
      ))}
      <Tip label="Add reaction"><button onClick={() => toggle("react")}><Ic d={ICON.react} s={18} /></button></Tip>
      <Tip label="Reply in thread" kbd="T"><button onClick={onThread}><Ic d={ICON.reply} s={18} /></button></Tip>
      <Tip label="Forward message…" kbd="F"><button onClick={() => toggle("fwd")}><Ic d={ICON.fwd} s={18} /></button></Tip>
      <Tip label="Ask an agent about this" kbd="A"><button className="sp" onClick={() => toggle("ask")}><Ic d={ICON.ask} s={18} /></button></Tip>
      <Tip label="More actions"><button onClick={() => toggle("more")}><Ic d={ICON.more} s={18} /></button></Tip>

      {open === "react" && (
        <div className="menu emo-grid">
          <div className="eh">Spooky reactions</div>
          {SPOOKY_NAMES.map((n) => <button key={n} title={SPOOKY[n].label} onClick={() => { onReact(n); setOpen(null); }}><Emo name={n} size={32} /><small>{SPOOKY[n].label}</small></button>)}
        </div>
      )}

      {open === "fwd" && (
        <div className="menu list">
          <div className="eh">Forward to</div>
          {Object.keys(ROOMS).filter((r) => r !== room).map((r) => (
            <button key={r} onClick={() => { onForward?.({ kind: "room", id: r }); done(`Forwarded to #${r}`); }}><span className="lic">#</span>{r}<small>room</small></button>
          ))}
          {(["kinjal", "sankritya"] as Id[]).map((id) => (
            <button key={id} onClick={() => { onForward?.({ kind: "person", id }); done(`Sent to ${P[id].name}`); }}><span className="lic" style={{ background: P[id].color, color: "#fff" }}>{P[id].name[0]}</span>{P[id].name}<small>direct message</small></button>
          ))}
        </div>
      )}

      {open === "ask" && (
        <div className="menu list">
          <div className="eh">Ask an agent about this</div>
          {[...AGENTS, "fatso", "stretch", "stinkie"].filter((id) => id !== who).map((id) => (
            <button key={id} onClick={() => { onAsk?.(id as Id); done(`Asked ${P[id as Id].name}`); }}>
              <span className="lic face"><Agent kind={P[id as Id].kind!} crop="head" className="size-full" /></span>{P[id as Id].name}<small>{P[id as Id].sub}</small>
            </button>
          ))}
        </div>
      )}

      {open === "more" && (
        <div className="menu list more">
          <button onClick={() => { setFlags({ ...flags, unread: !flags.unread }); done(flags.unread ? "Marked read" : "Marked unread"); }}><Ic d={ICON.unread} s={16} />{flags.unread ? "Mark read" : "Mark unread"}<kbd>U</kbd></button>
          <button onClick={() => { setFlags({ ...flags, saved: !flags.saved }); done(flags.saved ? "Removed from saved" : "Saved for later"); }}><Ic d={ICON.save} s={16} />{flags.saved ? "Remove from saved" : "Add to saved"}<kbd>⇧⌘S</kbd></button>
          <button onClick={() => { place(); setOpen("remind"); }}><Ic d={ICON.remind} s={16} />Remind me<span className="chev">›</span></button>
          <button onClick={() => { setFlags({ ...flags, follow: !flags.follow }); done(flags.follow ? "Stopped following" : "You’ll get new replies"); }}><Ic d={ICON.follow} s={16} />{flags.follow ? "Stop notifying me" : "Get notified about new replies"}</button>
          <hr />
          <button onClick={() => copy(link, "Link copied")}><Ic d={ICON.link} s={16} />Copy link<kbd>L</kbd></button>
          <button onClick={() => copy(text, "Message copied")}><Ic d={ICON.copy} s={16} />Copy message<kbd>⌘C</kbd></button>
          <hr />
          <button onClick={() => { setFlags({ ...flags, pinned: !flags.pinned }); done(flags.pinned ? "Unpinned" : "Pinned to the canvas"); }}><Ic d={ICON.pin} s={16} />{flags.pinned ? "Unpin from canvas" : "Pin to the canvas"}</button>
          <button onClick={() => { setFlags({ ...flags, task: true }); done("Turned into a task · Stretch will route it"); }}><Ic d={ICON.task} s={16} />Turn into a task</button>
          <hr />
          <button className="danger" onClick={() => { setFlags({ ...flags, flagged: !flags.flagged }); done(flags.flagged ? "Unflagged" : "Flagged · Stinkie will look"); }}><Ic d={ICON.flag} s={16} />{flags.flagged ? "Remove flag" : "Flag this message…"}</button>
        </div>
      )}

      {open === "remind" && (
        <div className="menu list more">
          <div className="eh">Remind me about this</div>
          {["In 20 minutes", "In 1 hour", "Tomorrow morning", "Next week"].map((r) => (
            <button key={r} onClick={() => { setFlags({ ...flags, remind: r }); done(`Reminder set · ${r.toLowerCase()}`); }}>{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}
