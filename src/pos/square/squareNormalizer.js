// Maps a Square payment object into POP UP's canonical sale shape.
// Square money amounts are already integer minor units (cents), so no float math.
export function normalizeSquarePayment(payment, vendorId) {
  const money = payment.amount_money ?? {};
  return {
    idempotencyKey: `square:${payment.id}`,
    vendorId,
    currency: money.currency ?? 'USD',
    totalCents: Number.isInteger(money.amount) ? money.amount : 0,
    items: [],
    occurredAt: payment.created_at ?? null,
    source: 'square',
  };
}
