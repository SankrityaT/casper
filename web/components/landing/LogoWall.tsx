import Image from "next/image";
import { CLIENTS } from "@/lib/agents";

/* Agent logos as little cream stickers with an ink edge, the last row fading out ("and any other…"). */
export default function LogoWall({ more = "and any other agent that speaks MCP." }: { more?: string }) {
  return (
    <div className="relative mx-auto max-w-[860px]">
      <ul className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-5 [mask-image:linear-gradient(to_bottom,#000_58%,transparent_100%)]">
        {CLIENTS.map((c, i) => (
          <li key={c.name} title={c.name} className="group">
            <span
              style={{ animationDelay: `${i * 45}ms`, rotate: `${((i * 37) % 7) - 3}deg` }}
              className="flex size-[60px] animate-[msg-in_0.5s_var(--ease-out)_both] items-center justify-center rounded-[18px] border-2 border-[#08070a] bg-[#f3efe6] shadow-[0_3px_0_#08070a] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0 sm:size-[72px] md:size-[80px] md:rounded-[22px]"
            >
              <Image src={`/logos/${c.logo}.svg`} alt={c.name} width={40} height={40} unoptimized className="size-8 md:size-10" />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-[18px] text-ink-2">{more}</p>
    </div>
  );
}
