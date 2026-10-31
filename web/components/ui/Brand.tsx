import { siGithub, siVercel, siLinear, siNotion, siFigma, siGoogledrive, siGoogle, siGooglecalendar, siX, siZoom, siStripe } from "simple-icons";

/* Real brand marks on a white tile. Paths from simple-icons (CC0); Slack isn't in that set, so its mark is drawn here. */
export type BrandName = "github" | "vercel" | "linear" | "notion" | "figma" | "drive" | "google" | "calendar" | "x" | "zoom" | "stripe" | "slack";

const SI: Partial<Record<BrandName, { path: string; hex: string }>> = {
  github: siGithub, vercel: siVercel, linear: siLinear, notion: siNotion, figma: siFigma, drive: siGoogledrive,
  google: siGoogle, calendar: siGooglecalendar, x: siX, zoom: siZoom, stripe: siStripe,
};

function Slack() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path fill="#E01E5A" d="M5.04 15.17a2.53 2.53 0 1 1-2.52-2.53h2.52v2.53zm1.27 0a2.53 2.53 0 0 1 5.05 0v6.31a2.53 2.53 0 1 1-5.05 0v-6.31z" />
      <path fill="#36C5F0" d="M8.83 5.04a2.53 2.53 0 1 1 2.53-2.52v2.52H8.83zm0 1.27a2.53 2.53 0 0 1 0 5.05H2.52a2.53 2.53 0 0 1 0-5.05h6.31z" />
      <path fill="#2EB67D" d="M18.96 8.83a2.53 2.53 0 1 1 2.52 2.53h-2.52V8.83zm-1.27 0a2.53 2.53 0 0 1-5.05 0V2.52a2.53 2.53 0 1 1 5.05 0v6.31z" />
      <path fill="#ECB22E" d="M15.17 18.96a2.53 2.53 0 1 1-2.53 2.52v-2.52h2.53zm0-1.27a2.53 2.53 0 0 1 0-5.05h6.31a2.53 2.53 0 1 1 0 5.05h-6.31z" />
    </svg>
  );
}

/* Google's mark in its four colours (simple-icons only ships it in one) */
function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.8z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.28a12 12 0 0 0 0 10.8l3.99-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.59 1.8l3.43-3.43A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.6l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

export default function Brand({ name, size = 28, radius, className = "" }: { name: BrandName; size?: number; radius?: number; className?: string }) {
  const s = SI[name];
  const pad = Math.round(size * 0.2);
  return (
    <span className={`inline-grid flex-none place-items-center bg-white ${className}`} style={{ width: size, height: size, borderRadius: radius ?? Math.round(size * 0.26), padding: pad, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}>
      {name === "slack" ? <Slack /> : name === "google" ? <GoogleG /> : s ? (
        <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden><path d={s.path} fill={`#${s.hex}`} /></svg>
      ) : null}
    </span>
  );
}
