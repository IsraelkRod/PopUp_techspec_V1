import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

const actorOf = (req) => ({ id: req.user.sub, role: req.user.role });

export function createHostRouter({ marketService }) {
  const router = Router();

  router.get('/overview', requireAuth, async (req, res, next) => {
    try {
      res.json(await marketService.hostOverview(actorOf(req)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
