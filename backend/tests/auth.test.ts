import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { emailService } from '../src/features/auth/email.service.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'test-owner@lalakirana.in';
const TEST_STAFF_EMAIL = 'test-staff@lalakirana.in';
const PASSWORD = 'password123';

describe('Auth Endpoints', () => {
  let ownerId: string;
  let staffId: string;

  beforeAll(async () => {
    // Make sure no leftover users exist
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);

    // Create test users
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);

    const { data: ownerUser, error: ownerError } = await supabase
      .from('users')
      .insert({
        name: 'Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    if (ownerError) {
      throw new Error(`Failed to create test owner user: ${ownerError.message}`);
    }
    ownerId = ownerUser.id;

    const { data: staffUser, error: staffError } = await supabase
      .from('users')
      .insert({
        name: 'Test Staff',
        email: TEST_STAFF_EMAIL,
        password: hashedPassword,
        role: 'staff',
      })
      .select('id')
      .single();

    if (staffError) {
      throw new Error(`Failed to create test staff user: ${staffError.message}`);
    }
    staffId = staffUser.id;
  });

  afterAll(async () => {
    // Clean up test users
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toEqual({
        id: ownerId,
        name: 'Test Owner',
        email: TEST_OWNER_EMAIL,
        role: 'owner',
      });
    });

    it('should return 401 for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should lock the account after 5 failed attempts', async () => {
      // We will use the test staff user so we do not lock the owner user
      // Perform 4 failed attempts
      for (let i = 0; i < 4; i++) {
        const res = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: TEST_STAFF_EMAIL, password: 'wrongpassword' });
        expect(res.status).toBe(401);
      }

      // 5th attempt should lock the account
      const resLockout = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_STAFF_EMAIL, password: 'wrongpassword' });

      expect(resLockout.status).toBe(403);
      expect(resLockout.body.message).toContain('locked');

      // Subsequent attempt should still return 403
      const resSubsequent = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_STAFF_EMAIL, password: PASSWORD });

      expect(resSubsequent.status).toBe(403);
      expect(resSubsequent.body.message).toContain('locked');

      // Manually reset lockout for the staff user in DB so other tests aren't blocked
      await supabase
        .from('users')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('id', staffId);
    }, 15000);
  });

  describe('Authenticated Operations', () => {
    let ownerToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
      ownerToken = res.body.token;
    });

    it('should get current user details from GET /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: ownerId,
        name: 'Test Owner',
        email: TEST_OWNER_EMAIL,
        role: 'owner',
      });
    });

    it('should return 401 for GET /me with an invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer invalidtoken`);

      expect(res.status).toBe(401);
    });

    it('should get active sessions list', async () => {
      const res = await request(app)
        .get('/api/v1/auth/sessions')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('token_jti');
    });

    it('should revoke session on logout', async () => {
      const resLogout = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(resLogout.status).toBe(200);

      // Verify that the token is now rejected
      const resMe = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(resMe.status).toBe(401);
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password and reset password successfully', async () => {
      // Spy on sendOTPEmail
      const sendEmailSpy = vi.spyOn(emailService, 'sendOTPEmail').mockResolvedValue(true);

      // 1. Forgot password request
      const resForgot = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: TEST_OWNER_EMAIL });

      expect(resForgot.status).toBe(200);
      expect(resForgot.body.message).toContain('sent a reset OTP code');
      expect(sendEmailSpy).toHaveBeenCalled();

      // Retrieve OTP code from spy calls
      const otpCode = sendEmailSpy.mock.calls[0][1];
      expect(otpCode).toHaveLength(6);

      // 2. Reset password
      const newPassword = 'newPassword123';
      const resReset = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          email: TEST_OWNER_EMAIL,
          otp: otpCode,
          newPassword: newPassword,
        });

      expect(resReset.status).toBe(200);
      expect(resReset.body.message).toContain('successfully');

      // 3. Verify we can login with the new password
      const resLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: newPassword });

      expect(resLogin.status).toBe(200);
      expect(resLogin.body).toHaveProperty('token');

      // 4. Verify we cannot login with the old password
      const resOldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });

      expect(resOldLogin.status).toBe(401);
    }, 15000);
  });
});
