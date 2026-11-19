
import 'dotenv/config';
import {
  decryptPartnerToken,
  encryptPartnerToken,
} from '../services/partnerTokenEncryption.js';

const testToken = 'RAMPAGE_PARTNER_ENCRYPTION_TEST_ONLY';

try {
  const encrypted = encryptPartnerToken(testToken);
  const decrypted = decryptPartnerToken(encrypted);

  if (decrypted !== testToken) {
    throw new Error('Encryption round-trip verification failed.');
  }

  console.log('PASS: AES-256-GCM encryption succeeded.');
  console.log('PASS: Token decryption restored the original test value.');
  console.log('PASS: Encryption key is valid and correctly configured.');
} catch (error) {
  console.error(
    'FAIL: Partner token encryption test:',
    error instanceof Error ? error.message : 'Unknown error',
  );

  process.exitCode = 1;
}
