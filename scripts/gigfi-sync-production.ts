/**
 * GigFi Production Sync — April 21, 2026
 *
 * Re-submits all batches from today's session to GigFi and saves results
 * directly to the PRODUCTION API so they appear on the submissions page.
 *
 * Combines: apr21 (28), notfound (4), feb-declined (15), feb4-declined (8)
 *
 * Run:
 *   GIGFI_API_KEY=<key> GIGFI_ENVIRONMENT=live tsx scripts/gigfi-sync-production.ts
 */

const GIGFI_API_KEY = process.env.GIGFI_API_KEY || "";
const GIGFI_ENVIRONMENT = process.env.GIGFI_ENVIRONMENT || "sandbox";
const GIGFI_LIVE_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/decide";
const GIGFI_SANDBOX_URL = "https://risk.bf9baa41.decide.taktile.com/run/api/v1/flows/gigfileads/sandbox/decide";
const PROD_API = "https://app.todaycapitalgroup.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Tcg1!tcg";
const NEXT_PAY_DATE = "05/01/2026";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanSsn(ssn: string | null): string { return (ssn || "").replace(/\D/g, ""); }
function cleanPhone(phone: string | null): string { return (phone || "").replace(/\D/g, "").slice(0, 10); }
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
  if (s.includes("6-12") || s.includes("6–12")) return 9;
  if (s.includes("3-6") || s.includes("3–6")) return 4;
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

function buildPayload(app: any) {
  const { first, last } = splitName(app.full_name);
  const ssn = cleanSsn(app.social_security_number);
  const phone = cleanPhone(app.phone);

  let city = (app.owner_city || "").trim();
  let state = (app.owner_state || "").trim();
  let zip = (app.owner_zip || "").trim().slice(0, 5);
  if (!city || !state || !zip) {
    const p = parseBusinessCsz(app.business_csz);
    city = city || p.city;
    state = state || p.state;
    zip = zip || p.zip;
  }

  const monthly = parseFloat(app.average_monthly_revenue || app.monthly_revenue || "0") || 10000;
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
        Employer: (app.legal_business_name || app.business_name || first).trim(),
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
  if (ssn.length !== 9) return `Bad SSN (${ssn.length} digits)`;
  if (!app.date_of_birth) return "Missing DOB";
  const dob = new Date(app.date_of_birth);
  if (dob > new Date()) return `DOB in future: ${app.date_of_birth}`;
  const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 18) return `Too young: ${age.toFixed(1)} yrs`;
  if (!app.email || app.email.toLowerCase() === "leiton" || app.email.includes("@imported.local")) return "Missing/invalid email";
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

