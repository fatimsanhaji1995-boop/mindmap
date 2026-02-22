import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }

  if (!databaseUrl.includes('-pooler')) {
    console.error('DATABASE_URL must use the Neon pooled connection string (contains "-pooler").');
    process.exit(1);
  }

  return databaseUrl;
}

const email = (getArg('email') || '').trim().toLowerCase();
const password = getArg('password') || '';
const databaseUrl = getDatabaseUrl();

if (!email || !password) {
  console.error('Usage: node scripts/seed-user.mjs --email=user@example.com --password=secret');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const createUsersTableSql = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

try {
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.query(createUsersTableSql);
  const result = await pool.query(
    `INSERT INTO users(email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [email, passwordHash],
  );

  console.log('User seeded successfully.');
} catch {
  console.error('Failed to seed user.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
