CREATE INDEX IF NOT EXISTS idx_ledger_transaction_id
  ON app.ledger (transaction_id);

CREATE INDEX IF NOT EXISTS idx_ledger_account_id
  ON app.ledger (account_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_currency
  ON app.accounts (user_id, currency);
