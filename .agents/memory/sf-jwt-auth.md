---
name: Salesforce JWT Bearer Auth
description: How SF auth is implemented and what pitfalls to avoid
---

# Salesforce JWT Bearer Auth

## The rule
SF_PRIVATE_KEY must be stored as a **base64-encoded PEM** (one line, no newlines).
Replit secrets panel truncates multi-line values to 64 chars (one PEM line).
The code decodes it: `Buffer.from(rawKey, "base64").toString("utf8")`.

**Why:** Original implementation used `PlatformCLI` refresh tokens against `test.salesforce.com` (sandbox). Both were wrong for production. Refresh tokens also expire and lose state on restart.

## How to apply
- Generate key pair: `openssl genrsa | openssl pkcs8 -topk8 -nocrypt` → certificate for SF upload, base64-encode the PEM for the secret
- Secrets needed: `SF_CLIENT_ID` (Consumer Key), `SF_USERNAME` (SF login email), `SF_PRIVATE_KEY` (base64 PEM), `SF_INSTANCE_URL`, optionally `SF_LOGIN_URL` (defaults to login.salesforce.com)
- Connected App in SF must have: cert uploaded, "Admin approved users are pre-authorized", user's profile added
- Changes in SF take 2-10 min to propagate before JWT works

## Code location
`server/services/salesforce.ts` — top ~80 lines handle all auth.
Token cached 55 min, auto-refreshed via `buildJwt()` → POST to `/services/oauth2/token`.
