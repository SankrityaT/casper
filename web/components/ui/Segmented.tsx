"use client";

/* A pill switch with a sliding thumb. Used for Canvas / Chat and anywhere we pick one of a few. */
export default function Segmented<T extends string>({ options, value, onChange, width = 124, label }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; width?: number; label?: string;
}) {
  const i = Math.max(0, options.indexOf(value));
  return (
    <div role="tablist" aria-label={label} className="relative flex rounded-full border border-line bg-night-2 p-1">
      <span aria-hidden className="absolute inset-y-1 left-1 rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-out)]"
        style={{ width, transform: `translateX(${i * width}px)` }} />
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={o === value} onClick={() => onChange(o)} style={{ width }}
          className={`relative z-10 rounded-full py-2 text-[15px] font-bold capitalize transition-colors duration-300 ${o === value ? "text-night" : "text-ink-2 hover:text-ink"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
