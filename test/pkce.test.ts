/**
 * AtlasBurn MCP — PKCE S256 correctness (pure, no network).
 *
 * Verifies the S256 transform in src/lib/mcp/pkce.ts against the canonical
 * RFC 7636 Appendix-B test vector, plus positive/negative PKCE checks.
 * This is the security-critical piece; full protocol validation is done live
 * with the MCP Inspector against a deploy (see README).
 *
 * Usage: npm test
 */
import { createHash } from 'node:crypto';
import { s256, verifyPkceS256 } from '../src/lib/mcp/pkce';

let pass = 0, fail = 0;
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${detail}`); }
};

console.log('MCP PKCE S256:');

// RFC 7636 Appendix B canonical vector.
const RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

check('S256 matches RFC 7636 vector', s256(RFC_VERIFIER) === RFC_CHALLENGE, `got ${s256(RFC_VERIFIER)}`);
check('challenge is unpadded base64url (no "=", "+", "/")', !/[=+/]/.test(s256(RFC_VERIFIER)));
check('verify accepts the correct verifier', verifyPkceS256(RFC_VERIFIER, RFC_CHALLENGE));
check('verify rejects a wrong verifier', !verifyPkceS256('not-the-verifier', RFC_CHALLENGE));
check('verify rejects the challenge used as its own verifier', !verifyPkceS256(RFC_CHALLENGE, RFC_CHALLENGE));
check('verify rejects empty verifier', !verifyPkceS256('', RFC_CHALLENGE));

// Round-trip on random verifiers.
let roundTrips = true;
for (let i = 0; i < 100; i++) {
  const v = createHash('sha256').update(`v${i}${Math.random()}`).digest('hex');
  if (!verifyPkceS256(v, s256(v))) roundTrips = false;
}
check('100 random verifier/challenge round-trips verify', roundTrips);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
