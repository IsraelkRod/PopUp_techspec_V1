import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createInMemoryDb } from '../src/db.js';
import { config } from '../src/config.js';

const sign = (rawBody, ts) =>
  crypto
    .createHmac('sha256', config.posWebhookSecret)
    .update(`${ts}.${rawBody}`)
    .digest('hex');

describe('POS webhook API', () => {
  test('a correctly-signed webhook is ingested (201)', async () => {
    const db = createInMemoryDb();
    const app = createApp({ db });
    const ts = Date.now();
    const payload = JSON.stringify({
      eventId: 'evt_w1',
      vendorId: 'vendor_1',
      items: [{ unitPriceCents: 1000, quantity: 1 }],
    });

    const res = await request(app)
      .post('/webhooks/pos/stripe')
      .set('content-type', 'application/json')
      .set('x-timestamp', String(ts))
      .set('x-signature', sign(payload, ts))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('created');
    expect(res.body.sale.totalCents).toBe(1000);
  });

  test('a bad signature is rejected (401)', async () => {
    const app = createApp();
    const ts = Date.now();
    const payload = JSON.stringify({
      eventId: 'evt_w2',
      vendorId: 'vendor_1',
      items: [{ unitPriceCents: 1000, quantity: 1 }],
    });

    const res = await request(app)
      .post('/webhooks/pos/stripe')
      .set('content-type', 'application/json')
      .set('x-timestamp', String(ts))
      .set('x-signature', 'deadbeef')
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('SIGNATURE_MISMATCH');
  });
});
