/**
 * GigFi Batch — NOT FOUND businesses that were actually in the DB
 * Run: tsx scripts/gigfi-batch-notfound.ts
 */

const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const GIGFI_ENVIRONMENT = process.env.GIGFI_ENVIRONMENT || "sandbox";
const GIGFI_LIVE_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const GIGFI_SANDBOX_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const PROD_API = "http://localhost:5000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const NEXT_PAY_DATE = "05/01/2026";

function cleanSsn(ssn: string): string { return ssn.replace(/\D/g, ""); }
function cleanPhone(phone: string): string { return phone.replace(/\D/g, "").slice(0, 10); }
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}
function employmentLength(tib: string | null): number {
  if (!tib) return 24;
  if (tib.toLowerCase().includes("more than 5")) return 72;
  const n = parseFloat(tib);
  if (!isNaN(n)) return Math.round(n * 12);
  return 24;
}

const APPS: any[] = [
  // Garner Heating And Cooling
  {
    id: "58eaaf57-34c3-4bbe-8f5d-74679a4d0162",
    email: "garnerhvac@outlook.com", full_name: "Bradley Garner",
    legal_business_name: "Garner Heating And Cooling", phone: "5174037338",
    average_monthly_revenue: "80000.00", requested_amount: "150000.00",
    time_in_business: "More than 5 years", social_security_number: "365766960",
    date_of_birth: "1960-09-14", owner_address_1: "176 Osborne St.",
    owner_city: "Britton", owner_state: "MI", owner_zip: "49229",
    business_csz: "Tecumseh, MI 49286",
  },
  // KARAM GRILL & BAKERY LLC
  {
    id: "32c81f0b-e23f-403b-a873-90753865557c",
    email: "main.sd202@gmail.com", full_name: "Main Daraghmeh",
    legal_business_name: "KARAM GRILL & BAKERY LLC", phone: "7135534879",
    average_monthly_revenue: "50000.00", requested_amount: "45000.00",
    time_in_business: null, social_security_number: "331375907",
    date_of_birth: "1971-08-25", owner_address_1: "3314 WIMBERLY PLACE LN",
    owner_city: "Katy", owner_state: "TX", owner_zip: "77494",
    business_csz: "Katy, TX 77450",
  },
  // LIBRE IMMIGRATION SERVICES INC (use higher-revenue record: 71fe9e56)
  {
    id: "71fe9e56-5ab7-47de-971e-658c4fed44c3",
    email: "vincent@librefianza.com", full_name: "Vincent Smith",
    legal_business_name: "LIBRE IMMIGRATION SERVICES INC", phone: "1610914239",
    average_monthly_revenue: "100000.00", requested_amount: "25000.00",
    time_in_business: null, social_security_number: "169545659",
    date_of_birth: "1962-12-19", owner_address_1: "1920 Kutztown Rd,",
    owner_city: "LEBANON", owner_state: "PA", owner_zip: "17042",
    business_csz: "LEBANON, PA 17042-1275",
  },
  // RHA JEWELERY LLC
  {
    id: "fc7c566c-b410-4cd0-95d1-3ae9f5b82b03",
    email: "qadrinoman@yahoo.com", full_name: "Noman Qadri",
    legal_business_name: "RHA JEWELERY LLC", phone: "7028095698",
    average_monthly_revenue: "150000.00", requested_amount: "100000.00",
    time_in_business: null, social_security_number: "622426806",
    date_of_birth: "1973-05-05", owner_address_1: "1021 Miradero LN",
    owner_city: "Las Vegas", owner_state: "NV", owner_zip: "89134",
    business_csz: "Las Vegas, NV 89128",
  },
];

function buildPayload(app: any) {
  const { first, last } = splitName(app.full_name);
  const ssn = cleanSsn(app.social_security_number);
  const phone = cleanPhone(app.phone);
  const monthly = parseFloat(app.average_monthly_revenue || "0") || 10000;
  let amount = parseFloat(app.requested_amount || "0");
  if (amount < 1000) amount = 10000;

  return {
    data: {
      RefID: `TCG-${app.id}`,
      LeadProvider: "TodayCapital", LeadAffiliate: "TodayCapital", LeadCost: 0,
      Firstname: first, Lastname: last,
      SSN: ssn, Email: app.email, DOB: app.date_of_birth,
      Language: "e", Military: "n",
      HomeAddress: (app.owner_address_1 || "").replace(/,$/, "").trim(),
      HomeCity: app.owner_city, HomeState: app.owner_state,
      HomeZip: (app.owner_zip || "").slice(0, 5),
      CellPhone: phone,
      BankInfo: { AccountToUse: "C" },
      EmploymentInfo: {
        MonthlyIncome: monthly, PayFrequency: "2", IncomeType: "5",
        PayrollType: "3", NextPayDay: NEXT_PAY_DATE,
        Employer: (app.legal_business_name || first).trim(),
        EmploymentLength: employmentLength(app.time_in_business),
      },
      LoanInfo: { Amount: amount },
    },
    metadata: { entity_id: `TCG-${app.id}` },
    control: { execution_mode: "sync" },
  };
}

async function submitToGigFi(payload: any): Promise<any> {
  const url = GIGFI_ENVIRONMENT === "live" ? GIGFI_LIVE_URL : GIGFI_SANDBOX_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": GIGFI_API_KEY },
    body: JSON.stringify(payload),
  });
  return { httpStatus: res.status, ...(await res.json()) };
}

async function recordResult(id: string, status: string, decisionId?: string, redirectUrl?: string) {
  const res = await fetch(`${PROD_API}/api/gigfi/external/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_PASSWORD}` },
    body: JSON.stringify({ applicationId: id, status, decisionId, redirectUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  console.log(`\n=== GigFi — NOT FOUND batch (${APPS.length} apps) | ${GIGFI_ENVIRONMENT} ===\n`);
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set"); process.exit(1); }

  const accepted: string[] = [], rejected: string[] = [], errors: string[] = [];

  for (const app of APPS) {
    const ssn = cleanSsn(app.social_security_number);
    if (ssn.length !== 9) { console.log(`[SKIP] ${app.full_name} — bad SSN`); continue; }

    process.stdout.write(`  [SUBMIT] ${app.full_name} (${app.legal_business_name}) ... `);
    const payload = buildPayload(app);
    const result = await submitToGigFi(payload);
    const status = result?.data?.status || "ERROR";
    const decisionId = result?.metadata?.decision_id;
    const redirectUrl = result?.data?.redirect_url;
    const errMsg = result?.detail?.msg || (typeof result?.detail === "string" ? result.detail : null);

    console.log(`${status}${decisionId ? ` [${decisionId}]` : ""}${errMsg ? ` — ${errMsg}` : ""}`);
    try { await recordResult(app.id, status, decisionId, redirectUrl); } catch (e: any) { console.log(`    ⚠ save failed: ${e.message}`); }

    if (status === "ACCEPTED") { accepted.push(app.full_name); if (redirectUrl) console.log(`    → ${redirectUrl}`); }
    else if (status === "REJECTED") rejected.push(app.full_name);
    else errors.push(app.full_name);

    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ACCEPTED: ${accepted.length}  REJECTED: ${rejected.length}  ERROR: ${errors.length}`);
  if (accepted.length) accepted.forEach(n => console.log(`    ✓ ${n}`));
}

main().catch(e => { console.error(e); process.exit(1); });
