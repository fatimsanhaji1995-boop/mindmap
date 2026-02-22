/* eslint-env node */
import { getDb } from '../_lib/db.js';

const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL || 'solo@mindmap.local';
const SINGLE_USER_PASSWORD_HASH = process.env.SINGLE_USER_PASSWORD_HASH || 'single-user-mode';

function normalizeGraph(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];
  const ogSnapshot = normalizeOgSnapshot(payload?.ogSnapshot);
  const cameraBookmarks = normalizeCameraBookmarks(payload?.cameraBookmarks);

  return {
    nodes: nodes.map(({ id, color, textSize, group, x, y, z }) => ({ id, color, textSize, group, x, y, z })),
    links: links.map(({ source, target, color, thickness }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
    })),
    ...(ogSnapshot ? { ogSnapshot } : {}),
    ...(cameraBookmarks.length ? { cameraBookmarks } : {}),
  };
}

async function getSingleUserId(db) {
  const result = await db.query(
    `INSERT INTO users(email, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (email)
     DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [SINGLE_USER_EMAIL, SINGLE_USER_PASSWORD_HASH],
  );

  return result.rows[0].id;
}

export default async function handler(req, res) {
  const graphId = req.query.id;
  if (!graphId) {
    res.status(400).json({ error: 'Graph id is required.' });
    return;
  }

  try {
    const db = getDb();
    const userId = await getSingleUserId(db);

    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT id, data, updated_at FROM graphs WHERE id = $1 AND user_id = $2',
        [graphId, userId],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Graph not found.' });
        return;
      }

      res.status(200).json({ graph: result.rows[0] });
      return;
    }

    if (req.method === 'POST') {
      const data = normalizeGraph(req.body?.data ?? req.body);
      const result = await db.query(
        `INSERT INTO graphs(id, user_id, data)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (id, user_id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = now()
         RETURNING id, updated_at`,
        [graphId, userId, JSON.stringify(data)],
      );

      res.status(200).json({ graph: { id: result.rows[0].id, updated_at: result.rows[0].updated_at } });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Graph operation failed.' });
  }
}
