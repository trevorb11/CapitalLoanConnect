-- Add secondary email for improved SF matching.
-- Populated from loan_applications.business_email or company_email.
ALTER TABLE business_underwriting_decisions
  ADD COLUMN IF NOT EXISTS secondary_email TEXT;

CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_secondary_email
  ON business_underwriting_decisions (secondary_email);

-- Backfill: populate secondary_email from loan_applications where available
UPDATE business_underwriting_decisions d
SET secondary_email = la.business_email
FROM loan_applications la
WHERE LOWER(d.business_email) = LOWER(la.email)
  AND la.business_email IS NOT NULL
  AND la.business_email != d.business_email
  AND d.secondary_email IS NULL;

-- Also try company_email
UPDATE business_underwriting_decisions d
SET secondary_email = la.company_email
FROM loan_applications la
WHERE LOWER(d.business_email) = LOWER(la.email)
  AND la.company_email IS NOT NULL
  AND la.company_email != d.business_email
  AND d.secondary_email IS NULL;