async function recordResult(applicationId: string, status: string, decisionId?: string, redirectUrl?: string) {
  const res = await fetch(`${PROD_API}/api/gigfi/external/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ADMIN_PASSWORD}` },
    body: JSON.stringify({ applicationId, status, decisionId, redirectUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Save failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// ─── Combined application data from all 4 batches ────────────────────────────

const APPS: any[] = [

  // ── APR 21 BATCH (28 apps) ──────────────────────────────────────────────────
  { id: "ce3c2f8a-be1c-4dea-a7c9-6ad0c9789ec6", batch: "apr21", email: "cardonarodolfo154@gmail.com", full_name: " Rodolfo Cardona", legal_business_name: "C.R1 CONSTRUCTION LLC", phone: "7864911026", average_monthly_revenue: "150000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "938965680", date_of_birth: "1989-07-08", owner_address_1: "3671 NW 15TH ST", owner_city: "MIAMI", owner_state: "FL", owner_zip: "33125" },
  { id: "b81e952d-fb05-4f55-8fc7-7fef9cc65c6d", batch: "apr21", email: "abramsalas@thepatriotservices.com", full_name: "ABRAM SALAS", legal_business_name: "PATRIOT SERVICES LLC", phone: "2522699801", average_monthly_revenue: "40000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "523374338", date_of_birth: "1983-03-27", owner_address_1: "21429 E Reunion Rd", owner_city: "Red Rock", owner_state: "AZ", owner_zip: "85145" },
  { id: "fe7274f8-7892-4644-9e0f-cd0a6894669f", batch: "apr21", email: "unitedcars323@yahoo.com", full_name: "Aaron Blandon", legal_business_name: "Dynamic Traders LLC", phone: "3109861412", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "150000.00", time_in_business: null, social_security_number: "621072237", date_of_birth: "1980-11-30", owner_address_1: "23028 Arlington ave", owner_city: "Los Angeles", owner_state: "CA", owner_zip: "90501" },
  { id: "9907bbab-3048-4467-adf1-ebebf6b25ddf", batch: "apr21", email: "turnbull988@gmail.com", full_name: "Adam Turnbull", legal_business_name: "dynamite trucking llc", phone: "2627494769", average_monthly_revenue: "70000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "387029525", date_of_birth: "1982-07-17", owner_address_1: "181 Prairie Street", owner_city: "Sharon", owner_state: "WI", owner_zip: "53585" },
  { id: "df8341a2-9025-454b-b314-d0033436133d", batch: "apr21", email: "BCLUS@HOTMAIL.COM", full_name: "BYRON CASTELLANOS LOPEZ", legal_business_name: "B&C US LOGISTICS LLC", phone: "4694647530", average_monthly_revenue: "44000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "739980690", date_of_birth: "1983-09-25", owner_address_1: "2526 CROSSLANDS DR.", owner_city: "GARLAND", owner_state: "TX", owner_zip: "75040" },
  { id: "a85c6e6d-c058-4f5f-a31d-aec5ee9256a7", batch: "apr21", email: "djones@csarealproperties.com", full_name: "Deena Jones", legal_business_name: "CSA Real Properties & Management, LLC", phone: "6787680426", average_monthly_revenue: "75000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "307744349", date_of_birth: "1961-04-06", owner_address_1: "3200 Windsor Gate Run", owner_city: "Duluth", owner_state: "GA", owner_zip: "30096" },
  { id: "54501a73-13dc-4aab-851c-593a34bd12c3", batch: "apr21", email: "eddie@desertgaterealestate.com", full_name: "Eddie Sanin", legal_business_name: "Desert Gate Real Estate Inc", phone: "7604095958", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "100000.00", time_in_business: null, social_security_number: "605227867", date_of_birth: "1965-11-08", owner_address_1: "116 Brenna Ln", owner_city: "Palm Desert", owner_state: "CA", owner_zip: "92211" },
  { id: "4e70e31c-9518-4bd9-8eef-e83f97cf252d", batch: "apr21", email: "enzo@hcifood.com", full_name: "Enzo Fierros", legal_business_name: "Huntington Culinary Inc", phone: "7149517057", average_monthly_revenue: "350000.00", requested_amount: "65000.00", time_in_business: null, social_security_number: "626327709", date_of_birth: "1989-09-15", owner_address_1: "72 Sellas Rd", owner_city: "Ladera Ranch", owner_state: "CA", owner_zip: "92694" },
  { id: "d8479156-decd-4835-905c-1828ab9d30ee", batch: "apr21", email: "herbertmoore23@gmail.com", full_name: "Herbert Moore", legal_business_name: "Herb's Rib Shack, LLC", phone: "4704528592", average_monthly_revenue: "100000.00", requested_amount: "400000.00", time_in_business: null, social_security_number: "230967784", date_of_birth: "1959-08-15", owner_address_1: "1420 Veterans Memorial Hwy SW", owner_city: "Mableton", owner_state: "GA", owner_zip: "30126" },
  { id: "82d3611c-4ef1-419e-aa28-8c0fc00ae824", batch: "apr21", email: "acgn.inc@gmail.com", full_name: "Jack Artinian", legal_business_name: "ACGN, INC.", phone: "8187709550", average_monthly_revenue: "75000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "613748531", date_of_birth: "1983-04-26", owner_address_1: "20541 KINGSBURY ST", owner_city: "Chatsworth", owner_state: "CA", owner_zip: "91311" },
  { id: "8b8c3110-c756-4be1-adfb-9eb4c3ed7f3e", batch: "apr21", email: "fullerworks.llc@yahoo.com", full_name: "Jonathan Noonan", legal_business_name: "Fullerworks LLC", phone: "6463911129", average_monthly_revenue: "40000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "134502963", date_of_birth: "1968-10-02", owner_address_1: "2002 Mapes Ave", owner_city: "bronx", owner_state: "NY", owner_zip: "10460" },
  { id: "0b46576f-a6c3-4778-b35a-5b542f63a2cf", batch: "apr21", email: "folalde@five-ofleetservice.com", full_name: "Jose olalde", legal_business_name: "Five-O Fleet Service llc", phone: "9401083918", average_monthly_revenue: "150000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "636589025", date_of_birth: "1997-06-25", owner_address_1: "18552 doubletree dr", owner_city: "Justin", owner_state: "TX", owner_zip: "76247" },
  { id: "813e6402-f495-4abf-be5a-cae6a32562c6", batch: "apr21", email: "jcghusky7@gmail.com", full_name: "Juan Carlos Garcia", legal_business_name: "Husky Concrete Removal Inc", phone: "7143286585", average_monthly_revenue: "103000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "602192037", date_of_birth: "1972-02-03", owner_address_1: "6768 Raven Circle", owner_city: "jurupa valley", owner_state: "CA", owner_zip: "92509" },
  { id: "930e6a55-b886-4afa-b4d8-82ec8160d37d", batch: "apr21", email: "Kevin@chosencontract.com", full_name: "KEVIN HATCHER", legal_business_name: "CHOSEN COMMERCIAL CONTRACT INC.", phone: "8593939551", average_monthly_revenue: "95000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "522251678", date_of_birth: "1965-02-17", owner_address_1: "526 ENTERPRISE DRIVE", owner_city: "ERLANGER", owner_state: "KY", owner_zip: "41018" },
  { id: "8419ad61-d85d-4ecb-b22f-6b695667e9e5", batch: "apr21", email: "bigbshowfeeds@gmail.com", full_name: "Keith Barron", legal_business_name: "Big B Show Feeds", phone: "8144421321", average_monthly_revenue: "22000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "167407592", date_of_birth: "1957-01-16", owner_address_1: "572 mountain view road", owner_city: "Somerset", owner_state: "PA", owner_zip: "15501" },
  { id: "5e320703-4675-4458-9642-38d5cc84c6a6", batch: "apr21", email: "KELSONKHEXTERIORS@GMAIL.COM", full_name: "Kelson Harris", legal_business_name: "KH Exteriors LLC", phone: "7578050998", average_monthly_revenue: "30000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "231530606", date_of_birth: "1984-01-03", owner_address_1: "1621 Donna Dr", owner_city: "Virginia Beach", owner_state: "VA", owner_zip: "23451" },
  { id: "191eeedb-291b-4ce1-a932-75e42aa0810e", batch: "apr21", email: "lesterwade@hotmail.com", full_name: "Lester Wade", legal_business_name: "Wade construction and remodeling inc", phone: "6178754425", average_monthly_revenue: "50000.00", requested_amount: "25000.00", time_in_business: null, social_security_number: "033662131", date_of_birth: "1981-01-21", owner_address_1: "25 millett ave", owner_city: "Weymouth", owner_state: "MA", owner_zip: "02190" },
  { id: "240e33f2-e178-4158-bbb7-1e478fde1677", batch: "apr21", email: "mcmeninc4@gmail.com", full_name: "Nicholas Mcfall", legal_business_name: "MCMENINC LLC", phone: "3233843584", average_monthly_revenue: "40000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "499866047", date_of_birth: "1982-08-23", owner_address_1: "5150 CANDLEWOOD ST STE 6A", owner_city: "LAKEWOOD", owner_state: "CA", owner_zip: "90712" },
  { id: "5b81a22b-baba-4c54-a7f3-5176a89f5a25", batch: "apr21", email: "PPEREZ@RP-INVESTIGATION.COM", full_name: "PEDRO PEREZ", legal_business_name: "RIVERSIDE PROTECTIVE INVESTIGATIONS", phone: "2108401455", average_monthly_revenue: "50000.00", requested_amount: "75000.00", time_in_business: null, social_security_number: "463757394", date_of_birth: "1985-11-23", owner_address_1: "1110 CALLE REAL", owner_city: "MESQUITE", owner_state: "TX", owner_zip: "75149" },
  // Richard Bryant already ACCEPTED — skip
  { id: "8cbf4cc3-8471-4a4a-964b-2cb3d0164f38", batch: "apr21", email: "frederickmovingco@gmail.com", full_name: "Robert Lapham", legal_business_name: "Bett'r Way Trucking Two Inc", phone: "3018656116", average_monthly_revenue: "25000.00", requested_amount: "50.00", time_in_business: null, social_security_number: "075640125", date_of_birth: "1963-05-25", owner_address_1: "6307 Danville Court", owner_city: "Frederick", owner_state: "MD", owner_zip: "21701" },
  { id: "a852097b-7b0f-4192-b337-5b91d1f135de", batch: "apr21", email: "HOMEBOYHILLS58@GMAIL.COM", full_name: "STEVEN L HILLS", legal_business_name: "Emergency Road Service and Diesel Repair LLC", phone: "5207054927", average_monthly_revenue: "80000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "509706690", date_of_birth: "1958-03-16", owner_address_1: "1788 West Frontage Road", owner_city: "SAN SIMON", owner_state: "AZ", owner_zip: "85632" },
  { id: "92a3d567-445d-4459-9810-ec976ae86845", batch: "apr21", email: "lastapias502@gmail.com", full_name: "Selvin Ordonez", legal_business_name: "LAS TAPIAS TRUCKING LLC", phone: "3234047212", average_monthly_revenue: "62000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "602644373", date_of_birth: "1980-11-04", owner_address_1: "10251 Fern Ave", owner_city: "STANTON", owner_state: "CA", owner_zip: "90680" },
  { id: "b0281b3a-8317-42af-9f69-9a81a5f6d06e", batch: "apr21", email: "Sanologistics0@gmail.com", full_name: "Terrell Thomas", legal_business_name: "S.a.n.o logistics LLC", phone: "5049319998", average_monthly_revenue: "38000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "436775587", date_of_birth: "1989-10-11", owner_address_1: "4710 new capital st", owner_city: "San Antonio", owner_state: "TX", owner_zip: "78222" },
  { id: "1af77371-fbda-4768-a1d6-a67bce2ba45b", batch: "apr21", email: "tybountom@gmail.com", full_name: "Tyler bountom", legal_business_name: "Capital king holdings", phone: "8176731112", average_monthly_revenue: "100000.00", requested_amount: "75000.00", time_in_business: null, social_security_number: "633523691", date_of_birth: "1996-03-28", owner_address_1: "16940 eastern red blvd", owner_city: "Justin", owner_state: "TX", owner_zip: "76247" },
  { id: "50b79453-ed97-4568-8206-42d07eaf9453", batch: "apr21", email: "ygmrtruckingllc@gmail.com", full_name: "Yender Gutierrez", legal_business_name: "YGMR TRUCKING LLC", phone: "7868792661", average_monthly_revenue: "76000.00", requested_amount: "25000.00", time_in_business: null, social_security_number: "834848642", date_of_birth: "1986-07-30", owner_address_1: "19445 TAHOKA SPRINGS DR", owner_city: "KATY", owner_state: "TX", owner_zip: "77449" },
  { id: "090d4233-183a-45c9-9f09-18093cd22042", batch: "apr21", email: "mike@asunnyday.com", full_name: "Michael Ventry", legal_business_name: "A Sunny Day Transport Services LLC", phone: "4703509113", average_monthly_revenue: "55000.00", requested_amount: "40000.00", time_in_business: null, social_security_number: "259359447", date_of_birth: "1966-08-09", owner_address_1: "1625 Rushing River Way", owner_city: "Suwanee", owner_state: "GA", owner_zip: "30024" },
  { id: "9ab15598-9b30-4b83-9650-b8404977cc54", batch: "apr21", email: "gutierrezjanitorial@outlook.com", full_name: "Robert Gutierrez", business_name: "Gutierrez Janitorial", legal_business_name: "Gutierrez Janitorial", phone: "5303919183", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "25000.00", time_in_business: "More than 5 years", social_security_number: "551677206", date_of_birth: "1981-06-21", owner_address_1: "2355 Pintail Ln.", owner_city: null, owner_state: null, owner_zip: null, business_csz: "Placerville, CA 95667" },

  // ── NOT FOUND BATCH (4 apps) ────────────────────────────────────────────────
  { id: "58eaaf57-34c3-4bbe-8f5d-74679a4d0162", batch: "notfound", email: "garnerhvac@outlook.com", full_name: "Bradley Garner", legal_business_name: "Garner Heating And Cooling", phone: "5174037338", average_monthly_revenue: "80000.00", requested_amount: "150000.00", time_in_business: "More than 5 years", social_security_number: "365766960", date_of_birth: "1960-09-14", owner_address_1: "176 Osborne St.", owner_city: "Britton", owner_state: "MI", owner_zip: "49229" },
  { id: "32c81f0b-e23f-403b-a873-90753865557c", batch: "notfound", email: "main.sd202@gmail.com", full_name: "Main Daraghmeh", legal_business_name: "KARAM GRILL & BAKERY LLC", phone: "7135534879", average_monthly_revenue: "50000.00", requested_amount: "45000.00", time_in_business: null, social_security_number: "331375907", date_of_birth: "1971-08-25", owner_address_1: "3314 WIMBERLY PLACE LN", owner_city: "Katy", owner_state: "TX", owner_zip: "77494" },
  { id: "71fe9e56-5ab7-47de-971e-658c4fed44c3", batch: "notfound", email: "vincent@librefianza.com", full_name: "Vincent Smith", legal_business_name: "LIBRE IMMIGRATION SERVICES INC", phone: "1610914239", average_monthly_revenue: "100000.00", requested_amount: "25000.00", time_in_business: null, social_security_number: "169545659", date_of_birth: "1962-12-19", owner_address_1: "1920 Kutztown Rd,", owner_city: "LEBANON", owner_state: "PA", owner_zip: "17042" },
  { id: "fc7c566c-b410-4cd0-95d1-3ae9f5b82b03", batch: "notfound", email: "qadrinoman@yahoo.com", full_name: "Noman Qadri", legal_business_name: "RHA JEWELERY LLC", phone: "7028095698", average_monthly_revenue: "150000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "622426806", date_of_birth: "1973-05-05", owner_address_1: "1021 Miradero LN", owner_city: "Las Vegas", owner_state: "NV", owner_zip: "89134" },

  // ── FEB/DEC DECLINED BATCH (15 apps) ────────────────────────────────────────
  { id: "a0175104-930f-4470-be97-0af8ae5d9479", batch: "feb-declined", email: "vgrillo@vyvoa.com", full_name: "VICENTE GRILLO", legal_business_name: "VYVOA CONSULTING LLC", phone: "2126165564", average_monthly_revenue: "25000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "089560151", date_of_birth: "1965-09-07", owner_address_1: "12217 109th AVENUE", owner_city: "SOUTH OZONE PARK", owner_state: "NY", owner_zip: "11420" },
  { id: "be8d47d3-d5b9-4250-826c-b77b7ca9ff11", batch: "feb-declined", email: "romelhilaire@yahoo.com", full_name: "Romel Hilaire", legal_business_name: "Andromel Estates Corporation", phone: "7542692275", average_monthly_revenue: "20000.00", requested_amount: "30000.00", time_in_business: null, social_security_number: "356693080", date_of_birth: "1975-09-06", owner_address_1: "8303 NW 26TH PL", owner_city: "SUNRISE", owner_state: "FL", owner_zip: "33322" },
  { id: "6c4319fa-5b80-411f-bca6-09f4c648a079", batch: "feb-declined", email: "bobbyl@blacklabelautomation.com", full_name: "Robert levesque", legal_business_name: "Black label automation", phone: "4313717658", average_monthly_revenue: "500000.00", requested_amount: "500000.00", time_in_business: "More than 5 years", social_security_number: "501093125", date_of_birth: "1979-02-21", owner_address_1: "West stutsman st", owner_city: "Pembina", owner_state: "ND", owner_zip: "58271" },
  { id: "6e2c7e7c-0b73-44cd-bc27-3f46e88abb2d", batch: "feb-declined", email: "info@highestremodeling.com", full_name: "Terry Bennett", legal_business_name: "Highest Remodeling LLC", phone: "7036770174", average_monthly_revenue: "50000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "214237469", date_of_birth: "1983-10-09", owner_address_1: "11267 waples mill rd", owner_city: "oakton", owner_state: "VA", owner_zip: "22124" },
  { id: "759167ab-f03c-422e-967a-041d17c0b4c1", batch: "feb-declined", email: "torell2@hotmail.com", full_name: "Michael Torell II", legal_business_name: "Living water well drilling", phone: "2096170945", average_monthly_revenue: "208000.00", requested_amount: "350000.00", time_in_business: "More than 5 years", social_security_number: "570755356", date_of_birth: "1977-10-11", owner_address_1: "2475 dunn rd", owner_city: "Merced", owner_state: "CA", owner_zip: "95340" },
  { id: "4a7b1dc5-8fea-4522-8059-68feea8a3992", batch: "feb-declined", email: "tbutter22@icloud.com", full_name: "Tyrone Butterfield", legal_business_name: "Bfields Investment Group, LLC", phone: "4078605902", average_monthly_revenue: "200000.00", requested_amount: "200000.00", time_in_business: null, social_security_number: "264772751", date_of_birth: "1977-01-07", owner_address_1: "5182 Moore St", owner_city: "Saint Cloud", owner_state: "FL", owner_zip: "34771" },
  { id: "025a90b3-fa56-490c-b7a9-730f6e67bdf4", batch: "feb-declined", email: "ramonher71@gmail.com", full_name: "Ramon Antonio Hernandez Garcia", legal_business_name: "WESTIN & CLARK LLC", phone: "8182721568", average_monthly_revenue: "65000.00", requested_amount: "500000.00", time_in_business: null, social_security_number: "606023149", date_of_birth: "1971-07-21", owner_address_1: "2746 West Ave O", owner_city: "Palmdale", owner_state: "CA", owner_zip: "83551" },
  { id: "a7005fc2-598a-47bb-a61e-17b8cad1c595", batch: "feb-declined", email: "isaacisaac1972@yahoo.com", full_name: "sharlenabell", legal_business_name: "pure and healthy hair salon", phone: "2145649557", average_monthly_revenue: "12000.00", requested_amount: "5000.00", time_in_business: null, social_security_number: "463376415", date_of_birth: "1972-08-29", owner_address_1: "5328 KATHRYN DR", owner_city: "GRAND PRAIRIE", owner_state: "TX", owner_zip: "75052" },
  { id: "ffeed1a0-851e-486e-bf42-4f43ca7b4d5a", batch: "feb-declined", email: "info@cigaarheavenusa.com", full_name: "Michael Wasserman", legal_business_name: "Cigar Heaven Inc", phone: "3122036457", average_monthly_revenue: "75000.00", requested_amount: "50000.00", time_in_business: null, social_security_number: "356404289", date_of_birth: "1957-10-07", owner_address_1: "506 E NORTHWEST HWY", owner_city: "MOUNT PROSPECT", owner_state: "IL", owner_zip: "60056" },
  { id: "3bd21684-4455-4ffd-9406-40fe5b12a3f7", batch: "feb-declined", email: "jmdlww77@gmail.com", full_name: "JOHN MARTIN", legal_business_name: "DAIRYLAND WOODWORKS LLC", phone: "7152712110", average_monthly_revenue: "120000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "399024842", date_of_birth: "1977-06-27", owner_address_1: "2131 N 700 W", owner_city: "WARSAW", owner_state: "IN", owner_zip: "46580" },
  { id: "17318c76-f075-45f6-9f6d-338b08f2c96b", batch: "feb-declined", email: "METALINSTALLATIONS@YAHOO.COM", full_name: "ERIC ROYAL", legal_business_name: "METAL INSTALLATIONS INC", phone: "7732691199", average_monthly_revenue: "80000.00", requested_amount: "100000.00", time_in_business: null, social_security_number: "316844033", date_of_birth: "1969-07-23", owner_address_1: "1704 N MANNHEIM RD", owner_city: "DES PLAINES", owner_state: "IL", owner_zip: "60018" },
  { id: "f2017a5e-cbe5-4299-81fa-8761079b10f9", batch: "feb-declined", email: "enchantedmagicalmoments@gmail.com", full_name: "Nicole Walters", legal_business_name: "Enchanted magical moments", phone: "3025692063", average_monthly_revenue: "14000.00", requested_amount: "5000.00", time_in_business: null, social_security_number: "241693944", date_of_birth: "1990-10-12", owner_address_1: "29006 Saint Lucia blvd", owner_city: "Millsboro", owner_state: "DE", owner_zip: "19966" },
  { id: "b8a3d57f-2f3c-4764-8932-0dc45651ece5", batch: "feb-declined", email: "cchernandez81@gmail.com", full_name: "Cristina Hernandez", legal_business_name: "Mayan Music Entertainment INC", phone: "7723233415", average_monthly_revenue: "55000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "767666061", date_of_birth: "1981-07-03", owner_address_1: "306 Se Tressler dr", owner_city: "Stuart", owner_state: "FL", owner_zip: "34994" },
  { id: "22c9f5b8-5866-4b77-a5fa-2ec35bb28b1e", batch: "feb-declined", email: "zr1231234@gmail.com", full_name: "Yehi Melamed", legal_business_name: "EZR PACKING CORP", phone: "3124567652", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "250000.00", time_in_business: null, social_security_number: "082848664", date_of_birth: "1965-12-30", owner_address_1: "4608 APPLIANCE DR", owner_city: "BELCAMP", owner_state: "MD", owner_zip: "21017" },
  { id: "993e2be0-bedf-48ed-aa3b-7c078fd0bc67", batch: "feb-declined", email: "jf737@yahoo.com", full_name: "Joseph Frocchi", legal_business_name: "The Vesper Kitchen + Bar", phone: "5854152946", average_monthly_revenue: null, monthly_revenue: null, requested_amount: "3000000.00", time_in_business: null, social_security_number: "077708082", date_of_birth: "1974-10-02", owner_address_1: "125 Shepard St", owner_city: "Rochester", owner_state: "NY", owner_zip: "14620" },

  // ── FEB 4 DECLINED BATCH (8 apps) ───────────────────────────────────────────
  { id: "a81459d4-4e2c-48e1-af5c-2d8ed1a634d8", batch: "feb4", email: "david@atlantascreenprints.com", full_name: "David Robison", legal_business_name: "Atlanta Screenprints GA LLC", phone: "6787557797", average_monthly_revenue: null, requested_amount: "25000.00", time_in_business: null, social_security_number: "492567118", date_of_birth: "1963-09-13", owner_address_1: "1490 Princeton View Court", owner_city: "Loganville", owner_state: "GA", owner_zip: "30052" },
  { id: "70260fea-c1ba-43f2-a6b1-62ca059adddd", batch: "feb4", email: "apex123@gmail.com", full_name: "GARY GRENIER", legal_business_name: "APEX PRO SERVICES", phone: "3123412312", average_monthly_revenue: "200000.00", requested_amount: "15000.00", time_in_business: null, social_security_number: "043669668", date_of_birth: "1962-03-27", owner_address_1: "28 CENTRAL DR", owner_city: "GLEN HEAD", owner_state: "NY", owner_zip: "11545" },
  { id: "69c7e619-5979-4f27-ac09-3fc966464c0e", batch: "feb4", email: "teemo6866@gmail.com", full_name: "LORI MOORE", legal_business_name: "MOORE PAINTING, LLC", phone: "6613127092", average_monthly_revenue: null, requested_amount: "60000.00", time_in_business: null, social_security_number: "550350390", date_of_birth: "1964-12-11", owner_address_1: "20216 Arthur Court", owner_city: "Saugus", owner_state: "CA", owner_zip: "91350" },
  { id: "520e9a67-e68f-4984-9978-5aff2cbfa253", batch: "feb4", email: "3generationant@gmail.com", full_name: "Harold Andrew Justrabo", legal_business_name: "Third Generation Antiques and Restoration, Inc.", phone: "9856491109", average_monthly_revenue: null, requested_amount: "10000.00", time_in_business: null, social_security_number: "435880478", date_of_birth: "1951-04-29", owner_address_1: "3610 RUE DELPHINE", owner_city: "New Orleans", owner_state: "LA", owner_zip: "70131" },
  { id: "53840054-c2a6-4591-85a7-02ef77bc7a8e", batch: "feb4", email: "a2zrestaurantstuff@gmail.com", full_name: "Vic Shelton", legal_business_name: "WATERLICK EAST INC", phone: "4344262583", average_monthly_revenue: null, requested_amount: "15000000.00", time_in_business: null, social_security_number: "229924834", date_of_birth: "1956-06-29", owner_address_1: "113 Dreaming Creek Dr", owner_city: "Lynchburg", owner_state: "VA", owner_zip: "24502" },
  { id: "e23e66c2-7b8b-42eb-b4ff-02b3910c07e9", batch: "feb4", email: "laynestoopssf@gmail.com", full_name: "Layne Stoops", legal_business_name: "Stoops Insurance & Financial Services Inc.", phone: "5099539961", average_monthly_revenue: null, requested_amount: "50000.00", time_in_business: null, social_security_number: "519339987", date_of_birth: "1983-01-21", owner_address_1: "4125 E 38th Ave", owner_city: "Spokane", owner_state: "WA", owner_zip: "99223" },
  { id: "e483821e-52a0-4a99-a80c-65f992d55f0a", batch: "feb4", email: "naamanrasinc@gmail.com", full_name: "Robert Smith", legal_business_name: "NAAMAN RAS INC.", phone: "7252207558", average_monthly_revenue: "100000.00", requested_amount: "20000.00", time_in_business: null, social_security_number: "560437479", date_of_birth: "1976-05-03", owner_address_1: "911 East Ogden Avenue", owner_city: "Las Vegas", owner_state: "NV", owner_zip: "89101" },
  { id: "cb4c3c86-8f73-4d8c-8fc1-3f15e4ae0bb1", batch: "feb4", email: "marcosavelez4@gmail.com", full_name: "Maria Leiton", legal_business_name: "M LINK WIRELESS LLC", phone: "5513584164", average_monthly_revenue: "75000.00", requested_amount: "60000.00", time_in_business: null, social_security_number: "002578404", date_of_birth: "1989-12-20", owner_address_1: "3504 BERGENLINE AVE", owner_city: "UNION CITY", owner_state: "NJ", owner_zip: "07087" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!GIGFI_API_KEY) { console.error("GIGFI_API_KEY not set. Aborting."); process.exit(1); }

  console.log(`\n=== GigFi Production Sync — April 21, 2026 ===`);
  console.log(`Environment : ${GIGFI_ENVIRONMENT}`);
  console.log(`Target API  : ${PROD_API}`);
  console.log(`Total apps  : ${APPS.length}\n`);

  const results: any[] = [];

  for (const app of APPS) {
    const err = validate(app);
    if (err) {
      console.log(`  [SKIP] ${(app.full_name || "").trim()} (${app.batch}) — ${err}`);
      results.push({ id: app.id, name: app.full_name, batch: app.batch, status: "SKIP", reason: err });
      continue;
    }

    const payload = buildPayload(app);
    process.stdout.write(`  [SUBMIT] ${(app.full_name || "").trim()} / ${(app.legal_business_name || "").trim()} ... `);

    try {
      const result = await submitToGigFi(payload);
      const status = result?.data?.status || "ERROR";
      const decisionId = result?.metadata?.decision_id;
      const redirectUrl = result?.data?.redirect_url;
      const errMsg = result?.detail?.msg || (typeof result?.detail === "string" ? result.detail : null) || result?.message;

      console.log(`${status}${decisionId ? ` [${decisionId}]` : ""}${errMsg ? ` — ${errMsg}` : ""}`);

      try {
        await recordResult(app.id, status, decisionId, redirectUrl);
        process.stdout.write(`    → saved to production\n`);
      } catch (saveErr: any) {
        console.log(`    ⚠ Save failed: ${saveErr.message}`);
      }

      results.push({ id: app.id, name: app.full_name, batch: app.batch, status, decisionId, redirectUrl, error: errMsg });
    } catch (e: any) {
      console.log(`ERROR — ${e.message}`);
      results.push({ id: app.id, name: app.full_name, batch: app.batch, status: "ERROR", reason: e.message });
    }

    await new Promise(r => setTimeout(r, 600));
  }

  const accepted = results.filter(r => r.status === "ACCEPTED");
  const rejected = results.filter(r => r.status === "REJECTED");
  const errors   = results.filter(r => r.status === "ERROR");
  const skipped  = results.filter(r => r.status === "SKIP");

  console.log(`\n=== Summary ===`);
  console.log(`  ACCEPTED : ${accepted.length}`);
  console.log(`  REJECTED : ${rejected.length}`);
  console.log(`  ERROR    : ${errors.length}`);
  console.log(`  SKIPPED  : ${skipped.length}`);

  if (accepted.length > 0) {
    console.log(`\n  Accepted:`);
    accepted.forEach(r => console.log(`    ✓ ${(r.name || "").trim()} [${r.batch}]${r.redirectUrl ? " → " + r.redirectUrl : ""}`));
  }
  if (errors.length > 0) {
    console.log(`\n  Errors:`);
    errors.forEach(r => console.log(`    ✗ ${(r.name || "").trim()} [${r.batch}]: ${r.reason || r.error}`));
  }
  if (skipped.length > 0) {
    console.log(`\n  Skipped:`);
    skipped.forEach(r => console.log(`    - ${(r.name || "").trim()} [${r.batch}]: ${r.reason}`));
  }

  console.log(`\nDone. Check https://app.todaycapitalgroup.com/gigfi-submissions`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
