// Script to generate view tokens for bank statements that are missing them
import { pool } from "../db";
import { randomBytes } from "crypto";

interface StatementRecord {
  id: string;
  email: string;
  original_file_name: string;
  view_token: string | null;
}

async function generateMissingTokens() {
  console.log("=== Generating Missing View Tokens ===\n");

  // Find all statements without view tokens
  const result = await pool.query<StatementRecord>(`
    SELECT id, email, original_file_name, view_token 
    FROM bank_statement_uploads 
    WHERE view_token IS NULL OR view_token = ''
    ORDER BY created_at ASC
  `);

  const statements = result.rows;
  console.log(`Found ${statements.length} statements without view tokens\n`);

  if (statements.length === 0) {
    console.log("All statements already have view tokens!");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const stmt of statements) {
    console.log(`Processing: ${stmt.original_file_name} (${stmt.email})`);
    
    try {
      // Generate a secure random 64-character hex token
      const viewToken = randomBytes(32).toString('hex');
      
      await pool.query(
        `UPDATE bank_statement_uploads SET view_token = $1 WHERE id = $2`,
        [viewToken, stmt.id]
      );
      
      console.log(`  ✓ Generated token: ${viewToken.substring(0, 16)}...`);
      updated++;
    } catch (error) {
      console.error(`  ✗ Failed:`, error);
      failed++;
    }
  }

  console.log("\n=== Complete ===");
  console.log(`  Updated: ${updated}`);
  console.log(`  Failed: ${failed}`);
}

// Run the script
generateMissingTokens()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
