import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                        // allow more concurrent queries during peak logins (default was 10)
  connectionTimeoutMillis: 10_000, // fail fast instead of hanging forever waiting for a free connection
  idleTimeoutMillis: 30_000,       // release idle connections back to PostgreSQL
});

// Prevent unhandled pool errors from crashing the server
pool.on('error', (err) => {
  console.error('[DB] Pool connection error (non-fatal):', err);
});

export const db = drizzle({ client: pool, schema });

// Neon pool for dialer tables (dialer_contacts, dialer_sessions)
// The main pool connects to the local Replit Postgres (merchant portal).
// Dialer data lives in the Neon database.
const neonDbUrl = process.env.NEON_DATABASE_URL;
export const neonPool = neonDbUrl ? new Pool({
  connectionString: neonDbUrl,
  max: 10,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
}) : null;
if (neonPool) {
  neonPool.on("error", (err) => {
    console.error("[NEON DB] Dialer pool connection error (non-fatal):", err);
  });
  console.log("[NEON DB] Dialer PostgreSQL pool initialized");
} else {
  console.warn("[NEON DB] NEON_DATABASE_URL not set — dialer queries will fail");
}
