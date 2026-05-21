import { config } from '../../config.js';

const SQUARE_VERSION = '2025-01-23';
const SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'ORDERS_READ',
  'ITEMS_READ',
];

const baseUrl = () =>
  config.square.environment === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

// Thin wrapper over the Square REST API. fetchImpl is injectable so tests can
// run without network access.
export function createSquareClient({ fetchImpl = fetch } = {}) {
  return {
    authorizeUrl(state) {
      const url = new URL(`${baseUrl()}/oauth2/authorize`);
      url.searchParams.set('client_id', config.square.applicationId);
      url.searchParams.set('scope', SCOPES.join(' '));
      url.searchParams.set('session', 'false');
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', config.square.redirectUrl);
      return url.toString();
    },

    async exchangeCode(code) {
      const res = await fetchImpl(`${baseUrl()}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Square-Version': SQUARE_VERSION,
        },
        body: JSON.stringify({
          client_id: config.square.applicationId,
          client_secret: config.square.applicationSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: config.square.redirectUrl,
        }),
      });
      if (!res.ok) {
        throw new Error(`Square token exchange failed (${res.status})`);
      }
      return res.json();
    },

    async listPayments({ accessToken }) {
      const res = await fetchImpl(`${baseUrl()}/v2/payments`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Square-Version': SQUARE_VERSION,
        },
      });
      if (!res.ok) {
        throw new Error(`Square payments fetch failed (${res.status})`);
      }
      const json = await res.json();
      return json.payments ?? [];
    },

    // Orders carry the line-item detail that payments lack. Up to 100 ids/call.
    async batchRetrieveOrders({ accessToken, orderIds }) {
      const res = await fetchImpl(`${baseUrl()}/v2/orders/batch-retrieve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': SQUARE_VERSION,
        },
        body: JSON.stringify({ order_ids: orderIds }),
      });
      if (!res.ok) {
        throw new Error(`Square orders fetch failed (${res.status})`);
      }
      const json = await res.json();
      return json.orders ?? [];
    },
  };
}
