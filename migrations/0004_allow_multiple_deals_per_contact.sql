-- Allow multiple deals (business_underwriting_decisions) per contact email
-- Previously business_email had a UNIQUE constraint, limiting one deal per contact
ALTER TABLE business_underwriting_decisions DROP CONSTRAINT IF EXISTS business_underwriting_decisions_business_email_unique;
