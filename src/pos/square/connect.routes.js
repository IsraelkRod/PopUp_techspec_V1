import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware.js';

const actorOf = (req) => ({ id: req.user.sub, role: req.user.role });

export function createSquareConnectRouter({ squareConnectService }) {
  const router = Router();

  // Vendor: get the Square authorize URL to redirect the browser to.
  router.get('/square/url', requireAuth, (req, res, next) => {
    try {
      res.json(squareConnectService.startConnect(actorOf(req)));
    } catch (err) {
      next(err);
    }
  });

  // Square redirects here after the vendor authorizes (no JWT; trust is the state).
  router.get('/square/callback', async (req, res, next) => {
    try {
      const result = await squareConnectService.handleCallback({
        code: req.query.code,
        state: req.query.state,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Vendor: is my Square account connected?
  router.get('/square/status', requireAuth, async (req, res, next) => {
    try {
      res.json(await squareConnectService.getStatus(actorOf(req)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
