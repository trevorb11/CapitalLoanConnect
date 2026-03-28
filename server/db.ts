import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Prevent unhandled pool errors (e.g. Neon terminating idle connections) from crashing the server
pool.on('error', (err) => {
  console.error('[DB] Pool connection error (non-fatal):', err.message);
});

export const db = drizzle({ client: pool, schema });

// Neon pool for dialer tables (dialer_contacts, dialer_sessions)
// The main pool connects to the local Replit Postgres (merchant portal).
// Dialer data lives in the Neon database.
const neonDbUrl = process.env.NEON_DATABASE_URL;
export const neonPool = neonDbUrl ? new Pool({ connectionString: neonDbUrl }) : null;
if (neonPool) {
  neonPool.on("error", (err) => {
    console.error("[NEON DB] Pool connection error (non-fatal):", err.message);
  });
  console.log("[NEON DB] Dialer database pool initialized");
} else {
  console.warn("[NEON DB] NEON_DATABASE_URL not set — dialer queries will fail");
}
