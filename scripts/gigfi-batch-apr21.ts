/**
 * GigFi Batch Submission — April 21, 2026
 * Submits declined businesses from the CSV to GigFi.
 * Saves results back via the production server API (avoids dev DB limitation).
 *
 * Run: tsx scripts/gigfi-batch-apr21.ts
 */

const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const GIGFI_ENVIRONMENT = process.env.GIGFI_ENVIRONMENT || "sandbox";
const GIGFI_LIVE_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const GIGFI_SANDBOX_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const PROD_API = "http://localhost:5000"; // server running locally
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const NEXT_PAY_DATE = "05/01/2026";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanSsn(ssn: string | null): string {
  return (ssn || "").replace(/\D/g, "");
}

function cleanPhone(phone: string | null): string {
  return (phone || "").replace(/\D/g, "").slice(0, 10);
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}

function employmentLength(tib: string | null): number {
  if (!tib) return 24;
  const s = tib.trim().toLowerCase();
  if (s.includes("more than 5")) return 72;
  if (s.includes("3-5 years") || s.includes("3–5 years")) return 48;
  if (s.includes("2-3") || s.includes("2–3")) return 30;
  if (s.includes("1-2") || s.includes("1–2")) return 18;
  if (s.includes("6-12") || s.includes("6–12")) return 9;
  if (s.includes("3-6") || s.includes("3–6") || s.includes("3-5 months")) return 4;
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

function buildPayload(app: any, refId: string) {
  const { first, last } = splitName(app.full_name || "Unknown");
  const ssn = cleanSsn(app.social_security_number);
  const phone = cleanPhone(app.phone);

  let city = (app.owner_city || "").trim();
  let state = (app.owner_state || "").trim();
  let zip = (app.owner_zip || "").trim().slice(0, 5);

  if (!city || !state || !zip) {
    const parsed = parseBusinessCsz(app.business_csz);
    city = city || parsed.city;
    state = state || parsed.state;
    zip = zip || parsed.zip;
  }

  const monthlyRevenue = parseFloat(app.average_monthly_revenue || app.monthly_revenue || "0") || 10000;
  let requestedAmount = parseFloat(app.requested_amount || "0");
  if (requestedAmount < 500 && requestedAmount > 0) requestedAmount *= 1000;
  if (requestedAmount < 1000) requestedAmount = 10000;

  return {
    data: {
      RefID: refId,
      LeadProvider: "TodayCapital",
      LeadAffiliate: "TodayCapital",
      LeadCost: 0,
      Firstname: first,
      Lastname: last,
      SSN: ssn,
      Email: app.email,
      DOB: app.date_of_birth,
      Language: "e",
      Military: "n",
      HomeAddress: (app.owner_address_1 || app.business_street_address || "").trim(),
      HomeCity: city,
      HomeState: state,
      HomeZip: zip.slice(0, 5),
      CellPhone: phone,
      BankInfo: { AccountToUse: "C" },
      EmploymentInfo: {
        MonthlyIncome: monthlyRevenue,
        PayFrequency: "2",
        IncomeType: "5",
        PayrollType: "3",
        NextPayDay: NEXT_PAY_DATE,
        Employer: (app.legal_business_name || app.business_name || first).trim(),
        EmploymentLength: employmentLength(app.time_in_business),
      },
      LoanInfo: { Amount: requestedAmount },
    },
    metadata: { entity_id: refId },
    control: { execution_mode: "sync" },
  };
}

function validate(app: any): string | null {
  if (!app.social_security_number) return "Missing SSN";
  const ssn = cleanSsn(app.social_security_number);
  if (ssn.length !== 9) return `Invalid SSN (${ssn.length} digits)`;
  if (!app.date_of_birth) return "Missing DOB";
  const dob = new Date(app.date_of_birth);
  const now = new Date();
  if (dob > now) return `DOB in future: ${app.date_of_birth}`;
  const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 18) return `Age too young: ${age.toFixed(1)} yrs`;
  if (!app.email) return "Missing email";
  return null;
}

