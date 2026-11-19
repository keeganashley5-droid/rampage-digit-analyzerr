import 'dotenv/config';
import argon2 from 'argon2';
import {
  database,
  closeDatabaseConnection,
} from '../services/database.js';

const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

async function main(): Promise<void> {
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('A valid administrator email is required.');
  }

  if (!password || password.length < 12 || password.length > 128) {
    throw new Error(
      'Administrator password must contain 12 to 128 characters.',
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const client = await database.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [741852964],
    );

    const existingOwner = await client.query(
      `SELECT id FROM admin_users`,
    );

    if (existingOwner.rowCount !== 0) {
      throw new Error(
        'An administrator owner already exists. Bootstrap is permanently closed.',
      );
    }

    const created = await client.query<{ id: string }>(
      `INSERT INTO admin_users (
         email,
         password_hash,
         role,
         status
       )
       VALUES ($1, $2, 'owner', 'active')
       RETURNING id`,
      [email, passwordHash],
    );

    await client.query(
      `INSERT INTO admin_audit_log (
         admin_user_id,
         action,
         target,
         details
       )
       VALUES ($1, 'initial_owner_created', $2, '{}'::jsonb)`,
      [created.rows[0].id, email],
    );

    await client.query('COMMIT');

    console.log('Initial administrator created successfully.');
    console.log('Email:', email);
    console.log('One-time bootstrap is now closed.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      'Administrator bootstrap failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    await closeDatabaseConnection();
  });