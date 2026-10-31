import CopyButton from "@/components/ui/CopyButton";

/* Building blocks for content pages. */
export function DocSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line pb-4 pt-10 first:border-t-0 first:pt-0">
      <h2 className="font-display text-[clamp(24px,2.6vw,32px)] font-extrabold tracking-[-0.01em]">{id ? <a href={`#${id}`} className="hover:text-pumpkin">{title}</a> : title}</h2>
      <div className="mt-4 space-y-4 text-[16.5px] leading-relaxed text-ink-2 [&_b]:text-ink [&_code]:rounded [&_code]:bg-card [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[14px] [&_code]:text-pumpkin-2">{children}</div>
    </section>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-night-2">
      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[12.5px] text-ink-3">
        <span>{label ?? "terminal"}</span>
        <CopyButton text={code} className="rounded-md px-2 py-0.5 text-ink-2 hover:bg-card hover:text-ink" />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13.5px] leading-relaxed text-ink">{code}</pre>
    </div>
  );
}

export function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 border-t border-line px-4 py-3 first:border-t-0 sm:grid-cols-[230px_1fr] sm:gap-4">
          <code className="self-start justify-self-start">{k}</code><span className="text-[15.5px]">{v}</span>
        </div>
      ))}
    </div>
  );
}
