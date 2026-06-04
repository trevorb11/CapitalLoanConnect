---
name: Bank statement upload 403 fix
description: Multipart/form-data POST requests blocked before reaching Express in Replit autoscale production deployment; workaround is base64 JSON.
---

# Problem
`POST /api/bank-statements/upload` (multipart/form-data) returns 403 HTML in production and never reaches Express (confirmed by diagnostic console.log never appearing in deployment logs). All JSON POST requests work fine.

# Root Cause
Replit's autoscale deployment reverse proxy blocks or silently drops multipart/form-data POST requests. Not a code-level issue — our Express handler has no auth check that could cause a 403.

**Why:** The request never appears in Express logs even with a console.log at the very top of the route handler (before multer). HTML 403 response (not JSON) = proxy, not Express.

# Fix Applied
Added `POST /api/bank-statements/upload-json` endpoint that accepts `{ fileBase64, fileName, mimeType, ...metadata }` as `application/json` with `express.json({ limit: '50mb' })`. Clients convert the File to base64 via FileReader before posting. Business logic is identical to the multipart endpoint.

**How to apply:** Any new file upload endpoint should use base64 JSON instead of multipart/form-data in this deployment environment. The multipart endpoint still exists as a fallback but doesn't work in production.
