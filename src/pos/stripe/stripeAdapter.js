import { normalizeStripeCharge } from './stripeNormalizer.js';

export function createStripeAdapter({ stripeClient }) {
  return {
    authorizeUrl: (state) => stripeClient.authorizeUrl(state),

    async exchangeCode(query) {
      const t = await stripeClient.exchangeCode(query.code);
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? null,
        externalAccountId: t.stripe_user_id ?? null,
        expiresAt: null,
        scopes: t.scope ? [t.scope] : [],
      };
    },

    async backfill({ accessToken, vendorId }) {
      const charges = await stripeClient.listCharges({ accessToken });
      return charges.map((c) => normalizeStripeCharge(c, vendorId));
    },
  };
}
