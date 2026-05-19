import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// Gate for protected routes. Verifies a `Bearer <jwt>` and attaches the decoded
// payload (`{ sub, role }`) to req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
