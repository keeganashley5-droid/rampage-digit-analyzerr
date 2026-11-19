import 'dotenv/config';
import {
  database,
  closeDatabaseConnection,
} from '../services/database.js';

async function main() {
  try {
    const tables = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'admin_%'
      ORDER BY table_name
    `);

    const users = await database.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count FROM admin_users
    `);

    const migrations = await database.query(`
      SELECT version, name
      FROM admin_schema_migrations
      ORDER BY version
    `);

    console.log('\nADMIN TABLES:');
    tables.rows.forEach((row) => console.log(`- ${row.table_name}`));

    console.log('\nADMIN ACCOUNTS:', users.rows[0].count);
    console.log('MIGRATIONS:', migrations.rows);
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error) => {
  console.error('Verification failed:', error.message);
  process.exitCode = 1;
});