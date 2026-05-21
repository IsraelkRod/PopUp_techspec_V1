import { normalizeCloverOrder } from './cloverNormalizer.js';

export function createCloverAdapter({ cloverClient }) {
  return {
    authorizeUrl: (state) => cloverClient.authorizeUrl(state),

    // Clover passes merchant_id back on the redirect (not in the token response).
    async exchangeCode(query) {
      const t = await cloverClient.exchangeCode(query.code);
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? null,
        externalAccountId: query.merchant_id ?? null,
        expiresAt: t.access_token_expiration ?? null,
        scopes: [],
      };
    },

    async backfill({ accessToken, vendorId, externalAccountId }) {
      if (!externalAccountId) return [];
      const orders = await cloverClient.listOrders({
        accessToken,
        merchantId: externalAccountId,
      });
      return orders.map((o) => normalizeCloverOrder(o, vendorId));
    },
  };
}
