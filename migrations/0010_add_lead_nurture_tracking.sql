-- Track which nurture sequence emails have been sent to each /track lead (CSV: day1,day3,day7)
ALTER TABLE lead_portal_accounts ADD COLUMN IF NOT EXISTS nurture_steps_sent TEXT;
