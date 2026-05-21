import crypto from 'node:crypto';
import { encrypt } from '../crypto/secretBox.js';

// Provider-agnostic POS connect orchestration. Each provider supplies an
// "adapter" with: authorizeUrl(state), exchangeCode(query) -> creds, and
// backfill({ accessToken, vendorId, externalAccountId }) -> canonical sales[].
// This service owns CSRF state, token encryption, connection storage, and
// idempotent ingestion — identical across Square/Clover/Stripe.

export class ConnectError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ConnectError';
    this.status = status;
  }
}

const STATE_TTL_MS = 10 * 60 * 1000;

export function createConnectService({ connections, db, adapters }) {
  const stateStore = new Map();

  function getAdapter(provider) {
    const adapter = adapters[provider];
    if (!adapter) {
      throw new ConnectError(`Unsupported provider: ${provider}`, 404);
    }
    return adapter;
  }

  async function ingest(sales) {
    let created = 0;
    for (const sale of sales) {
      if (!(await db.findSaleByEventId(sale.idempotencyKey))) {
        await db.insertSale(sale);
        created += 1;
      }
    }
    return created;
  }

  return {
    startConnect(actor, provider) {
      if (actor.role !== 'vendor') {
        throw new ConnectError('Only vendors can connect a POS', 403);
      }
      const adapter = getAdapter(provider);
      const state = crypto.randomBytes(16).toString('hex');
      stateStore.set(state, { vendorId: actor.id, provider, createdAt: Date.now() });
      return { authorizeUrl: adapter.authorizeUrl(state) };
    },

    async handleCallback(provider, query = {}) {
      const adapter = getAdapter(provider);
      const { code, state } = query;
      if (!code || !state) {
        throw new ConnectError('Missing code or state');
      }
      const entry = stateStore.get(state);
      if (
        !entry ||
        entry.provider !== provider ||
        Date.now() - entry.createdAt > STATE_TTL_MS
      ) {
        throw new ConnectError('Invalid or expired state', 400);
      }
      stateStore.delete(state); // single-use

      const creds = await adapter.exchangeCode(query);
      const connection = await connections.upsert({
        vendorId: entry.vendorId,
        provider,
        externalAccountId: creds.externalAccountId ?? null,
        accessTokenEnc: encrypt(creds.accessToken),
        refreshTokenEnc: creds.refreshToken ? encrypt(creds.refreshToken) : null,
        scopes: creds.scopes ?? [],
        expiresAt: creds.expiresAt ?? null,
        status: 'active',
      });

      const sales = await adapter.backfill({
        accessToken: creds.accessToken,
        vendorId: entry.vendorId,
        externalAccountId: creds.externalAccountId,
      });
      const created = await ingest(sales);

      return {
        status: 'connected',
        provider,
        account: connection.externalAccountId,
        backfill: { fetched: sales.length, created },
      };
    },

    async getStatus(actor, provider) {
      getAdapter(provider);
      const conn = await connections.findByVendorAndProvider(actor.id, provider);
      if (!conn) return { connected: false, provider };
      return {
        connected: true,
        provider,
        account: conn.externalAccountId,
        status: conn.status,
      };
    },
  };
}
