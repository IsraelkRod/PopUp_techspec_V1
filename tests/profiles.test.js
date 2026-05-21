import request from 'supertest';
import { createApp } from '../src/app.js';

async function token(app, email, role) {
  await request(app).post('/auth/signup').send({ email, password: 'supersecret', role });
  const login = await request(app).post('/auth/login').send({ email, password: 'supersecret' });
  return login.body.token;
}
const auth = (t) => ({ authorization: `Bearer ${t}` });

describe('profiles API', () => {
  test('vendor builds a business profile', async () => {
    const app = createApp();
    const t = await token(app, 'v@popup.com', 'vendor');

    const put = await request(app)
      .put('/profile/me')
      .set(auth(t))
      .send({ businessName: 'Bean Cart', category: 'Coffee', bio: 'Mobile espresso' });
    expect(put.status).toBe(200);
    expect(put.body.profile).toMatchObject({
      role: 'vendor',
      businessName: 'Bean Cart',
      category: 'Coffee',
    });

    const get = await request(app).get('/profile/me').set(auth(t));
    expect(get.body.profile.businessName).toBe('Bean Cart');
  });

  test('host builds an org profile; vendor-only fields are ignored', async () => {
    const app = createApp();
    const t = await token(app, 'h@popup.com', 'host');

    const put = await request(app)
      .put('/profile/me')
      .set(auth(t))
      .send({ orgName: 'Riverside Markets', businessName: 'should be ignored' });
    expect(put.status).toBe(200);
    expect(put.body.profile.orgName).toBe('Riverside Markets');
    expect(put.body.profile.businessName).toBeUndefined();
  });
});
