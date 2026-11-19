-- Bind every Partner OAuth transaction to its owner
DELETE FROM admin_oauth_transactions;
ALTER TABLE admin_oauth_transactions ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
ALTER TABLE admin_oauth_transactions ALTER COLUMN admin_user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS admin_oauth_transactions_owner_idx ON admin_oauth_transactions (admin_user_id);
