/* eslint-env node */
import bcrypt from 'bcryptjs';
import { getDb } from '../_lib/db.js';
import { createAuthToken, setAuthCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const db = getDb();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount > 0) {
      res.status(409).json({ error: 'Email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.query(
      'INSERT INTO users(email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [normalizedEmail, passwordHash],
    );

    const user = inserted.rows[0];
    const token = createAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
}
