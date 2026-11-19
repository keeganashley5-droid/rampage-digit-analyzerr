import { randomBytes } from 'node:crypto';

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

export interface ServerSession {
  accessToken: string;
  createdAt: number;
  lastSeenAt: number;
  absoluteExpiresAt: number;
  tokenExpiresAt: number | null;
}

const sessions = new Map<string, ServerSession>();

function isExpired(session: ServerSession, now: number): boolean {
  const idleExpired = now - session.lastSeenAt >= IDLE_TIMEOUT_MS;
  const absoluteExpired = now >= session.absoluteExpiresAt;
  const tokenExpired =
    session.tokenExpiresAt !== null && now >= session.tokenExpiresAt;

  return idleExpired || absoluteExpired || tokenExpired;
}

function removeExpiredSessions(now: number): void {
  for (const [sessionId, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(sessionId);
    }
  }
}

export const sessionStore = Object.freeze({
  create(
    accessToken: string,
    tokenExpiresAt: number | null = null,
  ): string {
    if (!accessToken.trim()) {
      throw new Error('Cannot create a session without an access token.');
    }

    const now = Date.now();
    removeExpiredSessions(now);

    const sessionId = randomBytes(32).toString('base64url');

    sessions.set(sessionId, {
      accessToken,
      createdAt: now,
      lastSeenAt: now,
      absoluteExpiresAt: now + ABSOLUTE_TIMEOUT_MS,
      tokenExpiresAt,
    });

    return sessionId;
  },

  get(sessionId: string): ServerSession | undefined {
    const now = Date.now();
    const session = sessions.get(sessionId);

    if (!session) {
      return undefined;
    }

    if (isExpired(session, now)) {
      sessions.delete(sessionId);
      return undefined;
    }

    session.lastSeenAt = now;
    return session;
  },

  delete(sessionId: string): void {
    sessions.delete(sessionId);
  },

  clear(): void {
    sessions.clear();
  },

  get size(): number {
    return sessions.size;
  },
});
