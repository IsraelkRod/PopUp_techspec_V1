import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

const actorOf = (req) => ({ id: req.user.sub, role: req.user.role });

export function createProfileRouter({ profileService }) {
  const router = Router();

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      res.json({ profile: await profileService.get(actorOf(req)) });
    } catch (err) {
      next(err);
    }
  });

  router.put('/me', requireAuth, async (req, res, next) => {
    try {
      const profile = await profileService.upsert(actorOf(req), req.body ?? {});
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
