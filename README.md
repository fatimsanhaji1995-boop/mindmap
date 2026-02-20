# 3D Node Graph Visualization

A dynamic 3D node graph visualization built with React and Three.js.

## Cloud Sync + Login (New)

This project now includes a backend API layer for Vercel functions with PostgreSQL storage and cookie-based auth.

### API Endpoints

- `POST /api/auth/register` - create account with email + password.
- `POST /api/auth/login` - login with email + password.
- `POST /api/auth/logout` - clear auth session cookie.
- `GET /api/auth/me` - read current session user.
- `GET /api/graphs/:id` - load a graph for logged-in user.
- `POST /api/graphs/:id` - save/update a graph for logged-in user.

Each user has their own namespace for graph IDs (`id + user_id` composite key), so the same graph ID on different users remains isolated.

### Environment Variables

Add these in Vercel project settings (or local `.env`):

- `DATABASE_URL` - Postgres connection string (Vercel Postgres / Neon / Supabase).
- `JWT_SECRET` - long random secret for signing auth tokens.

### Database Setup

Run the schema in `db/schema.sql` against your Postgres database.

### Frontend usage

In **File Operations** panel:

1. Register or login with email + password.
2. Enter a `Cloud Graph ID` (for example `default-graph`).
3. Click **Save to Cloud** or **Load from Cloud**.

This replaces manual cross-device JSON transfer for the main graph workflow.

## Local Development

```bash
npm install
npm run dev -- --host
```

## JSON Shape

```json
{
  "nodes": [
    {
      "id": "NodeID",
      "color": "#FF6B6B",
      "textSize": 6,
      "group": 1,
      "x": 0,
      "y": 0,
      "z": 0
    }
  ],
  "links": [
    {
      "source": "SourceNodeID",
      "target": "TargetNodeID",
      "color": "#F0F0F0",
      "thickness": 1
    }
  ]
}
```
