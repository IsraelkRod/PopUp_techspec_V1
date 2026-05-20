import request from 'supertest';
import { createApp } from '../src/app.js';

async function registerAndLogin(app, { email, role }) {
  await request(app)
    .post('/auth/signup')
    .send({ email, password: 'supersecret', role });
  const login = await request(app)
    .post('/auth/login')
    .send({ email, password: 'supersecret' });
  return login.body.token;
}

const auth = (token) => ({ authorization: `Bearer ${token}` });

describe('markets API (Start Project flow + vendor funnel)', () => {
  test('host creates a market, adds an event, vendor applies, host approves', async () => {
    const app = createApp();
    const hostToken = await registerAndLogin(app, {
      email: 'host@popup.com',
      role: 'host',
    });
    const vendorToken = await registerAndLogin(app, {
      email: 'vendor@popup.com',
      role: 'vendor',
    });

    // Host creates a market.
    const created = await request(app)
      .post('/markets')
      .set(auth(hostToken))
      .send({ name: 'Riverside Night Market', location: 'Austin, TX' });
    expect(created.status).toBe(201);
    const marketId = created.body.market.id;
    expect(created.body.market.status).toBe('open');

    // Host adds an event date.
    const event = await request(app)
      .post(`/markets/${marketId}/events`)
      .set(auth(hostToken))
      .send({ startsAt: '2026-07-01T17:00:00Z', endsAt: '2026-07-01T22:00:00Z' });
    expect(event.status).toBe(201);

    // Market detail includes the event.
    const detail = await request(app)
      .get(`/markets/${marketId}`)
      .set(auth(vendorToken));
    expect(detail.status).toBe(200);
    expect(detail.body.market.events).toHaveLength(1);

    // Vendor applies.
    const application = await request(app)
      .post(`/markets/${marketId}/applications`)
      .set(auth(vendorToken))
      .send({ note: 'Artisan coffee cart' });
    expect(application.status).toBe(201);
    const appId = application.body.application.id;
    expect(application.body.application.status).toBe('pending');

    // Host approves.
    const decision = await request(app)
      .patch(`/markets/${marketId}/applications/${appId}`)
      .set(auth(hostToken))
      .send({ decision: 'approved' });
    expect(decision.status).toBe(200);
    expect(decision.body.application.status).toBe('approved');
  });

  test('a vendor cannot create a market (403)', async () => {
    const app = createApp();
    const vendorToken = await registerAndLogin(app, {
      email: 'v2@popup.com',
      role: 'vendor',
    });

    const res = await request(app)
      .post('/markets')
      .set(auth(vendorToken))
      .send({ name: 'Should Fail' });
    expect(res.status).toBe(403);
  });

  test('creating a market without a token is rejected (401)', async () => {
    const app = createApp();
    const res = await request(app).post('/markets').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });

  test('a host cannot manage another host\'s market (403)', async () => {
    const app = createApp();
    const hostA = await registerAndLogin(app, { email: 'a@popup.com', role: 'host' });
    const hostB = await registerAndLogin(app, { email: 'b@popup.com', role: 'host' });

    const created = await request(app)
      .post('/markets')
      .set(auth(hostA))
      .send({ name: "A's Market" });
    const marketId = created.body.market.id;

    const res = await request(app)
      .post(`/markets/${marketId}/events`)
      .set(auth(hostB))
      .send({ startsAt: '2026-07-01T17:00:00Z' });
    expect(res.status).toBe(403);
  });
});
