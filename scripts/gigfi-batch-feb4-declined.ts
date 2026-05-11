/**
 * GigFi Batch — Feb 4 Declined businesses (second list)
 * Run: tsx scripts/gigfi-batch-feb4-declined.ts
 */

const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const GIGFI_ENVIRONMENT = process.env.GIGFI_ENVIRONMENT || "sandbox";
const GIGFI_LIVE_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const GIGFI_SANDBOX_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const PROD_API = "http://localhost:5000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const NEXT_PAY_DATE = "05/01/2026";

function cleanSsn(ssn: string): string { return (ssn || "").replace(/\D/g, ""); }
function cleanPhone(phone: string): string { return (phone || "").replace(/\D/g, "").slice(0, 10); }
function splitName(full: string): { first: string; last: string } {
  const parts = (full || "Unknown").trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}
function employmentLength(tib: string | null): number {
  if (!tib) return 24;
  const s = tib.trim().toLowerCase();
  if (s.includes("more than 5")) return 72;
  if (s.includes("3-5") || s.includes("3–5")) return 48;
  if (s.includes("2-3") || s.includes("2–3")) return 30;
  if (s.includes("1-2") || s.includes("1–2")) return 18;
  const n = parseFloat(s);
  if (!isNaN(n)) return Math.round(n * 12);
  return 24;
}
function parseBusinessCsz(csz: string | null): { city: string; state: string; zip: string } {
  if (!csz) return { city: "", state: "", zip: "" };
  const m = csz.match(/^(.+),?\s+([A-Z]{2})\s+(\d{5})/i);
  if (m) return { city: m[1].trim(), state: m[2].trim().toUpperCase(), zip: m[3].trim() };
  return { city: csz, state: "", zip: "" };
}

