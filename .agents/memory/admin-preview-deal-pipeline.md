---
name: admin-preview-data is a separate deal pipeline
description: /api/merchant/admin-preview-data builds deals independently from /api/merchant/deals — any new field must be added to both.
---

The merchant portal has two separate code paths that build deal objects:

1. **`/api/merchant/deals`** (line ~13905 in routes.ts) — used when a merchant logs in normally
2. **`/api/merchant/admin-preview-data`** (line ~14554 in routes.ts) — used when an admin generates a preview URL and opens the portal on behalf of a merchant

Both paths construct deal objects from `business_underwriting_decisions` rows. They are NOT shared — each independently maps columns to the deal shape.

**Why:** The LOC banner (`isLineOfCredit`, `creditLineTotal`) was added to path 1 but not path 2, so the banner never appeared when viewing via admin preview even though the DB had the right data.

**How to apply:**
- Any time a new field is added to the deal object in `/api/merchant/deals`, find the parallel `deals.push({...})` blocks in `/api/merchant/admin-preview-data` and add the same field there.
- The same pattern applies to `balance-report` and any other endpoint that rebuilds deals inline (search for "Build deals" comments in routes.ts).
