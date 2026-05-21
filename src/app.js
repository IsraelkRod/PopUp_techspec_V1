import express from 'express';
import {
  createUserRepo,
  createMarketRepo,
  createApplicationRepo,
  createConnectionRepo,
} from './repositories/memory.js';
import { createInMemoryDb } from './db.js';
import { createAuthService } from './auth/auth.service.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { createMarketService } from './markets/market.service.js';
import { createMarketRouter } from './markets/market.routes.js';
import { createWebhookRouter } from './pos/webhook.routes.js';
import { createSquareClient } from './pos/square/squareClient.js';
import { createSquareConnectService } from './pos/square/connect.service.js';
import { createSquareConnectRouter } from './pos/square/connect.routes.js';
import { createFeedRouter } from './feed/feed.routes.js';
import { errorHandler } from './middleware/error.js';

// App factory. Dependencies are injected so tests can pass in fresh stores.
export function createApp(deps = {}) {
  const users = deps.users ?? createUserRepo();
  const db = deps.db ?? createInMemoryDb();
  const markets = deps.markets ?? createMarketRepo();
  const applications = deps.applications ?? createApplicationRepo();
  const connections = deps.connections ?? createConnectionRepo();
  const squareClient = deps.squareClient ?? createSquareClient();
  const authService = createAuthService({ users });
  const marketService = createMarketService({ markets, applications });
  const squareConnectService = createSquareConnectService({
    connections,
    db,
    squareClient,
  });

  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'popup-api' });
  });

  // Webhooks mount BEFORE express.json() so the raw body survives for signature
  // verification.
  app.use('/webhooks', createWebhookRouter({ db }));

  app.use(express.json());
  app.use('/auth', createAuthRouter({ authService }));
  app.use('/markets', createMarketRouter({ marketService }));
  app.use('/connect', createSquareConnectRouter({ squareConnectService }));
  app.use('/feed', createFeedRouter({ db }));

  app.use(errorHandler);
  return app;
}
