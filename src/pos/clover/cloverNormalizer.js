// Maps a Clover order into POP UP's canonical sale shape.
// Clover amounts are integer cents; createdTime is epoch milliseconds.
export function normalizeCloverOrder(order, vendorId) {
  const lineItems = order.lineItems?.elements ?? [];
  return {
    idempotencyKey: `clover:${order.id}`,
    vendorId,
    currency: order.currency ?? 'USD',
    totalCents: Number.isInteger(order.total) ? order.total : 0,
    items: lineItems.map((li) => ({
      productName: li.name ?? 'Unknown item',
      quantity: 1,
      unitPriceCents: li.price ?? 0,
      totalCents: li.price ?? 0,
    })),
    occurredAt: order.createdTime
      ? new Date(order.createdTime).toISOString()
      : null,
    source: 'clover',
  };
}
