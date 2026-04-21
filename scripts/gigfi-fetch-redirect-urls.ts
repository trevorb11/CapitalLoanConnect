/**
 * GigFi Fetch Redirect URLs — via Taktile Decisions API
 *
 * Attempts to retrieve the accept/redirect URL for each ACCEPTED application
 * by querying the Taktile Decisions API with the stored decision IDs.
 *
 * Taktile stores all past decisions and exposes them via their data API.
 * The redirect_url is included in the original decision response data.
 *
 * Run:
 *   GIGFI_API_KEY=<your-key> tsx scripts/gigfi-fetch-redirect-urls.ts
 *
 * To also write found URLs back to production DB add --save:
 *   GIGFI_API_KEY=<your-key> tsx scripts/gigfi-fetch-redirect-urls.ts --save
 */

import fs from "fs";
import path from "path";

const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const PROD_API = "https://app.todaycapitalgroup.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const SAVE = process.argv.includes("--save");

// Taktile decisions base URL (remove /decide from the submit endpoint)
const TAKTILE_BASE = "https://risk.bf9baa41.decide.taktile.com";
const FLOW_SLUG = "gigfileads";

const ACCEPTED_RECORDS = [
  // APR21 batch
  { id: "ce3c2f8a-be1c-4dea-a7c9-6ad0c9789ec6", name: "Rodolfo Cardona",       decisionId: "019db135-7d9d-7b78-8899-cdc2ef820584" },
  { id: "b81e952d-fb05-4f55-8fc7-7fef9cc65c6d", name: "ABRAM SALAS",            decisionId: "019db135-8b3e-7a86-8db6-887dfa419b4a" },
  { id: "fe7274f8-7892-4644-9e0f-cd0a6894669f", name: "Aaron Blandon",          decisionId: "019db135-9970-7f01-8f61-cf18fd85c954" },
  { id: "9907bbab-3048-4467-adf1-ebebf6b25ddf", name: "Adam Turnbull",          decisionId: "019db135-a406-70ed-89be-69e2a9fb866e" },
  { id: "54501a73-13dc-4aab-851c-593a34bd12c3", name: "Eddie Sanin",            decisionId: "019db135-f93a-7012-8cec-1dcd58bba127" },
  { id: "4e70e31c-9518-4bd9-8eef-e83f97cf252d", name: "Enzo Fierros",           decisionId: "019db136-0848-769e-84df-196ccd73afea" },
  { id: "d8479156-decd-4835-905c-1828ab9d30ee", name: "Herbert Moore",          decisionId: "019db136-177f-78f8-8cf9-e52127947024" },
  { id: "82d3611c-4ef1-419e-aa28-8c0fc00ae824", name: "Jack Artinian",          decisionId: "019db136-2454-7c8e-8390-e2dac3ed2c28" },
  { id: "0b46576f-a6c3-4778-b35a-5b542f63a2cf", name: "Jose Olalde",            decisionId: "019db136-36dd-7dd7-815b-74896e6a9855" },
  { id: "813e6402-f495-4abf-be5a-cae6a32562c6", name: "Juan Carlos Garcia",     decisionId: "019db136-4566-70fe-8175-ec9a535a79c8" },
  { id: "930e6a55-b886-4afa-b4d8-82ec8160d37d", name: "KEVIN HATCHER",          decisionId: "019db136-5288-7097-86a8-846b2d3aa983" },
  { id: "8419ad61-d85d-4ecb-b22f-6b695667e9e5", name: "Keith Barron",           decisionId: "019db136-5f60-72d3-84be-dbd73e773b9a" },
  { id: "5e320703-4675-4458-9642-38d5cc84c6a6", name: "Kelson Harris",          decisionId: "019db136-6b11-75a0-8a0d-c1af9b6b7b6f" },
  { id: "191eeedb-291b-4ce1-a932-75e42aa0810e", name: "Lester Wade",            decisionId: "019db136-80eb-7223-8685-e162d5771687" },
  { id: "240e33f2-e178-4158-bbb7-1e478fde1677", name: "Nicholas Mcfall",        decisionId: "019db136-9e95-7197-8445-32036b560acc" },
  { id: "5b81a22b-baba-4c54-a7f3-5176a89f5a25", name: "PEDRO PEREZ",            decisionId: "019db136-a924-7c64-8c31-c8096c91bc06" },
  { id: "8cbf4cc3-8471-4a4a-964b-2cb3d0164f38", name: "Robert Lapham",          decisionId: "019db136-b70f-7957-8524-80a3b10a7049" },
  { id: "a852097b-7b0f-4192-b337-5b91d1f135de", name: "STEVEN L HILLS",         decisionId: "019db136-c4d0-7383-81a7-3acc4f40412d" },
  { id: "92a3d567-445d-4459-9810-ec976ae86845", name: "Selvin Ordonez",         decisionId: "019db136-d39e-7521-83e4-29d6a847eb7b" },
  { id: "b0281b3a-8317-42af-9f69-9a81a5f6d06e", name: "Terrell Thomas",         decisionId: "019db136-ddb8-7be2-8f32-0837b69f4015" },
  { id: "1af77371-fbda-4768-a1d6-a67bce2ba45b", name: "Tyler Bountom",          decisionId: "019db136-ef1c-7593-8903-03da5b02b951" },
  { id: "50b79453-ed97-4568-8206-42d07eaf9453", name: "Yender Gutierrez",       decisionId: "019db136-fd17-7af7-8f3e-e6922dbbaca6" },
  { id: "090d4233-183a-45c9-9f09-18093cd22042", name: "Michael Ventry",         decisionId: "019db137-0805-7dba-88d1-65d962240fd3" },
  { id: "9ab15598-9b30-4b83-9650-b8404977cc54", name: "Robert Gutierrez",       decisionId: "019db137-1399-7fe1-82ec-60b4b71c1bf1" },
  { id: "859d57b0-0dc3-4934-86f9-6fcf3a7462c6", name: "Richard Bryant",         decisionId: "019db0f1-c9ef-7bfb-8ca5-117ce286523a" },
  // FEB-DECLINED batch
  { id: "6c4319fa-5b80-411f-bca6-09f4c648a079", name: "Robert Levesque",        decisionId: "019db133-2802-7669-80a8-a4ea16860733" },
  { id: "6e2c7e7c-0b73-44cd-bc27-3f46e88abb2d", name: "Terry Bennett",          decisionId: "019db133-3772-727f-82cb-05ad1babcdf6" },
  { id: "759167ab-f03c-422e-967a-041d17c0b4c1", name: "Michael Torell II",      decisionId: "019db133-43b5-792c-8f1f-046e8404e267" },
  { id: "3bd21684-4455-4ffd-9406-40fe5b12a3f7", name: "JOHN MARTIN",            decisionId: "019db133-8a66-72f0-8d56-0ff1a0442e5a" },
  { id: "17318c76-f075-45f6-9f6d-338b08f2c96b", name: "ERIC ROYAL",             decisionId: "019db133-9502-7337-82e7-636585fd37db" },
  { id: "b8a3d57f-2f3c-4764-8932-0dc45651ece5", name: "Cristina Hernandez",     decisionId: "019db133-ad1f-76c8-84b9-730afe0de646" },
  // FEB4 batch
  { id: "a81459d4-4e2c-48e1-af5c-2d8ed1a634d8", name: "David Robison",          decisionId: "019db13a-5d40-79d2-8625-6d8a1b93a9e7" },
  { id: "69c7e619-5979-4f27-ac09-3fc966464c0e", name: "LORI MOORE",             decisionId: "019db13a-7643-7d6b-87ce-1b77e4042931" },
  { id: "520e9a67-e68f-4984-9978-5aff2cbfa253", name: "Harold Andrew Justrabo", decisionId: "019db13a-83fd-7f49-8e13-73f92e33ee91" },
  { id: "53840054-c2a6-4591-85a7-02ef77bc7a8e", name: "Vic Shelton",            decisionId: "019db13a-980b-744a-8866-afc833448438" },
  { id: "cb4c3c86-8f73-4d8c-8fc1-3f15e4ae0bb1", name: "Maria Leiton",           decisionId: "019db13a-b779-760d-8a28-72e151fad1ff" },
  // NOT-FOUND batch (from the evening re-run — these also have valid accepted decisions)
  { id: "58eaaf57-34c3-4bbe-8f5d-74679a4d0162", name: "Bradley Garner",         decisionId: undefined },
  { id: "71fe9e56-5ab7-47de-971e-658c4fed44c3", name: "Vincent Smith",          decisionId: undefined },
  { id: "fc7c566c-b410-4cd0-95d1-3ae9f5b82b03", name: "Noman Qadri",            decisionId: undefined },
];

