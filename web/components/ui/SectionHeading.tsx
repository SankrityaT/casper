/* The heading every landing section uses: small orange eyebrow, Zodiak title, optional muted half, short line under. */
export default function SectionHeading({ eyebrow, title, muted, sub, align = "center", className = "" }: {
  eyebrow?: string; title: React.ReactNode; muted?: React.ReactNode; sub?: React.ReactNode; align?: "center" | "left"; className?: string;
}) {
  const c = align === "center" ? "mx-auto text-center" : "text-left";
  return (
    <div className={`${c} max-w-[760px] ${className}`}>
      {eyebrow && <p className="text-[15px] font-medium text-pumpkin">{eyebrow}</p>}
      <h2 className="mt-3 font-display text-[clamp(34px,4.6vw,60px)] font-extrabold leading-[1.04] tracking-[-0.015em]">
        {title}{muted && <> <span className="text-ink-2">{muted}</span></>}
      </h2>
      {sub && <p className={`mt-4 max-w-[600px] text-[clamp(16px,1.3vw,18px)] leading-relaxed text-ink-2 ${align === "center" ? "mx-auto" : ""}`}>{sub}</p>}
    </div>
  );
}
