import express from 'express';
import {
  createUserRepo,
  createMarketRepo,
  createApplicationRepo,
  createConnectionRepo,
  createProfileRepo,
  createNotificationRepo,
} from './repositories/memory.js';
import { createInMemoryDb } from './db.js';
import { createAuthService } from './auth/auth.service.js';
import { createAuthRouter } from './auth/auth.routes.js';
import { createProfileService } from './profiles/profile.service.js';
import { createProfileRouter } from './profiles/profile.routes.js';
import { createMarketService } from './markets/market.service.js';
import { createMarketRouter } from './markets/market.routes.js';
import { createHostRouter } from './host/host.routes.js';
import { createNotificationRouter } from './notifications/notification.routes.js';
import { createWebhookRouter } from './pos/webhook.routes.js';
import { createSquareClient } from './pos/square/squareClient.js';
import { createSquareAdapter } from './pos/square/squareAdapter.js';
import { createCloverClient } from './pos/clover/cloverClient.js';
import { createCloverAdapter } from './pos/clover/cloverAdapter.js';
import { createStripeClient } from './pos/stripe/stripeClient.js';
import { createStripeAdapter } from './pos/stripe/stripeAdapter.js';
import { createConnectService } from './pos/connect.service.js';
import { createConnectRouter } from './pos/connect.routes.js';
import { createFeedRouter } from './feed/feed.routes.js';
import { createAnalyticsService } from './analytics/analytics.service.js';
import { createAnalyticsRouter } from './analytics/analytics.routes.js';
import { errorHandler } from './middleware/error.js';

// App factory. Dependencies are injected so tests can pass in fresh stores.
export function createApp(deps = {}) {
  const users = deps.users ?? createUserRepo();
  const db = deps.db ?? createInMemoryDb();
  const markets = deps.markets ?? createMarketRepo();
  const applications = deps.applications ?? createApplicationRepo();
  const connections = deps.connections ?? createConnectionRepo();
  const profiles = deps.profiles ?? createProfileRepo();
  const notifications = deps.notifications ?? createNotificationRepo();

  const squareClient = deps.squareClient ?? createSquareClient();
  const cloverClient = deps.cloverClient ?? createCloverClient();
  const stripeClient = deps.stripeClient ?? createStripeClient();
  const adapters = {
    square: createSquareAdapter({ squareClient }),
    clover: createCloverAdapter({ cloverClient }),
    stripe: createStripeAdapter({ stripeClient }),
  };

  const authService = createAuthService({ users });
  const profileService = createProfileService({ profiles });
  const marketService = createMarketService({
    markets,
    applications,
    notifications,
  });
  const connectService = createConnectService({ connections, db, adapters });
  const analyticsService = createAnalyticsService({ db });

  const app = express();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'popup-api' });
  });

  // Webhooks mount BEFORE express.json() so the raw body survives for signature
  // verification.
  app.use('/webhooks', createWebhookRouter({ db }));

  app.use(express.json());
  app.use('/auth', createAuthRouter({ authService }));
  app.use('/profile', createProfileRouter({ profileService }));
  app.use('/markets', createMarketRouter({ marketService }));
  app.use('/host', createHostRouter({ marketService }));
  app.use('/connect', createConnectRouter({ connectService }));
  app.use('/feed', createFeedRouter({ db }));
  app.use('/analytics', createAnalyticsRouter({ analyticsService }));
  app.use('/notifications', createNotificationRouter({ notifications }));

  app.use(errorHandler);
  return app;
}
