import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/* "Sign in with Claude" for a web app. The same public client and endpoints Claude Code uses (checked against the claude
   2.1.316 binary). A hosted site can't receive a localhost redirect, so this uses Claude Code's paste-a-code redirect: Claude's
   page shows `code#state`, the person pastes it back, and the server swaps it for tokens.
   Tokens never reach the browser: they're sealed with CASPER_SECRETS_KEY into an httpOnly cookie until the hub stores them. */

export const CLAUDE = {
  clientId: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  authorizeUrl: "https://claude.ai/oauth/authorize",
  tokenUrl: "https://platform.claude.com/v1/oauth/token",
  redirectUri: "https://platform.claude.com/oauth/code/callback",
  scope: "org:create_api_key user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload",
};

export type ClaudeCredential = { access: string; refresh: string; expires: number };

const b64url = (b: Buffer) => b.toString("base64url");

export function makePkce() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(24));
  return { verifier, challenge, state };
}

export function authorizeUrl(challenge: string, state: string) {
  const u = new URL(CLAUDE.authorizeUrl);
  const q = { code: "true", response_type: "code", client_id: CLAUDE.clientId, redirect_uri: CLAUDE.redirectUri, scope: CLAUDE.scope, code_challenge: challenge, code_challenge_method: "S256", state };
  for (const [k, v] of Object.entries(q)) u.searchParams.set(k, v);
  return u.toString();
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(CLAUDE.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, json };
}

function credentialOf(json: Record<string, unknown> | null, previousRefresh?: string): ClaudeCredential {
  const access = json?.access_token, refresh = json?.refresh_token ?? previousRefresh, expiresIn = json?.expires_in;
  if (typeof access !== "string" || typeof refresh !== "string" || typeof expiresIn !== "number") throw new Error("Claude answered without the tokens it should have.");
  return { access, refresh, expires: Date.now() + expiresIn * 1000 };
}

/** The pasted `code#state` for tokens. Errors never carry tokens, codes or response bodies. */
export async function exchange(pasted: string, verifier: string, expectedState: string): Promise<ClaudeCredential> {
  const [code, state] = pasted.trim().split("#");
  if (!code || state !== expectedState) throw new Error("That code doesn’t match this sign-in. Start again and paste the newest code.");
  const r = await tokenRequest({ grant_type: "authorization_code", client_id: CLAUDE.clientId, code, redirect_uri: CLAUDE.redirectUri, code_verifier: verifier, state });
  if (r.status !== 200) throw new Error(`Claude refused the sign-in (${r.status}).`);
  return credentialOf(r.json);
}

export async function refresh(cred: ClaudeCredential): Promise<ClaudeCredential> {
  const r = await tokenRequest({ grant_type: "refresh_token", client_id: CLAUDE.clientId, refresh_token: cred.refresh });
  if (r.status !== 200) throw new Error(`Claude couldn’t renew the sign-in (${r.status}). Sign in again.`);
  return credentialOf(r.json, cred.refresh);
}

/* ---------- sealing (AES-256-GCM with CASPER_SECRETS_KEY) ---------- */
function key() {
  const hex = process.env.CASPER_SECRETS_KEY;
  if (!hex || hex.length !== 64) throw new Error("CASPER_SECRETS_KEY is missing.");
  return Buffer.from(hex, "hex");
}
export function seal(v: unknown): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(v), "utf8"), c.final()]);
  return b64url(Buffer.concat([iv, c.getAuthTag(), body]));
}
export function unseal<T>(s: string | undefined): T | null {
  if (!s) return null;
  try {
    const raw = Buffer.from(s, "base64url"), d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch { return null; }
}

export const COOKIE = { pkce: "casper_cl_pkce", cred: "casper_cl_cred" };
export const cookieOpts = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/claude", maxAge });
