-- Add merchant financial tables for the Financials tab
-- merchantPlaidConnections: bridges merchant email to Plaid items
CREATE TABLE IF NOT EXISTS merchant_plaid_connections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_email TEXT NOT NULL,
  plaid_item_id TEXT NOT NULL,
  institution_name TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMP DEFAULT now()
);

-- merchantFinancialInsights: caches computed insights
CREATE TABLE IF NOT EXISTS merchant_financial_insights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_email TEXT NOT NULL,
  source_type TEXT NOT NULL,
  insights_data JSONB NOT NULL,
  generated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_merchant_plaid_connections_email ON merchant_plaid_connections(merchant_email);
CREATE INDEX IF NOT EXISTS idx_merchant_financial_insights_email_source ON merchant_financial_insights(merchant_email, source_type);
