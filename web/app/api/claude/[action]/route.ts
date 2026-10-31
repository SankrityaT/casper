import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, authorizeUrl, cookieOpts, exchange, makePkce, refresh, seal, unseal, type ClaudeCredential } from "@/lib/claude-oauth";

/* POST /api/claude/start      → { url } to open; remembers the PKCE verifier (sealed, 10 min)
   POST /api/claude/exchange   { code: "code#state" } → { connected, expires }
   POST /api/claude/disconnect → { connected: false }
   GET  /api/claude/status     → { connected, expires } (refreshes when near the end) */

type Pkce = { verifier: string; state: string };

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const jar = await cookies();

  if (action === "start") {
    const p = makePkce();
    jar.set(COOKIE.pkce, seal({ verifier: p.verifier, state: p.state } satisfies Pkce), cookieOpts(600));
    return NextResponse.json({ url: authorizeUrl(p.challenge, p.state) });
  }

  if (action === "exchange") {
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return NextResponse.json({ error: "Too big." }, { status: 413 });
    const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
    const pkce = unseal<Pkce>(jar.get(COOKIE.pkce)?.value);
    if (!pkce) return NextResponse.json({ error: "This sign-in timed out. Start again." }, { status: 400 });
    if (typeof body?.code !== "string" || body.code.length > 2048) return NextResponse.json({ error: "Paste the code Claude showed you." }, { status: 400 });
    try {
      const cred = await exchange(body.code, pkce.verifier, pkce.state);
      jar.delete({ name: COOKIE.pkce, path: "/api/claude" });
      jar.set(COOKIE.cred, seal(cred), cookieOpts(60 * 60 * 24 * 30));
      return NextResponse.json({ connected: true, expires: cred.expires });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Sign-in failed." }, { status: 400 });
    }
  }

  if (action === "disconnect") {
    jar.delete({ name: COOKIE.cred, path: "/api/claude" });
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 404 });
}

export async function GET(_: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "status") return NextResponse.json({ error: "Unknown action." }, { status: 404 });
  const jar = await cookies();
  let cred = unseal<ClaudeCredential>(jar.get(COOKIE.cred)?.value);
  if (!cred) return NextResponse.json({ connected: false });
  if (cred.expires - Date.now() < 5 * 60_000) {
    try { cred = await refresh(cred); jar.set(COOKIE.cred, seal(cred), cookieOpts(60 * 60 * 24 * 30)); }
    catch { jar.delete({ name: COOKIE.cred, path: "/api/claude" }); return NextResponse.json({ connected: false, error: "Sign in again." }); }
  }
  return NextResponse.json({ connected: true, expires: cred.expires });
}
