"use client";

import { useState } from "react";

type Props = {
  billId: string;
  /** Current server value. Autopay is off by default. */
  initialEnabled?: boolean;
  /** Base URL of the bills API; defaults to same origin. */
  apiBase?: string;
  onChange?: (enabled: boolean) => void;
};

export default function AutopayToggle({ billId, initialEnabled = false, apiBase = "", onChange }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/bills/${encodeURIComponent(billId)}/autopay`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error(res.status === 404 ? "Bill not found" : `Couldn't save (${res.status})`);
      onChange?.(next);
    } catch (e) {
      setEnabled(!next); // roll back
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Autopay"
        disabled={saving}
        onClick={toggle}
        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${enabled ? "bg-green-600" : "bg-neutral-400"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : ""}`}
        />
      </button>
      <span>Autopay {enabled ? "on" : "off"}</span>
      {error && <span role="alert" className="text-red-600 text-sm">{error}</span>}
    </div>
  );
}
