-- Track when a /track lead first met all qualification signals and when they were notified
ALTER TABLE lead_portal_accounts ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP;
ALTER TABLE lead_portal_accounts ADD COLUMN IF NOT EXISTS qualified_notified_at TIMESTAMP;
