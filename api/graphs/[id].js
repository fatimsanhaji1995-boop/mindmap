/* eslint-env node */
import { getDb } from '../_lib/db.js';
import { getUserFromRequest } from '../_lib/auth.js';

function normalizeGraph(payload) {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const links = Array.isArray(payload?.links) ? payload.links : [];

  return {
    nodes: nodes.map(({ id, color, textSize, group, x, y, z }) => ({ id, color, textSize, group, x, y, z })),
    links: links.map(({ source, target, color, thickness }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
    })),
  };
}

export default async function handler(req, res) {
  const user = getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const graphId = req.query.id;
  if (!graphId) {
    res.status(400).json({ error: 'Graph id is required.' });
    return;
  }

  try {
    const db = getDb();

    if (req.method === 'GET') {
      const result = await db.query(
        'SELECT id, data, updated_at FROM graphs WHERE id = $1 AND user_id = $2',
        [graphId, user.userId],
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
        [graphId, user.userId, JSON.stringify(data)],
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
