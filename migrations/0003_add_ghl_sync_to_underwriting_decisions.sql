-- Add GHL sync tracking fields to business_underwriting_decisions table
ALTER TABLE business_underwriting_decisions
ADD COLUMN IF NOT EXISTS ghl_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ghl_sync_message TEXT,
ADD COLUMN IF NOT EXISTS ghl_opportunity_id TEXT;

-- Create index for faster lookups of unsynced decisions
CREATE INDEX IF NOT EXISTS idx_underwriting_decisions_ghl_synced ON business_underwriting_decisions (ghl_synced);
