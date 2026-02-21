import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

function getArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

const email = (getArg('email') || '').trim().toLowerCase();
const password = getArg('password') || '';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

if (!email || !password) {
  console.error('Usage: node scripts/seed-user.mjs --email=user@example.com --password=secret');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
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

  console.log(`Seeded user ${result.rows[0].email} (id=${result.rows[0].id}).`);
} catch (error) {
  console.error('Failed to seed user:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
