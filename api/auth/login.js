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
    const db = getDb();
    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [normalizedEmail]);

    if (result.rowCount === 0) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createAuthToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.status(200).json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login.' });
  }
}