// ── Try multiple Taktile endpoint patterns ────────────────────────────────────
async function fetchDecisionFromTaktile(decisionId: string): Promise<any> {
  const endpoints = [
    // Taktile v2 decisions API (most common)
    `${TAKTILE_BASE}/api/v2/decisions/${decisionId}`,
    // Taktile v1 flow-scoped decisions
    `${TAKTILE_BASE}/run/api/v1/flows/${FLOW_SLUG}/decisions/${decisionId}`,
    // Taktile v1 live flow-scoped decisions
    `${TAKTILE_BASE}/run/api/v1/flows/${FLOW_SLUG}/live/decisions/${decisionId}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { "X-Api-Key": GIGFI_API_KEY, "Content-Type": "application/json" },
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body) {
        return { url, status: res.status, body };
      }
      // Log non-404 errors (404 just means wrong endpoint)
      if (res.status !== 404 && res.status !== 405) {
        console.log(`    [${res.status}] ${url}: ${JSON.stringify(body)?.slice(0, 80)}`);
      }
    } catch (e: any) {
      // Network error — skip
    }
  }
  return null;
}

async function saveRedirectUrl(appId: string, decisionId: string, redirectUrl: string) {
  const res = await fetch(`${PROD_API}/api/gigfi/external/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_PASSWORD}` },
    body: JSON.stringify({ applicationId: appId, status: "ACCEPTED", decisionId, redirectUrl }),
  });
  if (!res.ok) throw new Error(`Save failed (${res.status})`);
}

async function main() {
  if (!GIGFI_API_KEY) {
    console.error("GIGFI_API_KEY is not set.\nRun: GIGFI_API_KEY=<your-key> tsx scripts/gigfi-fetch-redirect-urls.ts");
    process.exit(1);
  }

  console.log(`\n=== GigFi Fetch Redirect URLs — ${new Date().toISOString()} ===`);
  console.log(`Mode: ${SAVE ? "SAVE to production" : "dry run (add --save to write)"}\n`);

  const found: any[] = [];
  const missing: any[] = [];

  for (const rec of ACCEPTED_RECORDS) {
    if (!rec.decisionId) {
      process.stdout.write(`  ${rec.name} — no decision ID, skipping\n`);
      missing.push({ ...rec, reason: "no decision ID" });
      continue;
    }

    process.stdout.write(`  ${rec.name} [${rec.decisionId.slice(0, 8)}] ... `);
    const result = await fetchDecisionFromTaktile(rec.decisionId);

    if (!result) {
      console.log("NOT FOUND in Taktile API");
      missing.push(rec);
      await new Promise(r => setTimeout(r, 300));
      continue;
    }

    // Try to extract redirect_url from various locations in response
    const body = result.body;
    const redirectUrl =
      body?.data?.redirect_url ||
      body?.output_data?.redirect_url ||
      body?.result?.data?.redirect_url ||
      body?.redirect_url;

    if (redirectUrl) {
      console.log(`FOUND → ${redirectUrl.slice(0, 60)}...`);
      found.push({ ...rec, redirectUrl, endpoint: result.url });

      if (SAVE) {
        try {
          await saveRedirectUrl(rec.id, rec.decisionId, redirectUrl);
          console.log(`    → saved to production DB`);
        } catch (e: any) {
          console.log(`    ⚠ save failed: ${e.message}`);
        }
      }
    } else {
      console.log(`RESPONSE BUT no redirect_url — keys: ${Object.keys(body || {}).join(", ")}`);
      missing.push({ ...rec, responseKeys: Object.keys(body || {}) });
    }

    await new Promise(r => setTimeout(r, 400));
  }

  // Write log
  const logDir = path.join(process.cwd(), "scripts", "logs");
  fs.mkdirSync(logDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = path.join(logDir, `gigfi-redirect-urls-${ts}.json`);
  fs.writeFileSync(logPath, JSON.stringify({ found, missing }, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`  Found    : ${found.length}`);
  console.log(`  Not found: ${missing.length}`);
  if (found.length > 0) {
    console.log(`\n  Redirect URLs:`);
    found.forEach(r => console.log(`    ${r.name}: ${r.redirectUrl}`));
  }
  console.log(`\n  Log → ${logPath}`);
  if (!SAVE && found.length > 0) {
    console.log(`\n  Re-run with --save to write these URLs to the production database.`);
  }
}

main().catch(console.error);
