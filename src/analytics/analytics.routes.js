import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

export function createAnalyticsRouter({ analyticsService }) {
  const router = Router();

  // KPIs for the logged-in vendor.
  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      res.json(await analyticsService.vendorKpis(req.user.sub));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
