import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/* AES-256-GCM with CASPER_SECRETS_KEY: iv(12) + tag(16) + body, base64url. */
const key = () => {
  const hex = process.env.CASPER_SECRETS_KEY ?? ""
  if (hex.length !== 64) throw new Error("CASPER_SECRETS_KEY is missing on the hub.")
  return Buffer.from(hex, "hex")
}
export function seal(plain: string): string {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", key(), iv)
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url")
}
export function unseal(s: string): string {
  const raw = Buffer.from(s, "base64url"), d = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(12, 28))
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")
}
