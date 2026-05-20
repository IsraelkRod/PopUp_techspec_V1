import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

const actorOf = (req) => ({ id: req.user.sub, role: req.user.role });

export function createMarketRouter({ marketService }) {
  const router = Router();
  router.use(requireAuth);

  // Host: start a project (create a market).
  router.post('/', async (req, res, next) => {
    try {
      const market = await marketService.createMarket(actorOf(req), req.body ?? {});
      res.status(201).json({ market });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (_req, res, next) => {
    try {
      res.json({ markets: await marketService.listMarkets() });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      res.json({ market: await marketService.getMarket(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  // Host: add an event date to their market.
  router.post('/:id/events', async (req, res, next) => {
    try {
      const event = await marketService.addEvent(
        actorOf(req),
        req.params.id,
        req.body ?? {}
      );
      res.status(201).json({ event });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id/events', async (req, res, next) => {
    try {
      res.json({ events: await marketService.listEvents(req.params.id) });
    } catch (err) {
      next(err);
    }
  });

  // Vendor: apply to a market.
  router.post('/:id/applications', async (req, res, next) => {
    try {
      const application = await marketService.apply(
        actorOf(req),
        req.params.id,
        req.body ?? {}
      );
      res.status(201).json({ application });
    } catch (err) {
      next(err);
    }
  });

  // Host: list applications to their market.
  router.get('/:id/applications', async (req, res, next) => {
    try {
      const applications = await marketService.listApplications(
        actorOf(req),
        req.params.id
      );
      res.json({ applications });
    } catch (err) {
      next(err);
    }
  });

  // Host: approve/reject an application.
  router.patch('/:id/applications/:appId', async (req, res, next) => {
    try {
      const application = await marketService.decide(
        actorOf(req),
        req.params.id,
        req.params.appId,
        (req.body ?? {}).decision
      );
      res.json({ application });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
