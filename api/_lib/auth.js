/* eslint-env node */
import jwt from 'jsonwebtoken';

const AUTH_COOKIE = 'mindmap_auth';

const JWT_SECRET = process.env.JWT_SECRET || 'default-fallback-secret-key-12345';

export function createAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function getUserFromRequest(req) {
  const cookieHeader = req.headers.cookie || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE}=`))
    ?.split('=')[1];

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${isProd ? '; Secure' : ''}`);
}

export function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}