// Production DB records — imported.local emails replaced with real emails found in DB
// WAJE CLEANING (already REJECTED), METAL INSTALLATIONS & MAYAN MUSIC (already submitted) excluded
const APPS: any[] = [
  // Atlanta Screenprints GA LLC
  { id: "a81459d4-4e2c-48e1-af5c-2d8ed1a634d8", email: "david@atlantascreenprints.com", full_name: "David Robison", legal_business_name: "Atlanta Screenprints GA LLC", phone: "6787557797", average_monthly_revenue: null, requested_amount: "25000.00", time_in_business: null, social_security_number: "492567118", date_of_birth: "1963-09-13", owner_address_1: "1490 Princeton View Court", owner_city: "Loganville", owner_state: "GA", owner_zip: "30052", business_csz: "Snellville, GA 30039" },
  // APEX PRO SERVICES — real email found in DB: apex123@gmail.com
  { id: "70260fea-c1ba-43f2-a6b1-62ca059adddd", email: "apex123@gmail.com", full_name: "GARY GRENIER", legal_business_name: "APEX PRO SERVICES", phone: "3123412312", average_monthly_revenue: "200000.00", requested_amount: "15000.00", time_in_business: null, social_security_number: "043669668", date_of_birth: "1962-03-27", owner_address_1: "28 CENTRAL DR", owner_city: "GLEN HEAD", owner_state: "NY", owner_zip: "11545", business_csz: "GLEN HEAD, NY 11545-1107" },
  // MOORE PAINTING, LLC — real email found in DB: teemo6866@gmail.com
  { id: "69c7e619-5979-4f27-ac09-3fc966464c0e", email: "teemo6866@gmail.com", full_name: "LORI MOORE", legal_business_name: "MOORE PAINTING, LLC", phone: "6613127092", average_monthly_revenue: null, requested_amount: "60000.00", time_in_business: null, social_security_number: "550350390", date_of_birth: "1964-12-11", owner_address_1: "20216 Arthur Court", owner_city: "Saugus", owner_state: "CA", owner_zip: "91350", business_csz: "Saugus, CA 91350" },
  // Third Generation Antiques and Restoration — real email: 3generationant@gmail.com
  { id: "520e9a67-e68f-4984-9978-5aff2cbfa253", email: "3generationant@gmail.com", full_name: "Harold Andrew Justrabo", legal_business_name: "Third Generation Antiques and Restoration, Inc.", phone: "9856491109", average_monthly_revenue: null, requested_amount: "10000.00", time_in_business: null, social_security_number: "435880478", date_of_birth: "1951-04-29", owner_address_1: "3610 RUE DELPHINE", owner_city: "New Orleans", owner_state: "LA", owner_zip: "70131", business_csz: "Slidell, LA 70458" },
  // WATERLICK EAST INC — real email: a2zrestaurantstuff@gmail.com
  { id: "53840054-c2a6-4591-85a7-02ef77bc7a8e", email: "a2zrestaurantstuff@gmail.com", full_name: "Vic Shelton", legal_business_name: "WATERLICK EAST INC", phone: "4344262583", average_monthly_revenue: null, requested_amount: "15000000.00", time_in_business: null, social_security_number: "229924834", date_of_birth: "1956-06-29", owner_address_1: "113 Dreaming Creek Dr", owner_city: "Lynchburg", owner_state: "VA", owner_zip: "24502", business_csz: "Lynchburg, VA 24502" },
  // Stoops Insurance & Financial Services — real email: laynestoopssf@gmail.com
  { id: "e23e66c2-7b8b-42eb-b4ff-02b3910c07e9", email: "laynestoopssf@gmail.com", full_name: "Layne Stoops", legal_business_name: "Stoops Insurance & Financial Services Inc.", phone: "5099539961", average_monthly_revenue: null, requested_amount: "50000.00", time_in_business: null, social_security_number: "519339987", date_of_birth: "1983-01-21", owner_address_1: "4125 E 38th Ave", owner_city: "Spokane", owner_state: "WA", owner_zip: "99223", business_csz: "Spokane, WA 99205" },
  // NAAMAN RAS INC — most recent unsubmitted record
  { id: "e483821e-52a0-4a99-a80c-65f992d55f0a", email: "naamanrasinc@gmail.com", full_name: "Robert Smith", legal_business_name: "NAAMAN RAS INC.", phone: "7252207558", average_monthly_revenue: "100000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "560437479", date_of_birth: "1976-05-03", owner_address_1: "911 East Ogden Avenue", owner_city: "Las Vegas", owner_state: "NV", owner_zip: "89101", business_csz: "Las Vegas, NV 89101" },
  // M LINK WIRELESS LLC — email in DB is "Leiton" (data entry error); using marcosavelez4@gmail.com from original list
  { id: "cb4c3c86-8f73-4d8c-8fc1-3f15e4ae0bb1", email: "marcosavelez4@gmail.com", full_name: "Maria Leiton", legal_business_name: "M LINK WIRELESS LLC", phone: "5513584164", average_monthly_revenue: "75000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "002578404", date_of_birth: "1989-12-20", owner_address_1: "3504 BERGENLINE AVE", owner_city: "UNION CITY", owner_state: "NJ", owner_zip: "07087", business_csz: "UNION CITY, NJ 07087" },

  // NOT FOUND in DB (no application records):
  // - Allphases Electric LLC (matt@allphasesphilly.com)
  // - VETERAN SECURITY (veteran1lopez@yahoo.com)
  // - Sknrgy (sterling@sunrgysolar.org)
  // - GOGI HOUSE
  // - Chipmasters Manufacturing Inc (reelmaker@earthlink.com)
  // - TOP RANK HEATING & AIR CONDITIONING INC
  // - Sundance Pool and Spa Service Inc (sundancepoolandspaservice@gmail.com)
  // - STEVE OBNEY BUILDERS
  // - Outdoor Systems Management (charles@osmaz.com)
  // - Nick of Time Restoration Services LLC
  // ALREADY SUBMITTED (excluded):
  // - WAJE CLEANING SERVICES INC: already REJECTED
  // - METAL INSTALLATIONS INC: submitted in previous batch
  // - MAYAN MUSIC ENTERTAINMENT INC: submitted in previous batch
];

function buildPayload(app: any) {
  const { first, last } = splitName(app.full_name);
  const ssn = cleanSsn(app.social_security_number);
  const phone = cleanPhone(app.phone);
  let city = (app.owner_city || "").trim();
  let state = (app.owner_state || "").trim();
  let zip = (app.owner_zip || "").trim().slice(0, 5);
  if (!city || !state || !zip) {
    const p = parseBusinessCsz(app.business_csz);
    city = city || p.city; state = state || p.state; zip = zip || p.zip;
  }
  const monthly = parseFloat(app.average_monthly_revenue || "0") || 10000;
  let amount = parseFloat(app.requested_amount || "0");
  if (amount < 500 && amount > 0) amount *= 1000;
  if (amount < 1000) amount = 10000;
  if (amount > 10000) amount = 10000;

  return {
    data: {
      RefID: `TCG-${app.id}`,
      LeadProvider: "TodayCapital", LeadAffiliate: "TodayCapital", LeadCost: 0,
      Firstname: first, Lastname: last,
      SSN: ssn, Email: app.email.toLowerCase(), DOB: app.date_of_birth,
      Language: "e", Military: "n",
      HomeAddress: (app.owner_address_1 || "").replace(/,\s*$/, "").trim(),
      HomeCity: city, HomeState: state, HomeZip: zip.slice(0, 5),
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

function validate(app: any): string | null {
  const ssn = cleanSsn(app.social_security_number);
  if (ssn.length !== 9) return `Bad SSN: "${ssn}" (${ssn.length} digits)`;
  if (!app.date_of_birth) return "Missing DOB";
  const dob = new Date(app.date_of_birth);
  if (dob > new Date()) return `DOB in future: ${app.date_of_birth}`;
  const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 18) return `Too young: ${age.toFixed(1)} yrs`;
  if (!app.email || app.email.toLowerCase() === "leiton") return "Missing/invalid email";
  return null;
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
  console.log(`\n=== GigFi Batch — Feb 4 Declined (${APPS.length} apps) | ${GIGFI_ENVIRONMENT} ===\n`);
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set"); process.exit(1); }

  const accepted: any[] = [], rejected: string[] = [], errors: string[] = [];

  for (const app of APPS) {
    const err = validate(app);
    if (err) { console.log(`  [SKIP] ${app.full_name} (${app.legal_business_name}) — ${err}`); continue; }

    process.stdout.write(`  [SUBMIT] ${app.full_name.trim()} (${app.legal_business_name.trim()}) ... `);
    const result = await submitToGigFi(buildPayload(app));
    const status = result?.data?.status || "ERROR";
    const decisionId = result?.metadata?.decision_id;
    const redirectUrl = result?.data?.redirect_url;
    const errMsg = result?.detail?.msg || (typeof result?.detail === "string" ? result.detail : null);

    console.log(`${status}${decisionId ? ` [${decisionId}]` : ""}${errMsg ? ` — ${errMsg}` : ""}`);
    try { await recordResult(app.id, status, decisionId, redirectUrl); } catch (e: any) { console.log(`    ⚠ save failed: ${e.message}`); }

    if (status === "ACCEPTED") accepted.push({ name: app.full_name, redirect: redirectUrl });
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
