# AtlasBurn MCP

**See where your AI spend goes. Catch costly agent behavior before it grows. Ask about it from Claude, Cursor or any MCP client.**

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![MCP](https://img.shields.io/badge/MCP-2025--06--18-6B46C1.svg)](https://modelcontextprotocol.io)

[AtlasBurn](https://atlasburn.com) shows which model, feature and workflow caused your AI bill, and catches loops and retry storms while they happen. The AtlasBurn [Model Context Protocol](https://modelcontextprotocol.io)
server lets any MCP client — Claude, ChatGPT, Cursor, Codex, VS Code, and others — read your
AtlasBurn data (spend, cost by model and feature, runway forecast, guardrail status, runaway-agent signals) and can set AtlasBurn up in your project for you.

**Content-blind. OAuth 2.1 + PKCE (S256). Read-only data tools; a new key only with your approval in the browser.**

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

No data yet? Ask: *"Set up AtlasBurn in this project."* (see [Set up from your assistant](#set-up-from-your-assistant)).

## Tools

The five data tools are read-only (`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`). Every tool returns text plus `structuredContent` matching a published `outputSchema`.

| Tool | Arguments | Returns |
|------|-----------|---------|
| `get_cost_summary` | `windowDays` (1–365, default 30) | Total spend, prompt/completion tokens, requests, requests/second, last event time |
| `get_cost_breakdown` | `windowDays` | Spend attribution by model and by product feature |
| `get_runway_forecast` | `windowDays` | Runway days, daily burn, reserves, projected monthly bill, MRR, systemic-risk probabilities |
| `get_guardrail_status` | — | Guardrails enabled / mode / status (ACTIVE · THROTTLED · SUSPENDED), budgets, recent breaches |
| `get_runtime_signals` | `windowDays` | Request rate, retry rate, loop probability, context-expansion rate, model mix |
| `request_integration_key` | `method` (`sdk` or `proxy`) | Starts a key request and returns an approval link. Creates nothing by itself. |
| `get_setup_code` | `requestId` | After you approve: a single-use setup code and the CLI commands to run |

The full tool contract (descriptions, input and output JSON Schemas, annotations) is in
[`src/lib/mcp/tools.ts`](./src/lib/mcp/tools.ts).

### Set up from your assistant

1. You ask: *"Set up AtlasBurn in this project."* The assistant calls `request_integration_key`, which only stores a pending request (10 minutes) and returns an approval link.
2. You open the link and approve. Approval needs a fresh sign-in (within the last 5 minutes) by the same account that connected the assistant.
3. The assistant calls `get_setup_code` and runs `npx abn init --code <code>` in your project. The code is single-use and expires in 10 minutes.
4. The CLI exchanges the code for a new ingest key and writes it to your env file. **The key goes only to the CLI. It never passes through the assistant or the chat.**

New keys are added, never replacing or revoking existing ones, and requests are rate limited.

### Example prompts

1. "Using AtlasBurn, what did I spend on AI over the last 7 days, and how many tokens?"
2. "Which model and which feature are driving most of my AtlasBurn cost this month?"
3. "What's my AtlasBurn runway and burn forecast right now?"
4. "Are my AtlasBurn guardrails active, and have there been any budget breaches recently?"
5. "Does anything in my AtlasBurn runtime signals look like a looping or runaway agent?"
6. "Set up AtlasBurn in this project."

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
- One scope, `atlasburn:read`. No tool can change settings, budgets, guardrails or usage data, or revoke a key. Access tokens last 1 hour; refresh tokens last 30 days and rotate on every use.
- **Tenant isolation:** the organization is taken from the verified token, never from a tool argument.
- **Content-blind:** only aggregated economics and metadata. Prompts and model outputs are never exposed.
- **Keys need a human:** the only writes are a pending key request and a one-time setup code. A key is created only after you approve in the browser, and is delivered only to the CLI.
- Authorization codes are single-use. Codes and tokens are never stored in plaintext, only as salted hashes.
- Rate limited per token and per IP. Every tool call is audit-logged.

Found a vulnerability? See [SECURITY.md](./SECURITY.md).

## What's in this repository

This repository is the public **protocol layer** of the AtlasBurn MCP server. The data layer, token
storage, and authorization endpoints run inside the hosted AtlasBurn service and are not included.

```
src/lib/mcp/tools.ts          Tool contract (generated from the hosted server): names, descriptions, input/output schemas, annotations
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

[Apache-2.0](./LICENSE) © 2026 AtlasBurn.
