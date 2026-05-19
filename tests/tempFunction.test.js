import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import { ingestPosSale, WebhookError } from '../src/tempFunction.js';
import { createInMemoryDb } from '../src/db.js';

const SECRET = 'whsec_test_popup_secret';
const FIXED_NOW = 1_700_000_000_000;

// Build a correctly-signed webhook request for the given payload object.
function signedRequest(payloadObj, { secret = SECRET, ts = FIXED_NOW } = {}) {
  const rawBody = JSON.stringify(payloadObj);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');
  return {
    rawBody,
    headers: { 'x-timestamp': String(ts), 'x-signature': signature },
  };
}

const validPayload = {
  eventId: 'evt_001',
  vendorId: 'vendor_42',
  currency: 'USD',
  items: [
    { unitPriceCents: 500, quantity: 2 }, // $10.00
    { unitPriceCents: 250, quantity: 1 }, // $2.50
  ],
};

describe('ingestPosSale — happy path (expected to PASS)', () => {
  test('a correctly-signed webhook is ingested and totaled in cents', async () => {
    const db = createInMemoryDb();
    const request = signedRequest(validPayload);

    const result = await ingestPosSale(request, {
      db,
      secret: SECRET,
      now: () => FIXED_NOW,
    });

    expect(result.status).toBe('created');
    expect(result.sale.totalCents).toBe(1250); // 2*500 + 250, no float drift
    expect(result.sale.vendorId).toBe('vendor_42');

    // Replaying the same event is idempotent (no duplicate sale).
    const replay = await ingestPosSale(request, {
      db,
      secret: SECRET,
      now: () => FIXED_NOW,
    });
    expect(replay.status).toBe('duplicate');
    expect(replay.sale.id).toBe(result.sale.id);
  });
});

describe('ingestPosSale — failure path (expected to FAIL/REJECT)', () => {
  // "Expected to fail" = the function must REJECT bad input. This test passes
  // precisely because the function refuses to ingest a tampered request.
  test('a tampered body (signature no longer matches) is rejected and never written', async () => {
    const db = createInMemoryDb();
    const insertSpy = jest.spyOn(db, 'insertSale');

    // Sign the legit payload, then tamper with the body after signing.
    const request = signedRequest(validPayload);
    const tampered = JSON.parse(request.rawBody);
    tampered.items[0].unitPriceCents = 1; // attacker lowers the price
    request.rawBody = JSON.stringify(tampered);

    await expect(
      ingestPosSale(request, { db, secret: SECRET, now: () => FIXED_NOW })
    ).rejects.toMatchObject({
      name: 'WebhookError',
      code: 'SIGNATURE_MISMATCH',
    });

    expect(insertSpy).not.toHaveBeenCalled();
  });
});
