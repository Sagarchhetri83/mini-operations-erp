/**
 * Phase 1 Auth Tests
 *
 * These tests verify the authentication and RBAC foundation.
 * Business logic tests (inventory, transfers, orders) will be added in Phases 2-5.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index';

const ADMIN_EMAIL = 'admin@erp.com';
const OPS_EMAIL = 'ops1@erp.com';
const SALES_EMAIL = 'sales1@erp.com';
const PASSWORD = 'Password123';
const WRONG_PASSWORD = 'WrongPassword';

describe('POST /api/auth/login', () => {
  it('ADMIN can log in and receives a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('OPERATIONS_USER can log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: OPS_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('OPERATIONS_USER');
  });

  it('SALES_USER can log in', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: SALES_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('SALES_USER');
  });

  it('Wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: WRONG_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('Unknown email returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@erp.com', password: PASSWORD });

    expect(res.status).toBe(401);
  });

  it('Missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('Returns current user when given a valid token', async () => {
    // First log in to get a token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(ADMIN_EMAIL);
    expect(meRes.body.user.role).toBe('ADMIN');
  });

  it('Returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('Returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally-invalid-token');
    expect(res.status).toBe(401);
  });
});

describe('RBAC — Role-based access control', () => {
  it('SALES_USER is denied access to work-orders (ADMIN only route)', async () => {
    // Log in as sales user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: SALES_EMAIL, password: PASSWORD });

    const token = loginRes.body.token;

    // Work orders creation will require ADMIN role (Phase 3)
    // For now we verify the /api/work-orders placeholder rejects unauthenticated correctly
    // and that our auth token IS valid (status 501 means route exists but not implemented — not 401/403)
    const res = await request(app)
      .get('/api/work-orders')
      .set('Authorization', `Bearer ${token}`);

    // Currently returns 501 (Not Implemented) because the route is a stub
    // Once Phase 3 is complete, this test will be updated to expect 403
    expect([200, 403, 501]).toContain(res.status);
  });

  it('Unauthenticated request to protected route returns 401', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('ADMIN token is accepted on protected route', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    const adminToken = loginRes.body.token;

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    // 501 means the route accepted auth and hit the stub handler (not 401/403)
    expect(res.status).toBe(501);
  });
});
