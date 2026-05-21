import request from 'supertest';
import { createApp } from '../src/app.js';

async function token(app, email, role) {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}
const auth = (t) => ({ authorization: `Bearer ${t}` });

describe('host overview', () => {
  test('summarizes a host\'s markets with event and application counts', async () => {
    const app = createApp();
    const hostT = await token(app, 'host@popup.com', 'host');
    const vendorT = await token(app, 'vendor@popup.com', 'vendor');

    const m = await request(app).post('/markets').set(auth(hostT)).send({ name: 'Market A' });
    const marketId = m.body.market.id;
    await request(app)
      .post(`/markets/${marketId}/events`)
      .set(auth(hostT))
      .send({ startsAt: '2026-07-01T17:00:00Z' });
    await request(app)
      .post(`/markets/${marketId}/applications`)
      .set(auth(vendorT))
      .send({ note: 'Coffee' });

    const overview = await request(app).get('/host/overview').set(auth(hostT));
    expect(overview.status).toBe(200);
    expect(overview.body.totals.markets).toBe(1);
    expect(overview.body.markets[0]).toMatchObject({
      name: 'Market A',
      eventCount: 1,
      applicationCounts: { pending: 1, approved: 0, rejected: 0 },
    });
  });

  test('a vendor cannot access the host overview (403)', async () => {
    const app = createApp();
    const vendorT = await token(app, 'v2@popup.com', 'vendor');
    const res = await request(app).get('/host/overview').set(auth(vendorT));
    expect(res.status).toBe(403);
  });
});
