import request from 'supertest';
import { createApp } from '../src/app.js';

async function token(app, email, role) {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}
const auth = (t) => ({ authorization: `Bearer ${t}` });

describe('notifications on the vendor funnel', () => {
  test('host is notified of an application; vendor is notified of the decision', async () => {
    const app = createApp();
    const hostT = await token(app, 'host@popup.com', 'host');
    const vendorT = await token(app, 'vendor@popup.com', 'vendor');

    const market = await request(app)
      .post('/markets')
      .set(auth(hostT))
      .send({ name: 'Night Market' });
    const marketId = market.body.market.id;

    const application = await request(app)
      .post(`/markets/${marketId}/applications`)
      .set(auth(vendorT))
      .send({ note: 'Tacos' });
    const appId = application.body.application.id;

    // Host has an "application.received" notification.
    const hostNotifs = await request(app).get('/notifications').set(auth(hostT));
    expect(hostNotifs.body.unread).toBe(1);
    expect(hostNotifs.body.notifications[0].type).toBe('application.received');

    // Host approves -> vendor gets an "application.decision" notification.
    await request(app)
      .patch(`/markets/${marketId}/applications/${appId}`)
      .set(auth(hostT))
      .send({ decision: 'approved' });

    const vendorNotifs = await request(app).get('/notifications').set(auth(vendorT));
    expect(vendorNotifs.body.unread).toBe(1);
    expect(vendorNotifs.body.notifications[0]).toMatchObject({
      type: 'application.decision',
    });
    expect(vendorNotifs.body.notifications[0].message).toContain('approved');

    // Mark all read.
    const readAll = await request(app).post('/notifications/read-all').set(auth(vendorT));
    expect(readAll.body.updated).toBe(1);
    const after = await request(app).get('/notifications').set(auth(vendorT));
    expect(after.body.unread).toBe(0);
  });
});
