import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'settings-owner@lalakirana.in';
const TEST_STAFF_EMAIL = 'settings-staff@lalakirana.in';
const NEW_STAFF_EMAIL = 'settings-newstaff@lalakirana.in';
const PASSWORD = 'password123';

describe('Settings & User Management Endpoints', () => {
  let ownerToken: string;
  let staffToken: string;
  let ownerId: string;
  let staffId: string;
  let newStaffId: string;

  beforeAll(async () => {
    // Clean up any leftovers
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL, NEW_STAFF_EMAIL]);

    const hashedPassword = await bcrypt.hash(PASSWORD, 12);

    // Create owner
    const { data: owner } = await supabase
      .from('users')
      .insert({
        name: 'Settings Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();
    ownerId = owner!.id;

    // Create staff
    const { data: staff } = await supabase
      .from('users')
      .insert({
        name: 'Settings Staff',
        email: TEST_STAFF_EMAIL,
        password: hashedPassword,
        role: 'staff',
      })
      .select('id')
      .single();
    staffId = staff!.id;

    // Logins
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_STAFF_EMAIL, password: PASSWORD });
    staffToken = staffLogin.body.token;
  }, 30000);

  afterAll(async () => {
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL, NEW_STAFF_EMAIL]);
  }, 30000);

  describe('GET /api/v1/auth/users (Owner only)', () => {
    it('should allow owner to list users', async () => {
      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.email === TEST_OWNER_EMAIL)).toBe(true);
      expect(res.body.some((u: any) => u.email === TEST_STAFF_EMAIL)).toBe(true);
    });

    it('should forbid staff from listing users', async () => {
      const res = await request(app)
        .get('/api/v1/auth/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/auth/users (Owner only)', () => {
    it('should allow owner to create a new staff member', async () => {
      const res = await request(app)
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'New Staff Member',
          email: NEW_STAFF_EMAIL,
          password: 'tempPassword123',
          role: 'staff',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(NEW_STAFF_EMAIL);
      expect(res.body.role).toBe('staff');
      newStaffId = res.body.id;

      // Verify the new staff can log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: NEW_STAFF_EMAIL, password: 'tempPassword123' });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    }, 20000);

    it('should forbid staff from creating users', async () => {
      const res = await request(app)
        .post('/api/v1/auth/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Fake Staff',
          email: 'fake-staff@lalakirana.in',
          password: 'tempPassword123',
          role: 'staff',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/v1/auth/users/:id/reset-password (Owner only)', () => {
    it('should allow owner to reset staff password', async () => {
      const res = await request(app)
        .put(`/api/v1/auth/users/${newStaffId}/reset-password`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ newPassword: 'newTemporaryPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset');

      // Verify login with old temp password fails
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: NEW_STAFF_EMAIL, password: 'tempPassword123' });
      expect(oldLogin.status).toBe(401);

      // Verify login with new temp password succeeds
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: NEW_STAFF_EMAIL, password: 'newTemporaryPassword123' });
      expect(newLogin.status).toBe(200);
    }, 20000);

    it('should forbid staff from resetting a password', async () => {
      const res = await request(app)
        .put(`/api/v1/auth/users/${ownerId}/reset-password`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ newPassword: 'hackedPassword123' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/auth/users/:id (Owner only deactivates)', () => {
    it('should allow owner to deactivate a user', async () => {
      const res = await request(app)
        .delete(`/api/v1/auth/users/${newStaffId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deactivated');

      // Verify deactivated user cannot log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: NEW_STAFF_EMAIL, password: 'newTemporaryPassword123' });
      expect(loginRes.status).toBe(401);
      expect(loginRes.body.message).toContain('deactivated');
    }, 20000);

    it('should forbid staff from deactivating users', async () => {
      const res = await request(app)
        .delete(`/api/v1/auth/users/${ownerId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/auth/sessions/all (Log out all others)', () => {
    it('should terminate all sessions except current one', async () => {
      // Login owner twice to get two sessions
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
      const token1 = res1.body.token;

      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
      const token2 = res2.body.token;

      // Both tokens should work
      const me1Before = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token1}`);
      expect(me1Before.status).toBe(200);
      const me2Before = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token2}`);
      expect(me2Before.status).toBe(200);

      // Call delete all sessions using token2
      const delRes = await request(app)
        .delete('/api/v1/auth/sessions/all')
        .set('Authorization', `Bearer ${token2}`);
      expect(delRes.status).toBe(200);

      // Current session (token2) should still work
      const me2After = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token2}`);
      expect(me2After.status).toBe(200);

      // Other session (token1) should be terminated (returns 401)
      const me1After = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token1}`);
      expect(me1After.status).toBe(401);
    }, 20000);
  });
});
