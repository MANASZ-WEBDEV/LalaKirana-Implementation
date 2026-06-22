import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'purchases-test-owner@lalakirana.in';
const PASSWORD = 'password123';

describe('Purchases Transactional Endpoints', () => {
  let ownerToken: string;
  let ownerId: string;
  let testCategoryId: string;
  let productId: string;
  let supplierId: string;
  let createdPurchaseOrderId: string;

  beforeAll(async () => {
    // 1. Clean up potential leftovers
    await cleanupTestUsers([TEST_OWNER_EMAIL]);
    await supabase.from('suppliers').delete().eq('name', 'Test Supplier');
    await supabase.from('categories').delete().eq('name', 'Test Purchases Category');

    // 2. Create test owner
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    const { data: ownerUser } = await supabase
      .from('users')
      .insert({
        name: 'Purchases Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    ownerId = ownerUser!.id;

    // Login
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;

    // 3. Create test category
    const { data: cat } = await supabase
      .from('categories')
      .insert({ name: 'Test Purchases Category' })
      .select('id')
      .single();
    testCategoryId = cat!.id;

    // 4. Create test product (Cost = 40.0, Sell = 50.0, Stock = 5)
    const { data: prod } = await supabase
      .from('products')
      .insert({
        name: 'Test Purchase Product',
        category_id: testCategoryId,
        price: 50.0,
        cost_price: 40.0,
        stock_qty: 5,
        low_stock_threshold: 1,
        unit: 'pcs',
      })
      .select('id')
      .single();
    productId = prod!.id;

    // 5. Create test supplier
    const { data: supp } = await supabase
      .from('suppliers')
      .insert({
        name: 'Test Supplier',
        phone: '1112223333',
        address: 'Supplier St.',
      })
      .select('id')
      .single();
    supplierId = supp!.id;
  }, 30000);

  afterAll(async () => {
    // Clean up
    if (supplierId) {
      await supabase.from('supplier_repayments').delete().eq('supplier_id', supplierId);
      await supabase.from('suppliers').delete().eq('id', supplierId);
    }
    if (productId) {
      await supabase.from('stock_log').delete().eq('product_id', productId);
      await supabase.from('products').delete().eq('id', productId);
    }
    await supabase.from('categories').delete().eq('id', testCategoryId);
    await cleanupTestUsers([TEST_OWNER_EMAIL]);
  });

  describe('Confirm Purchase Order', () => {
    it('should fail to confirm a PO if payment_status is partial but amount_paid is zero', async () => {
      const res = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_id: supplierId,
          supplier_name: 'Test Supplier',
          payment_status: 'partial',
          amount_paid: 0,
          items: [
            {
              product_id: productId,
              product_name: 'Test Purchase Product',
              qty: 5,
              cost_price: 45.0,
              sell_price: 55.0,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation error');
    });

    it('should successfully confirm a partial payment PO, update stock, prices, and supplier balance', async () => {
      // Total will be: 5 * 45.0 = 225.0
      // Amount paid: 100.0, Owed to supplier: 125.0
      const res = await request(app)
        .post('/api/v1/purchases')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          supplier_id: supplierId,
          supplier_name: 'Test Supplier',
          payment_status: 'partial',
          amount_paid: 100.0,
          items: [
            {
              product_id: productId,
              product_name: 'Test Purchase Product',
              qty: 5,
              cost_price: 45.0,
              sell_price: 55.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.payment_status).toBe('partial');
      expect(Number(res.body.total)).toBe(225.0);
      expect(Number(res.body.amount_paid)).toBe(100.0);

      createdPurchaseOrderId = res.body.id;

      // 1. Verify product stock increased (5 + 5 = 10)
      // and prices updated (cost_price = 45, sell_price = 55)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty, cost_price, price')
        .eq('id', productId)
        .single();
      expect(prod?.stock_qty).toBe(10);
      expect(Number(prod?.cost_price)).toBe(45.0);
      expect(Number(prod?.price)).toBe(55.0);

      // 2. Verify stock log created with 'purchase_order' reason
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', productId)
        .eq('purchase_order_id', createdPurchaseOrderId);
      expect(logs?.length).toBe(1);
      expect(logs?.[0].change_qty).toBe(5);
      expect(logs?.[0].reason).toBe('purchase_order');

      // 3. Verify supplier balance updated (+125.0)
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('total_balance')
        .eq('id', supplierId)
        .single();
      expect(Number(supplier?.total_balance)).toBe(125.0);
    });
  });

  describe('Supplier Repayment', () => {
    it('should successfully log a supplier repayment, decrease owed balance, and create a repayment record', async () => {
      // Repay ₹50.0 (Owed balance goes from 125.0 to 75.0)
      const res = await request(app)
        .post(`/api/v1/purchases/suppliers/${supplierId}/repay`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 50.0,
          note: 'Paying partial supplier debt',
        });

      expect(res.status).toBe(200);
      expect(res.body.new_balance).toBe(75.0);

      // 1. Verify supplier balance is ₹75.0
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('total_balance')
        .eq('id', supplierId)
        .single();
      expect(Number(supplier?.total_balance)).toBe(75.0);

      // 2. Verify repayment audit log created
      const { data: repayments } = await supabase
        .from('supplier_repayments')
        .select('*')
        .eq('supplier_id', supplierId);
      expect(repayments?.length).toBe(1);
      expect(Number(repayments?.[0].amount)).toBe(50.0);
      expect(repayments?.[0].note).toBe('Paying partial supplier debt');
    });

    it('should fail if repayment exceeds the supplier outstanding balance', async () => {
      // Balance is ₹75.0, trying to repay ₹80.0
      const res = await request(app)
        .post(`/api/v1/purchases/suppliers/${supplierId}/repay`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 80.0,
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('exceeds supplier outstanding balance');
    });
  });

  describe('Cancel Purchase Order', () => {
    it('should cancel the PO, restore stock (10 -> 5), restore previous prices (cost = 40, sell = 50), and reverse supplier balance (75 -> 0, capped)', async () => {
      const res = await request(app)
        .post(`/api/v1/purchases/${createdPurchaseOrderId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Ordered wrong inventory items',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Purchase order cancelled successfully');

      // 1. Verify PO status updated to cancelled
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('status')
        .eq('id', createdPurchaseOrderId)
        .single();
      expect(po?.status).toBe('cancelled');

      // 2. Verify product stock restored (was 10 - 5 = 5)
      // and previous prices restored (cost = 40.0, price = 50.0)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty, cost_price, price')
        .eq('id', productId)
        .single();
      expect(prod?.stock_qty).toBe(5);
      expect(Number(prod?.cost_price)).toBe(40.0);
      expect(Number(prod?.price)).toBe(50.0);

      // 3. Verify stock log with 'purchase_cancel' reason
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', productId)
        .eq('reason', 'purchase_cancel')
        .eq('purchase_order_id', createdPurchaseOrderId);
      expect(logs?.length).toBe(1);
      expect(logs?.[0].change_qty).toBe(-5);

      // 4. Verify supplier balance reversed (decreased by 125.0, clamped to 0)
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('total_balance')
        .eq('id', supplierId)
        .single();
      expect(Number(supplier?.total_balance)).toBe(0.0);
    });
  });
});
