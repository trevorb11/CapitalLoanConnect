/**
 * Migration script to backfill viewToken for existing bank statement uploads
 *
 * Run this script after deploying the viewToken schema update:
 * npx tsx server/scripts/backfill-view-tokens.ts
 */

import { db } from "../db";
import { bankStatementUploads } from "../../shared/schema";
import { isNull, eq } from "drizzle-orm";
import { randomBytes } from "crypto";

async function backfillViewTokens() {
  console.log("[MIGRATION] Starting backfill of viewTokens for existing bank statements...");

  try {
    // Get all statements without viewTokens
    const statementsWithoutTokens = await db
      .select()
      .from(bankStatementUploads)
      .where(isNull(bankStatementUploads.viewToken));

    console.log(`[MIGRATION] Found ${statementsWithoutTokens.length} statements without viewTokens`);

    if (statementsWithoutTokens.length === 0) {
      console.log("[MIGRATION] No statements need updating. Done!");
      return;
    }

    // Update each statement with a new viewToken
    let updated = 0;
    for (const statement of statementsWithoutTokens) {
      const viewToken = randomBytes(32).toString('hex');

      await db
        .update(bankStatementUploads)
        .set({ viewToken })
        .where(eq(bankStatementUploads.id, statement.id));

      updated++;
      if (updated % 10 === 0) {
        console.log(`[MIGRATION] Updated ${updated}/${statementsWithoutTokens.length} statements...`);
      }
    }

    console.log(`[MIGRATION] Successfully backfilled viewTokens for ${updated} statements`);
  } catch (error) {
    console.error("[MIGRATION] Error backfilling viewTokens:", error);
    process.exit(1);
  }

  process.exit(0);
}

backfillViewTokens();
