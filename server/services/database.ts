import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error('DATABASE_URL is required.');
}

const databaseUrl = new URL(connectionString);

if (
  databaseUrl.protocol !== 'postgres:' &&
  databaseUrl.protocol !== 'postgresql:'
) {
  throw new Error('DATABASE_URL must be a PostgreSQL connection string.');
}

export const database = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: false,
});

database.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export async function verifyDatabaseConnection(): Promise<void> {
  const result = await database.query<{
    database: string;
    current_time: Date;
  }>(
    'SELECT current_database() AS database, NOW() AS current_time',
  );

  console.log(
    `PostgreSQL connected successfully: ${result.rows[0].database}`,
  );
}

export async function closeDatabaseConnection(): Promise<void> {
  await database.end();
}
