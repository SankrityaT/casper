/* The night behind the hero: flat colours only, inked edges, slow motion. */

// Seeded so server and client draw the same stars.
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(31);
const STARS = Array.from({ length: 70 }, () => ({
  x: rnd() * 100,
  y: rnd() * 62,
  r: rnd() < 0.15 ? 1.6 : 0.9,
  d: (rnd() * 4).toFixed(2),
  t: (2.5 + rnd() * 3).toFixed(2),
})).filter((s) => !(s.x > 24 && s.x < 76 && s.y > 8 && s.y < 58));

const INK = "#08070a";

export default function Night() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* stars */}
      <svg className="absolute inset-0 size-full max-md:[mask-image:linear-gradient(to_bottom,black_6%,transparent_14%,transparent_62%,black_72%)]">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#f3eadb"
            className="animate-[twinkle_var(--t)_ease-in-out_infinite]"
            style={{ "--t": `${s.t}s`, animationDelay: `-${s.d}s` } as React.CSSProperties}
          />
        ))}
      </svg>

      {/* the moon, with clouds crossing it */}
      <svg className="absolute right-[5%] top-[7%] hidden w-[230px] md:block" viewBox="0 0 230 190" overflow="visible">
        <defs>
          <filter id="night-ink" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" />
            <feDisplacementMap in="SourceGraphic" scale="2.2" />
          </filter>
          <clipPath id="moon-clip"><circle cx="118" cy="92" r="58" /></clipPath>
        </defs>
        <circle cx="118" cy="92" r="84" fill="#ece2cf" opacity=".05" />
        <circle cx="118" cy="92" r="70" fill="#ece2cf" opacity=".06" />
        <g filter="url(#night-ink)">
          <circle cx="118" cy="92" r="58" fill="#ebe0c8" stroke={INK} strokeWidth="2.5" />
          <g clipPath="url(#moon-clip)">
            <path d="M150 40 C178 64 180 120 150 146 C186 132 196 70 150 40Z" fill="#d6c8aa" />
            <ellipse cx="98" cy="74" rx="12" ry="10" fill="#d9ccb0" stroke="#bfae8c" strokeWidth="1.4" />
            <ellipse cx="132" cy="108" rx="16" ry="13" fill="#d9ccb0" stroke="#bfae8c" strokeWidth="1.4" />
            <ellipse cx="96" cy="118" rx="7" ry="6" fill="#d9ccb0" stroke="#bfae8c" strokeWidth="1.2" />
            <ellipse cx="128" cy="62" rx="5" ry="4" fill="#d9ccb0" />
            <ellipse cx="82" cy="96" rx="4" ry="3.4" fill="#d9ccb0" />
          </g>
          <g className="animate-[drift_26s_ease-in-out_infinite_alternate]">
            <path d="M40 118 C52 108 66 110 74 114 C82 104 100 102 110 112 C120 106 136 108 142 116 C150 114 160 116 164 122 L40 122Z" fill="#2b2833" stroke={INK} strokeWidth="1.8" />
            
          </g>
          <g className="animate-[drift_34s_ease-in-out_infinite_alternate-reverse]">
            <path d="M118 62 C128 54 140 56 146 60 C154 54 168 56 174 64 C180 63 186 65 188 68 L118 68Z" fill="#26232e" stroke={INK} strokeWidth="1.8" />
          </g>
        </g>
      </svg>

      {/* bats crossing the sky every so often */}
      <div className="absolute left-0 top-[18%] hidden animate-[fly_16s_linear_infinite] md:block">
        {[0, 1, 2].map((i) => (
          <svg
            key={i}
            width={26 - i * 5}
            viewBox="0 0 26 14"
            className="absolute animate-[flap_0.32s_ease-in-out_infinite_alternate]"
            style={{ left: i * 34, top: i * 16 - (i === 2 ? 30 : 0), animationDelay: `${i * 0.11}s` }}
          >
            <path d="M13 4c1-2 2-2 2-2l1 2c3-3 7-4 10-3-2 1-3 3-3 6-2-1-4-1-5 1-1-1-2-1-3 0h-2c-1-1-2-1-3 0-1-2-3-2-5-1 0-3-1-5-3-6 3-1 7 0 10 3l1-2s1 0 2 2z" fill={INK} />
          </svg>
        ))}
      </div>

      {/* horizon: a bare tree on the left, a crooked house on the right */}
      <svg className="absolute bottom-[51px] left-0 hidden h-[190px] md:block" viewBox="0 0 360 190" preserveAspectRatio="xMinYMax meet">
        <path d="M0 190 V150 C60 132 140 140 220 160 C270 172 320 178 360 190Z" fill="#1b1922" />
        <path
          d="M92 190 C96 160 94 130 88 104 C80 90 66 84 54 70 M88 104 C96 88 112 82 120 64 C124 54 134 48 142 46 M92 132 C104 124 118 124 128 112 M90 150 C78 144 66 146 56 138 M112 82 C110 70 104 62 106 50"
          fill="none"
          stroke="#1b1922"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M86 190 L88 120 L98 120 L100 190Z" fill="#1b1922" />
      </svg>
      <svg className="absolute bottom-[51px] right-0 hidden h-[210px] md:block" viewBox="0 0 320 210" preserveAspectRatio="xMaxYMax meet">
        <path d="M0 210 C70 186 160 176 320 180 V210Z" fill="#1b1922" />
        <g transform="rotate(-4 200 180)">
          <path d="M150 182 V110 L196 66 L244 110 V182Z" fill="#1b1922" />
          <path d="M214 84 V58 H226 V96Z" fill="#1b1922" />
          <path d="M186 128 h16 v20 h-16z" fill="#e9a24a" className="animate-[flicker_3.2s_steps(2,end)_infinite]" />
          <path d="M214 140 h14 v18 h-14z" fill="#e9a24a" opacity=".55" />
          <path d="M194 128 V148 M186 138 H202" stroke="#1b1922" strokeWidth="2" />
        </g>
        <path d="M262 182 V170 M262 176 L254 170 M262 172 L270 166" stroke="#1b1922" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
