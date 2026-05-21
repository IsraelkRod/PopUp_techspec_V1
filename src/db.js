// Minimal data-access boundary. The point of this module is that callers NEVER
// build SQL strings themselves — they call named methods that use parameterized
// queries underneath. The in-memory implementation here is a stand-in so the
// reference code and tests are runnable without a real database.

export function createInMemoryDb() {
  const salesByEventId = new Map();

  return {
    async findSaleByEventId(eventId) {
      return salesByEventId.get(eventId) ?? null;
    },

    async insertSale({
      idempotencyKey,
      vendorId,
      currency,
      totalCents,
      items = [],
      occurredAt = null,
      source = 'unknown',
    }) {
      const sale = {
        id: crypto.randomUUID(),
        idempotencyKey,
        vendorId,
        currency,
        totalCents,
        lineItems: items.length,
        occurredAt,
        source,
        createdAt: new Date().toISOString(),
      };
      salesByEventId.set(idempotencyKey, sale);
      return sale;
    },

    async listSalesByVendor(vendorId) {
      return [...salesByEventId.values()].filter((s) => s.vendorId === vendorId);
    },
  };
}

// Example of the real boundary (pseudocode), to show queries are parameterized:
//   await pool.query(
//     'INSERT INTO sales (vendor_id, total_cents, currency, idempotency_key) VALUES ($1,$2,$3,$4)',
//     [vendorId, totalCents, currency, idempotencyKey]
//   );
