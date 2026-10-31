"use client";

import CopyButton from "@/components/ui/CopyButton";

/* "Already using an agent? Copy setup prompt", with the prompt one click away so nothing is hidden. */
export default function SetupPrompt({ prompt, ask = "Already using an agent?" }: { prompt: string; ask?: string }) {
  return (
    <div className="mx-auto w-full max-w-[760px]">
      <div className="flex flex-col items-stretch gap-3 rounded-3xl border border-line bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:py-2 sm:pl-6 sm:pr-2">
        <span className="px-2 text-center text-[17px] sm:px-0 sm:text-left">{ask}</span>
        <CopyButton text={prompt} label="Copy setup prompt"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-pumpkin px-5 py-3 text-[15px] font-bold text-[#1b1206] transition hover:bg-pumpkin-2 sm:py-2.5">
          <span aria-hidden className="relative size-4">
            <span className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-[#1b1206]/60" />
            <span className="absolute inset-0 rounded-[3px] border border-[#1b1206]" />
          </span>
        </CopyButton>
      </div>
      <details className="group mt-4 text-center">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[15px] text-ink-3 transition hover:text-ink [&::-webkit-details-marker]:hidden">
          See what it tells your agent
          <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-line bg-night-2 p-5 text-left font-mono text-[13.5px] leading-relaxed text-ink-2">{prompt}</pre>
      </details>
    </div>
  );
}
