import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

export function createNotificationRouter({ notifications }) {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const list = await notifications.listByUser(req.user.sub);
      res.json({
        unread: list.filter((n) => !n.read).length,
        notifications: list,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/read', requireAuth, async (req, res, next) => {
    try {
      const updated = await notifications.markRead(req.params.id, req.user.sub);
      if (!updated) return res.status(404).json({ error: 'Notification not found' });
      res.json({ notification: updated });
    } catch (err) {
      next(err);
    }
  });

  router.post('/read-all', requireAuth, async (req, res, next) => {
    try {
      res.json({ updated: await notifications.markAllRead(req.user.sub) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
