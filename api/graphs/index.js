/* eslint-env node */
import { getDb } from '../_lib/db.js';
import { getSingleUserId } from '../_lib/single-user.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const db = getDb();
    const userId = await getSingleUserId(db);
    const result = await db.query(
      'SELECT id, updated_at FROM graphs WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100',
      [userId],
    );

    res.status(200).json({ graphs: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to list graphs.' });
  }
}
