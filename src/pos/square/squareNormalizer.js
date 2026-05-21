// Maps Square data into POP UP's canonical sale shape.
// Square money amounts are already integer minor units (cents), so no float math.
// A Square `payment` carries the total; the linked `order` carries line items.

function normalizeLineItems(order) {
  return (order.line_items ?? []).map((li) => ({
    productName: li.name ?? li.variation_name ?? 'Unknown item',
    quantity: Number.parseInt(li.quantity ?? '1', 10) || 1,
    unitPriceCents: li.base_price_money?.amount ?? 0,
    totalCents: li.total_money?.amount ?? 0,
  }));
}

export function normalizeSquarePayment(payment, vendorId, order = null) {
  const money = payment.amount_money ?? {};
  return {
    idempotencyKey: `square:${payment.id}`,
    vendorId,
    currency: money.currency ?? 'USD',
    totalCents: Number.isInteger(money.amount) ? money.amount : 0,
    items: order ? normalizeLineItems(order) : [],
    occurredAt: payment.created_at ?? null,
    source: 'square',
  };
}
