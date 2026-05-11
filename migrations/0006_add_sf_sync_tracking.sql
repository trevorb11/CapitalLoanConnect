-- Add Salesforce sync tracking fields to mirror the existing ghl_sync_* pattern.
-- This is the missing half of the bridge: GHL sync tracking exists (migrations
-- 0001 and 0003), Salesforce sync tracking does not.
--
-- All columns are nullable / defaulted so this migration is safe to apply at
-- any time; no backfill is required. Live sync code can begin writing these
-- fields once deployed.

-- business_underwriting_decisions
ALTER TABLE business_underwriting_decisions
  ADD COLUMN IF NOT EXISTS sf_synced         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sf_synced_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sf_sync_message   TEXT,
  ADD COLUMN IF NOT EXISTS sf_account_id     TEXT,
  ADD COLUMN IF NOT EXISTS sf_contact_id     TEXT,
  ADD COLUMN IF NOT EXISTS sf_opportunity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_sf_synced
  ON business_underwriting_decisions (sf_synced);

CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_sf_opp
  ON business_underwriting_decisions (sf_opportunity_id);

-- lender_approvals
ALTER TABLE lender_approvals
  ADD COLUMN IF NOT EXISTS sf_synced         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sf_synced_at      TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sf_sync_message   TEXT,
  ADD COLUMN IF NOT EXISTS sf_opportunity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lender_approvals_sf_synced
  ON lender_approvals (sf_synced);

-- loan_applications — live syncApplicationToSalesforce() creates SF records
-- but has no way to record which SF records it created. Add tracking so the
-- sync becomes idempotent (skip-if-already-synced + backfill-safe).
ALTER TABLE loan_applications
  ADD COLUMN IF NOT EXISTS sf_account_id      TEXT,
  ADD COLUMN IF NOT EXISTS sf_contact_id      TEXT,
  ADD COLUMN IF NOT EXISTS sf_opportunity_id  TEXT,
  ADD COLUMN IF NOT EXISTS sf_synced_at       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sf_sync_message    TEXT;

CREATE INDEX IF NOT EXISTS idx_loan_applications_sf_opp
  ON loan_applications (sf_opportunity_id);
