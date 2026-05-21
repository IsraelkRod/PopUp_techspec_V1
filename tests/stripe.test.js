import request from 'supertest';
import { createApp } from '../src/app.js';

function fakeStripe() {
  return {
    authorizeUrl: (state) =>
      `https://connect.stripe.test/oauth/authorize?state=${state}`,
    exchangeCode: async () => ({
      access_token: 'stripe-access-token',
      stripe_user_id: 'acct_123',
      scope: 'read_only',
    }),
    listCharges: async () => [
      { id: 'ch_1', amount: 2000, currency: 'usd', created: 1748000000 },
      { id: 'ch_2', amount: 500, currency: 'usd', created: 1748000100 },
    ],
  };
}

async function vendorToken(app, email = 'sv@popup.com') {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role: 'vendor' });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}

const auth = (t) => ({ authorization: `Bearer ${t}` });
const stateFrom = (url) => new URL(url).searchParams.get('state');

describe('Stripe connect → backfill → feed', () => {
  test('connecting populates the feed from charges (payment-level, no line items)', async () => {
    const app = createApp({ stripeClient: fakeStripe() });
    const token = await vendorToken(app);

    const start = await request(app).get('/connect/stripe/url').set(auth(token));
    const state = stateFrom(start.body.authorizeUrl);

    const cb = await request(app)
      .get('/connect/stripe/callback')
      .query({ code: 'code_abc', state });
    expect(cb.status).toBe(200);
    expect(cb.body).toMatchObject({ status: 'connected', provider: 'stripe', account: 'acct_123' });
    expect(cb.body.backfill).toEqual({ fetched: 2, created: 2 });

    const feed = await request(app).get('/feed').set(auth(token));
    expect(feed.body.summary).toEqual({ count: 2, grossCents: 2500 });
    expect(feed.body.sales.every((s) => s.source === 'stripe')).toBe(true);
    expect(feed.body.sales[0].currency).toBe('USD');
  });
});
