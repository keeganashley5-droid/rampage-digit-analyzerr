-- Migration 004: Enforce one Super Administrator.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM admin_users) > 1 THEN
        RAISE EXCEPTION 'Cannot enforce a single administrator: multiple accounts exist.';
    END IF;

    IF EXISTS (SELECT 1 FROM admin_users WHERE role <> 'owner') THEN
        RAISE EXCEPTION 'Cannot enforce a single Super Administrator: a non-owner account exists.';
    END IF;
END;
$$;

ALTER TABLE admin_users
    ADD CONSTRAINT admin_users_owner_only_check CHECK (role = 'owner');

CREATE UNIQUE INDEX admin_users_single_account_unique
    ON admin_users ((TRUE));
