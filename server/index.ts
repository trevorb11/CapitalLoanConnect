import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { pollSalesforceChanges } from "./services/salesforcePoll";
import { registerMcpRoutes } from "./mcp";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduledTriggers } from "./messaging-triggers";
import { db } from "./db";
import { sql } from "drizzle-orm";

const app = express();

// Trust proxy for production (Replit runs behind a proxy)
app.set('trust proxy', 1);

declare module 'express-session' {
  interface SessionData {
    user?: {
      isAuthenticated: boolean;
      role: 'admin' | 'agent' | 'partner' | 'underwriting' | 'user' | 'merchant' | 'lead';
      agentEmail?: string;
      agentName?: string;
      partnerId?: string;
      partnerEmail?: string;
      partnerName?: string;
      companyName?: string;
      merchantEmail?: string;
      merchantName?: string;
    };
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

const isProduction = process.env.NODE_ENV === 'production';

// Prevent database/network errors from crashing the server process
process.on('uncaughtException', (err) => {
  console.error('[PROCESS] Uncaught exception (server kept alive):', err.message);
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error('[PROCESS] Unhandled promise rejection (server kept alive):', msg);
});

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
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
      pool.on('error', (err) => {
        console.error('[SESSION POOL] Connection error (non-fatal):', err.message);
      });
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
    // Run lightweight startup migrations (idempotent — safe to run on every boot)
    try {
      await db.execute(sql`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS gigfi_submitted_at TIMESTAMP`);
      await db.execute(sql`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS gigfi_bank_connected_at TIMESTAMP`);
      await db.execute(sql`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS gigfi_approved_at TIMESTAMP`);
      console.log('[STARTUP] Migration: gigfi columns ensured');
      // Underwriting AI snapshots table
      await db.execute(sql`CREATE TABLE IF NOT EXISTS underwriting_snapshots (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        snapshot JSONB NOT NULL,
        ran_at TIMESTAMP DEFAULT NOW(),
        ran_by TEXT,
        files_processed INTEGER DEFAULT 0
      )`);
      console.log('[STARTUP] Migration: underwriting_snapshots ensured');
      // Rep call stats table (for Zoom Phone webhook dial log)
      await db.execute(sql`CREATE TABLE IF NOT EXISTS rep_call_stats (
        id VARCHAR(255) PRIMARY KEY,
        rep_name TEXT,
        rep_email TEXT,
        call_id TEXT,
        call_type TEXT,
        direction TEXT,
        duration INTEGER,
        caller_number TEXT,
        callee_number TEXT,
        caller_name TEXT,
        callee_name TEXT,
        result TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        recording_url TEXT,
        zoom_user_id TEXT,
        zoom_user_email TEXT,
        raw_payload JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log('[STARTUP] Migration: rep_call_stats ensured');
      // Rep #2 column on underwriting decisions
      await db.execute(sql`ALTER TABLE business_underwriting_decisions ADD COLUMN IF NOT EXISTS assigned_rep_2 TEXT`);
      console.log('[STARTUP] Migration: assigned_rep_2 column ensured');
      // UW submission timestamp on loan applications
      await db.execute(sql`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS uw_submitted_at TIMESTAMP`);
      console.log('[STARTUP] Migration: uw_submitted_at column ensured');
      // Pipeline reports table
      await db.execute(sql`CREATE TABLE IF NOT EXISTS pipeline_reports (
        id SERIAL PRIMARY KEY,
        rep_name TEXT NOT NULL,
        rep_email TEXT,
        report_date DATE NOT NULL DEFAULT CURRENT_DATE,
        report_type TEXT NOT NULL DEFAULT 'daily',
        html_content TEXT NOT NULL,
        deal_count INTEGER DEFAULT 0,
        high_count INTEGER DEFAULT 0,
        total_value NUMERIC(12,2) DEFAULT 0,
        deals_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log('[STARTUP] Migration: pipeline_reports table ensured');
      // Merchant notes table (rep-facing notes per business)
      await db.execute(sql`CREATE TABLE IF NOT EXISTS merchant_notes (
        id SERIAL PRIMARY KEY,
        business_email TEXT NOT NULL,
        business_name TEXT,
        note TEXT NOT NULL,
        author_name TEXT,
        author_email TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_merchant_notes_email ON merchant_notes (LOWER(business_email))`);
      console.log('[STARTUP] Migration: merchant_notes table ensured');
      // GHL Pipeline Reports — per-rep pipeline analysis reports
      await db.execute(sql`CREATE TABLE IF NOT EXISTS ghl_pipeline_reports (
        id SERIAL PRIMARY KEY,
        rep_name TEXT NOT NULL,
        rep_email TEXT,
        report_date DATE NOT NULL,
        report_type TEXT NOT NULL DEFAULT 'daily',
        pipeline_name TEXT NOT NULL DEFAULT '1. App Sent',
        html_content TEXT NOT NULL,
        deal_count INTEGER DEFAULT 0,
        stale_count INTEGER DEFAULT 0,
        high_count INTEGER DEFAULT 0,
        total_value NUMERIC(12,2) DEFAULT 0,
        avg_days NUMERIC(5,1) DEFAULT 0,
        health_rating TEXT,
        deals_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log('[STARTUP] Migration: ghl_pipeline_reports table ensured');
      // GHL Pipeline Snapshots — company-wide overarching reports
      await db.execute(sql`CREATE TABLE IF NOT EXISTS ghl_pipeline_snapshots (
        id SERIAL PRIMARY KEY,
        report_date DATE NOT NULL,
        pipeline_name TEXT NOT NULL,
        report_type TEXT NOT NULL DEFAULT 'daily',
        total_opps INTEGER,
        total_value NUMERIC(12,2),
        total_stale_30_plus INTEGER,
        total_fresh_7_or_less INTEGER,
        total_unassigned INTEGER,
        opps_with_value INTEGER,
        avg_days_in_stage NUMERIC(5,1),
        report_html TEXT,
        rep_summary JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log('[STARTUP] Migration: ghl_pipeline_snapshots table ensured');
      // GHL Opportunity Snapshots — per-opp granular tracking
      await db.execute(sql`CREATE TABLE IF NOT EXISTS ghl_opportunity_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE NOT NULL,
        pipeline_name TEXT NOT NULL DEFAULT '1. App Sent',
        opp_id TEXT NOT NULL,
        opp_name TEXT,
        company_name TEXT,
        rep_name TEXT,
        stage_name TEXT,
        monetary_value NUMERIC(12,2),
        days_in_stage INTEGER,
        has_email BOOLEAN,
        has_phone BOOLEAN,
        status TEXT,
        last_stage_change TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      console.log('[STARTUP] Migration: ghl_opportunity_snapshots table ensured');
      // Structured declines JSONB column
      await db.execute(sql`ALTER TABLE business_underwriting_decisions ADD COLUMN IF NOT EXISTS additional_declines JSONB`);
      console.log('[STARTUP] Migration: additional_declines column ensured');
      // One-time backfill: parse legacy decline_reason text into additional_declines JSONB
      const backfillDeclines = await db.execute(sql`
        UPDATE business_underwriting_decisions
        SET additional_declines = (
          SELECT jsonb_agg(jsonb_build_object(
            'id', 'decl-legacy-' || row_number,
            'lender', CASE
              WHEN part LIKE '%(%' THEN trim(substring(part FROM '\(([^)]+)\)'))
              ELSE 'Unknown'
            END,
            'reason', CASE
              WHEN part LIKE '%(%' THEN trim(substring(part FROM '^(.+)\s*\('))
              ELSE trim(part)
            END,
            'date', CASE
              WHEN part ~ '\d{4}-\d{2}-\d{2}' THEN substring(part FROM '(\d{4}-\d{2}-\d{2})')
              ELSE null
            END,
            'createdAt', NOW()
          ))
          FROM (
            SELECT trim(unnest(string_to_array(decline_reason, ';'))) AS part,
                   row_number() OVER () AS row_number
          ) parts
          WHERE part != ''
        )
        WHERE decline_reason IS NOT NULL
          AND decline_reason != ''
          AND additional_declines IS NULL
      `);
      if ((backfillDeclines as any).rowCount > 0)
        console.log(`[STARTUP] Backfill: parsed decline_reason into additional_declines for ${(backfillDeclines as any).rowCount} rows`);
      // Merchants table + merchant_id FK on loan_applications
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS merchants (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
          business_name TEXT,
          primary_email TEXT,
          primary_phone TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS merchant_id VARCHAR(255)`);
      // FK constraint: loan_applications.merchant_id → merchants.id
      await db.execute(sql`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_loan_applications_merchant_id'
          ) THEN
            ALTER TABLE loan_applications
              ADD CONSTRAINT fk_loan_applications_merchant_id
              FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL;
          END IF;
        END $$
      `);
      // Helpful lookup indexes (idempotent)
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_merchants_primary_email ON merchants (LOWER(primary_email))`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_loan_applications_merchant_id ON loan_applications (merchant_id)`);
      console.log('[STARTUP] Migration: merchants table + merchant_id column ensured');
      // Sequential per-app backfill: email → phone → business name (same logic as findOrCreateMerchant)
      await db.execute(sql`
        DO $$
        DECLARE
          r RECORD;
          norm_email TEXT;
          norm_phone TEXT;
          norm_biz   TEXT;
          mid        VARCHAR(255);
        BEGIN
          FOR r IN
            SELECT id, email, phone, legal_business_name, business_name
            FROM loan_applications
            WHERE merchant_id IS NULL
            ORDER BY created_at
          LOOP
            norm_email := LOWER(TRIM(COALESCE(r.email, '')));
            norm_phone := REGEXP_REPLACE(COALESCE(r.phone, ''), '[^0-9]', '', 'g');
            norm_biz   := LOWER(TRIM(COALESCE(r.legal_business_name, r.business_name, '')));
            mid := NULL;

            -- 1. Match by email
            IF norm_email != '' THEN
              SELECT id INTO mid FROM merchants WHERE LOWER(primary_email) = norm_email LIMIT 1;
            END IF;

            -- 2. Match by phone
            IF mid IS NULL AND LENGTH(norm_phone) >= 10 THEN
              SELECT id INTO mid FROM merchants
              WHERE REGEXP_REPLACE(COALESCE(primary_phone,''), '[^0-9]', '', 'g') = norm_phone
                AND LENGTH(REGEXP_REPLACE(COALESCE(primary_phone,''), '[^0-9]', '', 'g')) >= 10
              LIMIT 1;
            END IF;

            -- 3. Match by business name
            IF mid IS NULL AND LENGTH(norm_biz) > 2 THEN
              SELECT id INTO mid FROM merchants
              WHERE LOWER(TRIM(COALESCE(business_name, ''))) = norm_biz
              LIMIT 1;
            END IF;

            -- 4. Create new merchant if still not found
            IF mid IS NULL THEN
              INSERT INTO merchants (id, business_name, primary_email, primary_phone, created_at)
              VALUES (
                gen_random_uuid(),
                COALESCE(r.legal_business_name, r.business_name),
                CASE WHEN norm_email != '' THEN norm_email ELSE NULL END,
                CASE WHEN LENGTH(norm_phone) >= 10 THEN norm_phone ELSE NULL END,
                NOW()
              )
              RETURNING id INTO mid;
            END IF;

            UPDATE loan_applications SET merchant_id = mid WHERE id = r.id;
          END LOOP;
        END;
        $$
      `);
      const backfillResult = await db.execute(sql`SELECT COUNT(*) FROM merchants`);
      console.log(`[STARTUP] Merchant backfill complete: ${(backfillResult.rows[0] as any).count} merchants`);
      // Backfill rep_call_stats: reassign Carlos Batista → Jonathan Rendon
      const carlosBackfill = await db.execute(sql`
        UPDATE rep_call_stats
        SET rep_name = 'Jonathan Rendon', rep_email = 'jonathan@todaycapitalgroup.com'
        WHERE rep_name = 'Carlos Batista'
      `);
      if ((carlosBackfill as any).rowCount > 0)
        console.log(`[STARTUP] Backfill: reassigned ${(carlosBackfill as any).rowCount} Carlos Batista calls → Jonathan Rendon`);
      // Backfill rep_call_stats: fill missing email for Gregory Dergevorkian
      const gregBackfill = await db.execute(sql`
        UPDATE rep_call_stats
        SET rep_email = 'greg@todaycapitalgroup.com'
        WHERE rep_name = 'Gregory Dergevorkian' AND (rep_email IS NULL OR rep_email = '')
      `);
      if ((gregBackfill as any).rowCount > 0)
        console.log(`[STARTUP] Backfill: filled email for ${(gregBackfill as any).rowCount} Gregory Dergevorkian records`);
      // Backfill submitted_at from UUID v7 decision IDs for any rows missing it
      const backfill = await db.execute(sql`
        UPDATE loan_applications
        SET gigfi_submitted_at = to_timestamp(
          ('x' || left(replace(gigfi_decision_id, '-', ''), 12))::bit(48)::bigint / 1000.0
        )
        WHERE gigfi_decision_id IS NOT NULL AND gigfi_submitted_at IS NULL
      `);
      const count = (backfill as any).rowCount ?? 0;
      if (count > 0) console.log(`[STARTUP] Migration: backfilled gigfi_submitted_at for ${count} rows`);
    } catch (migErr) {
      console.warn('[STARTUP] Migration warning (non-fatal):', migErr);
    }

    console.log('[STARTUP] Registering routes...');
    const server = await registerRoutes(app);
    registerMcpRoutes(app);
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

      // Start scheduled messaging triggers (stale approval reminders, incomplete app nudges)
      startScheduledTriggers();

      // Auto-poll Salesforce for inbound changes every 15 minutes
      const SF_POLL_INTERVAL_MS = 15 * 60 * 1000;
      if (process.env.SF_INSTANCE_URL && (process.env.SF_REFRESH_TOKEN || process.env.SF_ACCESS_TOKEN)) {
        console.log(`[STARTUP] SF auto-poll enabled (every ${SF_POLL_INTERVAL_MS / 1000}s)`);
        // Initial poll after 30s delay (let server fully warm up)
        setTimeout(() => {
          pollSalesforceChanges().catch(err =>
            console.error("[SF Poll] Initial poll error:", err.message)
          );
        }, 30000);
        // Then every 5 minutes
        setInterval(() => {
          pollSalesforceChanges().catch(err =>
            console.error("[SF Poll] Scheduled poll error:", err.message)
          );
        }, SF_POLL_INTERVAL_MS);
      } else {
        console.log("[STARTUP] SF auto-poll disabled — no SF credentials configured");
      }
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    process.exit(1);
  }
})();
