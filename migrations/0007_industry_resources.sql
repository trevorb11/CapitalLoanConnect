-- Industry-based merchant portal personalization.
--
-- 1. Adds merchant_portal_accounts.industry so the portal can read a merchant's
--    vertical without joining back to loan_applications on every request.
-- 2. Backfills that column from the linked loan application (or, if none, from
--    the most recent application matching the merchant's email).
-- 3. Creates industry_resources: the DB-driven replacement for the hardcoded
--    resource grid in client/src/pages/MerchantPortal.tsx (ResourcesTab).
--    industry_key = NULL rows are universal; non-null rows filter to matching
--    merchants only.
-- 4. Seeds the initial universal set plus five verticals:
--    restaurant, trucking, construction, retail, professional_services.

-- --------------------------------------------------------------------------
-- 1. merchant_portal_accounts.industry
-- --------------------------------------------------------------------------
ALTER TABLE merchant_portal_accounts
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- --------------------------------------------------------------------------
-- 2. Backfill from loan_applications
-- --------------------------------------------------------------------------
-- Direct link first (application_id is stored on the portal account)
UPDATE merchant_portal_accounts mpa
SET industry = la.industry
FROM loan_applications la
WHERE mpa.industry IS NULL
  AND mpa.application_id IS NOT NULL
  AND la.id = mpa.application_id
  AND la.industry IS NOT NULL
  AND la.industry <> '';

-- Fallback: match by email, take the most recent application's industry
UPDATE merchant_portal_accounts mpa
SET industry = la.industry
FROM (
  SELECT DISTINCT ON (LOWER(email)) LOWER(email) AS email_key, industry
  FROM loan_applications
  WHERE industry IS NOT NULL AND industry <> ''
  ORDER BY LOWER(email), created_at DESC
) la
WHERE mpa.industry IS NULL
  AND LOWER(mpa.email) = la.email_key;

-- --------------------------------------------------------------------------
-- 3. industry_resources table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS industry_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  tag TEXT,
  tag_color TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industry_resources_key_active
  ON industry_resources (industry_key, is_active);

-- --------------------------------------------------------------------------
-- 4. Seed data
-- --------------------------------------------------------------------------
-- Idempotent guard: only seed if the table is empty.
INSERT INTO industry_resources (industry_key, category, title, description, url, tag, tag_color, priority)
SELECT * FROM (VALUES
  -- Universal (shown to everyone) — mirrors the previous hardcoded list
  (NULL::text, 'Credit Monitoring', 'Nav.com — Free Business Credit Scores',
    'See your Dun & Bradstreet and Experian business credit scores for free. Understand what lenders see when they review your business.',
    'https://www.nav.com/business-credit-scores/', 'Free', '#34d399', 100),
  (NULL, 'Credit Monitoring', 'Experian Business Credit',
    'Monitor your Experian business credit profile. Get alerts when your score changes and see what factors are impacting it.',
    'https://www.experian.com/business/check-business-credit.html', 'Free Report', '#60a5fa', 90),
  (NULL, 'Credit Monitoring', 'Dun & Bradstreet — Get Your D-U-N-S Number',
    'A D-U-N-S number is essential for building business credit. Get yours for free if you don''t have one yet.',
    'https://www.dnb.com/duns-number/get-a-duns.html', 'Free', '#34d399', 80),

  (NULL, 'SBA & Government Programs', 'SBA Loan Programs Overview',
    'Explore SBA 7(a), 504, and Microloan programs. Government-backed loans with lower rates and longer terms for qualifying businesses.',
    'https://www.sba.gov/funding-programs/loans', 'Gov', '#a78bfa', 100),
  (NULL, 'SBA & Government Programs', 'Grants.gov — Federal Business Grants',
    'Search for federal grant opportunities. Unlike loans, grants don''t need to be repaid.',
    'https://www.grants.gov/', 'Grants', '#fbbf24', 90),

  (NULL, 'Financial Tools', 'Wave — Free Accounting Software',
    'Free invoicing, accounting, and receipt scanning for small businesses. No credit card required.',
    'https://www.waveapps.com/', 'Free', '#34d399', 100),
  (NULL, 'Financial Tools', 'IRS Tax Calendar for Businesses',
    'Never miss a tax deadline. See all federal tax due dates for your business type at a glance.',
    'https://www.irs.gov/businesses/small-businesses-self-employed/tax-calendars', 'IRS', '#a78bfa', 90),

  (NULL, 'Business Growth', 'Google Business Profile',
    'Claim and optimize your free Google Business listing. Show up in local search results and Google Maps.',
    'https://business.google.com/', 'Free', '#34d399', 100),
  (NULL, 'Business Growth', 'NEXT Insurance — Business Insurance',
    'Get affordable business insurance in minutes. General liability, professional liability, workers'' comp, and more.',
    'https://www.nextinsurance.com/', 'Quote', '#60a5fa', 90),

  -- Restaurants & food service
  ('restaurant', 'Industry Tools', 'Toast POS',
    'All-in-one restaurant POS with online ordering, payroll, and guest management built for food service operators.',
    'https://pos.toasttab.com/', 'POS', '#f97316', 100),
  ('restaurant', 'Industry Tools', 'ServSafe Food Handler Certification',
    'Official food handler training recognized by health departments nationwide. Required in many states.',
    'https://www.servsafe.com/ServSafe-Food-Handler', 'Cert', '#a78bfa', 90),
  ('restaurant', 'Industry Tools', 'MarketMan — Restaurant Inventory',
    'Track food cost, manage vendors, and automate inventory counts. Integrates with Toast and Square.',
    'https://www.marketman.com/', 'Tool', '#60a5fa', 80),
  ('restaurant', 'Compliance & Licensing', 'FDA Food Code Overview',
    'The baseline food-safety code that state and local health departments adopt. Know what inspectors check.',
    'https://www.fda.gov/food/retail-food-protection/fda-food-code', 'Gov', '#a78bfa', 70),

  -- Trucking / transportation
  ('trucking', 'Industry Tools', 'DAT Load Board',
    'The largest freight load board in North America. Find backhauls and match trucks to loads in real time.',
    'https://www.dat.com/', 'Loads', '#f97316', 100),
  ('trucking', 'Industry Tools', 'KeepTruckin (Motive) ELD',
    'FMCSA-compliant electronic logging, GPS tracking, and fuel card tools for fleets of any size.',
    'https://gomotive.com/', 'ELD', '#60a5fa', 90),
  ('trucking', 'Compliance & Licensing', 'FMCSA — Register / Update USDOT',
    'Manage your USDOT number, MC authority, and BOC-3 filings. Required for interstate carriers.',
    'https://www.fmcsa.dot.gov/registration', 'Gov', '#a78bfa', 80),
  ('trucking', 'Compliance & Licensing', 'IFTA Filing Info',
    'Quarterly fuel-tax reporting for carriers operating in multiple jurisdictions.',
    'https://www.iftach.org/', 'Tax', '#fbbf24', 70),

  -- Construction
  ('construction', 'Industry Tools', 'Procore — Construction Management',
    'Project management, budgeting, RFIs, and document control used by general contractors of every size.',
    'https://www.procore.com/', 'PM', '#60a5fa', 100),
  ('construction', 'Industry Tools', 'Buildertrend',
    'All-in-one platform for home builders and remodelers: scheduling, client portals, change orders, and payments.',
    'https://buildertrend.com/', 'PM', '#60a5fa', 90),
  ('construction', 'Compliance & Licensing', 'OSHA 10/30-Hour Training',
    'Industry-recognized safety certifications that many states and general contractors require on jobsites.',
    'https://www.osha.com/', 'Cert', '#a78bfa', 80),
  ('construction', 'Business Growth', 'Contractor''s State License Board Directory',
    'Find state-by-state contractor licensing requirements. Stay current on renewals to keep bidding.',
    'https://www.contractors-license.org/', 'Gov', '#a78bfa', 70),

  -- Retail
  ('retail', 'Industry Tools', 'Shopify',
    'Launch or upgrade an online store that syncs with your in-store POS. Thousands of apps for marketing and inventory.',
    'https://www.shopify.com/', 'Ecom', '#34d399', 100),
  ('retail', 'Industry Tools', 'Square for Retail',
    'Retail-focused POS with inventory, barcode scanning, employee management, and built-in payments.',
    'https://squareup.com/us/en/point-of-sale/retail', 'POS', '#f97316', 90),
  ('retail', 'Business Growth', 'Meta Ads for Small Business',
    'Reach local shoppers on Facebook and Instagram. Free training and ad credits for eligible new accounts.',
    'https://www.facebook.com/business/small-business', 'Ads', '#60a5fa', 80),
  ('retail', 'Business Growth', 'Klaviyo — Email & SMS for Retailers',
    'The email/SMS platform most Shopify and BigCommerce stores use to drive repeat purchases.',
    'https://www.klaviyo.com/', 'Mktg', '#a78bfa', 70),

  -- Professional services
  ('professional_services', 'Industry Tools', 'HubSpot CRM (Free)',
    'Free-tier CRM, email tracking, and pipeline management that scales with your practice.',
    'https://www.hubspot.com/products/crm', 'Free', '#34d399', 100),
  ('professional_services', 'Industry Tools', 'Calendly',
    'Automate client scheduling with booking links that respect your availability and collect intake info.',
    'https://calendly.com/', 'Tool', '#60a5fa', 90),
  ('professional_services', 'Industry Tools', 'FreshBooks',
    'Cloud invoicing, time tracking, and expense management tailored for service-based businesses.',
    'https://www.freshbooks.com/', 'Acctg', '#34d399', 80),
  ('professional_services', 'Business Growth', 'LinkedIn Sales Navigator',
    'Targeted prospecting and lead lists for consultants, agencies, and B2B service firms.',
    'https://business.linkedin.com/sales-solutions/sales-navigator', 'B2B', '#60a5fa', 70)
) AS seed(industry_key, category, title, description, url, tag, tag_color, priority)
WHERE NOT EXISTS (SELECT 1 FROM industry_resources);
