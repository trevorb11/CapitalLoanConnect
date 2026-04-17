/**
 * One-time script: save GigFi rejection results to the DB after batch submission.
 * Run with: npx tsx server/scripts/save-gigfi-results.ts
 */
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { loanApplications } from "../../shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle({ client: pool });

const results = [
  { id: "da0b06b9-5153-4087-9c89-a76f8ad83598", biz: "Arco Petroleum Transport INC",    decisionId: "019d9cf3-b04f-76b1-8324-794e044b5b70" },
  { id: "4885dfd5-e908-49c8-bbb1-dcc83118576b", biz: "ESCAPADEUSA INC",                  decisionId: "019d9cf3-b835-7cc3-8189-173132017bcf" },
  { id: "ec227db3-9373-4911-87ad-97f0e02f648e", biz: "The Wormac Group Inc",              decisionId: "019d9cf3-c41b-7950-8390-db7f56dda345" },
  { id: "d53f5776-5ce2-446d-9bf6-5372ee5e5fd4", biz: "ONELLA HOME CARE LLC",             decisionId: "019d9cf5-b34e-70c6-8b5e-43f01332021d" },
  { id: "a7005fc2-598a-47bb-a61e-17b8cad1c595", biz: "pure and healthy hair salon",      decisionId: "019d9cf5-bd0e-7478-8ee2-aa268d353cab" },
  { id: "025a90b3-fa56-490c-b7a9-730f6e67bdf4", biz: "WESTIN & CLARK LLC",               decisionId: "019d9cf5-c6c5-7127-83ac-90e69050339f" },
  { id: "be8d47d3-d5b9-4250-826c-b77b7ca9ff11", biz: "Andromel Estates Corporation",     decisionId: "019d9cf5-cf03-7964-8fec-7cb824c64029" },
  { id: "4a7b1dc5-8fea-4522-8059-68feea8a3992", biz: "Bfields Investment Group LLC",     decisionId: "019d9cf5-d862-7f34-83c0-0549a837ae83" },
];

async function run() {
  console.log("Saving GigFi results to DB...\n");
  for (const r of results) {
    await db.update(loanApplications)
      .set({ gigfiStatus: "REJECTED", gigfiDecisionId: r.decisionId })
      .where(eq(loanApplications.id, r.id));
    console.log(`✓ ${r.biz} — saved REJECTED | ${r.decisionId}`);
  }
  console.log("\nDone.");
  await pool.end();
}

run().catch(err => { console.error(err); process.exit(1); });
