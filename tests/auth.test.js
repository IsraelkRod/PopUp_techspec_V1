import request from 'supertest';
import { createApp } from '../src/app.js';

describe('auth API', () => {
  test('signup issues a public user, login returns a JWT, /me is protected', async () => {
    const app = createApp();
    const creds = { email: 'V@Example.com', password: 'supersecret', role: 'vendor' };

    const signup = await request(app).post('/auth/signup').send(creds);
    expect(signup.status).toBe(201);
    expect(signup.body.user.email).toBe('v@example.com'); // normalized
    expect(signup.body.user).not.toHaveProperty('passwordHash');

    const login = await request(app)
      .post('/auth/login')
      .send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');

    const me = await request(app)
      .get('/auth/me')
      .set('authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('vendor');
  });

  test('login with the wrong password is rejected (401)', async () => {
    const app = createApp();
    await request(app)
      .post('/auth/signup')
      .send({ email: 'h@example.com', password: 'supersecret', role: 'host' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'h@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});
