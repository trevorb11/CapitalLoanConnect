/**
 * GigFi Submit — Targeted Leads
 *
 * Submits a specific set of leads to GigFi (live), capping all amounts at $10k.
 * Validates DOB (rejects impossible years), SSN, phone, and address before submitting.
 *
 * Run:
 *   GIGFI_API_KEY=<key> GIGFI_ENVIRONMENT=live tsx scripts/gigfi-submit-targeted.ts
 */

import fs from "fs";
import path from "path";

const GIGFI_API_KEY  = process.env.GIGFI_API_KEY || "";
const GIGFI_ENV      = process.env.GIGFI_ENVIRONMENT || "sandbox";
const LIVE_URL       = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const SANDBOX_URL    = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const GIGFI_URL      = GIGFI_ENV === "live" ? LIVE_URL : SANDBOX_URL;
const PROD_API       = "https://app.todaycapitalgroup.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const LEAD_PROVIDER  = process.env.GIGFI_LEAD_PROVIDER || "TodayCapital";
const LEAD_AFFILIATE = process.env.GIGFI_LEAD_AFFILIATE || "TodayCapital";
const NEXT_PAY_DATE  = "05/15/2026";

// ─── Target apps ─────────────────────────────────────────────────────────────
const TARGET_APP_IDS: string[] = [
  "1a3f982c-0e05-444a-8a1d-e76fb8962aa1", // Robert Dwain Smith — Mr. SMITHS HOME REPAIR SERVICE (700 FICO)
  "c907032c-518a-4bd3-b1f9-1893a90f0051", // Angelica Sosa (676 FICO)
  "a54ec404-5000-4fcb-87b3-d5f33a1ccaa5", // Ronnie Wayne Ball — Ball Electric Inc (748 FICO)
  "cd1aa88e-d710-498d-b6be-25559a91f584", // Lawrence A Martin Jr — Back Riding Roadside (563 FICO — low, may reject)
  "f9e700b2-3d08-44ac-b1b8-cac8626ef748", // Peterson — Arrival Transportation (500 FICO — low, may reject)
  // f9d1e2be-94bd-45af-b12a-f16156dd4b86  Kirk August — A&B Construction — SKIPPED: DOB "19621-03-04" is invalid
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanSsn(ssn: string | null | undefined): string { return (ssn || "").replace(/\D/g, ""); }
function cleanPhone(phone: string | null | undefined): string { return (phone || "").replace(/\D/g, "").slice(0, 10); }
function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(0, 10);
  if (d.length !== 10) return phone;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}
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
function isValidDob(dob: string | null | undefined): boolean {
  if (!dob) return false;
  const year = parseInt((dob || "").split(/[-/]/)[0], 10);
  return year >= 1900 && year <= new Date().getFullYear() - 18;
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

// ─── Submit to GigFi ──────────────────────────────────────────────────────────
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

  const decisionId = data?.id ?? data?.decision_id ?? undefined;
  const dataStatus = data?.data?.status;
  if (dataStatus === "ACCEPTED") return { status: "ACCEPTED", decisionId, redirectUrl: data?.data?.redirect_url };
  if (dataStatus === "REJECTED") return { status: "REJECTED", decisionId };
  return { status: "ERROR", decisionId, error: `Unexpected status: ${dataStatus} — ${text.slice(0, 300)}` };
}

