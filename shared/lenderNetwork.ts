// Lender network — email addresses for deal submission ("shopping")
// All addresses in `emails` are sent as To:, `ccEmails` as CC:.
// The backend shop route combines both into a single To: field so every
// contact at that lender receives one shared email thread.
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
    notes: "Positions 1–8 | Term: 36 wks (new) / 44 wks (renewals) | All industries except Trucking & Auto Sales | Specializes in 7-figure deals with minimal stips",
  },
  {
    name: "American Financial Center",
    emails: ["underwriting@afincen.com"],
    ccEmails: ["markc@afincen.com"],
    contactPhone: "818-981-1034",
    tier: "A-B",
    notes: "Term: 8–10 months | Trucking: min 2 trucks & $30K avg monthly rev",
  },
  {
    name: "Aspire Funding",
    emails: ["submissions@aspirefundingplatform.com"],
    notes: "Not funding NY",
  },

  // ── B ──────────────────────────────────────────────────────────────
  {
    name: "Backd",
    emails: ["submissions@backd.com"],
    ccEmails: ["vy@backd.com"],
  },
  {
    name: "BHB Funding",
    emails: ["ISObiz@bhbfunding.com"],
    ccEmails: ["sabina@bhbfunding.com"],
    tier: "B",
    notes: "Min rev: $15K | Positions 1–3 | Min deposits: 4/mo | Max neg days: 5/mo | TIB: 1yr | Term: 11mo | FICO: 550+ | Max: $125K | NOT funding CA | TX: 1st pos only w/UCC | Decision Logic | 5% fee | Trucking: min $75K/mo (not avg), 5 trucks, TIB 3yr, FICO 600 | Construction: 1st min $125K, 2nd min $150K | Restaurants (1st & 2nd only): min $40K/mo, TIB 2yr",
  },
  {
    name: "BizPoint Capital",
    emails: ["underwriting@bizpointcapital.com"],
  },

  // ── C ──────────────────────────────────────────────────────────────
  {
    name: "Capitalize Group",
    emails: ["subs@capitalizegroup.com"],
    ccEmails: ["isaac@capitalizegroup.com"],
  },
  {
    name: "Capybara USA",
    emails: ["deals@capybarausa.com"],
    ccEmails: ["cbianco@capybarausa.com"],
    contactPhone: "561-404-1674",
  },

  // ── D ──────────────────────────────────────────────────────────────
  {
    name: "DLP Funding",
    emails: ["submissions@dlpfunding.com"],
    tier: "C",
    notes: "Min rev: $40K | Positions: 2nd+ | Min funding: $10K | TIB: 2yr | Min deposits: 8/mo | Prohibited states: UT, VA | Max leverage: 50%, reverse: 70% | Min construction: $60K, 2mo payment history | Prohibited: Trucking, Auto Sales | Normal up to $250K; over $250K requires full financials, FICO 750+, max 3rd pos",
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
    notes: "Min rev: $10K | Positions 1–4 | Prohibited states: CA, HI, AK, PR | Max: $150K (reverse: $350K) | Min deposits: 5/mo | TIB: 1yr | FICO: 500+ | Terms: max 8–9mo | Construction: 1st pos only, <$40K/mo | Prohibited: Auto, Bail Bonds, Check Cashing, Collections, Gambling, Law Firms, Oil, Gas Stations, Trucking | Buy rates 1.25–1.35 (12 pts built-in) | 5% fee | 1% bonus for 5+ new deals/mo or $250K+ new deals/mo",
  },
  {
    name: "Fintegra",
    emails: ["Submissions@getfintegra.com"],
    notes: "TIB: 12mo | Min rev: $10K | Min bank balance: $1K | FICO: 550+ | Min deposits: 5/mo | Max NSFs (3mo avg): 5 | No TX | B-paper funder (1st, 2nd, 3rd) | Funding $10K–$250K | Avg term: 8–10mo (up to 15mo) | <2hr turnaround | 5% fee",
  },
  {
    name: "Fox Business Funding",
    emails: ["Underwriting@foxbusinessfunding.com"],
    ccEmails: ["jacob.e@foxbusinessfunding.com"],
    notes: "Min rev: $50K | Positions 2–5 | FICO: 500+ | TIB: 6mo | Max term: 12mo | Max funding: $1.5M | No trucking/auto sales | CA, TX & NY: must avg $150K/mo & qualify for $100K+",
  },
  {
    name: "Fuji Funding",
    emails: ["michael@fujifunding.com"],
    contactName: "Michael",
    contactPhone: "847-606-1979",
    tier: "A-C",
    notes: "Min rev: $20K | Positions: 2nd+ (firm) | Funds defaults | Prohibited: Trucking",
  },

  // ── H ──────────────────────────────────────────────────────────────
  {
    name: "Highland Hill Capital",
    emails: ["submissions@highlandhillcap.com"],
    ccEmails: ["Sean@highlandhillcap.com"],
    notes: "Min rev: $30K | Positions 2–8 | Terms: Straight 160 days / Reverse 260 days | Max neg days: 5 | Min deposits: 5/mo | TIB: 1yr | FICO: 500+ | Defaults must be satisfied | Restricted states: CA, VA, TX | Prohibited: Investors, Bail Bonds | Funding: $10K–$5M | Exclusivity: first ISO to send correctly signed contract is ISO of record for 5 business days",
  },

  // ── I ──────────────────────────────────────────────────────────────
  {
    name: "I Got Funded",
    emails: ["Submit@i-gotfunded.com"],
    ccEmails: ["Mai@i-gotfunded.com"],
    notes: "1st pos: 60 days seasoning on prior MCA | Terms: 40–140 business days (daily or weekly) | Min rev: $75K | Funds 60–75% of verified avg deposits | Min 15+ transactions & $200+ daily deposits | Base: 12 pts at 1.50 factor / 10% fee | Hard floors: 1.40 factor / 5% fee",
  },

  // ── K ──────────────────────────────────────────────────────────────
  {
    name: "Kapitus",
    emails: ["newcontracts@kapitus.com"],
    ccEmails: ["teambyler@kapitus.com"],
    contactName: "Braden Byler",
    contactPhone: "814-602-0991",
    tier: "A-B",
    notes: "Min rev: $10K | Positions 1–2 (2nd max $100K / 12mo) | Min deposits: 5/mo | Max neg days: 3 | TIB: 1–2yr (strong credit) or 3+yr; Restaurants 3yr; Construction 4yr; Trucking 10yr | Terms: 6–36mo, 48mo max for preferred healthcare | Origination fee: 2.5% | Restaurants/General Contractors max $150K | Trucking max $125K | Prohibited: Real Estate, Credit Repair, Auto Dealers, Finance, Insurance, Cell Phone Stores, CBD/Marijuana, Online Supplements, Auto Rental | Min FICO: 625 | Alyssa: 863-370-4569 | Asif: 954-257-5214",
  },

  // ── L ──────────────────────────────────────────────────────────────
  {
    name: "Legend Funding",
    emails: ["apps@legendfunding.com"],
    ccEmails: ["dcaro@legendfunding.com"],
    contactName: "David Caro",
    contactPhone: "559-474-5233",
  },
  {
    name: "Lendr",
    emails: [],
    notes: "No submission email on file — contact directly",
  },
  {
    name: "Likety",
    emails: ["funding@likety.com"],
    ccEmails: ["ray@likety.com"],
    notes: "Old submissions: submissions@likety.com | Status/conditions: underwriting@likety.com",
  },
  {
    name: "Lite Fund",
    emails: ["deals@litefund.co"],
    ccEmails: ["aron@litefund.co", "frank@litefund.co"],
  },

  // ── N ──────────────────────────────────────────────────────────────
  {
    name: "Newco Capital Group",
    emails: ["TeamRebekah@NewCoCapitalGroup.com"],
  },

  // ── P ──────────────────────────────────────────────────────────────
  {
    name: "Pearl Cash",
    emails: ["submitpearl@pearlcash.com"],
    ccEmails: ["brett.spass@revenued.com"],
    notes: "Grades A–D (A: 12.5mo 1.25x → D: 5mo 1.36x) | Min $20K–$50K deposits | Stips: DL, Voided Check, A/R, Login (+Financials >$150K, +Tax Guard >$250K) | Preferred: Manufacturing, Medical, Tech, Construction, Auto | High Risk: Insurance, Real Estate, Home-based, Lawyers, Lenders | Prohibited: Marijuana (CBD/Hemp OK)",
  },
  {
    name: "PIRS Capital",
    emails: ["Submissions@pirscapital.com"],
    ccEmails: ["Mitchell@pirscapital.com"],
    tier: "A-B",
    notes: "Min rev: $20K | Positions: 1st (will do 2nd only behind another Tier 1 lender) | TIB: 1–2yr | Min FICO: 650 | Prohibited: Trucking, Logistics, Auto Sales, Supermarkets, Gas Stations, Law Firms, Travel Agencies, Cannabis, Casino/Gambling, Accounting, Real Estate/Property Mgmt",
  },

  // ── R ──────────────────────────────────────────────────────────────
  {
    name: "Radiance Funding",
    emails: ["Subs@RadianceFunding.com"],
    ccEmails: ["Simon@radiancefunding.com"],
    tier: "A-C",
    notes: "Positions 1–3 | TIB: 6mo | Min deposits: 4/mo | Max neg days: 4 | Max: $400K | Biweekly offers | Prohibited: Law Firms, Auto Sales, Travel Agents, Trucking, Brokers, Non-Profits, Oil, Gas, Real Estate, Limos, Solar",
  },
  {
    name: "Rapid Finance",
    emails: [],
    notes: "Portal-based: https://login.rapidfinance.com — submit via portal, not email",
  },
  {
    name: "Red Wood Loans",
    emails: ["underwriting@redwoodloans.com"],
    ccEmails: ["jacob.e@foxbusinessfunding.com"],
    notes: "Texas affiliate for Fox Business Funding",
  },
  {
    name: "Revenued",
    emails: ["submitrevenued@revenued.com"],
    ccEmails: ["brett.spass@revenued.com"],
    contactPhone: "908-400-2740",
    notes: "Line of credit program | Min rev: $20K | Positions 1–3 | TIB: 6mo | Term: 12mo | Funds TX | FICO: 400+ | No sole props",
  },
  {
    name: "River Advance",
    emails: ["iso@riveradvance.com", "Eli@riveradvance.com", "Sarah@riveradvance.com"],
    contactPhone: "845-376-0994",
    notes: "Positions 2nd–6th | New deals: $750K | Renewals: up to $1M | Max term: 180 payments | Buy rates: 1.29–1.379 | Min deposits: 3/mo | No min FICO | Min rev: $40K ($100K for construction) | Restricted: Cannabis, Legal Services, Auto Sales, Trucking",
  },

  // ── S ──────────────────────────────────────────────────────────────
  {
    name: "Silverline Funding",
    emails: ["submissions@silverlinefunding.com"],
    tier: "B-D",
    notes: "Min rev: $45K | Positions: 2nd–6th & Reverse (NO 1st pos — firm) | TIB: 5mo | Max neg days: 3/mo | Prohibited: Auto Dealerships, Nail Salons, Digital Marketing | Funding: $8K–$500K | For contracts email: contracts@silverlinefunding.com",
  },
  {
    name: "Smart Business Funder",
    emails: ["Submit@SmartBusinessFunder.com"],
    ccEmails: ["Monique@SmartBusinessFunder.com"],
    contactName: "Anthony Colin / Monique Cohen",
    contactPhone: "917-533-2979 (Anthony) | 347-409-0633 (Monique)",
    tier: "C",
    notes: "Min rev: $5K | Max neg days: 8/mo | TIB: 3mo | Prohibited: Trucking",
  },
  {
    name: "Specialty Capital",
    emails: ["Submissions@specialtycapital.com"],
    ccEmails: ["Michael@specialtycapital.com"],
    contactName: "Michael",
    contactPhone: "+1 (917) 651-4613",
    tier: "A-B",
    notes: "Positions 1st–3rd (specialized) | Up to 15 months | No cannabis",
  },
  {
    name: "Super Fast Cap",
    emails: ["submissions@superfastcap.com"],
    ccEmails: ["ertjon@superfastcap.com"],
    tier: "A-B",
    notes: "Min rev: $20K | Positions 1–3 | Max neg days: 3/mo | TIB: 1–2yr | CA & TX temporarily restricted | Prohibited: Trucking",
  },

  // ── T ──────────────────────────────────────────────────────────────
  {
    name: "The Smarter Merchant",
    emails: ["submissions@thesmartermerchant.com"],
    ccEmails: ["Lena@thesmartermerchant.com"],
    contactPhone: "646-241-1484",
    tier: "A-B",
    notes: "Min rev: $25K | Positions 1–3 | TIB: 1yr | Max neg days: 6/mo | Min deposits: 8/mo | Prohibited states: CA, CT, TX | Max term: 11mo | 3 tiers of funding",
  },
  {
    name: "Top Choice Financial",
    emails: ["submissions@topchoicefinancial.com"],
    ccEmails: ["Kimberly@topchoicefinancial.com"],
    tier: "A-C",
    notes: "TIB: 2yr | FICO: 600+ | Avg monthly deposits: $25K+ | NSFs: max 5 in last 90 days | Prohibited state: VA | Prohibited: Trucking, General Contracting/Construction, Cannabis, Escort/Adult Entertainment, Debt Consolidation/Credit Repair, Bail Bonds, Property Mgmt, Real Estate, Lawyers",
  },
  {
    name: "TVT Capital",
    emails: ["MKAROW@TVTCAPITAL.COM", "AFELLUS@TVTCAPITAL.COM"],
    notes: "Min rev: $50K (Trucking/Construction: $250K) | FICO: 525+ | Max funded: $25M | Biweekly & monthly payments | A-paper 1st pos | Buy rates: 1.20–1.28 | Terms: 48–52 wks (16mo option for qualifying) | 24mo term loan: $6M+ annualized, FICO 650+, TIB 5yr+",
  },

  // ── U ──────────────────────────────────────────────────────────────
  {
    name: "UF Capital Experts / EZ Revenue",
    emails: ["underwriting@ufcapitalexperts.com"],
    ccEmails: ["Matt@ezrevenuefinance.com"],
  },

  // ── V ──────────────────────────────────────────────────────────────
  {
    name: "Velocity CG",
    emails: ["Subs@velocitycg.com"],
    ccEmails: ["carlosbrown@velocitycg.com"],
    contactPhone: "516-784-7115",
  },
  {
    name: "Vital Cap Fund",
    emails: ["submissions@vitalcapfund.com"],
    ccEmails: ["pooja.nene@vitalcapfund.com"],
    tier: "B",
    notes: "Positions 1–4 (2–3 preferred) | Min deposits: 5/mo | Max neg days: 5/mo | TIB: 1yr | FICO: 520+ | Max term: 12mo | Max: $400K | Prohibited states: UT, AK, HI (TX case by case) | Preferred: Restaurants, Wholesalers, Liquor Stores, Retail, Medical, Manufacturers (min $15K/mo) | Non-preferred: Construction, Landscaping, Auto Repair, Insurance, Law Firms (min $70K/mo, no 1st pos) | Restricted: Financial Institutions, Collection Agencies, Gas Stations, Used/New Auto Sales, Trucking, Non-Profit, Bail Bonds, Check-Cashing, Religious, Real Estate Investment, Staffing, Travel Agencies, Childcare, Oil Drilling",
  },
  {
    name: "Vox Funding",
    emails: ["submissions@voxfunding.com", "nvarner@voxfunding.com"],
    ccEmails: ["jscavuzzo@voxfunding.com"],
    tier: "A-C",
    notes: "Min rev: $15K | Positions 1–3 | Max neg days: 5/mo | TIB: 1yr | Min deposits: 5/mo | Min FICO: 600 | Funding up to $1.5M | 12-point upsell | Funds TX | jscavuzzo@voxfunding.com included for deals $150K+ | Prohibited: Adult Entertainment, Cash Advance Companies, Credit Card Protection, Credit Restoration, Escort Services, Mortgage Lenders, Pawn Shops, Check Cashier, Wire Transfer, State/Govt Agencies, Used Car Dealerships, Sole Props, Trucking",
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

  // ── Z ──────────────────────────────────────────────────────────────
  {
    name: "Zlur Funding",
    emails: ["submissions@zlur.com"],
    tier: "D",
    notes: "Funding: $2K–$250K | Min rev: $5K/mo | FICO: 475+ | TIB: 3mo | Positions 1st–10th | Term: 30–120 days (longer on renewals) | Funds ALL states & industries",
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
