import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { database, closeDatabaseConnection } from '../services/database.js';

async function main() {
  const client = await database.connect();

  try {
    const sql = await readFile('./server/migrations/003_partner_oauth_owner_binding.sql', 'utf8');

    console.log('\n--- SQL being tested ---\n');
    console.log(JSON.stringify(sql));

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('ROLLBACK');

    console.log('\nMigration SQL executed successfully in a rolled-back test.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('\n--- FULL DATABASE ERROR ---');
    console.dir(error, { depth: 8 });
  } finally {
    client.release();
    await closeDatabaseConnection();
  }
}

main().catch(console.error);

