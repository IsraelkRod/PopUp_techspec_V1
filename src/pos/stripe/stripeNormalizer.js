// Maps a Stripe charge into POP UP's canonical sale shape.
// Stripe amounts are integer cents; created is epoch seconds. Charges have no
// line items, so items is empty (Stripe is a processor, not a full POS).
export function normalizeStripeCharge(charge, vendorId) {
  return {
    idempotencyKey: `stripe:${charge.id}`,
    vendorId,
    currency: (charge.currency ?? 'usd').toUpperCase(),
    totalCents: Number.isInteger(charge.amount) ? charge.amount : 0,
    items: [],
    occurredAt: charge.created
      ? new Date(charge.created * 1000).toISOString()
      : null,
    source: 'stripe',
  };
}
