-- DB-backed SMS OTP store for /track lead login (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS lead_otp_codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  email TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
