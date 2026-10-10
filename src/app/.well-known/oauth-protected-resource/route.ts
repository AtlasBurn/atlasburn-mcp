import { getOrigin, mcpResourceUrl, SUPPORTED_SCOPES } from "@/lib/mcp/oauth-config";
import { jsonResponse, preflight } from "@/lib/mcp/http";

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 * Advertised in the WWW-Authenticate header of a 401 from /api/mcp so clients
 * can locate the Authorization Server.
 */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  return jsonResponse({
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [...SUPPORTED_SCOPES],
    bearer_methods_supported: ["header"],
  });
}

export async function OPTIONS() {
  return preflight();
}
