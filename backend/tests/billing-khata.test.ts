import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'billing-test-owner@lalakirana.in';
const TEST_STAFF_EMAIL = 'billing-test-staff@lalakirana.in';
const PASSWORD = 'password123';

describe('Billing and Khata Transactional Endpoints', () => {
  let ownerToken: string;
  let ownerId: string;
  let staffToken: string;
  let staffId: string;
  let testCategoryId: string;
  let product1Id: string;
  let product2Id: string;
  let productLooseId: string;
  let customerId: string;
  let createdPaidBillId: string;
  let createdKhataBillId: string;

  beforeAll(async () => {
    // 1. Clean up potential leftovers
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);
    await supabase.from('customers').delete().eq('name', 'Billing Test Customer');
    await supabase.from('categories').delete().eq('name', 'Billing Test Category');

    // 2. Create test owner
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    const { data: ownerUser } = await supabase
      .from('users')
      .insert({
        name: 'Billing Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    ownerId = ownerUser!.id;

    // Login owner
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;

    // Create test staff
    const { data: staffUser } = await supabase
      .from('users')
      .insert({
        name: 'Billing Test Staff',
        email: TEST_STAFF_EMAIL,
        password: hashedPassword,
        role: 'staff',
      })
      .select('id')
      .single();

    staffId = staffUser!.id;

    // Login staff
    const staffLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_STAFF_EMAIL, password: PASSWORD });
    staffToken = staffLogin.body.token;

    // 3. Create test category
    let { data: cat } = await supabase
      .from('categories')
      .insert({ name: 'Billing Test Category' })
      .select('id')
      .single();

    if (!cat) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Billing Test Category')
        .single();
      cat = existing;
    }
    testCategoryId = cat!.id;

    // 4. Create test products
    // Product 1: Stock = 10
    const { data: p1 } = await supabase
      .from('products')
      .insert({
        name: 'Billing Test Item 1',
        category_id: testCategoryId,
        price: 50.0,
        cost_price: 40.0,
        stock_qty: 10,
        low_stock_threshold: 2,
        unit: 'pcs',
      })
      .select('id')
      .single();
    product1Id = p1!.id;

    // Product 2: Stock = 0 (out of stock)
    const { data: p2 } = await supabase
      .from('products')
      .insert({
        name: 'Billing Test Item 2',
        category_id: testCategoryId,
        price: 100.0,
        cost_price: 80.0,
        stock_qty: 0,
        low_stock_threshold: 1,
        unit: 'pcs',
      })
      .select('id')
      .single();
    product2Id = p2!.id;

    // Product Loose: Stock = 20 (kg)
    const { data: pLoose } = await supabase
      .from('products')
      .insert({
        name: 'Billing Test Loose Item',
        category_id: testCategoryId,
        price: 200.0,
        cost_price: 150.0,
        stock_qty: 20,
        low_stock_threshold: 2,
        unit: 'kg',
        is_loose: true,
      })
      .select('id')
      .single();
    productLooseId = pLoose!.id;

    // 5. Create test customer
    const { data: cust } = await supabase
      .from('customers')
      .insert({
        name: 'Billing Test Customer',
        phone: '9999999999',
        address: 'Test Address',
      })
      .select('id')
      .single();
    customerId = cust!.id;
  }, 120000);

  afterAll(async () => {
    // Delete transactions and related records
    if (customerId) {
      await supabase.from('khata_entries').delete().eq('customer_id', customerId);
      await supabase.from('customers').delete().eq('id', customerId);
    }
    if (product1Id) {
      await supabase.from('stock_log').delete().eq('product_id', product1Id);
      await supabase.from('products').delete().eq('id', product1Id);
    }
    if (product2Id) {
      await supabase.from('stock_log').delete().eq('product_id', product2Id);
      await supabase.from('products').delete().eq('id', product2Id);
    }
    if (productLooseId) {
      await supabase.from('stock_log').delete().eq('product_id', productLooseId);
      await supabase.from('products').delete().eq('id', productLooseId);
    }
    await supabase.from('categories').delete().eq('id', testCategoryId);
    await cleanupTestUsers([TEST_OWNER_EMAIL, TEST_STAFF_EMAIL]);
  });

  describe('Paid Bill Checkout', () => {
    it('should successfully confirm a paid bill with sufficient stock and deduct stock', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 100.0,
          customer_id: null,
          customer_name: 'Walk-in Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 2,
              unit_price: 50.0,
              cost_price: 40.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('paid');
      expect(res.body.bill_items.length).toBe(1);

      createdPaidBillId = res.body.id;

      // Verify product stock was decremented from 10 to 8
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product1Id)
        .single();
      expect(prod?.stock_qty).toBe(8);

      // Verify stock log was created
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', product1Id)
        .eq('bill_id', res.body.id);
      expect(logs?.length).toBe(1);
      expect(logs?.[0].change_qty).toBe(-2);
    });

    it('should fail to confirm a bill when stock is insufficient and rollback entirely', async () => {
      // Current stock is 8. Let's request 10.
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 500.0,
          customer_id: null,
          customer_name: 'Walk-in Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 10,
              unit_price: 50.0,
              cost_price: 40.0,
            },
          ],
        });

      expect(res.status).toBe(500); // Exception from DB function should map to 500 internal server error
      expect(res.body.message).toContain('Insufficient stock');

      // Verify product stock is STILL 8 (rolled back)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product1Id)
        .single();
      expect(prod?.stock_qty).toBe(8);
    });

    it('should fail to confirm a bill when adding an out of stock product (stock_qty = 0)', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 100.0,
          customer_id: null,
          customer_name: 'Walk-in Customer',
          items: [
            {
              product_id: product2Id,
              product_name: 'Billing Test Item 2',
              qty: 1,
              unit_price: 100.0,
              cost_price: 80.0,
            },
          ],
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Insufficient stock');
    });
  });

  describe('Khata Bill Checkout', () => {
    it('should fail to confirm a Khata bill if customer_id is missing', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'khata',
          total: 50.0,
          customer_id: null,
          customer_name: 'Anonymous Khata Attempt',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 1,
              unit_price: 50.0,
              cost_price: 40.0,
            },
          ],
        });
      // Validated by ConfirmBillSchema zod refine
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation error');
      expect(res.body.errors[0].message).toContain('Khata bills require a registered customer account ID');
    });

    it('should successfully confirm a Khata bill, decrement stock, and update customer balance and ledger', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'khata',
          total: 100.0,
          customer_id: customerId,
          customer_name: 'Billing Test Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 2,
              unit_price: 50.0,
              cost_price: 40.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('khata');
      expect(res.body.customer_id).toBe(customerId);

      createdKhataBillId = res.body.id;

      // Verify product stock decremented from 8 to 6
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product1Id)
        .single();
      expect(prod?.stock_qty).toBe(6);

      // Verify customer outstanding balance increased by ₹100
      const { data: customer } = await supabase
        .from('customers')
        .select('total_balance')
        .eq('id', customerId)
        .single();
      expect(Number(customer?.total_balance)).toBe(100.0);

      // Verify ledger entry created
      const { data: entries } = await supabase
        .from('khata_entries')
        .select('*')
        .eq('customer_id', customerId)
        .eq('bill_id', res.body.id)
        .eq('type', 'purchase');
      expect(entries?.length).toBe(1);
      expect(Number(entries?.[0].amount)).toBe(100.0);
    });
  });

  describe('Khata Repayment', () => {
    it('should log a repayment successfully and decrease customer balance', async () => {
      // Log repayment of ₹40
      const res = await request(app)
        .post(`/api/v1/customers/${customerId}/repay`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 40.0,
          note: 'Partial repayment',
        });

      expect(res.status).toBe(200);
      expect(res.body.new_balance).toBe(60.0);

      // Verify customer outstanding balance decreased to ₹60
      const { data: customer } = await supabase
        .from('customers')
        .select('total_balance')
        .eq('id', customerId)
        .single();
      expect(Number(customer?.total_balance)).toBe(60.0);

      // Verify repayment ledger entry was created
      const { data: entry } = await supabase
        .from('khata_entries')
        .select('*')
        .eq('customer_id', customerId)
        .eq('type', 'payment')
        .single();
      expect(Number(entry?.amount)).toBe(40.0);
      expect(entry?.note).toBe('Partial repayment');
    });

    it('should fail to log a repayment exceeding the outstanding balance', async () => {
      // Balance is ₹60. Attempting repayment of ₹70.
      const res = await request(app)
        .post(`/api/v1/customers/${customerId}/repay`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          amount: 70.0,
          note: 'Overpayment attempt',
        });

      expect(res.status).toBe(500); // Fails in DB RPC
      expect(res.body.message).toContain('exceeds outstanding balance');

      // Verify balance remains ₹60
      const { data: customer } = await supabase
        .from('customers')
        .select('total_balance')
        .eq('id', customerId)
        .single();
      expect(Number(customer?.total_balance)).toBe(60.0);
    });
  });

  describe('Bill Cancellation', () => {
    it('should cancel a paid bill and restore product stock', async () => {
      expect(createdPaidBillId).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/billing/${createdPaidBillId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Customer returned items',
        });

      expect(res.status).toBe(200);

      // Verify bill status updated to cancelled
      const { data: bill } = await supabase
        .from('bills')
        .select('status')
        .eq('id', createdPaidBillId)
        .single();
      expect(bill?.status).toBe('cancelled');

      // Verify product stock restored (was 6, should be 8 now)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product1Id)
        .single();
      expect(prod?.stock_qty).toBe(8);

      // Verify cancellation stock log was created
      const { data: logs } = await supabase
        .from('stock_log')
        .select('*')
        .eq('product_id', product1Id)
        .eq('reason', 'bill_cancel')
        .eq('bill_id', createdPaidBillId);
      expect(logs?.length).toBe(1);
      expect(logs?.[0].change_qty).toBe(2);
    });

    it('should cancel a Khata bill, restore stock, and reverse customer outstanding balance and ledger', async () => {
      expect(createdKhataBillId).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/billing/${createdKhataBillId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          reason: 'Billed incorrectly',
        });

      expect(res.status).toBe(200);

      // Verify bill status updated to cancelled
      const { data: bill } = await supabase
        .from('bills')
        .select('status')
        .eq('id', createdKhataBillId)
        .single();
      expect(bill?.status).toBe('cancelled');

      // Verify product stock restored (was 8, should be 10 now)
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', product1Id)
        .single();
      expect(prod?.stock_qty).toBe(10);

      // Verify customer outstanding balance decreased by ₹100 (from ₹60 to ₹0, clamped to 0)
      const { data: customer } = await supabase
        .from('customers')
        .select('total_balance')
        .eq('id', customerId)
        .single();
      expect(Number(customer?.total_balance)).toBe(0.0);

      // Verify ledger entry for the bill is soft-deleted (is_deleted = TRUE)
      const { data: entry } = await supabase
        .from('khata_entries')
        .select('is_deleted')
        .eq('bill_id', createdKhataBillId)
        .single();
      expect(entry?.is_deleted).toBe(true);
    });
  });

  describe('Bill History Search', () => {
    it('should search bills by customer name successfully', async () => {
      // We will create a fresh bill linked to our test customer
      const billRes = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 50.0,
          customer_id: customerId,
          customer_name: 'Billing Test Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 1,
              unit_price: 50.0,
              cost_price: 40.0,
            },
          ],
        });
      expect(billRes.status).toBe(201);

      console.log('Test customer ID:', customerId);
      console.log('Created Search Bill Body:', billRes.body);
      const searchRes = await request(app)
        .get('/api/v1/billing?search=Billing')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(searchRes.status).toBe(200);
      expect(searchRes.body.bills.length).toBeGreaterThan(0);
      expect(
        searchRes.body.bills.some(
          (b: any) => b.id === billRes.body.id && b.customers?.name === 'Billing Test Customer'
        )
      ).toBe(true);
    });
  });

  describe('Discounts & Staff limits', () => {
    it('should successfully confirm a bill with a discount by owner', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 40.0,
          customer_id: null,
          customer_name: 'Discounted Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 1,
              unit_price: 50.0,
              cost_price: 40.0,
              discount: 10.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(40.0);
      expect(Number(res.body.discount_total)).toBe(10.0);
      expect(Number(res.body.bill_items[0].discount)).toBe(10.0);
      expect(Number(res.body.bill_items[0].subtotal)).toBe(40.0);
    });

    it('should successfully confirm a bill with a discount by staff under limit', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 30.0,
          customer_id: null,
          customer_name: 'Staff Discount Customer',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 1,
              unit_price: 50.0,
              cost_price: 40.0,
              discount: 20.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(30.0);
      expect(Number(res.body.discount_total)).toBe(20.0);
    });

    it('should fail to confirm a bill with a discount by staff exceeding limit', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 10.0,
          customer_id: null,
          customer_name: 'Staff Discount Exceeded',
          items: [
            {
              product_id: product1Id,
              product_name: 'Billing Test Item 1',
              qty: 1,
              unit_price: 50.0,
              cost_price: 40.0,
              discount: 60.0,
            },
          ],
        });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Staff discount limit exceeded');
    });
  });

  describe('Loose / Bulk Items', () => {
    it('should successfully confirm a bill with decimal quantity for loose product', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          mode: 'full',
          status: 'paid',
          total: 50.0,
          customer_id: null,
          customer_name: 'Loose Item Customer',
          items: [
            {
              product_id: productLooseId,
              product_name: 'Billing Test Loose Item',
              qty: 0.25,
              unit_price: 200.0,
              cost_price: 150.0,
              discount: 0,
              is_loose: true,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.total)).toBe(50.0);
      expect(res.body.bill_items[0].is_loose).toBe(true);
      expect(Number(res.body.bill_items[0].qty)).toBe(0.25);

      // Verify stock is decremented in DB
      const { data: prod } = await supabase
        .from('products')
        .select('stock_qty')
        .eq('id', productLooseId)
        .single();
      expect(Number(prod!.stock_qty)).toBe(19.75);
    });
  });
});
