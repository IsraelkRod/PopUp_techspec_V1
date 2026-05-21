import crypto from 'node:crypto';
import { encrypt, decrypt } from '../../crypto/secretBox.js';
import { normalizeSquarePayment } from './squareNormalizer.js';

export class ConnectError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ConnectError';
    this.status = status;
  }
}

const STATE_TTL_MS = 10 * 60 * 1000;

export function createSquareConnectService({ connections, db, squareClient }) {
  // CSRF state -> vendor, single-use, short-lived.
  const stateStore = new Map();

  async function runBackfill(connection) {
    const accessToken = decrypt(connection.accessTokenEnc);
    const payments = await squareClient.listPayments({ accessToken });
    let created = 0;
    for (const payment of payments) {
      const sale = normalizeSquarePayment(payment, connection.vendorId);
      if (!(await db.findSaleByEventId(sale.idempotencyKey))) {
        await db.insertSale(sale);
        created += 1;
      }
    }
    return { fetched: payments.length, created };
  }

  return {
    // Step 1: vendor begins the OAuth flow; returns the URL to send them to.
    startConnect(actor) {
      if (actor.role !== 'vendor') {
        throw new ConnectError('Only vendors can connect a POS', 403);
      }
      const state = crypto.randomBytes(16).toString('hex');
      stateStore.set(state, { vendorId: actor.id, createdAt: Date.now() });
      return { authorizeUrl: squareClient.authorizeUrl(state) };
    },

    // Step 2: Square redirects back here with a code; exchange + store + backfill.
    async handleCallback({ code, state }) {
      if (!code || !state) {
        throw new ConnectError('Missing code or state');
      }
      const entry = stateStore.get(state);
      if (!entry || Date.now() - entry.createdAt > STATE_TTL_MS) {
        throw new ConnectError('Invalid or expired state', 400);
      }
      stateStore.delete(state); // single-use

      const tokens = await squareClient.exchangeCode(code);
      const connection = await connections.upsert({
        vendorId: entry.vendorId,
        provider: 'square',
        externalAccountId: tokens.merchant_id ?? null,
        accessTokenEnc: encrypt(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token
          ? encrypt(tokens.refresh_token)
          : null,
        scopes: tokens.scopes ?? [],
        expiresAt: tokens.expires_at ?? null,
        status: 'active',
      });

      const backfill = await runBackfill(connection);
      return {
        status: 'connected',
        merchantId: connection.externalAccountId,
        backfill,
      };
    },

    async getStatus(actor) {
      const conn = await connections.findByVendorAndProvider(actor.id, 'square');
      if (!conn) return { connected: false };
      return {
        connected: true,
        merchantId: conn.externalAccountId,
        status: conn.status,
      };
    },
  };
}
