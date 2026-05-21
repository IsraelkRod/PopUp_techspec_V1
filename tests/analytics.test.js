import request from 'supertest';
import { createApp } from '../src/app.js';

function fakeSquare() {
  return {
    authorizeUrl: (state) => `https://sq.test/authorize?state=${state}`,
    exchangeCode: async () => ({ access_token: 'a', merchant_id: 'M1' }),
    listPayments: async () => [
      { id: 'p1', order_id: 'o1', amount_money: { amount: 1000, currency: 'USD' }, created_at: '2026-05-01T10:00:00Z' },
      { id: 'p2', order_id: 'o2', amount_money: { amount: 3000, currency: 'USD' }, created_at: '2026-05-01T11:00:00Z' },
    ],
    batchRetrieveOrders: async ({ orderIds }) =>
      [
        { id: 'o1', line_items: [{ name: 'Latte', quantity: '2', base_price_money: { amount: 500 }, total_money: { amount: 1000 } }] },
        { id: 'o2', line_items: [{ name: 'Latte', quantity: '4', base_price_money: { amount: 500 }, total_money: { amount: 2000 } }, { name: 'Cake', quantity: '1', base_price_money: { amount: 1000 }, total_money: { amount: 1000 } }] },
      ].filter((o) => orderIds.includes(o.id)),
  };
}

const auth = (t) => ({ authorization: `Bearer ${t}` });
const stateFrom = (url) => new URL(url).searchParams.get('state');

describe('analytics KPIs', () => {
  test('vendor KPIs aggregate gross, avg ticket, and top products', async () => {
    const app = createApp({ squareClient: fakeSquare() });
    await request(app).post('/auth/signup').send({ email: 'a@popup.com', password: 'supersecret', role: 'vendor' });
    const login = await request(app).post('/auth/login').send({ email: 'a@popup.com', password: 'supersecret' });
    const token = login.body.token;

    const start = await request(app).get('/connect/square/url').set(auth(token));
    const state = stateFrom(start.body.authorizeUrl);
    await request(app).get('/connect/square/callback').query({ code: 'c', state });

    const res = await request(app).get('/analytics/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.transactions).toBe(2);
    expect(res.body.grossCents).toBe(4000);
    expect(res.body.avgTicketCents).toBe(2000);
    // Latte sold 6 units for 3000c across both orders -> top product.
    expect(res.body.topProducts[0]).toEqual({ productName: 'Latte', unitsSold: 6, grossCents: 3000 });
    expect(res.body.grossBySourceCents).toEqual({ square: 4000 });
  });
});
