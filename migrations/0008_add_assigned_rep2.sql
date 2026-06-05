-- Add second assigned rep column to support co-crediting two reps on approvals and funded deals.
ALTER TABLE business_underwriting_decisions
  ADD COLUMN IF NOT EXISTS assigned_rep_2 TEXT;
