// Lender network — email addresses for deal submission ("shopping")
// All addresses in `emails` are sent as To:, `ccEmails` as CC:.
// The backend shop route combines both into a single To: field so all contacts receive it.
// Each lender gets its own separate thread per submission.
// Emails are sent FROM: Today Capital Group Underwriting <underwriting@todaycapitalgroup.com>

export interface LenderContact {
  name: string;
  emails: string[];      // primary submission addresses (To:)
  ccEmails?: string[];   // secondary/CC contacts (also included in To: by backend)
  contactName?: string;
  contactPhone?: string;
  notes?: string;
  tier?: string;         // A–D lender quality tier
}

export const LENDER_NETWORK: LenderContact[] = [

  // ── A ──────────────────────────────────────────────────────────────
  {
    name: "Ace Funding Source",
    emails: ["Deals@acefundingllc.com", "steven@acefundingllc.com"],
    notes: "Positions: 1–8 | Term: 36wks (new) / 44wks (renewals) | All industries except Trucking & Auto Sales | Specialized in 7-figure deals with minimal stips",
  },
  {
    name: "American Financial Center",
    emails: ["underwriting@afincen.com"],
    ccEmails: ["markc@afincen.com"],
    contactPhone: "818-981-1034",
    tier: "A-B",
    notes: "Term: 8–10 months | Trucking: min 2 trucks & avg $30K/mo",
  },
  {
    name: "Aspire Funding",
    emails: ["submissions@aspirefundingplatform.com"],
    notes: "Funding up to $1M | 12mo max term | Positions 1–6 | 500 FICO | 9mo TIB | 3+ deposits/mo | $1K+ avg daily balance | Max 6 NSFs/mo | $10K min rev/mo | Not funding NY or CA sole props | Will do trucking/auto sales with payment history",
  },

  // ── B ──────────────────────────────────────────────────────────────
  {
    name: "BHB Funding",
    emails: ["ISObiz@bhbfunding.com"],
    ccEmails: ["sabina@bhbfunding.com"],
    tier: "B",
    notes: "Min rev: $15K | Positions 1–3 | Min deposits: 4/mo | Max neg days: 5/mo | TIB: 1yr | Term: 11mo | FICO: 550+ | Max: $125K | NOT funding CA | TX: 1st pos only w/UCC | Decision Logic | 5% fee | Trucking: min $75K/mo (not avg), 5 trucks, TIB 3yr, FICO 600 | Construction: 1st min $125K/mo | Restaurants (1st & 2nd only): min $40K/mo, TIB 2yr",
  },

  // ── D ──────────────────────────────────────────────────────────────
  {
    name: "DLP Funding",
    emails: ["submissions@dlpfunding.com"],
    tier: "C",
    notes: "Min rev: $40K | Positions: 2nd+ | Min funding: $10K | TIB: 2yr | Min deposits: 8/mo | Prohibited states: Utah/Virginia | Max leverage 50% / reverse 70% | Min construction: $60K 2mo payment history | Prohibited: Trucking/Auto Sales | Over $250K: full financials, FICO 750+, max 3rd pos",
  },

  // ── E ──────────────────────────────────────────────────────────────
  {
    name: "Ecrypt (Credit Card Processing)",
    emails: ["Ryan.zone@ecrypt.com"],
    notes: "Credit card processing partner",
  },
  {
    name: "Evolve Capital Finance",
    emails: ["tony@evolvecapitalfinance.com"],
    notes: "Equipment financing",
  },

  // ── F ──────────────────────────────────────────────────────────────
  {
    name: "Fenix Capital Funding",
    emails: ["newdeals@fenixcapitalfunding.com"],
    ccEmails: ["olegz@fenixcapitalfunding.com"],
    tier: "B-D",
    notes: "Min rev: $10K | Positions 1–4 | Prohibited states: CA/HI/AK/PR | Max funding: $150K / $350K (reverse) | Min deposits: 5/mo | TIB: 1yr | FICO: 500 | Terms: max 8–9mo",
  },
  {
    name: "Fintegra",
    emails: ["Submissions@getfintegra.com"],
    notes: "Min TIB: 12mo | Min avg monthly rev: $10K | Min avg balance: $1K | Min FICO: 550 | Min deposits: 5/mo | Max NSFs: 5 | No Texas | Solid B paper (1st, 2nd, 3rd positions)",
  },
  {
    name: "Fox Business Funding",
    emails: ["underwriting@foxbusinessfunding.com"],
    ccEmails: ["jacob.e@foxbusinessfunding.com"],
    notes: "Min rev: $50K | Positions 2–5 | FICO: 500 | TIB: 6mo | Max term: 12mo | Max: $1.5M | No trucking/auto sales | CA/TX/NY must avg $150K/mo and qualify for $100K+",
  },
  {
    name: "Fuji Funding",
    emails: ["michael@fujifunding.com"],
    contactPhone: "847-606-1979",
    tier: "A-C",
    notes: "Min rev: $20K | Positions: 2nd+ (firm) | Funds defaults | Prohibited: Trucking",
  },

  // ── H ──────────────────────────────────────────────────────────────
  {
    name: "Highland Hill",
    emails: ["submissions@highlandhillcap.com"],
    ccEmails: ["Sean@highlandhillcap.com"],
    notes: "Min rev: $30K | Positions 2–8 | Terms: straight 160 days / reverse 260 days | Max neg days: 5/mo | Min deposits: 5/mo | TIB: 1yr | FICO: 500 | Defaults must be satisfied | Restricted states: CA/VA/TX | Prohibited: Investors/Bail Bonds | Funding: $10K–$5M",
  },

  // ── I ──────────────────────────────────────────────────────────────
  {
    name: "I Got Funded",
    emails: ["Submit@i-gotfunded.com"],
    ccEmails: ["Mai@i-gotfunded.com"],
    notes: "1st pos: 60 days seasoning required on prior MCA | Standard terms: 40–140 business days | Min rev: $75K | Funds 60–75% of avg deposits | Min 15 transactions & $200+ daily deposits",
  },

  // ── K ──────────────────────────────────────────────────────────────
  {
    name: "Kapitus",
    emails: ["newcontracts@kapitus.com"],
    ccEmails: ["teambyler@kapitus.com"],
    tier: "A-B",
    notes: "Alyssa: 863.370.4569 | Asif: 954.257.5214 | Braden: 814.602.0991",
  },

  // ── N ──────────────────────────────────────────────────────────────
  {
    name: "Newco Capital Group",
    emails: ["TeamRebekah@NewCoCapitalGroup.com"],
  },

  // ── P ──────────────────────────────────────────────────────────────
  {
    name: "Pearl",
    emails: ["submitpearl@pearlcash.com"],
    ccEmails: ["brett.spass@revenued.com"],
  },
  {
    name: "Pirs Capital",
    emails: ["Submissions@pirscapital.com"],
    ccEmails: ["Mitchell@pirscapital.com"],
    tier: "A-B",
  },

  // ── R ──────────────────────────────────────────────────────────────
  {
    name: "Radiance Funding",
    emails: ["Subs@RadianceFunding.com"],
    ccEmails: ["Simon@radiancefunding.com"],
    tier: "A-C",
  },
  {
    name: "Red Wood Loans",
    emails: ["underwriting@redwoodloans.com"],
    ccEmails: ["jacob.e@foxbusinessfunding.com"],
  },
  {
    name: "Revenued",
    emails: ["submitrevenued@revenued.com"],
    ccEmails: ["brett.spass@revenued.com"],
  },
  {
    name: "River Advance",
    emails: ["iso@riveradvance.com"],
    ccEmails: ["Eli@riveradvance.com", "Sarah@riveradvance.com"],
    contactPhone: "845-376-0994",
  },

  // ── S ──────────────────────────────────────────────────────────────
  {
    name: "Silverline",
    emails: ["submissions@silverlinefunding.com"],
    tier: "B-D",
    notes: "Min rev: $45K | Positions: 2nd–6th & reverse (no 1st) | Min TIB: 5mo | Max neg days: 3/mo | Prohibited industries: Auto Dealerships/Nail Salons/Digital Marketing",
  },
  {
    name: "Smart Business Funder",
    emails: ["Submit@SmartBusinessFunder.com"],
    ccEmails: ["Monique@SmartBusinessFunder.com"],
    tier: "C",
    notes: "Min rev: $5K | Max neg days: 8/mo | Min TIB: 3mo | Prohibited: Trucking | Anthony Colin: 917.533.2979 | Monique Cohen: 347-409-0633",
  },
  {
    name: "Smarter Merchant",
    emails: ["submissions@thesmartermerchant.com"],
    ccEmails: ["Lena@thesmartermerchant.com"],
    contactPhone: "646-241-1484",
    tier: "A-B",
    notes: "Min rev: $25K | Positions 1–3 | TIB: 1yr | Max neg days: 6/mo | Min deposits: 8/mo | Prohibited states: CA/CT/TX | Max term: 11mo",
  },
  {
    name: "Specialty Capital",
    emails: ["Submissions@specialtycapital.com"],
    ccEmails: ["Michael@specialtycapital.com"],
    contactPhone: "+1 (917) 651-4613",
    tier: "A-B",
    notes: "Positions 1–3 (specialized) | Up to 15 months | No cannabis",
  },
  {
    name: "Superfast Cap",
    emails: ["submissions@superfastcap.com"],
    ccEmails: ["ertjon@superfastcap.com"],
    tier: "A-B",
    notes: "Min rev: $20K | Positions 1–3 | Max neg days: 3/mo | TIB: 1–2yr | CA & TX temporarily restricted | Prohibited: Trucking",
  },

  // ── T ──────────────────────────────────────────────────────────────
  {
    name: "Top Choice Financial",
    emails: ["submissions@topchoicefinancial.com"],
    ccEmails: ["Kimberly@topchoicefinancial.com"],
    tier: "A-C",
    notes: "Min TIB: 2yr | Min FICO: 600 | Min avg monthly deposits: $25K | Max NSFs: 5 in last 90 days | Prohibited states: Virginia | Prohibited: Trucking/Construction/Cannabis",
  },
  {
    name: "TVT Capital",
    emails: ["MKAROW@TVTCAPITAL.COM"],
    ccEmails: ["AFELLUS@TVTCAPITAL.COM"],
    notes: "Min rev: $50K | Trucking/Construction: $250K min | FICO: 525 | Max: $25M | Biweekly & monthly payments | A-Paper 1st pos | Buy rates: 1.20–1.28 | Terms: 48–52wks",
  },

  // ── V ──────────────────────────────────────────────────────────────
  {
    name: "Vital Cap",
    emails: ["submissions@vitalcapfund.com"],
    ccEmails: ["pooja.nene@vitalcapfund.com"],
    tier: "B",
    notes: "Positions 1–4 (2–3 preferred) | Min deposits: 5/mo | Max neg days: 5/mo | TIB: 1yr | FICO: 520 | Max term: 12mo | Max: $400K | Prohibited states: UT/AK/HI (TX case by case) | Preferred: Restaurants/Wholesalers/Liquor/Retail/Medical/Manufacturers | Restricted: Trucking/Non-Profit/Gas Stations/Used Auto",
  },
  {
    name: "Vox Funding",
    emails: ["submissions@voxfunding.com", "nvarner@voxfunding.com"],
    ccEmails: ["jscavuzzo@voxfunding.com"],
    tier: "A-C",
    notes: "Min rev: $15K | Positions 1–3 | Max neg days: 5/mo | TIB: 1yr | Min deposits: 5/mo | Min FICO: 600 | Funding up to $1.5M | jscavuzzo@ for deals $150K+ | Prohibited: Trucking/Adult Entertainment/Sole Props",
  },

  // ── W ──────────────────────────────────────────────────────────────
  {
    name: "Westwood Funding",
    emails: ["Masoncap@westwoodfunding.com"],
    contactName: "Juan Monegro",
    contactPhone: "954-350-0331 ext 1032 | 347-865-7773",
    tier: "C",
    notes: "Positions 1–7 (no reverses) | All states & industries | Funding up to $2M | Starter program for tiny deals",
  },
  {
    name: "World Business Lenders",
    emails: ["jarce@wbl.com"],
  },

  // ── Z ──────────────────────────────────────────────────────────────
  {
    name: "Zlur Funding",
    emails: ["submissions@zlur.com"],
    tier: "D",
    notes: "Funding: $2K–$250K | Min rev: $5K/mo | FICO: 475+ | TIB: 3mo | Positions 1–10 | Term: 30–120 days (longer on renewals) | All states & industries",
  },

  // ── INTERNAL / TEST ─────────────────────────────────────────────────
  {
    name: "Today Capital Group",
    emails: ["admin@todaycapitalgroup.com", "underwriting@todaycapitalgroup.com", "dillon@todaycapitalgroup.com", "marketing@todaycapitalgroup.com"],
    notes: "Internal test shop — Today Capital Group team",
  },
  {
    name: "Test Lender",
    emails: ["marketing@todaycapitalgroup.com", "trevorbosetti@gmail.com", "trevor@rankzone.studio", "tbosetti11@gmail.com"],
    notes: "Test lender — sandbox submissions only",
  },
];
