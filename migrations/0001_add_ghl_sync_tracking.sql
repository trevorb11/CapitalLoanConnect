-- Add GHL sync tracking fields to lender_approvals table
ALTER TABLE lender_approvals
ADD COLUMN IF NOT EXISTS ghl_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ghl_sync_message TEXT,
ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;

-- Create index for faster lookups of unsynced approvals
CREATE INDEX IF NOT EXISTS idx_lender_approvals_ghl_synced ON lender_approvals (ghl_synced);
