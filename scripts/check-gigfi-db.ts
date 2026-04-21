import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const rows = await db.execute(sql`
    SELECT id, gigfi_status, gigfi_decision_id, gigfi_submitted_at, created_at
    FROM loan_applications
    WHERE gigfi_status IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 15
  `);
  console.log(`Total GigFi rows: ${(rows as any).rows?.length ?? rows.length}`);
  const data = (rows as any).rows ?? rows;
  data.forEach((r: any) => {
    console.log(`  ${r.id.slice(0,8)} | status=${r.gigfi_status} | decision=${r.gigfi_decision_id?.slice(0,8) ?? 'NULL'} | submitted_at=${r.gigfi_submitted_at ?? 'NULL'}`);
  });
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
