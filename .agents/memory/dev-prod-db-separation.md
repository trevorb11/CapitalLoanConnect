---
name: Dev vs prod databases are separate
description: executeSql tool hits Replit-managed dev DB; production app uses external Neon DB. They are not the same instance.
---

The `executeSql` code-execution callback targets the **Replit-managed development PostgreSQL**, not the external Neon database the production app connects to.

**Why:** Confirmed when debugging the LOC banner — `executeSql` found zero funded decisions for `ekline.jason@gmail.com`, but production server logs showed the PATCH succeeded and the decision clearly existed in the production Neon DB with `status=funded`.

**How to apply:**
- Never use `executeSql` to verify production data. Use `fetch_deployment_logs` to inspect production server behavior instead.
- Direct SQL writes via `executeSql` affect only the dev database and have no effect on production data.
- To investigate a production data issue, look at: (1) deployment logs for the relevant API response, (2) the route/storage code path, (3) deploy a logging improvement if needed.
- Previous memory note claiming "dev and prod share same Neon instance" was incorrect.
