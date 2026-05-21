import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

const actorOf = (req) => ({ id: req.user.sub, role: req.user.role });

// Generic POS connect routes: /connect/:provider/{url,callback,status}.
export function createConnectRouter({ connectService }) {
  const router = Router();

  router.get('/:provider/url', requireAuth, (req, res, next) => {
    try {
      res.json(connectService.startConnect(actorOf(req), req.params.provider));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:provider/callback', async (req, res, next) => {
    try {
      res.json(
        await connectService.handleCallback(req.params.provider, req.query)
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/:provider/status', requireAuth, async (req, res, next) => {
    try {
      res.json(await connectService.getStatus(actorOf(req), req.params.provider));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
