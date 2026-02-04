-- Exchange rates table
CREATE TABLE IF NOT EXISTS app.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency)
);

-- Initial exchange rates
INSERT INTO app.exchange_rates (from_currency, to_currency, rate)
VALUES
  ('USD', 'EUR', 0.92),
  ('EUR', 'USD', 1.08695652) -- 1 / 0.92
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- System user for exchange operations (special UUID for system)
INSERT INTO auth.users (id, email, password_hash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system@exchange.internal',
  'SYSTEM_ACCOUNT_NO_LOGIN'
) ON CONFLICT (id) DO NOTHING;

-- System exchange accounts (counterparty for user exchanges)
-- These accounts act as the "exchange pool"
INSERT INTO app.accounts (id, user_id, currency, balance)
VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'USD', 1000000.00),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'EUR', 1000000.00)
ON CONFLICT (id) DO NOTHING;
