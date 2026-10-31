"use client";

import { useEffect, useRef, useState } from "react";
import { Ic } from "@/components/ws/data";

/* Our dropdown. Replaces the browser's <select>: same look as the app's menus, keyboard friendly,
   closes on outside click or Esc, and opens upward when there's no room below. */
export type Option<T extends string> = { value: T; label: string; desc?: string; icon?: React.ReactNode };

export default function Select<T extends string>({ value, options, onChange, label, size = "md", align = "right" }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void; label?: string; size?: "sm" | "md"; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const cur = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    addEventListener("pointerdown", down);
    return () => removeEventListener("pointerdown", down);
  }, [open]);

  const show = () => {
    const r = box.current?.getBoundingClientRect();
    const area = box.current?.closest(".sc, .ib, .chat")?.getBoundingClientRect();
    setUp(!!r && !!area && area.bottom - r.bottom < 60 + options.length * 52);
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (v: T) => { onChange(v); setOpen(false); };

  return (
    <div ref={box} className={`sel ${size} ${open ? "open" : ""}`}
      onKeyDown={(e) => {
        if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) { e.preventDefault(); show(); return; }
        if (!open) return;
        if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
        if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(options.length - 1, h + 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
        if (e.key === "Enter") { e.preventDefault(); pick(options[hi].value); }
      }}>
      <button type="button" className="sel-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => (open ? setOpen(false) : show())}>
        {cur.icon}<span>{cur.label}</span>
        <Ic d="M7 10l5 5 5-5" s={14} />
      </button>
      {open && (
        <div role="listbox" className={`sel-menu ${up ? "up" : ""} ${align}`}>
          {label && <div className="sel-h">{label}</div>}
          {options.map((o, i) => (
            <button type="button" role="option" aria-selected={o.value === value} key={o.value}
              className={`${i === hi ? "hi" : ""} ${o.value === value ? "cur" : ""}`}
              onMouseEnter={() => setHi(i)} onClick={() => pick(o.value)}>
              {o.icon}
              <span className="tx"><b>{o.label}</b>{o.desc && <small>{o.desc}</small>}</span>
              {o.value === value && <Ic d="M5 12l5 5 9-10" s={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
