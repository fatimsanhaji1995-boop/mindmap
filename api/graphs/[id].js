/* eslint-env node */
import { getDb } from '../_lib/db.js';
import { getSingleUserId } from '../_lib/single-user.js';

function normalizeOgSnapshot(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const links = Array.isArray(payload.links) ? payload.links : [];

  return {
    nodes: nodes.map(({ id, x, y, z }) => ({ id, x, y, z })),
    links: links.map(({ source, target, color, thickness }) => ({
      source: typeof source === 'object' ? source.id : source,
      target: typeof target === 'object' ? target.id : target,
      color,
      thickness,
    })),
    updatedAt: payload.updatedAt || new Date().toISOString(),
  };
}


function normalizeCameraBookmarks(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((bookmark, index) => ({
    name: bookmark?.name || `view-${index + 1}`,
    position: {
      x: bookmark?.position?.x ?? 0,
      y: bookmark?.position?.y ?? 0,
      z: bookmark?.position?.z ?? 400,
    },
    lookAt: {
      x: bookmark?.lookAt?.x ?? 0,
      y: bookmark?.lookAt?.y ?? 0,
      z: bookmark?.lookAt?.z ?? 0,
    },
    up: {
      x: bookmark?.up?.x ?? 0,
      y: bookmark?.up?.y ?? 1,
      z: bookmark?.up?.z ?? 0,
    },
    zoom: bookmark?.zoom ?? 1,
    isOrthographic: Boolean(bookmark?.isOrthographic),
  }));
}

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
