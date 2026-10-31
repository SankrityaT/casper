/* Casper's own reactions: little inked Halloween stickers, same style as the cast. */

const K = "#1d1a22"; // ink
const S = { stroke: K, strokeWidth: 1.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export const SPOOKY = {
  pumpkin: { label: "Nice one", svg: (
    <>
      <path d="M12 6c-1-2 0-3.5 1.6-4l.8 1.2c-1 .6-1.2 1.4-1 2.8" fill="#5e8a35" {...S} />
      <ellipse cx="12" cy="14" rx="9" ry="7.2" fill="#f58a33" {...S} />
      <path d="M12 7c-2 2-2 12 0 14M7.5 8c-2.5 2.5-2.5 9.5 0 12M16.5 8c2.5 2.5 2.5 9.5 0 12" fill="none" stroke="#c4561c" strokeWidth="1" />
      <path d="M8 12.5l1.6-1.6 1.2 1.6zM13.2 12.5l1.2-1.6 1.6 1.6zM8.5 15.5c1 1.6 6 1.6 7 0l-1.2.6-1-.8-1 .9-1-.9-1 .8z" fill={K} />
    </>) },
  ghost: { label: "Boo / on it", svg: (
    <>
      <path d="M5 21V11a7 7 0 0 1 14 0v10l-2.3-1.6L14.4 21 12 19.4 9.6 21l-2.3-1.6z" fill="#f3f0fb" {...S} />
      <ellipse cx="9.6" cy="11" rx="1.3" ry="1.8" fill={K} /><ellipse cx="14.4" cy="11" rx="1.3" ry="1.8" fill={K} />
      <ellipse cx="12" cy="15" rx="1.2" ry="1.5" fill={K} />
      <ellipse cx="8" cy="7.5" rx="1.6" ry=".9" fill="#fff" transform="rotate(-30 8 7.5)" />
    </>) },
  skull: { label: "I’m dead", svg: (
    <>
      <path d="M4.5 11a7.5 7.5 0 0 1 15 0c0 2.4-1 3.8-2.5 4.6V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3.4C5.5 14.8 4.5 13.4 4.5 11z" fill="#efe9da" {...S} />
      <circle cx="9" cy="11.6" r="2" fill={K} /><circle cx="15" cy="11.6" r="2" fill={K} />
      <path d="M12 14l-1 2h2z" fill={K} /><path d="M10 20v-2M12 20v-2M14 20v-2" stroke={K} strokeWidth="1" />
    </>) },
  bat: { label: "Shipped it", svg: (
    <g transform="translate(12 10.5) scale(1.3) translate(-12 -10.5)">
      <path d="M12 9c-1.4-2-2.6-2.6-4-2.2.4 1.2 0 2-.8 2.6C5 8.6 3 9.4 1.8 11.4c1.6-.4 2.8.2 3.4 1.6 1-.8 2.2-.8 3 0 .8-.9 2-1 3.8 0 1.8-1 3-.9 3.8 0 .8-.8 2-.8 3 0 .6-1.4 1.8-2 3.4-1.6C21 9.4 19 8.6 16.8 9.4c-.8-.6-1.2-1.4-.8-2.6-1.4-.4-2.6.2-4 2.2z" fill="#8e78f2" {...S} />
      <circle cx="10.8" cy="10.6" r=".7" fill="#ffd36b" /><circle cx="13.2" cy="10.6" r=".7" fill="#ffd36b" />
    </g>) },
  candy: { label: "Treat!", svg: (
    <>
      <path d="M12 2.5c3 0 7 13.5 7 16.5 0 1.6-3.5 2.5-7 2.5S5 20.6 5 19c0-3 4-16.5 7-16.5z" fill="#fff8e6" {...S} />
      <path d="M8 12.6c2.6.8 5.4.8 8 0l-1.5-4.8c-1.6.5-3.4.5-5 0z" fill="#f58a33" />
      <path d="M5.4 17.4C6.3 19.8 17.7 19.8 18.6 17.4L16.6 12.6c-2.6.8-6.6.8-9.2 0z" fill="#ffd34d" />
      <path d="M12 2.5c3 0 7 13.5 7 16.5 0 1.6-3.5 2.5-7 2.5S5 20.6 5 19c0-3 4-16.5 7-16.5z" fill="none" {...S} />
    </>) },
  cauldron: { label: "Cooking", svg: (
    <>
      <circle cx="9" cy="5.5" r="1.6" fill="#9cd46a" {...S} strokeWidth={1} /><circle cx="14" cy="3.8" r="1.1" fill="#9cd46a" {...S} strokeWidth={1} />
      <path d="M4 10h16" stroke="#6b657a" strokeWidth="2.2" />
      <path d="M5 10.5c-1 6 2 10 7 10s8-4 7-10z" fill="#4f4a5c" {...S} />
      <path d="M5.4 10.5c1.8 1.6 11.4 1.6 13.2 0" fill="#9cd46a" stroke="none" />
      <path d="M7 20.5l-1 1.5M17 20.5l1 1.5" stroke={K} strokeWidth="1.6" />
      <ellipse cx="8.5" cy="14.5" rx=".8" ry="1.8" fill="#5a5466" />
    </>) },
  eye: { label: "Looking", svg: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="#fbf8f2" {...S} />
      <path d="M4.5 9.5l3 1.2M5 15l2.6-.8M19.4 9l-2.8 1.4M18.8 15.6l-2.4-1.2" stroke="#e46a5a" strokeWidth=".9" />
      <circle cx="12.6" cy="12.4" r="3.8" fill="#58c47e" stroke={K} strokeWidth="1" />
      <circle cx="12.8" cy="12.6" r="1.8" fill={K} /><circle cx="11.6" cy="11.2" r=".9" fill="#fff" />
    </>) },
  spider: { label: "Bug found", svg: (
    <>
      <path d="M12 1v6" stroke="#8d8a95" strokeWidth=".9" />
      <path d="M9 11L4 7.5M9 12.5H3.5M9 14l-5 3.5M15 11l5-3.5M15 12.5h5.5M15 14l5 3.5" fill="none" stroke="#8d86a6" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="12" cy="14" rx="4" ry="4.8" fill="#5b5468" {...S} /><circle cx="12" cy="8.4" r="2.4" fill="#5b5468" {...S} /><path d="M12 11.5v5" stroke="#ef6b6b" strokeWidth="1.2" />
      <circle cx="11.1" cy="8.3" r=".6" fill="#ef6b6b" /><circle cx="12.9" cy="8.3" r=".6" fill="#ef6b6b" />
    </>) },
  hat: { label: "Magic", svg: (
    <>
      <path d="M2.5 19.5c4 1.6 15 1.6 19 0-2-1.6-17-1.6-19 0z" fill="#3b2a63" {...S} />
      <path d="M6.5 18.6C8 13 9.5 5 13 2c.6 2.6 2.4 4.4 1.8 6.8l2.7 9.8c-3.6.6-7.4.6-11 0z" fill="#4f3cc0" {...S} />
      <path d="M7.4 16c3 .6 6.6.6 9.6 0l.5 2c-3.6.6-7.4.6-11 0z" fill="#f58a33" {...S} strokeWidth={1} />
      <path d="M13 9.5l.5 1 1.1.1-.8.7.2 1.1-1-.5-1 .5.2-1.1-.8-.7 1.1-.1z" fill="#ffd36b" />
    </>) },
  tomb: { label: "RIP that idea", svg: (
    <>
      <path d="M2.5 21.5h19" stroke="#5e8a35" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 21V9a6 6 0 0 1 12 0v12z" fill="#b8b5c0" {...S} />
      <text x="12" y="13.8" textAnchor="middle" fontSize="4.6" fontWeight="800" fill={K} fontFamily="system-ui">RIP</text>
      <path d="M9 17h6" stroke="#8d8a95" strokeWidth="1" />
    </>) },
  potion: { label: "Fixed", svg: (
    <>
      <path d="M10 2.5h4M10.4 2.5v5.2C6.8 9 4.8 11.8 4.8 15a7.2 7.2 0 0 0 14.4 0c0-3.2-2-6-5.6-7.3V2.5" fill="#f3f0fb" {...S} />
      <path d="M5.4 14c1.8-1 4-.2 6.6-.6s4.4-1.4 6.6-.4A7.2 7.2 0 0 1 5.4 14z" fill="#c158e6" stroke="none" />
      <path d="M10 2.5h4M10.4 2.5v5.2C6.8 9 4.8 11.8 4.8 15a7.2 7.2 0 0 0 14.4 0c0-3.2-2-6-5.6-7.3V2.5" fill="none" {...S} />
      <circle cx="10" cy="17" r="1" fill="#f6d6ff" /><circle cx="13.6" cy="15.6" r=".7" fill="#f6d6ff" />
    </>) },
  moon: { label: "Night shift", svg: (
    <>
      <path d="M15.5 3.2A9 9 0 1 0 20.8 15a7 7 0 1 1-5.3-11.8z" fill="#ffd659" {...S} />
      <circle cx="9.5" cy="15" r="1.1" fill="#e0a92c" /><circle cx="7.6" cy="10" r=".8" fill="#e0a92c" />
    </>) },
} as const;

export type SpookyName = keyof typeof SPOOKY;
export const SPOOKY_NAMES = Object.keys(SPOOKY) as SpookyName[];
export const isSpooky = (e: string): e is SpookyName => e in SPOOKY;

export function Emo({ name, size = 18 }: { name: string; size?: number }) {
  if (!isSpooky(name)) return <span style={{ fontSize: size * 0.85 }}>{name}</span>;
  return (
    <svg className="emo" viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={SPOOKY[name].label}>
      {SPOOKY[name].svg}
    </svg>
  );
}
