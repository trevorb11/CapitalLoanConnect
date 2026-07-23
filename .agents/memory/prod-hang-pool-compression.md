---
name: Production hang causes & compression/SSE rule
description: Why the dashboard hung for some users at peak, and the rule that gzip compression must exclude SSE endpoints.
---

## Dashboard hangs at peak = DB pool exhaustion, not frontend

**Rule:** Every `Pool` in this app (Neon serverless driver and pg) must set `max`, `connectionTimeoutMillis` (~10s), and `idleTimeoutMillis`. The driver default is a small pool with an **infinite** connection wait — under concurrent logins requests queue forever, which looks like a hung/blank page for some users but not others.

**Why:** July 2026 production incident — internal team dashboard hung at peak. Root causes stacked: default pools with infinite wait, every dashboard load fetching full tables (1,600+ bank uploads) with no caching, and stale index.html after deploys referencing dead chunk files. There are multiple pools (main, session store, dialer/Neon); tuning only one leaves the hang reachable through the others.

**How to apply:** When adding any new Pool or heavy admin endpoint, set pool timeouts and consider a short server-side cache (with cache-bust on mutation handlers) plus React Query staleTime.

## Compression middleware breaks SSE

**Rule:** `app.use(compression())` must exclude streaming/SSE routes (the MCP SSE endpoint at `/api/mcp`, and any future SSE/streaming route) via the `filter` option. zlib buffers writes until flush/end, so SSE handshake events never reach the client — connections hang silently.

**How to apply:** Any new streaming endpoint must be added to the compression filter exclusion in the server entry file.
