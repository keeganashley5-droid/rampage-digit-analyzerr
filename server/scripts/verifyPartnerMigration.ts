
import 'dotenv/config';
import {
  database,
  closeDatabaseConnection,
} from '../services/database.js';

async function main(): Promise<void> {
  try {
    const result = await database.query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = $1
         AND table_name = ANY($2)
       ORDER BY table_name`,
      [
        'public',
        ['admin_integrations', 'admin_oauth_transactions'],
      ],
    );

    console.log('Verified migration tables:');
    console.log(result.rows);

    if (result.rows.length !== 2) {
      throw new Error('One or more migration tables are missing.');
    }

    console.log('PASS: Both migration 002 tables exist.');
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Migration verification failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});
