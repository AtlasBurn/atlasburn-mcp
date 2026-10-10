# Security Policy

AtlasBurn's MCP server gives AI assistants read access to customers' cost and guardrail data, so we take
security reports seriously and appreciate responsible disclosure.

## Supported versions

| Version | Supported |
|---------|-----------|
| Hosted server at `https://app.atlasburn.com/api/mcp` | ✅ |
| Latest `main` of this repository | ✅ |
| Older commits | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub issue, discussion, or pull request for security problems.**

Report privately by either:

- using GitHub's **"Report a vulnerability"** button on this repository's **Security** tab (private vulnerability reporting), or
- emailing **contact@atlasburn.com** with the subject line `SECURITY: <short summary>`.

Please include:

- what is affected (endpoint, tool, file, or OAuth step)
- steps to reproduce, or a proof of concept
- the impact you believe it has (for example cross-tenant data access, token or code replay, PKCE bypass, open redirect)
- your name or handle if you would like credit

## What to expect

- **Acknowledgement** within 3 business days.
- **Initial assessment** within 7 business days, including whether we accept the report and its severity.
- **Fix timeline:** we aim to fix critical and high-severity issues within 30 days, and to keep you updated until it is resolved.
- **Credit** in the release notes or advisory, if you want it.

## Scope

In scope:

- The hosted MCP endpoint and its OAuth 2.1 endpoints (`/api/mcp`, `/api/oauth/*`, `/oauth/authorize`, `/.well-known/*`) on `app.atlasburn.com`
- The code in this repository

Especially interesting:

- reading another organization's data (tenant isolation bypass)
- any way for an MCP tool to modify data
- authorization code or token replay, or a refresh token surviving rotation
- PKCE bypass or downgrade (for example getting `plain` accepted)
- redirect URI validation flaws or open redirects in the consent flow
- prompts or model outputs being exposed through any tool

Out of scope:

- denial of service or volumetric testing
- social engineering or phishing of AtlasBurn staff or customers
- physical attacks
- reports from automated scanners without a demonstrated impact
- missing best-practice headers with no exploitable consequence

## Safe harbor

We will not pursue legal action against good-faith research that:

- only uses accounts and data you own, or have explicit permission to test
- avoids privacy violations, data destruction, and service degradation
- stops and reports as soon as you reach data that is not yours
- gives us reasonable time to fix the issue before any public disclosure