// ─── Record result in production ──────────────────────────────────────────────
async function recordResult(appId: string, status: string, decisionId: string | undefined, redirectUrl: string | undefined, cookie: string) {
  const res = await fetch(`${PROD_API}/api/gigfi/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ applicationId: appId, status, decisionId, redirectUrl }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`  WARN: Failed to record result for ${appId}: ${res.status} ${txt.slice(0,100)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set"); process.exit(1); }
  console.log(`\nGigFi environment: ${GIGFI_ENV.toUpperCase()}`);
  console.log(`Submitting up to ${TARGET_APP_IDS.length} targeted applications...\n`);

  const cookie = await getSessionCookie();
  console.log("Logged in to production API ✓\n");

  const log: any[] = [];
  let submitted = 0, skipped = 0, accepted = 0, rejected = 0;

  for (const appId of TARGET_APP_IDS) {
    try {
      const app = await fetchApp(appId, cookie);
      const biz = app.businessName || app.legalBusinessName || app.fullName || "(unknown)";
      const fico = app.ficoScoreExact || app.personalCreditScoreRange || "?";

      // Already submitted?
      if (app.gigfiStatus) {
        console.log(`  SKIP  [${biz}] — already submitted (${app.gigfiStatus})`);
        log.push({ appId, biz, result: "SKIPPED", reason: `Already submitted: ${app.gigfiStatus}` });
        skipped++;
        continue;
      }

      // SSN
      const ssn = cleanSsn(app.socialSecurityNumber);
      if (ssn.length !== 9) {
        console.log(`  SKIP  [${biz}] — SSN missing/invalid`);
        log.push({ appId, biz, result: "SKIPPED", reason: "SSN missing" });
        skipped++; continue;
      }

      // DOB — reject bogus years
      if (!isValidDob(app.dateOfBirth)) {
        console.log(`  SKIP  [${biz}] — DOB invalid: ${app.dateOfBirth}`);
        log.push({ appId, biz, result: "SKIPPED", reason: `DOB invalid: ${app.dateOfBirth}` });
        skipped++; continue;
      }

      // Phone
      const phone = cleanPhone(app.phone);
      if (phone.length !== 10) {
        console.log(`  SKIP  [${biz}] — phone invalid (${app.phone})`);
        log.push({ appId, biz, result: "SKIPPED", reason: `Phone invalid: ${app.phone}` });
        skipped++; continue;
      }

      // Address
      const homeAddress = app.ownerAddress1 || app.businessStreetAddress || app.businessAddress || "";
      const homeCity    = app.ownerCity || app.city || "";
      const homeState   = (app.ownerState || app.state || "").toUpperCase().slice(0, 2);
      const homeZip     = (app.ownerZip || app.zipCode || "").replace(/\D/g, "").slice(0, 5);
      if (!homeAddress || !homeCity || homeState.length !== 2 || homeZip.length !== 5) {
        console.log(`  SKIP  [${biz}] — incomplete address`);
        log.push({ appId, biz, result: "SKIPPED", reason: `Address incomplete: "${homeAddress}" ${homeCity} ${homeState} ${homeZip}` });
        skipped++; continue;
      }

      console.log(`  SUB   [${biz}] FICO=${fico} Rev=$${app.monthlyRevenue}/mo (${appId.slice(0, 8)}...)`);
      const result = await submitToGigFi(app, appId);

      if (result.status === "ERROR") {
        console.log(`         → ERROR: ${result.error}`);
        log.push({ appId, biz, result: "ERROR", reason: result.error });
      } else {
        console.log(`         → ${result.status}  decisionId=${result.decisionId || "—"}`);
        await recordResult(appId, result.status, result.decisionId, result.redirectUrl, cookie);
        log.push({ appId, biz, result: "SUBMITTED", gigfiStatus: result.status, decisionId: result.decisionId, redirectUrl: result.redirectUrl });
        submitted++;
        if (result.status === "ACCEPTED") accepted++;
        else rejected++;
      }

      await sleep(500);
    } catch (err: any) {
      console.log(`  ERR   [${appId}] — ${err.message}`);
      log.push({ appId, result: "ERROR", reason: err.message });
    }
  }

  console.log(`\n─── Summary ──────────────────────────────────────────`);
  console.log(`  Submitted: ${submitted}  (${accepted} ACCEPTED, ${rejected} REJECTED)`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Total:     ${TARGET_APP_IDS.length}`);

  const logsDir = path.join("scripts", "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `gigfi-targeted-${Date.now()}.json`);
  fs.writeFileSync(logFile, JSON.stringify({ runAt: new Date().toISOString(), env: GIGFI_ENV, results: log }, null, 2));
  console.log(`\nLog saved → ${logFile}`);
}

main().catch(err => { console.error(err); process.exit(1); });
