import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'inv-test-owner@lalakirana.in';
const PASSWORD = 'password123';

describe('Inventory & EOD Endpoints', () => {
  let ownerToken: string;
  let ownerId: string;
  let testCategoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Make sure no leftover users exist
    await cleanupTestUsers([TEST_OWNER_EMAIL]);

    // Clean up prior test runs
    await supabase.from('eod_entries').delete().eq('entry_date', '2026-06-20');
    const { data: existingProds } = await supabase
      .from('products')
      .select('id')
      .eq('name', 'Inventory Test Oats 500g');
    if (existingProds && existingProds.length > 0) {
      const prodIds = existingProds.map(p => p.id);
      await supabase.from('eod_entries').delete().in('product_id', prodIds);
      await supabase.from('stock_log').delete().in('product_id', prodIds);
      await supabase.from('products').delete().in('id', prodIds);
    }
    await supabase.from('categories').delete().eq('name', 'Inventory Test Category');

    // Create test user
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);

    const { data: ownerUser } = await supabase
      .from('users')
      .insert({
        name: 'Inventory Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    ownerId = ownerUser!.id;

    // Login to get token
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;

    // Create a test category
    const { data: cat } = await supabase
      .from('categories')
      .insert({ name: 'Inventory Test Category' })
      .select('id')
      .single();
    testCategoryId = cat!.id;

    // Create a test product with initial stock = 20
    const { data: prod } = await supabase
      .from('products')
      .insert({
        name: 'Inventory Test Oats 500g',
        category_id: testCategoryId,
        price: 90.0,
        stock_qty: 20,
        low_stock_threshold: 5,
        unit: 'g',
      })
      .select('id')
      .single();
    testProductId = prod!.id;
  });

  afterAll(async () => {
    // Delete EOD entries, stock logs, products, category, and users
    if (testProductId) {
      await supabase.from('eod_entries').delete().eq('product_id', testProductId);
      await supabase.from('stock_log').delete().eq('product_id', testProductId);
      await supabase.from('products').delete().eq('id', testProductId);
    }
    if (testCategoryId) {
      await supabase.from('categories').delete().eq('id', testCategoryId);
    }
    await cleanupTestUsers([TEST_OWNER_EMAIL]);
  });

  describe('EOD Endpoints', () => {
    const entryDate = '2026-06-20';

    it('should return empty list when no EOD entry exists for the date', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/eod?date=${entryDate}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    }, 20000);

    it('should submit a new EOD entry and decrement stock_qty', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/eod')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          entry_date: entryDate,
          items: [
            { product_id: testProductId, qty_sold: 5 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(1);

      // Verify product stock is now 15 (20 - 5)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', testProductId)
        .single();
      expect(prod!.stock_qty).toBe(15);

      // Verify stock log contains the reduction
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', testProductId)
        .eq('reason', 'eod_entry')
        .order('created_at', { ascending: false });

      expect(logs!.length).toBe(1);
      expect(logs![0].change_qty).toBe(-5);
    }, 20000);

    it('should UPSERT when resubmitting for the same day and correctly adjust stock', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/eod')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          entry_date: entryDate,
          items: [
            { product_id: testProductId, qty_sold: 8 } // Increase total sold to 8 (+3 sold)
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(1);

      // Verify product stock is now 12 (15 - 3)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', testProductId)
        .single();
      expect(prod!.stock_qty).toBe(12);

      // Verify there is only one entry in eod_entries for this product and date
      const { data: eodEntries } = await supabase
        .from('eod_entries')
        .select('*')
        .eq('product_id', testProductId)
        .eq('entry_date', entryDate);
      expect(eodEntries!.length).toBe(1);
      expect(eodEntries![0].qty_sold).toBe(8);

      // Verify stock log contains the new reduction
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', testProductId)
        .eq('reason', 'eod_entry')
        .order('created_at', { ascending: false });

      // There should now be two stock logs for this product with reason eod_entry:
      // one for -5, one for -3.
      expect(logs!.length).toBe(2);
      expect(logs![0].change_qty).toBe(-3);
      expect(logs![1].change_qty).toBe(-5);
    }, 20000);

    it('should fetch the EOD entries successfully', async () => {
      const res = await request(app)
        .get(`/api/v1/inventory/eod?date=${entryDate}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].product_id).toBe(testProductId);
      expect(res.body[0].qty_sold).toBe(8);
    }, 20000);

    it('should delete EOD entry and restore stock when submitting an empty list or omitting a product', async () => {
      const res = await request(app)
        .post('/api/v1/inventory/eod')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          entry_date: entryDate,
          items: [] // Empty list to clear all entries for the date
        });

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(0);

      // Verify product stock is restored back to 20
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', testProductId)
        .single();
      expect(prod!.stock_qty).toBe(20);

      // Verify EOD entry is deleted
      const { data: eodEntries } = await supabase
        .from('eod_entries')
        .select('*')
        .eq('product_id', testProductId)
        .eq('entry_date', entryDate);
      expect(eodEntries!.length).toBe(0);

      // Verify stock log contains the restoration (+8)
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', testProductId)
        .eq('reason', 'eod_entry')
        .order('created_at', { ascending: false });

      expect(logs![0].change_qty).toBe(8); // +8 returned to stock
    }, 20000);
  });
});
