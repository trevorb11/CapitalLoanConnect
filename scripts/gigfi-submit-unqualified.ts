/**
 * GigFi Submit — Unqualified Leads Batch
 *
 * Submits unqualified leads (from the attached list) that have not yet been
 * submitted to GigFi.  Skips any that are missing SSN / DOB / address / phone.
 *
 * Run:
 *   GIGFI_API_KEY=<key> GIGFI_ENVIRONMENT=live tsx scripts/gigfi-submit-unqualified.ts
 */

import fs from "fs";
import path from "path";

const GIGFI_API_KEY    = process.env.GIGFI_API_KEY || "";
const GIGFI_ENV        = process.env.GIGFI_ENVIRONMENT || "sandbox";
const LIVE_URL         = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const SANDBOX_URL      = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const GIGFI_URL        = GIGFI_ENV === "live" ? LIVE_URL : SANDBOX_URL;
const PROD_API         = "https://app.todaycapitalgroup.com";
const ADMIN_PASSWORD   = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const LEAD_PROVIDER    = process.env.GIGFI_LEAD_PROVIDER || "TodayCapital";
const LEAD_AFFILIATE   = process.env.GIGFI_LEAD_AFFILIATE || "TodayCapital";
const NEXT_PAY_DATE    = "05/01/2026";

