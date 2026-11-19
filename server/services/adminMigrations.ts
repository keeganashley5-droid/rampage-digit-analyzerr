
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { database } from './database.js';

const MIGRATIONS = [
  {
    version: 1,
    name: '001_admin_portal',
    file: '001_admin_portal.sql',
  },
  {
    version: 2,
    name: '002_deriv_partner_integration',
    file: '002_deriv_partner_integration.sql',
  },
  {
    version: 3,
    name: '003_partner_oauth_owner_binding',
    file: '003_partner_oauth_owner_binding.sql',
  },
  {
    version: 4,
    name: '004_single_super_admin',
    file: '004_single_super_admin.sql',
  },
] as const;

export async function runAdminMigrations(): Promise<void> {
  const client = await database.connect();

  try {
    await client.query('BEGIN');

    // Prevent concurrent migration processes.
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [741852963],
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migration of MIGRATIONS) {
      const existing = await client.query<{ name: string }>(
        'SELECT name FROM admin_schema_migrations WHERE version = $1',
        [migration.version],
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].name !== migration.name) {
          throw new Error(
            `Migration version ${migration.version} has an unexpected name.`,
          );
        }

        console.log(
          `Admin migration ${migration.version} already applied.`,
        );

        continue;
      }

      const migrationPath = path.resolve(
        process.cwd(),
        'server/migrations',
        migration.file,
      );

      const migrationSql = await readFile(migrationPath, 'utf8');

      await client.query(migrationSql);

      await client.query(
        `INSERT INTO admin_schema_migrations (version, name)
         VALUES ($1, $2)`,
        [migration.version, migration.name],
      );

      console.log(
        `Admin migration ${migration.version} applied successfully.`,
      );
    }

    await client.query('COMMIT');
    console.log('Admin database migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
