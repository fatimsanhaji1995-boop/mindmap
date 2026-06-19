/* eslint-env node */
import { Pool } from 'pg';

let pool;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  return databaseUrl;
}

export function getDb() {
  const databaseUrl = getDatabaseUrl();

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}
