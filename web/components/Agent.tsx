"use client";

import { useEffect, useRef } from "react";
import Cast from "@/lib/cast";

export type AgentKind = "casper" | "pumpkin" | "bat" | "candle" | "moon" | "cat" | "stretch" | "fatso" | "stinkie";
export type Mood = "calm" | "alert" | "worried" | "sleep" | "happy";

type Props = {
  kind: AgentKind;
  mood?: Mood;
  crop?: "full" | "head";
  still?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
};

/* The SVG uses per-instance gradient ids, so it is drawn on the client only. */
export default function Agent({ kind, mood = "calm", crop = "full", still, label, className, style }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = Cast.svg(kind, { mood, crop, still, title: label });
  }, [kind, mood, crop, still, label]);
  return <span ref={ref} style={style} className={`block ${className ?? ""}`} role="img" aria-label={label ?? kind} />;
}
