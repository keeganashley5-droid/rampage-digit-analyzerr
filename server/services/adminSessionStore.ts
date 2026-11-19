import { createHash, randomBytes } from 'node:crypto';
import { database } from './database.js';

const SESSION_DURATION_HOURS = 8;

export interface AdminIdentity {
  id: string;
  email: string;
  role: 'owner';
}

export interface AdminSession {
  sessionId: string;
  user: AdminIdentity;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const adminSessionStore = {
  async create(
    userId: string,
    userAgent?: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const result = await database.query<{ expires_at: Date }>(
      `INSERT INTO admin_sessions (
         user_id,
         token_hash,
         expires_at,
         user_agent
       )
       SELECT
         id,
         $2,
         NOW() + ($3 * INTERVAL '1 hour'),
         $4
       FROM admin_users
       WHERE id = $1 AND status = 'active'
       RETURNING expires_at`,
      [
        userId,
        tokenHash,
        SESSION_DURATION_HOURS,
        userAgent?.slice(0, 512) ?? null,
      ],
    );

    if (result.rowCount !== 1) {
      throw new Error('Unable to create administrator session.');
    }

    return {
      token,
      expiresAt: result.rows[0].expires_at,
    };
  },

  async find(token: string): Promise<AdminSession | null> {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return null;
    }

    const tokenHash = hashToken(token);

    const result = await database.query<{
      session_id: string;
      user_id: string;
      email: string;
      role: 'owner';
      expires_at: Date;
    }>(
      `SELECT
         s.id AS session_id,
         u.id AS user_id,
         u.email,
         u.role,
         s.expires_at
       FROM admin_sessions s
       INNER JOIN admin_users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.status = 'active'
       LIMIT 1`,
      [tokenHash],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    await database.query(
      `UPDATE admin_sessions
       SET last_seen_at = NOW()
       WHERE id = $1
         AND last_seen_at < NOW() - INTERVAL '1 minute'`,
      [row.session_id],
    );

    return {
      sessionId: row.session_id,
      user: {
        id: row.user_id,
        email: row.email,
        role: row.role,
      },
      expiresAt: row.expires_at,
    };
  },

  async revoke(token: string): Promise<void> {
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return;
    }

    await database.query(
      `UPDATE admin_sessions
       SET revoked_at = NOW()
       WHERE token_hash = $1
         AND revoked_at IS NULL`,
      [hashToken(token)],
    );
  },

  async revokeAll(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    await database.query(
      `UPDATE admin_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > NOW()
         AND ($2::uuid IS NULL OR id <> $2::uuid)`,
      [userId, exceptSessionId ?? null],
    );
  },
};