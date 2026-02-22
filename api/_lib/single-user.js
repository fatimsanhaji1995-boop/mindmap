/* eslint-env node */

const SINGLE_USER_EMAIL = process.env.SINGLE_USER_EMAIL || 'solo@mindmap.local';
const SINGLE_USER_PASSWORD_HASH = process.env.SINGLE_USER_PASSWORD_HASH || 'single-user-mode';

export async function getSingleUserId(db) {
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
