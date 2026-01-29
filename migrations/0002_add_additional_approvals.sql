-- Add additional_approvals JSONB column to business_underwriting_decisions
ALTER TABLE business_underwriting_decisions
ADD COLUMN IF NOT EXISTS additional_approvals jsonb;
