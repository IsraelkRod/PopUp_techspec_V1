import request from 'supertest';
import { createApp } from '../src/app.js';

// Fake Square client — no network. authorizeUrl embeds the state so the test
// can read it back and simulate the OAuth redirect.
function fakeSquare() {
  return {
    authorizeUrl: (state) =>
      `https://connect.squareupsandbox.test/oauth2/authorize?state=${state}`,
    exchangeCode: async () => ({
      access_token: 'sandbox-access-token',
      refresh_token: 'sandbox-refresh-token',
      merchant_id: 'MERCHANT_123',
      expires_at: '2027-01-01T00:00:00Z',
    }),
    listPayments: async () => [
      { id: 'pay_1', amount_money: { amount: 1500, currency: 'USD' }, created_at: '2026-05-01T10:00:00Z' },
      { id: 'pay_2', amount_money: { amount: 800, currency: 'USD' }, created_at: '2026-05-01T11:00:00Z' },
    ],
  };
}

async function vendorToken(app, email = 'vendor@popup.com') {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role: 'vendor' });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}

const auth = (t) => ({ authorization: `Bearer ${t}` });
const stateFrom = (url) => new URL(url).searchParams.get('state');

describe('Square connect → backfill → feed', () => {
  test('connecting populates the vendor feed from backfilled payments', async () => {
    const app = createApp({ squareClient: fakeSquare() });
    const token = await vendorToken(app);

    // 1. Vendor starts the OAuth flow.
    const start = await request(app).get('/connect/square/url').set(auth(token));
    expect(start.status).toBe(200);
    const state = stateFrom(start.body.authorizeUrl);
    expect(state).toBeTruthy();

    // 2. Square redirects back; we exchange + store + backfill.
    const cb = await request(app)
      .get('/connect/square/callback')
      .query({ code: 'auth_code_abc', state });
    expect(cb.status).toBe(200);
    expect(cb.body.status).toBe('connected');
    expect(cb.body.merchantId).toBe('MERCHANT_123');
    expect(cb.body.backfill).toEqual({ fetched: 2, created: 2 });

    // 3. The feed is now populated.
    const feed = await request(app).get('/feed').set(auth(token));
    expect(feed.status).toBe(200);
    expect(feed.body.summary).toEqual({ count: 2, grossCents: 2300 });
    expect(feed.body.sales.every((s) => s.source === 'square')).toBe(true);

    // 4. Status reflects the connection.
    const status = await request(app).get('/connect/square/status').set(auth(token));
    expect(status.body).toMatchObject({ connected: true, merchantId: 'MERCHANT_123' });
  });

  test('a non-vendor cannot connect a POS (403)', async () => {
    const app = createApp({ squareClient: fakeSquare() });
    await request(app).post('/auth/signup').send({ email: 'host@popup.com', password: 'supersecret', role: 'host' });
    const login = await request(app).post('/auth/login').send({ email: 'host@popup.com', password: 'supersecret' });

    const res = await request(app).get('/connect/square/url').set(auth(login.body.token));
    expect(res.status).toBe(403);
  });

  test('callback with an invalid state is rejected (400)', async () => {
    const app = createApp({ squareClient: fakeSquare() });
    const res = await request(app)
      .get('/connect/square/callback')
      .query({ code: 'x', state: 'not-a-real-state' });
    expect(res.status).toBe(400);
  });
});
