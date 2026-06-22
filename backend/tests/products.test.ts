import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'prod-test-owner@lalakirana.in';
const TEST_STAFF_EMAIL = 'prod-test-staff@lalakirana.in';
const PASSWORD = 'password123';

describe('Products Endpoints', () => {
  let ownerToken: string;
  let staffToken: string;
  let ownerId: string;
  let staffId: string;
  let testCategoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Make sure no leftover users exist
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);

    // Create test users
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);

    const { data: ownerUser } = await supabase
      .from('users')
      .insert({
        name: 'Product Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    ownerId = ownerUser!.id;

    const { data: staffUser } = await supabase
      .from('users')
      .insert({
        name: 'Product Test Staff',
        email: TEST_STAFF_EMAIL,
        password: hashedPassword,
        role: 'staff',
      })
      .select('id')
      .single();

    staffId = staffUser!.id;

    // Login to get tokens
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;

    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_STAFF_EMAIL, password: PASSWORD });
    staffToken = staffLogin.body.token;

    // Clean up prior test runs
    await supabase.from('categories').delete().eq('name', 'Temp Test Category');

    // Create a test category directly in database for products testing
    const { data: cat } = await supabase
      .from('categories')
      .insert({ name: 'Temp Test Category' })
      .select('id')
      .single();
    testCategoryId = cat!.id;
  }, 30000);

  afterAll(async () => {
    // Delete test products and category
    if (testProductId) {
      await supabase.from('products').delete().eq('id', testProductId);
    }
    await supabase.from('categories').delete().eq('id', testCategoryId);

    // Clean up test users
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);
  });

  describe('Category Routes', () => {
    it('should allow fetching categories', async () => {
      const res = await request(app)
        .get('/api/v1/products/categories')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === testCategoryId)).toBe(true);
    });

    it('should allow owner to create a category', async () => {
      const res = await request(app)
        .post('/api/v1/products/categories')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Owner Created Category' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Owner Created Category');

      // Cleanup immediately
      await supabase.from('categories').delete().eq('id', res.body.id);
    });

    it('should forbid staff from creating a category', async () => {
      const res = await request(app)
        .post('/api/v1/products/categories')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Staff Created Category' });

      expect(res.status).toBe(403);
    });
  });

  describe('Product CRUD Routes', () => {
    it('should create a product successfully', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Supertest Oats 500g',
          category_id: testCategoryId,
          price: 90.0,
          cost_price: 85.5,
          stock_qty: 10,
          low_stock_threshold: 5,
          unit: 'g',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Supertest Oats 500g');
      expect(Number(res.body.price)).toBe(90.0);

      testProductId = res.body.id;
    });

    it('should fetch all active products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === testProductId)).toBe(true);
    });

    it('should filter products by category', async () => {
      const res = await request(app)
        .get(`/api/v1/products?category_id=${testCategoryId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.every((p: any) => p.category_id === testCategoryId)).toBe(true);
    });

    it('should filter products by search term', async () => {
      const res = await request(app)
        .get('/api/v1/products?search=Oats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.id === testProductId)).toBe(true);
    });

    it('should update product price and record price history with the correct user ID', async () => {
      const res = await request(app)
        .put(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          price: 95.0,
        });

      expect(res.status).toBe(200);
      expect(Number(res.body.price)).toBe(95.0);

      // Verify price history log
      const historyRes = await request(app)
        .get(`/api/v1/products/${testProductId}/price-history`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.length).toBeGreaterThan(0);
      expect(Number(historyRes.body[0].old_price)).toBe(90.0);
      expect(Number(historyRes.body[0].new_price)).toBe(95.0);
      expect(historyRes.body[0].changed_by).toBe(ownerId);
    });

    it('should allow bulk updating price changes', async () => {
      const res = await request(app)
        .post('/api/v1/products/bulk-price')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          items: [
            { id: testProductId, price: 100.0 },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);

      // Verify update
      const prodRes = await request(app)
        .get(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(Number(prodRes.body.price)).toBe(100.0);
    });

    it('should prevent staff from deactivating products', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    }, 20000);

    it('should allow owner to deactivate a product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);

      // Verify product is no longer active
      const checkRes = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(checkRes.body.some((p: any) => p.id === testProductId)).toBe(false);
    }, 20000);
  });
});
