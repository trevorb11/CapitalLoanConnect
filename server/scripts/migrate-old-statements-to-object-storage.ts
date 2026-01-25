// Migration script to move old bank statements from local storage to Object Storage
// Old statements don't have the "bank-statements/" prefix, causing them to fail in combined view

import { Client } from "@replit/object-storage";
import { pool } from "../db";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

const objectStorageClient = new Client();
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "bank-statements");

interface StatementRecord {
  id: string;
  email: string;
  stored_file_name: string;
  original_file_name: string;
}

async function migrateStatements() {
  console.log("=== Migrating Old Bank Statements to Object Storage ===\n");

  // Get all statements without the "bank-statements/" prefix
  const result = await pool.query<StatementRecord>(`
    SELECT id, email, stored_file_name, original_file_name 
    FROM bank_statement_uploads 
    WHERE stored_file_name NOT LIKE 'bank-statements/%'
    ORDER BY created_at ASC
  `);

  const oldStatements = result.rows;
  console.log(`Found ${oldStatements.length} old statements to migrate\n`);

  if (oldStatements.length === 0) {
    console.log("No old statements to migrate!");
    return;
  }

  let migrated = 0;
  let failed = 0;
  let alreadyMigrated = 0;

  for (const stmt of oldStatements) {
    console.log(`\nProcessing: ${stmt.original_file_name} (${stmt.email})`);
    console.log(`  Current storage: ${stmt.stored_file_name}`);

    // Check if file exists locally
    const localPath = path.join(UPLOAD_DIR, stmt.stored_file_name);
    
    if (!fs.existsSync(localPath)) {
      console.log(`  ⚠ Local file not found at: ${localPath}`);
      
      // Check if maybe it was already migrated (file exists in object storage)
      const newObjectName = `bank-statements/${stmt.stored_file_name}`;
      try {
        const existsResult = await objectStorageClient.exists(newObjectName);
        if (existsResult.ok && existsResult.value) {
          console.log(`  ✓ Already exists in Object Storage, updating database...`);
          await pool.query(
            `UPDATE bank_statement_uploads SET stored_file_name = $1 WHERE id = $2`,
            [newObjectName, stmt.id]
          );
          alreadyMigrated++;
          continue;
        }
      } catch (e) {
        // Ignore errors checking object storage
      }
      
      failed++;
      continue;
    }

    // Read the local file
    console.log(`  Reading local file...`);
    const fileBuffer = fs.readFileSync(localPath);
    console.log(`  File size: ${fileBuffer.length} bytes`);

    // Upload to object storage with new path
    const objectId = randomUUID();
    const newObjectName = `bank-statements/${objectId}-${stmt.original_file_name}`;
    
    console.log(`  Uploading to Object Storage: ${newObjectName}`);
    
    try {
      // Encode as base64 (matching existing upload logic)
      const base64Content = fileBuffer.toString("base64");
      const uploadResult = await objectStorageClient.uploadFromText(newObjectName, base64Content);
      
      if (!uploadResult.ok) {
        throw new Error(`Upload failed: ${uploadResult.error?.message || "Unknown error"}`);
      }

      // Update database record
      await pool.query(
        `UPDATE bank_statement_uploads SET stored_file_name = $1 WHERE id = $2`,
        [newObjectName, stmt.id]
      );

      console.log(`  ✓ Migrated successfully!`);
      migrated++;
    } catch (error) {
      console.error(`  ✗ Migration failed:`, error);
      failed++;
    }
  }

  console.log("\n=== Migration Complete ===");
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Already in Object Storage: ${alreadyMigrated}`);
  console.log(`  Failed: ${failed}`);
}

// Run the migration
migrateStatements()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
