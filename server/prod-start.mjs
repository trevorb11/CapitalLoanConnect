// Production bootstrap: binds the port immediately so deployment health checks
// pass while the main server bundle (~6s of module loading + migrations) initializes.
// The main server calls globalThis.__closeBootstrapPlaceholder() right before it
// binds the port itself (see server/index.ts).
import http from "http";

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const port = parseInt(process.env.PORT || "5000", 10);

const placeholder = http.createServer((req, res) => {
  // Serve the auto-refreshing "starting up" page for ANY page navigation
  // (/dashboard, /track, ...), not just "/" — a bare 503 during the boot
  // window reads as "site can't be reached" to users. API and asset
  // requests still get 503 + Retry-After so clients retry instead of
  // parsing HTML.
  const url = typeof req.url === "string" ? req.url : "/";
  const isPageGet =
    (req.method === "GET" || req.method === "HEAD") &&
    !url.startsWith("/api/") &&
    !/\.(js|mjs|css|map|json|png|jpg|jpeg|gif|ico|svg|webp|woff2?|ttf|eot)(\?.*)?$/i.test(url);
  if (isPageGet) {
    res.writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
      "Connection": "close",
    });
    res.end(
      '<!doctype html><html><head><meta http-equiv="refresh" content="2"><title>Starting up</title></head>' +
      '<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#334155">Starting up&hellip;</body></html>'
    );
  } else {
    res.writeHead(503, { "Retry-After": "2", "Connection": "close" });
    res.end();
  }
});

placeholder.listen({ port, host: "0.0.0.0" }, () => {
  console.log(`[BOOTSTRAP] Placeholder listening on port ${port} while main server loads`);
});

globalThis.__closeBootstrapPlaceholder = () =>
  new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("[BOOTSTRAP] Placeholder close timed out — continuing anyway");
      resolve();
    }, 3000);
    if (typeof timeout.unref === "function") timeout.unref();
    placeholder.close(() => {
      clearTimeout(timeout);
      console.log("[BOOTSTRAP] Placeholder closed — main server taking over");
      resolve();
    });
    if (typeof placeholder.closeAllConnections === "function") {
      placeholder.closeAllConnections();
    }
  });

try {
  await import("../dist/index.js");
} catch (err) {
  console.error("[BOOTSTRAP] Failed to load main server:", err);
  process.exit(1);
}
