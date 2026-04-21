/**
 * GigFi Batch — Feb/Dec Declined businesses
 * Run: tsx scripts/gigfi-batch-feb-declined.ts
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
  if (tib.toLowerCase().includes("1-2") || tib.toLowerCase().includes("1–2")) return 18;
  const n = parseFloat(tib);
  if (!isNaN(n)) return Math.round(n * 12);
  return 24;
}

// All records pulled directly from production DB query
// Already submitted / skip notes included inline
const APPS: any[] = [
  // VYVOA CONSULTING LLC — most recent record (Apr 14, 2026)
  { id: "a0175104-930f-4470-be97-0af8ae5d9479", email: "vgrillo@vyvoa.com", full_name: "VICENTE GRILLO", legal_business_name: "VYVOA CONSULTING LLC", phone: "2126165564", average_monthly_revenue: "25000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "089560151", date_of_birth: "1965-09-07", owner_address_1: "12217 109th AVENUE", owner_city: "SOUTH OZONE PARK", owner_state: "NY", owner_zip: "11420", business_csz: "SOUTH OZONE PARK, NY 11420" },
  // Andromel Estates Corporation — unsubmitted record (Feb 11, 2026); bd283553 already REJECTED
  { id: "be8d47d3-d5b9-4250-826c-b77b7ca9ff11", email: "romelhilaire@yahoo.com", full_name: "Romel Hilaire", legal_business_name: "Andromel Estates Corporation", phone: "7542692275", average_monthly_revenue: "20000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "356693080", date_of_birth: "1975-09-06", owner_address_1: "8303 NW 26TH PL", owner_city: "SUNRISE", owner_state: "FL", owner_zip: "33322", business_csz: "SUNRISE, FL 33322" },
  // Black label automation — most recent full record (Feb 4, 2026)
  { id: "6c4319fa-5b80-411f-bca6-09f4c648a079", email: "bobbyl@blacklabelautomation.com", full_name: "Robert levesque", legal_business_name: "Black label automation", phone: "4313717658", average_monthly_revenue: "500000.00", requested_amount: "500000.00", time_in_business: "More than 5 years", social_security_number: "501093125", date_of_birth: "1979-02-21", owner_address_1: "West stutsman st", owner_city: "Pembina", owner_state: "ND", owner_zip: "58271", business_csz: "Pembina, ND 58271" },
  // Highest Remodeling LLC
  { id: "6e2c7e7c-0b73-44cd-bc27-3f46e88abb2d", email: "info@highestremodeling.com", full_name: "Terry Bennett", legal_business_name: "Highest Remodeling LLC", phone: "7036770174", average_monthly_revenue: "50000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "214237469", date_of_birth: "1983-10-09", owner_address_1: "11267 waples mill rd", owner_city: "oakton", owner_state: "VA", owner_zip: "22124", business_csz: "Oakton, VA 22124" },
  // Living water well drilling
  { id: "759167ab-f03c-422e-967a-041d17c0b4c1", email: "torell2@hotmail.com", full_name: "Michael Torell II", legal_business_name: "Living water well drilling", phone: "2096170945", average_monthly_revenue: "208000.00", requested_amount: "350000.00", time_in_business: "More than 5 years", social_security_number: "570755356", date_of_birth: "1977-10-11", owner_address_1: "2475 dunn rd", owner_city: "Merced", owner_state: "CA", owner_zip: "95340", business_csz: "Merced, CA 95340" },
  // Bfields Investment Group, LLC
  { id: "4a7b1dc5-8fea-4522-8059-68feea8a3992", email: "tbutter22@icloud.com", full_name: "Tyrone Butterfield", legal_business_name: "Bfields Investment Group, LLC", phone: "4078605902", average_monthly_revenue: "200000.00", requested_amount: "200000.00", time_in_business: null, social_security_number: "264772751", date_of_birth: "1977-01-07", owner_address_1: "5182 Moore St", owner_city: "Saint Cloud", owner_state: "FL", owner_zip: "34771", business_csz: "Orlando , FL 32828" },
  // WESTIN & CLARK LLC
  { id: "025a90b3-fa56-490c-b7a9-730f6e67bdf4", email: "ramonher71@gmail.com", full_name: "Ramon Antonio Hernandez Garcia", legal_business_name: "WESTIN & CLARK LLC", phone: "8182721568", average_monthly_revenue: "65000.00", requested_amount: "500000.00", time_in_business: null, social_security_number: "606023149", date_of_birth: "1971-07-21", owner_address_1: "2746 West Ave O", owner_city: "Palmdale", owner_state: "CA", owner_zip: "83551", business_csz: "Panorama city, CA 91402" },
  // pure and healthy hair salon
  { id: "a7005fc2-598a-47bb-a61e-17b8cad1c595", email: "isaacisaac1972@yahoo.com", full_name: "sharlenabell", legal_business_name: "pure and healthy hair salon", phone: "2145649557", average_monthly_revenue: "12000.00", requested_amount: "5000.00", time_in_business: null, social_security_number: "463376415", date_of_birth: "1972-08-29", owner_address_1: "5328 KATHRYN DR", owner_city: "GRAND PRAIRIE", owner_state: "TX", owner_zip: "75052", business_csz: "plano, TX 75093" },
  // Cigar Heaven Inc
  { id: "ffeed1a0-851e-486e-bf42-4f43ca7b4d5a", email: "info@cigaarheavenusa.com", full_name: "Michael Wasserman", legal_business_name: "Cigar Heaven Inc", phone: "3122036457", average_monthly_revenue: "75000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "356404289", date_of_birth: "1957-10-07", owner_address_1: "506 E NORTHWEST HWY", owner_city: "MOUNT PROSPECT", owner_state: "IL", owner_zip: "60056", business_csz: "MOUNT PROSPECT, IL 60056" },
  // DAIRYLAND WOODWORKS LLC (email was jmdlww77@gmail.com in DB — imported.local was a placeholder)
  { id: "3bd21684-4455-4ffd-9406-40fe5b12a3f7", email: "jmdlww77@gmail.com", full_name: "JOHN MARTIN", legal_business_name: "DAIRYLAND WOODWORKS LLC", phone: "7152712110", average_monthly_revenue: "120000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "399024842", date_of_birth: "1977-06-27", owner_address_1: "2131 N 700 W", owner_city: "WARSAW", owner_state: "IN", owner_zip: "46580", business_csz: "WARSAW, IN 46580-6531" },
  // METAL INSTALLATIONS INC
  { id: "17318c76-f075-45f6-9f6d-338b08f2c96b", email: "METALINSTALLATIONS@YAHOO.COM", full_name: "ERIC ROYAL", legal_business_name: "METAL INSTALLATIONS INC", phone: "7732691199", average_monthly_revenue: "80000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "316844033", date_of_birth: "1969-07-23", owner_address_1: "1704 N MANNHEIM RD", owner_city: "DES PLAINES", owner_state: "IL", owner_zip: "60018", business_csz: "FRANKLIN PARK, IL 60131" },
  // Enchanted Magical Moments
  { id: "f2017a5e-cbe5-4299-81fa-8761079b10f9", email: "enchantedmagicalmoments@gmail.com", full_name: "Nicole Walters", legal_business_name: "Enchanted magical moments", phone: "3025692063", average_monthly_revenue: "14000.00", requested_amount: "5000.00", time_in_business: null, social_security_number: "241693944", date_of_birth: "1990-10-12", owner_address_1: "29006 Saint Lucia blvd", owner_city: "Millsboro", owner_state: "DE", owner_zip: "19966", business_csz: "Millsboro , DE 19966" },
  // Mayan Music Entertainment INC
  { id: "b8a3d57f-2f3c-4764-8932-0dc45651ece5", email: "cchernandez81@gmail.com", full_name: "Cristina Hernandez", legal_business_name: "Mayan Music Entertainment INC", phone: "7723233415", average_monthly_revenue: "55000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "767666061", date_of_birth: "1981-07-03", owner_address_1: "306 Se Tressler dr", owner_city: "Stuart", owner_state: "FL", owner_zip: "34994", business_csz: "Lake worth beach , FL 33461" },
  // EZR PACKING CORP (DB email was zr1231234@gmail.com — imported.local was a placeholder)
  { id: "22c9f5b8-5866-4b77-a5fa-2ec35bb28b1e", email: "zr1231234@gmail.com", full_name: "Yehi Melamed", legal_business_name: "EZR PACKING CORP", phone: "3124567652", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "250000.00", time_in_business: null, social_security_number: "082848664", date_of_birth: "1965-12-30", owner_address_1: "4608 APPLIANCE DR", owner_city: "BELCAMP", owner_state: "MD", owner_zip: "21017", business_csz: "BELCAMP, MD 21017-1242" },
  // The Vesper Kitchen + Bar (DB email was jf737@yahoo.com — imported.local was placeholder)
  { id: "993e2be0-bedf-48ed-aa3b-7c078fd0bc67", email: "jf737@yahoo.com", full_name: "Joseph Frocchi", legal_business_name: "The Vesper Kitchen + Bar", phone: "5854152946", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "3000000.00", time_in_business: null, social_security_number: "077708082", date_of_birth: "1974-10-02", owner_address_1: "125 Shepard St", owner_city: "Rochester", owner_state: "NY", owner_zip: "14620", business_csz: "Rochester, NY 14607" },

  // SKIP NOTES (not included above):
  // - Arco Petroleum Transport INC: DOB = 2026-01-17 (future date, data entry error); no valid record
  // - Top Flight Transportation: no SSN or DOB in either record
  // - Infinity cargo van line: already ACCEPTED
  // - ESCAPADEUSA INC: already ACCEPTED
  // - HKS Remodeling and Construction LLC: not found in DB
  // - HMP Designs (patterson@atc.net): not found in DB
];

function buildPayload(app: any) {
  const { first, last } = splitName(app.full_name);
  const ssn = cleanSsn(app.social_security_number);
  const phone = cleanPhone(app.phone);
  const monthly = parseFloat(app.average_monthly_revenue || app.monthly_revenue || "0") || 10000;
  let amount = parseFloat(app.requested_amount || "0");
  if (amount < 500 && amount > 0) amount *= 1000;
  if (amount < 1000) amount = 10000;
  // Cap at $10k per user request
  if (amount > 10000) amount = 10000;

  return {
    data: {
      RefID: `TCG-${app.id}`,
      LeadProvider: "TodayCapital", LeadAffiliate: "TodayCapital", LeadCost: 0,
      Firstname: first, Lastname: last,
      SSN: ssn, Email: app.email.toLowerCase(), DOB: app.date_of_birth,
      Language: "e", Military: "n",
      HomeAddress: (app.owner_address_1 || "").replace(/,\s*$/, "").trim(),
      HomeCity: (app.owner_city || "").trim(),
      HomeState: (app.owner_state || "").trim(),
      HomeZip: (app.owner_zip || "").replace(/[^0-9]/, "").slice(0, 5),
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
}

async function main() {
  console.log(`\n=== GigFi Batch — Feb/Dec Declined (${APPS.length} apps) | ${GIGFI_ENVIRONMENT} ===\n`);
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set"); process.exit(1); }

  const accepted: any[] = [], rejected: string[] = [], errors: string[] = [];

  for (const app of APPS) {
    const ssn = cleanSsn(app.social_security_number || "");
    if (ssn.length !== 9) {
      console.log(`  [SKIP] ${app.full_name} (${app.legal_business_name}) — bad SSN: "${ssn}" (${ssn.length} digits)`);
      continue;
    }
    const dob = new Date(app.date_of_birth);
    if (dob > new Date()) {
      console.log(`  [SKIP] ${app.full_name} — DOB in future: ${app.date_of_birth}`);
      continue;
    }

    process.stdout.write(`  [SUBMIT] ${app.full_name.trim()} (${app.legal_business_name.trim()}) ... `);
    const payload = buildPayload(app);
    const result = await submitToGigFi(payload);
    const status = result?.data?.status || "ERROR";
    const decisionId = result?.metadata?.decision_id;
    const redirectUrl = result?.data?.redirect_url;
    const errMsg = result?.detail?.msg || (typeof result?.detail === "string" ? result.detail : null);

    console.log(`${status}${decisionId ? ` [${decisionId}]` : ""}${errMsg ? ` — ${errMsg}` : ""}`);
    try { await recordResult(app.id, status, decisionId, redirectUrl); } catch (e: any) { console.log(`    ⚠ save failed: ${e.message}`); }

    if (status === "ACCEPTED") { accepted.push({ name: app.full_name, redirect: redirectUrl }); }
    else if (status === "REJECTED") rejected.push(app.full_name);
    else errors.push(app.full_name);

    await new Promise(r => setTimeout(r, 600));
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ACCEPTED : ${accepted.length}`);
  console.log(`  REJECTED : ${rejected.length}`);
  console.log(`  ERROR    : ${errors.length}`);
  if (accepted.length) { console.log(`\n  Accepted leads:`); accepted.forEach(a => console.log(`    ✓ ${a.name.trim()} → ${a.redirect || "no redirect"}`)); }
  if (errors.length) { console.log(`\n  Errors:`); errors.forEach(n => console.log(`    ✗ ${n}`)); }
}

main().catch(e => { console.error(e); process.exit(1); });
