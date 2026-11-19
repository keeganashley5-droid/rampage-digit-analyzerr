
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const encodedKey = process.env.DERIV_PARTNER_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      'DERIV_PARTNER_TOKEN_ENCRYPTION_KEY is not configured.',
    );
  }

  if (!/^[A-Za-z0-9+/]{43}=$/.test(encodedKey)) {
    throw new Error('Partner encryption key must be valid Base64.');
  }

  const key = Buffer.from(encodedKey, 'base64');

  if (
    key.length !== 32 ||
    key.toString('base64') !== encodedKey
  ) {
    throw new Error(
      'Partner encryption key must decode to exactly 32 bytes.',
    );
  }

  return key;
}

export interface EncryptedToken {
  encryptedAccessToken: string;
  encryptionIv: string;
  encryptionAuthTag: string;
}

export function encryptPartnerToken(
  accessToken: string,
): EncryptedToken {
  if (!accessToken || accessToken.length > 16384) {
    throw new Error('Invalid Partner access token.');
  }

  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
    { authTagLength: AUTH_TAG_LENGTH },
  );

  const encrypted = Buffer.concat([
    cipher.update(accessToken, 'utf8'),
    cipher.final(),
  ]);

  return {
    encryptedAccessToken: encrypted.toString('base64'),
    encryptionIv: iv.toString('base64'),
    encryptionAuthTag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptPartnerToken(
  encryptedToken: EncryptedToken,
): string {
  const encrypted = Buffer.from(
    encryptedToken.encryptedAccessToken,
    'base64',
  );

  const iv = Buffer.from(encryptedToken.encryptionIv, 'base64');
  const authTag = Buffer.from(
    encryptedToken.encryptionAuthTag,
    'base64',
  );

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH ||
    encrypted.length === 0
  ) {
    throw new Error('Invalid encrypted Partner token data.');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv,
    { authTagLength: AUTH_TAG_LENGTH },
  );

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
}