// ─── Application IDs to submit (not yet submitted, not test entries) ──────────
// Duplicates resolved: picked the record with more data / higher revenue
const TARGET_APP_IDS: string[] = [
  "8069318e-842f-45e1-ba78-295c13ee3dd9", // Sell My phone long Beach (Gary Dickens jr)
  "86940d98-8c21-4b68-b121-ade5b19bce74", // GFJ Food Liquidators (Joseph DiBartolo)
  "57c25687-1959-48e9-b8a1-f5a434e4b676", // The Small Engine Clinic (Cayden Curtis)
  "312720db-ac9e-48a5-ba95-cc2430e60d45", // king mabry ranch llc (Tanner Davis)
  "6448e7c0-02e2-4d0f-8be9-6d764793c4c0", // Humming bird elite (Christopher Mussared)
  "1c826f23-aa2c-4cce-bd0d-e50862fee8f0", // The ultimate decision (Boyd Bradley henry)
  "c8358746-dc88-4277-a86a-b6fef5eb67d4", // Copper Penny Bar (Lori Conrady)
  "99881435-7ea7-463a-af53-a379b0b0c835", // Black Kingz Holdings LLC (Cornell Davis)
  "898512fd-80b7-4c2b-8b25-5f96996010e2", // Texan Housing and RVs (Diana Hawkins)
  "2f87461a-8ccc-459f-ae24-6a73c832fba4", // Allstate Techs LLC (Rowhelleo Griffiths)
  "b9d6da8a-b0e7-456f-b35f-e65d229f2cd8", // traveltainment traveltainment
  "b33eb2f2-7d58-4985-ad0c-2e60710d4d74", // Teenage & Adolescent Parenting Program (Sharon Bakkum)
  "8cec9ba1-9983-4752-9078-4d8fa6f3b7e3", // Uncle A's (Avery Calicutt — different app)
  "e93d77da-0da3-4dad-a6be-c27c2f381ae3", // Little Scholars Services (Gelza Salazar — different app)
  "8c281f25-022b-4a48-91cc-774579718f0a", // Coffee cafe (Olivya jones — different app)
  "d8154025-e779-42d7-bc60-fba423e129d0", // Explicit Detail LLC (Jacob Mahler)
  "21c1c47d-36e1-466e-864c-ebaf89c4ffc6", // LawnMark Lawn Care (Kevin Lundmark)
  "5317c8cc-8432-497a-9c32-416b26fd693b", // SHEPHERD'S SHOP (Shepherd chinamira)
  "42ac89a8-a4f3-42af-9edc-2773bac09062", // Skyway Entertainment LLC (Holly Price)
  "6d694bdc-1aa3-48a5-b73a-435ea3203a0f", // pourciaus services (chasedy pourciau)
  "30a964eb-e1cd-4f99-95c9-c9541488f4ef", // CHANGING HEARTS HOME CARE LLC (Rhonda Long)
  "f29567f3-bcb5-4742-b592-736c71f9ab7f", // Primetime Logistic Services (Russell Votoe)
  "cd39bb20-4b0e-40e2-9f5d-0ad245de5b95", // CNZ HEATING (Jonathan Malone)
  "cb07411e-ace3-42d3-9e7a-3b211922cacf", // Blaq Pressure llc (Timothy Simpson)
  "93713dbf-3996-47f3-8207-9e5afc8e0ca9", // Gaspar Colmenero
  "b0552c5a-a318-4fc0-aced-956b248bd963", // Ur Personal Chauffeur (Raymond Lakings)
  "987b841b-325b-4a00-b054-d5729178deca", // Hilton Hitch Investments Inc (Reid Scott)
  "f000d061-b21c-4122-95b9-0b8efc351dec", // j exceptional cleaning service (John Furbay)
  "2f00246b-8d59-4b46-b8de-9d331b7560d8", // Family Affair BBQ
  "e45c5491-f9d3-4196-a42e-00ed1a0fbaee", // J3L Enterprises LLC (Jacob Mcgowan)
  "5ed42e47-e008-4664-a13a-ff1f725e3477", // Sam The Plumbers LLC (Reginald Zuniga)
  "1cea63fb-eaf5-4176-a231-796e4d100e5d", // Savvy Sharon International LLC (Sharon Hunt)
  "d9a4c8c2-e291-44c0-bebf-bc8b9b594c4e", // Roland Marchman (different app)
  "ba10b540-d534-4d74-af7c-f602d9983290", // The handy man / Mark Joseph Austin
  "6d37e812-f5ae-4334-bb3e-f70d8fff2cba", // Digital collections llc (Michael Mpofu)
  "078523c5-3f79-4a66-b0f7-d86a9840dfa3", // Pm auto solutions llc (Pascual)
  "7dbd8dd5-d7ee-4ff5-9412-1411d1c36996", // Phillips retail (Leslie Phillips)
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanSsn(ssn: string | null | undefined): string { return (ssn || "").replace(/\D/g, ""); }
function cleanPhone(phone: string | null | undefined): string { return (phone || "").replace(/\D/g, "").slice(0, 10); }
function splitName(full: string): { first: string; last: string } {
  const parts = (full || "Unknown").trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}
function employmentLength(tib: string | null | undefined): number {
  if (!tib) return 24;
  const s = tib.trim().toLowerCase();
  if (s.includes("more than 5")) return 72;
  if (s.includes("3-5") || s.includes("3–5")) return 48;
  if (s.includes("2-3") || s.includes("2–3")) return 30;
  if (s.includes("1-2") || s.includes("1–2")) return 18;
  if (s.includes("6-12") || s.includes("6–12")) return 9;
  if (s.includes("3-6") || s.includes("3–6")) return 4;
  return 24;
}
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Login ────────────────────────────────────────────────────────────────────

async function getSessionCookie(): Promise<string> {
  const res = await fetch(`${PROD_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const raw = res.headers.get("set-cookie") || "";
  return raw.split(",").map(c => c.trim().split(";")[0]).join("; ");
}

// ─── Fetch application ────────────────────────────────────────────────────────

async function fetchApp(appId: string, cookie: string): Promise<any> {
  const res = await fetch(`${PROD_API}/api/applications/${appId}`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) throw new Error(`Fetch app ${appId} failed: ${res.status}`);
  return res.json();
}

// ─── Format phone for GigFi (NXX-NXX-XXXX) ──────────────────────────────────

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(0, 10);
  if (d.length !== 10) return phone;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

// ─── Build GigFi Taktile payload ──────────────────────────────────────────────

function buildPayload(app: any, refId: string) {
  const { first, last } = splitName(app.fullName || "");
  const phone = formatPhone(cleanPhone(app.phone));
  const biz = app.businessName || app.legalBusinessName || app.fullName || "";
  const rev = parseFloat(app.monthlyRevenue || app.averageMonthlyRevenue || "3000") || 3000;
  const homeAddress = app.ownerAddress1 || app.businessStreetAddress || app.businessAddress || "";
  const homeCity    = app.ownerCity || app.city || "";
  const homeState   = (app.ownerState || app.state || "").toUpperCase().slice(0, 2);
  const homeZip     = (app.ownerZip || app.zipCode || "").replace(/\D/g, "").slice(0, 5);

  return {
    data: {
      RefID: refId,
      LeadProvider: LEAD_PROVIDER,
      LeadAffiliate: LEAD_AFFILIATE,
      LeadCost: 0,
      Firstname: first,
      Lastname: last,
      SSN: cleanSsn(app.socialSecurityNumber),
      Email: app.email || app.companyEmail || "",
      DOB: app.dateOfBirth,
      Language: "e",
      Military: "n",
      HomeAddress: homeAddress,
      HomeCity: homeCity,
      HomeState: homeState,
      HomeZip: homeZip,
      CellPhone: phone,
      BankInfo: { AccountToUse: "C" },
      EmploymentInfo: {
        MonthlyIncome: rev,
        PayFrequency: "4",
        IncomeType: "5",
        PayrollType: "3",
        NextPayDay: NEXT_PAY_DATE,
        Employer: biz,
        EmploymentLength: employmentLength(app.timeInBusiness),
      },
      LoanInfo: { Amount: 10000 },
    },
    metadata: { entity_id: refId },
    control: { execution_mode: "sync" },
  };
}

// ─── Submit to GigFi ─────────────────────────────────────────────────────────

async function submitToGigFi(app: any, appId: string): Promise<{ status: string; decisionId?: string; redirectUrl?: string; error?: string }> {
  const refId = `TCG-${appId}`;
  const payload = buildPayload(app, refId);

  const res = await fetch(GIGFI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": GIGFI_API_KEY },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { return { status: "ERROR", error: `Non-JSON: ${text.slice(0, 200)}` }; }
  if (!res.ok) return { status: "ERROR", error: `HTTP ${res.status}: ${text.slice(0, 200)}` };

  const decisionId = data?.metadata?.decision_id ?? data?.id ?? data?.decision_id ?? undefined;
  const dataStatus = data?.data?.status;
  if (dataStatus === "ACCEPTED") {
    return { status: "ACCEPTED", decisionId, redirectUrl: data?.data?.redirect_url };
  }
  if (dataStatus === "REJECTED") {
    return { status: "REJECTED", decisionId };
  }
  return { status: "ERROR", decisionId, error: `Unexpected status: ${dataStatus}` };
}

// ─── Record result in production ──────────────────────────────────────────────

async function recordResult(appId: string, status: string, decisionId: string | undefined, redirectUrl: string | undefined, cookie: string) {
  await fetch(`${PROD_API}/api/gigfi/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ applicationId: appId, status, decisionId, redirectUrl }),
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set"); process.exit(1); }
  console.log(`\nGigFi environment: ${GIGFI_ENV.toUpperCase()}`);
  console.log(`Submitting ${TARGET_APP_IDS.length} applications...\n`);

  const cookie = await getSessionCookie();
  console.log("Logged in to production API ✓\n");

  const log: any[] = [];
  let submitted = 0, skipped = 0, accepted = 0, rejected = 0;

  for (const appId of TARGET_APP_IDS) {
    try {
      const app = await fetchApp(appId, cookie);
      const biz = app.businessName || app.legalBusinessName || app.fullName || "(unknown)";

      // Validate required fields
      const ssn = cleanSsn(app.socialSecurityNumber);
      if (ssn.length !== 9) {
        console.log(`  SKIP  [${biz}] — SSN missing/invalid`);
        log.push({ appId, biz, result: "SKIPPED", reason: "SSN missing" });
        skipped++;
        continue;
      }
      if (!app.dateOfBirth) {
        console.log(`  SKIP  [${biz}] — DOB missing`);
        log.push({ appId, biz, result: "SKIPPED", reason: "DOB missing" });
        skipped++;
        continue;
      }
      const phone = cleanPhone(app.phone);
      if (phone.length !== 10) {
        console.log(`  SKIP  [${biz}] — phone invalid (${app.phone})`);
        log.push({ appId, biz, result: "SKIPPED", reason: `Phone invalid: ${app.phone}` });
        skipped++;
        continue;
      }
      const homeAddress = app.ownerAddress1 || app.businessStreetAddress || app.businessAddress || "";
      const homeCity    = app.ownerCity || app.city || "";
      const homeState   = (app.ownerState || app.state || "").toUpperCase().slice(0, 2);
      const homeZip     = (app.ownerZip || app.zipCode || "").replace(/\D/g, "").slice(0, 5);
      if (!homeAddress || !homeCity || homeState.length !== 2 || homeZip.length !== 5) {
        console.log(`  SKIP  [${biz}] — incomplete address`);
        log.push({ appId, biz, result: "SKIPPED", reason: `Address incomplete: "${homeAddress}" ${homeCity} ${homeState} ${homeZip}` });
        skipped++;
        continue;
      }

      console.log(`  SUB   [${biz}] (${appId.slice(0, 8)}...)`);
      const result = await submitToGigFi(app, appId);

      if (result.status === "ERROR") {
        console.log(`         → ERROR: ${result.error}`);
        log.push({ appId, biz, result: "ERROR", reason: result.error });
      } else {
        console.log(`         → ${result.status}  decisionId=${result.decisionId || "—"}  redirectUrl=${result.redirectUrl ? "YES" : "—"}`);
        await recordResult(appId, result.status, result.decisionId, result.redirectUrl, cookie);
        log.push({ appId, biz, result: "SUBMITTED", gigfiStatus: result.status, decisionId: result.decisionId, redirectUrl: result.redirectUrl });
        submitted++;
        if (result.status === "ACCEPTED") accepted++;
        else rejected++;
      }

      await sleep(300); // avoid rate limiting
    } catch (err: any) {
      console.log(`  ERR   [${appId}] — ${err.message}`);
      log.push({ appId, result: "ERROR", reason: err.message });
    }
  }

  console.log(`\n─── Summary ─────────────────────────────────────────`);
  console.log(`  Submitted: ${submitted}  (${accepted} ACCEPTED, ${rejected} REJECTED)`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Total:     ${TARGET_APP_IDS.length}`);

  // Save log
  const logsDir = path.join("scripts", "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `gigfi-unqualified-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ runAt: new Date().toISOString(), env: GIGFI_ENV, results: log }, null, 2));
  console.log(`\nLog saved → ${logFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
