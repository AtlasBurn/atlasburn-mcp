/**
 * Stash the MCP OAuth authorize URL across a login round-trip.
 *
 * When a logged-out user lands on /oauth/authorize, we save the full authorize
 * URL, send them to /login, and AuthGuard restores it after they sign in. Only
 * internal /oauth/authorize and /mcp/approve paths are ever stored/returned, so
 * this can't be abused as an open redirect. (/mcp/approve: the key-request approval
 * page, which forces a fresh sign-in.)
 */
const KEY = "atlasburn_mcp_oauth_return";

function isSafe(url: string): boolean {
  return typeof url === "string" && (url.startsWith("/oauth/authorize") || url.startsWith("/mcp/approve?"));
}

export function stashOAuthReturn(url: string): void {
  try {
    if (isSafe(url)) localStorage.setItem(KEY, url);
  } catch {
    /* storage unavailable — flow still works if already signed in */
  }
}

export function readOAuthReturn(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && isSafe(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearOAuthReturn(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* no-op */
  }
}
