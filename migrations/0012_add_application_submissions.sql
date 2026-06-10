-- Submission history per loan application file. The dedup-by-email logic keeps
-- one loan_applications record per business; this table records each completed
-- intake/full-app submission so re-submissions are visible on the dashboard.
CREATE TABLE IF NOT EXISTS application_submissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id VARCHAR NOT NULL,
  email TEXT,
  submission_type TEXT NOT NULL,
  requested_amount DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_submissions_app_id ON application_submissions (loan_application_id);

ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP;

-- Backfill: one submission row per already-completed application (original date),
-- and seed last_submission_at from created_at so sorting stays stable.
INSERT INTO application_submissions (loan_application_id, email, submission_type, requested_amount, created_at)
SELECT id, email,
       CASE WHEN is_full_application_completed THEN 'full_application' ELSE 'intake' END,
       requested_amount, created_at
FROM loan_applications
WHERE (is_completed = true OR is_full_application_completed = true)
  AND NOT EXISTS (SELECT 1 FROM application_submissions s WHERE s.loan_application_id = loan_applications.id);

UPDATE loan_applications SET last_submission_at = created_at WHERE last_submission_at IS NULL;
