import { Router, raw } from 'express';
import { ingestPosSale } from '../tempFunction.js';
import { config } from '../config.js';

// POS webhook intake. Uses raw body parsing so the HMAC signature can be
// verified against the exact bytes the provider signed (see ingestPosSale).
export function createWebhookRouter({ db }) {
  const router = Router();

  router.post('/pos/:provider', raw({ type: '*/*' }), async (req, res, next) => {
    try {
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body.toString('utf8')
        : '';
      const result = await ingestPosSale(
        { rawBody, headers: req.headers },
        { db, secret: config.posWebhookSecret }
      );
      res.status(result.status === 'created' ? 201 : 200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
