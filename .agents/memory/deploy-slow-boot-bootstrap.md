---
name: Deploy bootstrap for slow-booting server
description: Autoscale health checks give up ~6.5s after container start; this app needs ~8s to bind. A placeholder bootstrap binds the port instantly, then hands over.
---

Autoscale deployments probe `GET /` within seconds of container start and fail the publish ("app built but failed to start") if the port isn't bound in time. This app's production boot takes ~8s (npm overhead + large ESM bundle module loading + session store/migrations/routes), so publishes failed with zero runtime errors.

**Why:** esbuild `--format=esm --packages=external` hoists all external imports, so module loading cost can't be deferred with dynamic imports. The fix is a bootstrap entry (`server/prod-start.mjs`) that binds the port instantly with a placeholder (200 + meta-refresh only for GET/HEAD of `/`; 503 + Retry-After for everything else, so API clients and webhooks never parse placeholder HTML as data), then imports the real bundle.

**How to apply:**
- Deployment run command is `node server/prod-start.mjs`, NOT `npm run start`. The bootstrap sets NODE_ENV=production itself.
- Node 20 silently ignores `reusePort`, so the placeholder MUST close before the real `server.listen` — the main server awaits `globalThis.__closeBootstrapPlaceholder()` right before listening, and exits on listen 'error' to avoid a zombie process.
- If boot timing changes (new heavy imports, more startup migrations), the placeholder absorbs it — but a hung startup would serve "Starting up" forever; pools have connection timeouts to prevent this.

Related gotcha fixed at the same time: regex patterns inside JS/SQL template literals need double backslashes (`\\s`, `\\(`, `\\d`) — single backslashes are eaten by the template literal, producing invalid Postgres regexes. One such bug ("parentheses not balanced") silently aborted ALL subsequent startup migrations in that try block on every prod boot.
