# AtlasBurn MCP

**Ask your AI assistant about your AI cost, runway, and guardrails — from your real AtlasBurn data.**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-2025--06--18-6B46C1.svg)](https://modelcontextprotocol.io)

AtlasBurn is an AI cost-intelligence platform. The AtlasBurn [Model Context Protocol](https://modelcontextprotocol.io)
server lets any MCP client — Claude, ChatGPT, Cursor, Codex, VS Code, and others — read your
AtlasBurn data: spend, cost breakdowns, runway forecast, guardrail status, and runaway-agent signals.

**Read-only. Content-blind. OAuth 2.1 + PKCE (S256).**

---

## Connect

The hosted server is a remote MCP server over Streamable HTTP:

```
https://app.atlasburn.com/api/mcp
```

**Claude Code**

```bash
claude mcp add --transport http atlasburn https://app.atlasburn.com/api/mcp
```

**Cursor / VS Code / other clients** — add a remote server entry:

```json
{
  "mcpServers": {
    "atlasburn": { "url": "https://app.atlasburn.com/api/mcp" }
  }
}
```

Then:

1. Your client discovers OAuth automatically (RFC 9728 → RFC 8414 metadata) and opens the AtlasBurn consent screen.
2. Sign in to your AtlasBurn account and approve **read-only** access.
3. Ask away.

You need an AtlasBurn account with the [SDK](https://www.npmjs.com/package/@atlasburn/sdk) or edge proxy sending usage telemetry, so there is data to read.

## Tools

All tools are read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`) and return both text and `structuredContent` matching a published `outputSchema`.

| Tool | Arguments | Returns |
|------|-----------|---------|
| `get_cost_summary` | `windowDays` (1–365, default 30) | Total spend, prompt/completion tokens, requests, requests/second, last event time |
| `get_cost_breakdown` | `windowDays` | Spend attribution by model and by product feature |
| `get_runway_forecast` | `windowDays` | Runway days, daily burn, reserves, projected monthly bill, MRR, systemic-risk probabilities |
| `get_guardrail_status` | — | Guardrails enabled / mode / status (ACTIVE · THROTTLED · SUSPENDED), budgets, recent breaches |
| `get_runtime_signals` | `windowDays` | Request rate, retry rate, loop probability, context-expansion rate, model mix |

The full tool contract (descriptions, input and output JSON Schemas, annotations) is in
[`src/lib/mcp/tools.ts`](./src/lib/mcp/tools.ts).

### Example prompts

1. "Using AtlasBurn, what did I spend on AI over the last 7 days, and how many tokens?"
2. "Which model and which feature are driving most of my AtlasBurn cost this month?"
3. "What's my AtlasBurn runway and burn forecast right now?"
4. "Are my AtlasBurn guardrails active, and have there been any budget breaches recently?"
5. "Does anything in my AtlasBurn runtime signals look like a looping or runaway agent?"

## Endpoints

| Path | Purpose |
|------|---------|
| `POST /api/mcp` | MCP Streamable-HTTP (stateless JSON-RPC) endpoint. Bearer-token auth. |
| `GET /.well-known/oauth-protected-resource` | RFC 9728 — points clients at the Authorization Server. |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 — AS metadata (endpoints, `S256`, scopes). |
| `POST /api/oauth/register` | RFC 7591 dynamic client registration (public client, no secret). |
| `GET /oauth/authorize` | Consent page (sign in + approve). |
| `POST /api/oauth/token` | `authorization_code` (PKCE) and `refresh_token` grants. |

A request without a valid token gets `401` with
`WWW-Authenticate: Bearer resource_metadata="<origin>/.well-known/oauth-protected-resource"`, which starts discovery.

## Security model

- **OAuth 2.1** authorization-code flow. **PKCE is mandatory and `S256` only**; `plain` and missing challenges are rejected.
- One read-only scope, `atlasburn:read`. Access tokens last 1 hour; refresh tokens last 30 days and rotate on every use.
- **Tenant isolation:** the organization is taken from the verified token, never from a tool argument.
- **Content-blind:** only aggregated economics and metadata. Prompts and model outputs are never exposed.
- **Zero writes:** no tool can change settings, budgets, keys, or data.
- Authorization codes are single-use. Codes and tokens are never stored in plaintext, only as salted hashes.
- Rate limited per token and per IP. Every tool call is audit-logged.

Found a vulnerability? See [SECURITY.md](./SECURITY.md).

## What's in this repository

This repository is the public **protocol layer** of the AtlasBurn MCP server. The data layer, token
storage, and authorization endpoints run inside the hosted AtlasBurn service and are not included.

```
src/lib/mcp/tools.ts          Tool contract: names, descriptions, input/output schemas, annotations
src/lib/mcp/oauth-config.ts   Scope, PKCE method, token lifetimes, protocol version, origin resolution
src/lib/mcp/pkce.ts           PKCE S256 transform + constant-time verifier check
src/lib/mcp/http.ts           CORS headers and JSON response helpers
src/lib/mcp-oauth-return.ts   Browser helper that preserves the authorize URL across sign-in (no open redirect)
src/app/.well-known/oauth-authorization-server/route.ts   RFC 8414 metadata route
src/app/.well-known/oauth-protected-resource/route.ts     RFC 9728 metadata route
test/pkce.test.ts             PKCE S256 tests (RFC 7636 Appendix B vector)
```

Route files follow the Next.js App Router convention (`export async function GET(request: Request)`) and use
only the Web `Request`/`Response` APIs.

## Development

Requires Node.js 20+.

```bash
npm install
npm run typecheck
npm test
```

## Contributing

Issues and pull requests are welcome. Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## Links

- Website: [atlasburn.com](https://atlasburn.com)
- Dashboard: [app.atlasburn.com](https://app.atlasburn.com)
- Docs: [docs.atlasburn.com](https://docs.atlasburn.com)
- SDK: [@atlasburn/sdk](https://www.npmjs.com/package/@atlasburn/sdk)

## License

[Apache-2.0](./LICENSE) © 2026 AtlasBurn Institutional.
