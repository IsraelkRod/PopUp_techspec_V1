import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

// The vendor feed: sales ingested for the logged-in vendor, with a quick summary.
export function createFeedRouter({ db }) {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const vendorId = req.user.sub;
      const sales = await db.listSalesByVendor(vendorId);
      const grossCents = sales.reduce((sum, s) => sum + s.totalCents, 0);
      res.json({
        summary: { count: sales.length, grossCents },
        sales,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
