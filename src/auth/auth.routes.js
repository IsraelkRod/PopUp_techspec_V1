import { Router } from 'express';
import { requireAuth } from './auth.middleware.js';

export function createAuthRouter({ authService }) {
  const router = Router();

  router.post('/signup', async (req, res, next) => {
    try {
      const user = await authService.signup(req.body ?? {});
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const result = await authService.login(req.body ?? {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Example protected route: who am I?
  router.get('/me', requireAuth, (req, res) => {
    res.json({ id: req.user.sub, role: req.user.role });
  });

  return router;
}
