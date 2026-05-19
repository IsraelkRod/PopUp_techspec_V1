import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const ROLES = new Set(['vendor', 'host']);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
});

export function createAuthService({ users }) {
  return {
    async signup({ email, password, role } = {}) {
      if (!EMAIL_RE.test(email ?? '')) {
        throw new AuthError('A valid email is required');
      }
      if (!password || password.length < 8) {
        throw new AuthError('Password must be at least 8 characters');
      }
      if (!ROLES.has(role)) {
        throw new AuthError('Role must be "vendor" or "host"');
      }
      if (await users.findByEmail(email)) {
        throw new AuthError('Email already registered', 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await users.create({ email, passwordHash, role });
      return publicUser(user);
    },

    async login({ email, password } = {}) {
      const user = await users.findByEmail(email ?? '');
      // Compare regardless of user existence to avoid leaking which emails exist.
      const ok = user
        ? await bcrypt.compare(password ?? '', user.passwordHash)
        : false;
      if (!user || !ok) {
        throw new AuthError('Invalid credentials', 401);
      }

      const token = jwt.sign(
        { sub: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      return { token, user: publicUser(user) };
    },
  };
}
