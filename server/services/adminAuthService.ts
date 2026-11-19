
import argon2 from 'argon2';
import { database } from './database.js';
import {
  adminSessionStore,
} from './adminSessionStore.js';

export interface AdminLoginResult {
  token: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    role: 'owner';
  };
}

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePassword(password: string): void {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new Error(
      'Password must contain between 12 and 128 characters.',
    );
  }
}

export const adminAuthService = {
  async login(
    email: string,
    password: string,
    userAgent?: string,
  ): Promise<AdminLoginResult | null> {
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      typeof password !== 'string' ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return null;
    }

    const result = await database.query<{
      id: string;
      email: string;
      password_hash: string;
      role: 'owner';
    }>(
      `SELECT id, email, password_hash, role
       FROM admin_users
       WHERE LOWER(email) = $1 AND role = 'owner'
         AND status = 'active'
       LIMIT 1`,
      [normalizedEmail],
    );

    const user = result.rows[0];

    if (!user) {
      return null;
    }

    const passwordMatches = await argon2.verify(
      user.password_hash,
      password,
    );

    if (!passwordMatches) {
      return null;
    }

    const session = await adminSessionStore.create(
      user.id,
      userAgent,
    );

    await database.query(
      `UPDATE admin_users
       SET last_login_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id],
    );

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  },

  async createInitialOwner(
    email: string,
    password: string,
  ): Promise<void> {
    const normalizedEmail = normalizeEmail(email);

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new Error('A valid administrator email is required.');
    }

    validatePassword(password);

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const result = await database.query(
      `INSERT INTO admin_users (
         email,
         password_hash,
         role,
         status
       )
       SELECT $1, $2, 'owner', 'active'
       WHERE NOT EXISTS (
         SELECT 1 FROM admin_users
       )
       RETURNING id`,
      [normalizedEmail, passwordHash],
    );

    if (result.rowCount !== 1) {
      throw new Error(
        'Initial administrator already exists or could not be created.',
      );
    }
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    validatePassword(newPassword);

    const result = await database.query<{
      password_hash: string;
    }>(
      `SELECT password_hash
       FROM admin_users
       WHERE id = $1 AND status = 'active'
       LIMIT 1`,
      [userId],
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await argon2.verify(user.password_hash, currentPassword))
    ) {
      throw new Error('Current password is incorrect.');
    }

    const newHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    await database.query(
      `UPDATE admin_users
       SET password_hash = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newHash, userId],
    );

    await adminSessionStore.revokeAll(userId);
  },
};
