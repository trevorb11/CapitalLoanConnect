import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for production (Replit runs behind a proxy)
app.set('trust proxy', 1);

declare module 'express-session' {
  interface SessionData {
    user?: {
      isAuthenticated: boolean;
      role: 'admin' | 'agent' | 'partner';
      agentEmail?: string;
      agentName?: string;
      partnerId?: string;
      partnerEmail?: string;
      partnerName?: string;
      companyName?: string;
    };
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

const isProduction = process.env.NODE_ENV === 'production';

// Log startup
console.log(`[STARTUP] Starting server in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
console.log(`[STARTUP] DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`[STARTUP] SESSION_SECRET: ${process.env.SESSION_SECRET ? 'SET' : 'NOT SET'}`);

// Early health check - BEFORE any middleware that might fail
// This ensures the health check responds even if other things are broken
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('[STARTUP] Health check endpoint registered');

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Require SESSION_SECRET in production
if (isProduction && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET environment variable is required in production");
  process.exit(1);
}

// Create PostgreSQL session store for production with error handling
let sessionStore: any = undefined;

if (isProduction) {
  if (!process.env.DATABASE_URL) {
    console.error("[STARTUP] WARNING: DATABASE_URL not set, using memory session store");
  } else {
    try {
      console.log('[STARTUP] Creating PostgreSQL session store...');
      const PgSession = connectPgSimple(session);
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      sessionStore = new PgSession({
        pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      console.log('[STARTUP] PostgreSQL session store created successfully');
    } catch (error) {
      console.error('[STARTUP] Failed to create PostgreSQL session store:', error);
      console.log('[STARTUP] Falling back to memory session store');
    }
  }
}

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'tcg-dashboard-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: isProduction ? 'strict' : 'lax',
  }
}));

console.log('[STARTUP] Session middleware configured');

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    console.log('[STARTUP] Registering routes...');
    const server = await registerRoutes(app);
    console.log('[STARTUP] Routes registered successfully');

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error(`[ERROR] ${status}: ${message}`);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`[STARTUP] Server successfully started on port ${port}`);
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    process.exit(1);
  }
})();
