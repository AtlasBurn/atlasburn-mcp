/**
 * AtlasBurn MCP — PKCE (RFC 7636) S256 helpers.
 *
 * PKCE is mandatory and S256-only: `plain` and missing challenges are rejected
 * before a code is ever minted. These are the pure functions the authorization
 * server uses to bind an authorization code to the client's code_verifier.
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** base64url(SHA-256(input)) — the PKCE S256 transform, unpadded. */
export function s256(input: string): string {
  return createHash("sha256").update(input).digest("base64url");
}

/** Constant-time compare of the S256(code_verifier) against the stored challenge. */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  const computed = s256(codeVerifier);
  const a = Buffer.from(computed);
  const b = Buffer.from(codeChallenge);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
