import { config } from '../../config.js';

// Stripe Connect: OAuth via connect.stripe.com, data via api.stripe.com.
export function createStripeClient({ fetchImpl = fetch } = {}) {
  return {
    authorizeUrl(state) {
      const url = new URL('https://connect.stripe.com/oauth/authorize');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', config.stripe.clientId);
      url.searchParams.set('scope', 'read_only');
      url.searchParams.set('state', state);
      url.searchParams.set('redirect_uri', config.stripe.redirectUrl);
      return url.toString();
    },

    async exchangeCode(code) {
      const body = new URLSearchParams({
        client_secret: config.stripe.secretKey,
        code,
        grant_type: 'authorization_code',
      });
      const res = await fetchImpl('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        throw new Error(`Stripe token exchange failed (${res.status})`);
      }
      return res.json();
    },

    async listCharges({ accessToken }) {
      const res = await fetchImpl('https://api.stripe.com/v1/charges?limit=100', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Stripe charges fetch failed (${res.status})`);
      }
      const json = await res.json();
      return json.data ?? [];
    },
  };
}
