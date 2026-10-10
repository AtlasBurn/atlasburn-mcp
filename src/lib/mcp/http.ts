/** Shared HTTP helpers for the public MCP + OAuth endpoints (CORS + JSON). */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Session-Id, MCP-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS, ...extraHeaders },
  });
}

/** CORS preflight response. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
