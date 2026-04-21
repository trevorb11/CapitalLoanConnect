/**
 * One-time migration: add gigfi_submitted_at column and backfill from UUID v7 decision IDs
 * Run: tsx scripts/migrate-gigfi-submitted-at.ts
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding gigfi_submitted_at column...");
  await db.execute(sql`
    ALTER TABLE loan_applications
    ADD COLUMN IF NOT EXISTS gigfi_submitted_at TIMESTAMP;
  `);
  console.log("Column added (or already exists).");

  console.log("Backfilling gigfi_submitted_at from UUID v7 decision IDs...");
  const result = await db.execute(sql`
    UPDATE loan_applications
    SET gigfi_submitted_at = to_timestamp(
      ('x' || left(replace(gigfi_decision_id, '-', ''), 12))::bit(48)::bigint / 1000.0
    )
    WHERE gigfi_decision_id IS NOT NULL
      AND gigfi_submitted_at IS NULL;
  `);
  console.log(`Backfilled ${(result as any).rowCount ?? "?"} rows.`);
  console.log("Done.");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
