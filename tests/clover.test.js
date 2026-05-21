import request from 'supertest';
import { createApp } from '../src/app.js';

function fakeClover() {
  return {
    authorizeUrl: (state) =>
      `https://sandbox.dev.clover.test/oauth/authorize?state=${state}`,
    exchangeCode: async () => ({ access_token: 'clover-access-token' }),
    listOrders: async () => [
      {
        id: 'ord_c1',
        total: 1200,
        currency: 'USD',
        createdTime: 1748000000000,
        lineItems: {
          elements: [
            { name: 'Taco', price: 400 },
            { name: 'Horchata', price: 800 },
          ],
        },
      },
    ],
  };
}

async function vendorToken(app, email = 'cv@popup.com') {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role: 'vendor' });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}

const auth = (t) => ({ authorization: `Bearer ${t}` });
const stateFrom = (url) => new URL(url).searchParams.get('state');

describe('Clover connect → backfill → feed', () => {
  test('connecting with a merchant_id populates the feed', async () => {
    const app = createApp({ cloverClient: fakeClover() });
    const token = await vendorToken(app);

    const start = await request(app).get('/connect/clover/url').set(auth(token));
    const state = stateFrom(start.body.authorizeUrl);

    // Clover returns merchant_id on the redirect.
    const cb = await request(app)
      .get('/connect/clover/callback')
      .query({ code: 'code_abc', state, merchant_id: 'MERCHANT_C' });
    expect(cb.status).toBe(200);
    expect(cb.body).toMatchObject({ status: 'connected', provider: 'clover', account: 'MERCHANT_C' });
    expect(cb.body.backfill).toEqual({ fetched: 1, created: 1 });

    const feed = await request(app).get('/feed').set(auth(token));
    expect(feed.body.summary).toEqual({ count: 1, grossCents: 1200 });
    expect(feed.body.sales[0].source).toBe('clover');
    expect(feed.body.sales[0].items).toEqual([
      { productName: 'Taco', quantity: 1, unitPriceCents: 400, totalCents: 400 },
      { productName: 'Horchata', quantity: 1, unitPriceCents: 800, totalCents: 800 },
    ]);
  });
});
