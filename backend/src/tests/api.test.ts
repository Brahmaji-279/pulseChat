import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { connectDatabase } from '../config/database.js';

describe('PulseChat Backend REST API Integration', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  const testUser = {
    username: `user_${Date.now()}`,
    email: `test_${Date.now()}@pulsechat.io`,
    password: 'SecurePassword123!',
    displayName: 'Test Pulse User',
  };

  let authToken: string;

  it('GET /api/health reports operational status and PQC algorithms', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database.connected).toBe(true);
    expect(res.body.cryptography.mlKemStandard).toBe('FIPS 203 (ML-KEM-768)');
    expect(res.body.cryptography.mlDsaStandard).toBe('FIPS 204 (ML-DSA-65)');
  });

  it('POST /api/auth/register creates user and returns session', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  it('POST /api/auth/register rejects duplicate username', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.username,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('POST /api/auth/login rejects incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.username,
      password: 'WrongPassword999!',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me requires authentication token', async () => {
    const resUnauth = await request(app).get('/api/auth/me');
    expect(resUnauth.status).toBe(401);

    const resAuth = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    expect(resAuth.status).toBe(200);
    expect(resAuth.body.user.username).toBe(testUser.username);
  });
});
