import { normalizeSquarePayment } from './squareNormalizer.js';

export function createSquareAdapter({ squareClient }) {
  return {
    authorizeUrl: (state) => squareClient.authorizeUrl(state),

    async exchangeCode(query) {
      const t = await squareClient.exchangeCode(query.code);
      return {
        accessToken: t.access_token,
        refreshToken: t.refresh_token ?? null,
        externalAccountId: t.merchant_id ?? null,
        expiresAt: t.expires_at ?? null,
        scopes: t.scopes ?? [],
      };
    },

    async backfill({ accessToken, vendorId }) {
      const payments = await squareClient.listPayments({ accessToken });
      const orderIds = [
        ...new Set(payments.map((p) => p.order_id).filter(Boolean)),
      ];
      const orders = orderIds.length
        ? await squareClient.batchRetrieveOrders({ accessToken, orderIds })
        : [];
      const ordersById = new Map(orders.map((o) => [o.id, o]));
      return payments.map((p) =>
        normalizeSquarePayment(
          p,
          vendorId,
          p.order_id ? ordersById.get(p.order_id) ?? null : null
        )
      );
    },
  };
}