async function submitToGigFi(payload: any): Promise<any> {
  const url = GIGFI_ENVIRONMENT === "live" ? GIGFI_LIVE_URL : GIGFI_SANDBOX_URL;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": GIGFI_API_KEY },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { httpStatus: res.status, ...data };
}

async function recordResult(applicationId: string, status: string, decisionId?: string, redirectUrl?: string) {
  const res = await fetch(`${PROD_API}/api/gigfi/external/record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ADMIN_PASSWORD}`,
    },
    body: JSON.stringify({ applicationId, status, decisionId, redirectUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`record failed: ${JSON.stringify(data)}`);
  return data;
}

// ─── Application data ─────────────────────────────────────────────────────────
// Pulled directly from production DB query — pre-populated here to avoid dev DB issue

const APPS: any[] = [
  { id: "ce3c2f8a-be1c-4dea-a7c9-6ad0c9789ec6", email: "cardonarodolfo154@gmail.com", full_name: " Rodolfo Cardona", legal_business_name: "C.R1 CONSTRUCTION LLC", phone: "7864911026", average_monthly_revenue: "150000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "938965680", date_of_birth: "1989-07-08", owner_address_1: "3671 NW 15TH ST", owner_city: "MIAMI", owner_state: "FL", owner_zip: "33125", business_csz: "MIAMI , FL 33125-1717", gigfi_status: null },
  { id: "b81e952d-fb05-4f55-8fc7-7fef9cc65c6d", email: "abramsalas@thepatriotservices.com", full_name: "ABRAM SALAS", legal_business_name: "PATRIOT SERVICES LLC", phone: "2522699801", average_monthly_revenue: "40000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "523374338", date_of_birth: "1983-03-27", owner_address_1: "21429 E Reunion Rd", owner_city: "Red Rock", owner_state: "AZ", owner_zip: "85145", business_csz: "Red Rock, AZ 85145", gigfi_status: null },
  { id: "fe7274f8-7892-4644-9e0f-cd0a6894669f", email: "unitedcars323@yahoo.com", full_name: "Aaron Blandon", legal_business_name: "Dynamic Traders LLC", phone: "3109861412", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "150000.00", time_in_business: null, social_security_number: "621072237", date_of_birth: "1980-11-30", owner_address_1: "23028 Arlington ave", owner_city: "Los Angeles", owner_state: "CA", owner_zip: "90501", business_csz: "Los Angeles, CA 90022", gigfi_status: null },
  { id: "9907bbab-3048-4467-adf1-ebebf6b25ddf", email: "turnbull988@gmail.com", full_name: "Adam Turnbull", legal_business_name: "dynamite trucking llc", phone: "2627494769", average_monthly_revenue: "70000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "387029525", date_of_birth: "1982-07-17", owner_address_1: "181 Prairie Street", owner_city: "Sharon", owner_state: "WI", owner_zip: "53585", business_csz: "sharon, WI 53585", gigfi_status: null },
  { id: "df8341a2-9025-454b-b314-d0033436133d", email: "BCLUS@HOTMAIL.COM", full_name: "BYRON CASTELLANOS LOPEZ", legal_business_name: "B&C US LOGISTICS LLC", phone: "4694647530", average_monthly_revenue: "44000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "739980690", date_of_birth: "1983-09-25", owner_address_1: "2526 CROSSLANDS DR.", owner_city: "GARLAND", owner_state: "TX", owner_zip: "75040", business_csz: "GARLAND, TX 75040", gigfi_status: null },
  { id: "a85c6e6d-c058-4f5f-a31d-aec5ee9256a7", email: "djones@csarealproperties.com", full_name: "Deena Jones", legal_business_name: "CSA Real Properties & Management, LLC", phone: "6787680426", average_monthly_revenue: "75000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "307744349", date_of_birth: "1961-04-06", owner_address_1: "3200 Windsor Gate Run", owner_city: "Duluth", owner_state: "GA", owner_zip: "30096", business_csz: "Duluth, GA 30096", gigfi_status: null },
  { id: "54501a73-13dc-4aab-851c-593a34bd12c3", email: "eddie@desertgaterealestate.com", full_name: "Eddie Sanin", legal_business_name: "Desert Gate Real Estate Inc", phone: "7604095958", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "100000.00", time_in_business: null, social_security_number: "605227867", date_of_birth: "1965-11-08", owner_address_1: "116 Brenna Ln", owner_city: "Palm Desert", owner_state: "CA", owner_zip: "92211", business_csz: "Palm Desert, CA 92211", gigfi_status: null },
  { id: "4e70e31c-9518-4bd9-8eef-e83f97cf252d", email: "enzo@hcifood.com", full_name: "Enzo Fierros", legal_business_name: "Huntington Culinary Inc", phone: "7149517057", average_monthly_revenue: "350000.00", requested_amount: "65000.00", time_in_business: null, social_security_number: "626327709", date_of_birth: "1989-09-15", owner_address_1: "72 Sellas Rd", owner_city: "Ladera Ranch", owner_state: "CA", owner_zip: "92694", business_csz: "Huntington Beach, CA 92694", gigfi_status: null },
  { id: "d8479156-decd-4835-905c-1828ab9d30ee", email: "herbertmoore23@gmail.com", full_name: "Herbert Moore", legal_business_name: "Herb's Rib Shack, LLC", phone: "4704528592", average_monthly_revenue: "100000.00", requested_amount: "400000.00", time_in_business: null, social_security_number: "230967784", date_of_birth: "1959-08-15", owner_address_1: "1420 Veterans Memorial Hwy SW", owner_city: "Mableton", owner_state: "GA", owner_zip: "30126", business_csz: "Mableton, GA 30126", gigfi_status: null },
  { id: "82d3611c-4ef1-419e-aa28-8c0fc00ae824", email: "acgn.inc@gmail.com", full_name: "Jack Artinian", legal_business_name: "ACGN, INC.", phone: "8187709550", average_monthly_revenue: "75000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "613748531", date_of_birth: "1983-04-26", owner_address_1: "20541 KINGSBURY ST", owner_city: "Chatsworth", owner_state: "CA", owner_zip: "91311", business_csz: "Chatsworth, CA 91311", gigfi_status: null },
  { id: "8b8c3110-c756-4be1-adfb-9eb4c3ed7f3e", email: "fullerworks.llc@yahoo.com", full_name: "Jonathan Noonan", legal_business_name: "Fullerworks LLC", phone: "6463911129", average_monthly_revenue: "40000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "134502963", date_of_birth: "1968-10-02", owner_address_1: "2002 Mapes Ave", owner_city: "bronx", owner_state: "NY", owner_zip: "10460", business_csz: "Bronx, NY 10466", gigfi_status: null },
  { id: "0b46576f-a6c3-4778-b35a-5b542f63a2cf", email: "folalde@five-ofleetservice.com", full_name: "Jose olalde", legal_business_name: "Five-O Fleet Service llc", phone: "9401083918", average_monthly_revenue: "150000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "636589025", date_of_birth: "1997-06-25", owner_address_1: "18552 doubletree dr", owner_city: "Justin", owner_state: "TX", owner_zip: "76247", business_csz: "Midland , TX 79706", gigfi_status: null },
  { id: "813e6402-f495-4abf-be5a-cae6a32562c6", email: "jcghusky7@gmail.com", full_name: "Juan Carlos Garcia", legal_business_name: "Husky Concrete Removal Inc", phone: "7143286585", average_monthly_revenue: "103000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "602192037", date_of_birth: "1972-02-03", owner_address_1: "6768 Raven Circle", owner_city: "jurupa valley", owner_state: "CA", owner_zip: "92509", business_csz: "jurupa valley, CA 92509", gigfi_status: null },
  { id: "930e6a55-b886-4afa-b4d8-82ec8160d37d", email: "Kevin@chosencontract.com", full_name: "KEVIN HATCHER", legal_business_name: "CHOSEN COMMERCIAL CONTRACT INC.", phone: "8593939551", average_monthly_revenue: "95000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "522251678", date_of_birth: "1965-02-17", owner_address_1: "526 ENTERPRISE DRIVE", owner_city: "ERLANGER", owner_state: "KY", owner_zip: "41018", business_csz: "FLORENCE, KS 41022-0991", gigfi_status: null },
  { id: "8419ad61-d85d-4ecb-b22f-6b695667e9e5", email: "bigbshowfeeds@gmail.com", full_name: "Keith Barron", legal_business_name: "Big B Show Feeds", phone: "8144421321", average_monthly_revenue: "22000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "167407592", date_of_birth: "1957-01-16", owner_address_1: "572 mountain view road", owner_city: "Somerset", owner_state: "PA", owner_zip: "15501", business_csz: "Somerset , PA 15501", gigfi_status: null },
  { id: "5e320703-4675-4458-9642-38d5cc84c6a6", email: "KELSONKHEXTERIORS@GMAIL.COM", full_name: "Kelson Harris", legal_business_name: "KH Exteriors LLC", phone: "7578050998", average_monthly_revenue: "30000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "231530606", date_of_birth: "1984-01-03", owner_address_1: "1621 Donna Dr", owner_city: "Virginia Beach", owner_state: "VA", owner_zip: "23451", business_csz: "Virginia Beach, VA 23451", gigfi_status: null },
  { id: "191eeedb-291b-4ce1-a932-75e42aa0810e", email: "lesterwade@hotmail.com", full_name: "Lester Wade", legal_business_name: "Wade construction and remodeling inc", phone: "6178754425", average_monthly_revenue: "50000.00", requested_amount: "25000.00", time_in_business: null, social_security_number: "033662131", date_of_birth: "1981-01-21", owner_address_1: "25 millett ave", owner_city: "Weymouth", owner_state: "MA", owner_zip: "02190", business_csz: "Weymouth , MA 02190", gigfi_status: null },
  { id: "240e33f2-e178-4158-bbb7-1e478fde1677", email: "mcmeninc4@gmail.com", full_name: "Nicholas Mcfall", legal_business_name: "MCMENINC LLC", phone: "3233843584", average_monthly_revenue: "40000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "499866047", date_of_birth: "1982-08-23", owner_address_1: "5150 CANDLEWOOD ST STE 6A", owner_city: "LAKEWOOD", owner_state: "CA", owner_zip: "90712", business_csz: "LAKEWOOD , CA 90712", gigfi_status: null },
  { id: "5b81a22b-baba-4c54-a7f3-5176a89f5a25", email: "PPEREZ@RP-INVESTIGATION.COM", full_name: "PEDRO PEREZ", legal_business_name: "RIVERSIDE PROTECTIVE INVESTIGATIONS", phone: "2108401455", average_monthly_revenue: "50000.00", requested_amount: "75000.00", time_in_business: null, social_security_number: "463757394", date_of_birth: "1985-11-23", owner_address_1: "1110 CALLE REAL", owner_city: "MESQUITE", owner_state: "TX", owner_zip: "75149", business_csz: "MESQUITE, TX 75149", gigfi_status: null },
  { id: "859d57b0-0dc3-4934-86f9-6fcf3a7462c6", email: "JOBRYANT.JAB@GMAIL.COM", full_name: "Richard Bryant", legal_business_name: "COMFORT AIR SOLUTIONS LLC", phone: "9857899563", average_monthly_revenue: "100000.00", requested_amount: "10000.00", time_in_business: null, social_security_number: "626038915", date_of_birth: "1978-10-28", owner_address_1: "1907 E COTTONWOOD LN", owner_city: "MOHAVE VALLEY", owner_state: "AZ", owner_zip: "86440", business_csz: "MOHAVE VALLEY, AZ 86440", gigfi_status: null },
  { id: "8cbf4cc3-8471-4a4a-964b-2cb3d0164f38", email: "frederickmovingco@gmail.com", full_name: "Robert Lapham", legal_business_name: "Bett'r Way Trucking Two Inc", phone: "3018656116", average_monthly_revenue: "25000.00", requested_amount: "50.00", time_in_business: null, social_security_number: "075640125", date_of_birth: "1963-05-25", owner_address_1: "6307 Danville Court", owner_city: "Frederick", owner_state: "MD", owner_zip: "21701", business_csz: "Frederick , MD 21701", gigfi_status: null },
  { id: "a852097b-7b0f-4192-b337-5b91d1f135de", email: "HOMEBOYHILLS58@GMAIL.COM", full_name: "STEVEN L HILLS", legal_business_name: "Emergency Road Service and Diesel Repair LLC", phone: "5207054927", average_monthly_revenue: "80000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "509706690", date_of_birth: "1958-03-16", owner_address_1: "1788 West Frontage Road", owner_city: "SAN SIMON", owner_state: "AZ", owner_zip: "85632", business_csz: "SAN SIMON, AZ 85632", gigfi_status: null },
  { id: "92a3d567-445d-4459-9810-ec976ae86845", email: "lastapias502@gmail.com", full_name: "Selvin Ordonez", legal_business_name: "LAS TAPIAS TRUCKING LLC", phone: "3234047212", average_monthly_revenue: "62000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "602644373", date_of_birth: "1980-11-04", owner_address_1: "10251 Fern Ave", owner_city: "STANTON", owner_state: "CA", owner_zip: "90680", business_csz: "STANTON, CA 90680", gigfi_status: null },
  { id: "b0281b3a-8317-42af-9f69-9a81a5f6d06e", email: "Sanologistics0@gmail.com", full_name: "Terrell Thomas", legal_business_name: "S.a.n.o logistics LLC", phone: "5049319998", average_monthly_revenue: "38000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "436775587", date_of_birth: "1989-10-11", owner_address_1: "4710 new capital st", owner_city: "San Antonio", owner_state: "TX", owner_zip: "78222", business_csz: "Converse, TX 78109", gigfi_status: null },
  { id: "1af77371-fbda-4768-a1d6-a67bce2ba45b", email: "tybountom@gmail.com", full_name: "Tyler bountom", legal_business_name: "Capital king holdings", phone: "8176731112", average_monthly_revenue: "100000.00", requested_amount: "75000.00", time_in_business: null, social_security_number: "633523691", date_of_birth: "1996-03-28", owner_address_1: "16940 eastern red blvd", owner_city: "Justin", owner_state: "TX", owner_zip: "76247", business_csz: "Justin, TX 76247", gigfi_status: null },
  { id: "50b79453-ed97-4568-8206-42d07eaf9453", email: "ygmrtruckingllc@gmail.com", full_name: "Yender Gutierrez", legal_business_name: "YGMR TRUCKING LLC", phone: "7868792661", average_monthly_revenue: "76000.00", requested_amount: "25000.00", time_in_business: null, social_security_number: "834848642", date_of_birth: "1986-07-30", owner_address_1: "19445 TAHOKA SPRINGS DR", owner_city: "KATY", owner_state: "TX", owner_zip: "77449", business_csz: "KATY, TX 77449", gigfi_status: null },
  { id: "090d4233-183a-45c9-9f09-18093cd22042", email: "mike@asunnyday.com", full_name: "Michael Ventry", legal_business_name: "A Sunny Day Transport Services LLC", phone: "4703509113", average_monthly_revenue: "55000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "259359447", date_of_birth: "1966-08-09", owner_address_1: "1625 Rushing River Way", owner_city: "Suwanee", owner_state: "GA", owner_zip: "30024", business_csz: "Cumming, GA 30040", gigfi_status: null },
  { id: "9ab15598-9b30-4b83-9650-b8404977cc54", email: "gutierrezjanitorial@outlook.com", full_name: "Robert Gutierrez", business_name: "Gutierrez Janitorial", legal_business_name: "Gutierrez Janitorial", phone: "5303919183", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "25000.00", time_in_business: "More than 5 years", social_security_number: "551677206", date_of_birth: "1981-06-21", owner_address_1: "2355 Pintail Ln.", owner_city: null, owner_state: null, owner_zip: null, business_csz: "Placerville, CA 95667", gigfi_status: null },
  // SKIP: Bert Orr (Timberline Electric) — DOB = 2026-01-29 (data entry error, age = 0)
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!GIGFI_API_KEY) {
    console.error("GIGFI_API_KEY not set. Aborting.");
    process.exit(1);
  }

  console.log(`\n=== GigFi Batch Submission — April 21, 2026 ===`);
  console.log(`Environment: ${GIGFI_ENVIRONMENT}`);
  console.log(`Target: ${APPS.length} applications\n`);

  const results: any[] = [];

  for (const app of APPS) {
    const err = validate(app);
    if (err) {
      console.log(`  [SKIP] ${app.full_name} — ${err}`);
      results.push({ id: app.id, name: app.full_name, status: "SKIP", reason: err });
      continue;
    }

    const refId = `TCG-${app.id}`;
    const payload = buildPayload(app, refId);

    process.stdout.write(`  [SUBMIT] ${app.full_name.trim()} (${(app.legal_business_name || app.business_name || "").trim()}) ... `);

    try {
      const result = await submitToGigFi(payload);
      const gigfiStatus = result?.data?.status || "ERROR";
      const decisionId = result?.metadata?.decision_id;
      const redirectUrl = result?.data?.redirect_url;
      const errorMsg = result?.detail?.msg || (typeof result?.detail === "string" ? result.detail : null) || result?.message;

      console.log(`${gigfiStatus}${decisionId ? ` [${decisionId}]` : ""}${errorMsg ? ` — ${errorMsg}` : ""}`);

      // Save result back to production DB via server API
      try {
        await recordResult(app.id, gigfiStatus, decisionId, redirectUrl);
      } catch (saveErr: any) {
        console.log(`    ⚠ Failed to save result: ${saveErr.message}`);
      }

      results.push({ id: app.id, name: app.full_name, status: gigfiStatus, decisionId, redirectUrl, error: errorMsg });
    } catch (e: any) {
      console.log(`ERROR — ${e.message}`);
      results.push({ id: app.id, name: app.full_name, status: "ERROR", reason: e.message });
    }

    await new Promise(r => setTimeout(r, 600));
  }

  const accepted = results.filter(r => r.status === "ACCEPTED");
  const rejected = results.filter(r => r.status === "REJECTED");
  const errors = results.filter(r => r.status === "ERROR");
  const skipped = results.filter(r => r.status === "SKIP");

  console.log(`\n=== Summary ===`);
  console.log(`  ACCEPTED : ${accepted.length}`);
  console.log(`  REJECTED : ${rejected.length}`);
  console.log(`  ERROR    : ${errors.length}`);
  console.log(`  SKIPPED  : ${skipped.length}`);

  if (accepted.length > 0) {
    console.log(`\n  Accepted leads:`);
    accepted.forEach(r => console.log(`    - ${r.name?.trim()}: ${r.redirectUrl || "no redirect"}`));
  }
  if (errors.length > 0) {
    console.log(`\n  Errors/issues:`);
    errors.forEach(r => console.log(`    - ${r.name?.trim()}: ${r.reason || r.error}`));
  }
  if (skipped.length > 0) {
    console.log(`\n  Skipped:`);
    skipped.forEach(r => console.log(`    - ${r.name?.trim() || r.id}: ${r.reason}`));
  }

  console.log(`\nDone.`);
}

main().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
