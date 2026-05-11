/**
 * GigFi Restore Accepted — April 21, 2026
 *
 * Restores the correct ACCEPTED statuses (with morning decision IDs) to
 * the production database. These were overwritten by a re-run that triggered
 * GigFi's same-day duplicate detection (all came back REJECTED).
 *
 * Decision IDs recovered from workflow server logs:
 *   .local/state/workflow-logs/VO4jjGdk-a5fiAZf7UpdD/start_application.shell.exec.0
 *
 * Run:
 *   tsx scripts/gigfi-restore-accepted.ts
 */

const PROD_API = "https://app.todaycapitalgroup.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";

const ACCEPTED_RECORDS = [
  // ── APR21 batch (6:02–6:04 PM run) ────────────────────────────────────────
  { id: "ce3c2f8a-be1c-4dea-a7c9-6ad0c9789ec6", name: "Rodolfo Cardona",      decisionId: "019db135-7d9d-7b78-8899-cdc2ef820584" },
  { id: "b81e952d-fb05-4f55-8fc7-7fef9cc65c6d", name: "ABRAM SALAS",           decisionId: "019db135-8b3e-7a86-8db6-887dfa419b4a" },
  { id: "fe7274f8-7892-4644-9e0f-cd0a6894669f", name: "Aaron Blandon",         decisionId: "019db135-9970-7f01-8f61-cf18fd85c954" },
  { id: "9907bbab-3048-4467-adf1-ebebf6b25ddf", name: "Adam Turnbull",         decisionId: "019db135-a406-70ed-89be-69e2a9fb866e" },
  { id: "54501a73-13dc-4aab-851c-593a34bd12c3", name: "Eddie Sanin",           decisionId: "019db135-f93a-7012-8cec-1dcd58bba127" },
  { id: "4e70e31c-9518-4bd9-8eef-e83f97cf252d", name: "Enzo Fierros",          decisionId: "019db136-0848-769e-84df-196ccd73afea" },
  { id: "d8479156-decd-4835-905c-1828ab9d30ee", name: "Herbert Moore",         decisionId: "019db136-177f-78f8-8cf9-e52127947024" },
  { id: "82d3611c-4ef1-419e-aa28-8c0fc00ae824", name: "Jack Artinian",         decisionId: "019db136-2454-7c8e-8390-e2dac3ed2c28" },
  { id: "0b46576f-a6c3-4778-b35a-5b542f63a2cf", name: "Jose Olalde",           decisionId: "019db136-36dd-7dd7-815b-74896e6a9855" },
  { id: "813e6402-f495-4abf-be5a-cae6a32562c6", name: "Juan Carlos Garcia",    decisionId: "019db136-4566-70fe-8175-ec9a535a79c8" },
  { id: "930e6a55-b886-4afa-b4d8-82ec8160d37d", name: "KEVIN HATCHER",         decisionId: "019db136-5288-7097-86a8-846b2d3aa983" },
  { id: "8419ad61-d85d-4ecb-b22f-6b695667e9e5", name: "Keith Barron",          decisionId: "019db136-5f60-72d3-84be-dbd73e773b9a" },
  { id: "5e320703-4675-4458-9642-38d5cc84c6a6", name: "Kelson Harris",         decisionId: "019db136-6b11-75a0-8a0d-c1af9b6b7b6f" },
  { id: "191eeedb-291b-4ce1-a932-75e42aa0810e", name: "Lester Wade",           decisionId: "019db136-80eb-7223-8685-e162d5771687" },
  { id: "240e33f2-e178-4158-bbb7-1e478fde1677", name: "Nicholas Mcfall",       decisionId: "019db136-9e95-7197-8445-32036b560acc" },
  { id: "5b81a22b-baba-4c54-a7f3-5176a89f5a25", name: "PEDRO PEREZ",           decisionId: "019db136-a924-7c64-8c31-c8096c91bc06" },
  { id: "8cbf4cc3-8471-4a4a-964b-2cb3d0164f38", name: "Robert Lapham",         decisionId: "019db136-b70f-7957-8524-80a3b10a7049" },
  { id: "a852097b-7b0f-4192-b337-5b91d1f135de", name: "STEVEN L HILLS",        decisionId: "019db136-c4d0-7383-81a7-3acc4f40412d" },
  { id: "92a3d567-445d-4459-9810-ec976ae86845", name: "Selvin Ordonez",        decisionId: "019db136-d39e-7521-83e4-29d6a847eb7b" },
  { id: "b0281b3a-8317-42af-9f69-9a81a5f6d06e", name: "Terrell Thomas",        decisionId: "019db136-ddb8-7be2-8f32-0837b69f4015" },
  { id: "1af77371-fbda-4768-a1d6-a67bce2ba45b", name: "Tyler Bountom",         decisionId: "019db136-ef1c-7593-8903-03da5b02b951" },
  { id: "50b79453-ed97-4568-8206-42d07eaf9453", name: "Yender Gutierrez",      decisionId: "019db136-fd17-7af7-8f3e-e6922dbbaca6" },
  { id: "090d4233-183a-45c9-9f09-18093cd22042", name: "Michael Ventry",        decisionId: "019db137-0805-7dba-88d1-65d962240fd3" },
  { id: "9ab15598-9b30-4b83-9650-b8404977cc54", name: "Robert Gutierrez",      decisionId: "019db137-1399-7fe1-82ec-60b4b71c1bf1" },

  // ── APR21 — Richard Bryant (accepted in the very first run, 4:48 PM) ───────
  { id: "859d57b0-0dc3-4934-86f9-6fcf3a7462c6", name: "Richard Bryant",        decisionId: "019db0f1-c9ef-7bfb-8ca5-117ce286523a" },

  // ── FEB-DECLINED batch (6:00 PM run) ──────────────────────────────────────
  { id: "6c4319fa-5b80-411f-bca6-09f4c648a079", name: "Robert Levesque",       decisionId: "019db133-2802-7669-80a8-a4ea16860733" },
  { id: "6e2c7e7c-0b73-44cd-bc27-3f46e88abb2d", name: "Terry Bennett",         decisionId: "019db133-3772-727f-82cb-05ad1babcdf6" },
  { id: "759167ab-f03c-422e-967a-041d17c0b4c1", name: "Michael Torell II",     decisionId: "019db133-43b5-792c-8f1f-046e8404e267" },
  { id: "3bd21684-4455-4ffd-9406-40fe5b12a3f7", name: "JOHN MARTIN",           decisionId: "019db133-8a66-72f0-8d56-0ff1a0442e5a" },
  { id: "17318c76-f075-45f6-9f6d-338b08f2c96b", name: "ERIC ROYAL",            decisionId: "019db133-9502-7337-82e7-636585fd37db" },
  { id: "b8a3d57f-2f3c-4764-8932-0dc45651ece5", name: "Cristina Hernandez",    decisionId: "019db133-ad1f-76c8-84b9-730afe0de646" },

  // ── FEB4-DECLINED batch (6:08 PM run) ─────────────────────────────────────
  { id: "a81459d4-4e2c-48e1-af5c-2d8ed1a634d8", name: "David Robison",         decisionId: "019db13a-5d40-79d2-8625-6d8a1b93a9e7" },
  { id: "69c7e619-5979-4f27-ac09-3fc966464c0e", name: "LORI MOORE",            decisionId: "019db13a-7643-7d6b-87ce-1b77e4042931" },
  { id: "520e9a67-e68f-4984-9978-5aff2cbfa253", name: "Harold Andrew Justrabo",decisionId: "019db13a-83fd-7f49-8e13-73f92e33ee91" },
  { id: "53840054-c2a6-4591-85a7-02ef77bc7a8e", name: "Vic Shelton",           decisionId: "019db13a-980b-744a-8866-afc833448438" },
  { id: "cb4c3c86-8f73-4d8c-8fc1-3f15e4ae0bb1", name: "Maria Leiton",          decisionId: "019db13a-b779-760d-8a28-72e151fad1ff" },
];

async function restoreRecord(rec: { id: string; name: string; decisionId: string }) {
  const res = await fetch(`${PROD_API}/api/gigfi/external/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_PASSWORD}` },
    body: JSON.stringify({ applicationId: rec.id, status: "ACCEPTED", decisionId: rec.decisionId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log(`\n=== GigFi Restore Accepted — ${new Date().toISOString()} ===`);
  console.log(`Target: ${PROD_API}`);
  console.log(`Records to restore: ${ACCEPTED_RECORDS.length}\n`);

  let ok = 0, failed = 0;
  for (const rec of ACCEPTED_RECORDS) {
    process.stdout.write(`  ${rec.name} [${rec.id.slice(0, 8)}] → `);
    try {
      await restoreRecord(rec);
      console.log(`RESTORED (decisionId=${rec.decisionId})`);
      ok++;
    } catch (e: any) {
      console.log(`FAILED — ${e.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Done: ${ok} restored, ${failed} failed ===\n`);
}

main().catch(console.error);
