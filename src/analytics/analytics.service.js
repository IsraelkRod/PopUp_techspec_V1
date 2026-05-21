// Descriptive analytics over a vendor's ingested sales. All money stays in
// integer cents.
export function createAnalyticsService({ db }) {
  return {
    async vendorKpis(vendorId) {
      const sales = await db.listSalesByVendor(vendorId);
      const transactions = sales.length;
      const grossCents = sales.reduce((sum, s) => sum + s.totalCents, 0);
      const avgTicketCents = transactions
        ? Math.round(grossCents / transactions)
        : 0;

      const products = new Map();
      for (const sale of sales) {
        for (const item of sale.items ?? []) {
          const key = item.productName;
          const cur = products.get(key) ?? {
            productName: key,
            unitsSold: 0,
            grossCents: 0,
          };
          cur.unitsSold += item.quantity ?? 0;
          cur.grossCents += item.totalCents ?? 0;
          products.set(key, cur);
        }
      }
      const topProducts = [...products.values()]
        .sort((a, b) => b.grossCents - a.grossCents)
        .slice(0, 10);

      const grossBySourceCents = {};
      for (const s of sales) {
        grossBySourceCents[s.source] =
          (grossBySourceCents[s.source] ?? 0) + s.totalCents;
      }

      return {
        transactions,
        grossCents,
        avgTicketCents,
        topProducts,
        grossBySourceCents,
      };
    },
  };
}
