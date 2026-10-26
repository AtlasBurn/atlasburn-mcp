/**
 * AtlasBurn MCP — OAuth 2.1 configuration & shared constants.
 *
 * The MCP server is a public, client-agnostic remote server. Directories
 * (Anthropic connector directory, OpenAI) require OAuth 2.1 with PKCE, so the
 * app doubles as the Authorization Server. This module holds the knobs; the
 * store (oauth-store.ts) holds the logic.
 */

/** Single read-only scope for v1. Granular scopes (costs:read, guardrails:read)
 *  can be added later without breaking clients that request atlasburn:read. */
export const SCOPE_READ = "atlasburn:read";
export const SUPPORTED_SCOPES = [SCOPE_READ] as const;

/** PKCE — S256 ONLY. `plain` is rejected everywhere. */
export const SUPPORTED_CODE_CHALLENGE_METHODS = ["S256"] as const;

export const ACCESS_TOKEN_TTL_SEC = 60 * 60;          // 1 hour
export const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
export const AUTH_CODE_TTL_SEC = 60 * 5;               // 5 minutes

/** Raw-credential prefixes (never stored raw — only salted HMAC hashes are). */
export const PREFIX = {
  clientId: "abmc_",   // MCP client (dynamic client registration)
  code: "abcode_",     // authorization code
  access: "abtok_",    // access token
  refresh: "abref_",   // refresh token
  request: "abreq_",   // integration-key request (approved by a human in the browser)
  setup: "abset_",     // one-time CLI setup code (redeemed only at /api/cli/claim)
} as const;

/** Integration-key flow (see src/lib/mcp/key-requests.ts). */
export const KEY_REQUEST_TTL_SEC = 60 * 10; // the user has 10 minutes to approve
export const SETUP_CODE_TTL_SEC = 60 * 10;  // and the CLI 10 minutes to redeem the code
export const FRESH_AUTH_MAX_AGE_SEC = 60 * 5; // approval needs a sign-in from the last 5 minutes

/** MCP protocol version we advertise (echoes the client's if it sends a known one). */
export const MCP_PROTOCOL_VERSION = "2025-06-18";

export const SERVER_INFO = { name: "AtlasBurn", version: "1.0.0" } as const;

/**
 * Resolve the externally-visible origin behind a reverse proxy / load balancer.
 * Absolute URLs in OAuth metadata MUST match what the client called, so we trust
 * the forwarded host/proto headers, falling back to the request URL.
 */
export function getOrigin(request: Request): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host");
  if (host) return `${proto}://${host}`;
  try {
    return new URL(request.url).origin;
  } catch {
    return "https://app.atlasburn.com";
  }
}

/** The MCP resource endpoint (the protected resource clients call). */
export function mcpResourceUrl(origin: string): string {
  return `${origin}/api/mcp`;
}
