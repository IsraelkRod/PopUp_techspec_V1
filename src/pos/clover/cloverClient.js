import { config } from '../../config.js';

// Clover splits OAuth (sandbox.dev.clover.com) from the API (apisandbox.dev.clover.com).
const oauthBase = () =>
  config.clover.environment === 'production'
    ? 'https://www.clover.com'
    : 'https://sandbox.dev.clover.com';

const apiBase = () =>
  config.clover.environment === 'production'
    ? 'https://api.clover.com'
    : 'https://apisandbox.dev.clover.com';

export function createCloverClient({ fetchImpl = fetch } = {}) {
  return {
    authorizeUrl(state) {
      const url = new URL(`${oauthBase()}/oauth/authorize`);
      url.searchParams.set('client_id', config.clover.appId);
      url.searchParams.set('redirect_uri', config.clover.redirectUrl);
      url.searchParams.set('state', state);
      return url.toString();
    },

    async exchangeCode(code) {
      const url = new URL(`${oauthBase()}/oauth/token`);
      url.searchParams.set('client_id', config.clover.appId);
      url.searchParams.set('client_secret', config.clover.appSecret);
      url.searchParams.set('code', code);
      const res = await fetchImpl(url.toString());
      if (!res.ok) {
        throw new Error(`Clover token exchange failed (${res.status})`);
      }
      return res.json();
    },

    async listOrders({ accessToken, merchantId }) {
      const url = new URL(`${apiBase()}/v3/merchants/${merchantId}/orders`);
      url.searchParams.set('expand', 'lineItems');
      const res = await fetchImpl(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Clover orders fetch failed (${res.status})`);
      }
      const json = await res.json();
      return json.elements ?? [];
    },
  };
}
