
-- Rampage Digit Analyzer
-- Migration 002: Secure Deriv Partner integration storage

CREATE TABLE IF NOT EXISTS admin_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider TEXT NOT NULL UNIQUE
        CHECK (provider = 'deriv_partner'),

    encrypted_access_token TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    encryption_auth_tag TEXT NOT NULL,

    token_expires_at TIMESTAMPTZ,
    granted_scope TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'connected'
        CHECK (status IN ('connected', 'disconnected')),

    connected_by UUID REFERENCES admin_users(id)
        ON DELETE SET NULL,

    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_oauth_transactions (
    state_hash CHAR(64) PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_oauth_transactions_expiry_idx
    ON admin_oauth_transactions (expires_at);
