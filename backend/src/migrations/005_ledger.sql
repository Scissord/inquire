CREATE TABLE app.ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES app.transactions(id),
  account_id uuid NOT NULL REFERENCES app.accounts(id),
  amount NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
