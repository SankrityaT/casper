"use client";

import { useState } from "react";

/* Copies text, says "Copied" for a moment. Falls back to a hidden textarea when the clipboard API isn't there. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export default function CopyButton({ text, label = "Copy", done = "Copied", className = "", children }: {
  text: string; label?: string; done?: string; className?: string; children?: React.ReactNode;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className={className} onClick={async () => { await copyText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}>
      {children}
      <span aria-live="polite">{ok ? done : label}</span>
    </button>
  );
}
