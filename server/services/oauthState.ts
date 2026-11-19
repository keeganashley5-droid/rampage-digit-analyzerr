import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const TRANSACTION_TTL_MS = 10 * 60 * 1000;

interface OAuthTransaction {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

const transactions = new Map<string, OAuthTransaction>();

function cleanupExpired(): void {
  const now = Date.now();

  for (const [state, transaction] of transactions) {
    if (now - transaction.createdAt >= TRANSACTION_TTL_MS) {
      transactions.delete(state);
    }
  }
}

function createCodeChallenge(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

export const oauthState = Object.freeze({
  create(): {
    state: string;
    codeVerifier: string;
    codeChallenge: string;
  } {
    cleanupExpired();

    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');

    transactions.set(state, {
      state,
      codeVerifier,
      createdAt: Date.now(),
    });

    return {
      state,
      codeVerifier,
      codeChallenge: createCodeChallenge(codeVerifier),
    };
  },

  consume(state: string): string | undefined {
    cleanupExpired();

    const transaction = transactions.get(state);

    if (!transaction || !secureEqual(transaction.state, state)) {
      return undefined;
    }

    // A transaction can only be used once.
    transactions.delete(state);

    return transaction.codeVerifier;
  },
});
