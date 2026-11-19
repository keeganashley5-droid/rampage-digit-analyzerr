
import 'dotenv/config';
import { runAdminMigrations } from '../services/adminMigrations.js';
import { closeDatabaseConnection } from '../services/database.js';

async function main(): Promise<void> {
  try {
    await runAdminMigrations();
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error: unknown) => {
  console.error(
    'Admin migration failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );

  process.exitCode = 1;
});
