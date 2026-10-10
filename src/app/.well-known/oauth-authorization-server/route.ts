import {
  getOrigin,
  SUPPORTED_SCOPES,
  SUPPORTED_CODE_CHALLENGE_METHODS,
} from "@/lib/mcp/oauth-config";
import { jsonResponse, preflight } from "@/lib/mcp/http";

/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414).
 * MCP clients discover the auth endpoints here after a 401 from /api/mcp.
 */
export async function GET(request: Request) {
  const origin = getOrigin(request);
  return jsonResponse({
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [...SUPPORTED_SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: [...SUPPORTED_CODE_CHALLENGE_METHODS],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export async function OPTIONS() {
  return preflight();
}
