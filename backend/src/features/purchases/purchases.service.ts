import { supabase } from '../../db/supabase.js';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQuery,
  SupplierRepaymentInput,
  CreatePurchaseOrderInput,
  PurchaseQuery,
  CreateExpenseInput,
  ExpenseQuery,
} from './purchases.schema.js';

export const purchasesService = {

  // ─── SUPPLIERS ───────────────────────────────────

  /**
   * Get paginated supplier list with search.
   */
  getSuppliers: async (query: SupplierQuery) => {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 50;
    const { search, active_only } = query;
    const offset = (pageNum - 1) * limitNum;

    let dbQuery = supabase
      .from('suppliers')
      .select('*', { count: 'exact' });

    if (active_only) {
      dbQuery = dbQuery.eq('is_active', true);
    }
    if (search) {
      dbQuery = dbQuery.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('name', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }

    return {
      suppliers: (data || []).map((s: any) => ({
        ...s,
        total_balance: Number(s.total_balance),
      })),
      total: count || 0,
      page: pageNum,
      limit: limitNum,
    };
  },

  /**
   * Create a new supplier.
   */
  createSupplier: async (input: CreateSupplierInput) => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{
        name: input.name.trim(),
        phone: input.phone || null,
        address: input.address || null,
        note: input.note || null,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create supplier: ${error.message}`);
    }

    return data;
  },

  /**
   * Update supplier details.
   */
  updateSupplier: async (supplierId: string, input: UpdateSupplierInput) => {
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update supplier: ${error.message}`);
    }

    return data;
  },

  /**
   * Log a payment to supplier (decrease what we owe them).
   */
  logSupplierRepayment: async (supplierId: string, input: SupplierRepaymentInput, userId: string) => {
    const { data: supplier, error: suppError } = await supabase
      .from('suppliers')
      .select('id, name, total_balance')
      .eq('id', supplierId)
      .single();

    if (suppError || !supplier) {
      throw new Error('Supplier not found');
    }

    const currentBalance = Number(supplier.total_balance);

    const { data: newBalance, error: rpcError } = await supabase.rpc('log_supplier_repayment_transaction', {
      p_supplier_id: supplierId,
      p_amount: input.amount,
      p_note: input.note || null,
      p_created_by: userId,
    });

    if (rpcError) {
      throw new Error(`Failed to log repayment: ${rpcError.message}`);
    }

    return {
      supplier_id: supplierId,
      supplier_name: supplier.name,
      amount_paid: input.amount,
      previous_balance: currentBalance,
      new_balance: Number(newBalance),
      note: input.note || null,
    };
  },

  // ─── PURCHASE ORDERS ─────────────────────────────

  /**
   * Confirm a purchase order — the main stock-in function.
   * Creates the PO, updates product stock and prices, logs stock movements.
   */
  confirmPurchaseOrder: async (input: CreatePurchaseOrderInput, userId: string) => {
    let canonicalSupplierName = input.supplier_name.trim();

    if (input.supplier_id) {
      const { data: supplier, error: suppErr } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', input.supplier_id)
        .single();
      if (suppErr || !supplier) {
        throw new Error('Supplier not found');
      }
      canonicalSupplierName = supplier.name;
    }

    const { data: poResult, error: rpcError } = await supabase.rpc('confirm_purchase_order_transaction', {
      p_supplier_id: input.supplier_id || null,
      p_supplier_name: canonicalSupplierName,
      p_order_date: input.order_date || new Date().toISOString().split('T')[0],
      p_reference_number: input.reference_number || null,
      p_payment_status: input.payment_status,
      p_amount_paid: input.payment_status === 'paid' ? 0 : (input.amount_paid || 0),
      p_note: input.note || null,
      p_created_by: userId,
      p_items: input.items,
    });

    if (rpcError) {
      throw new Error(`Failed to confirm purchase order: ${rpcError.message}`);
    }

    // Fetch the inserted items to return with the payload
    const { data: items, error: itemsErr } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('purchase_order_id', poResult.id);

    if (itemsErr) {
      throw new Error(`Failed to fetch PO items after confirmation: ${itemsErr.message}`);
    }

    return {
      ...poResult,
      items: items || [],
    };
  },

  /**
   * Cancel a purchase order.
   * Restores stock, reverses supplier balance.
   */
  cancelPurchaseOrder: async (poId: string, reason: string, userId: string) => {
    const { error } = await supabase.rpc('cancel_purchase_order_transaction', {
      p_po_id: poId,
      p_reason: reason,
      p_cancelled_by: userId,
    });

    if (error) {
      throw new Error(`Failed to cancel purchase order: ${error.message}`);
    }

    return { message: 'Purchase order cancelled successfully' };
  },

  /**
   * Get paginated purchase orders with filters.
   */
  getPurchaseOrders: async (query: PurchaseQuery) => {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 15;
    const { supplier_id, date_from, date_to, payment_status, status } = query;
    const offset = (pageNum - 1) * limitNum;

    let dbQuery = supabase
      .from('purchase_orders')
      .select('*', { count: 'exact' });

    if (supplier_id) dbQuery = dbQuery.eq('supplier_id', supplier_id);
    if (date_from) dbQuery = dbQuery.gte('order_date', date_from);
    if (date_to) dbQuery = dbQuery.lte('order_date', date_to);
    if (payment_status) dbQuery = dbQuery.eq('payment_status', payment_status);
    if (status) dbQuery = dbQuery.eq('status', status);

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw new Error(`Failed to fetch purchase orders: ${error.message}`);
    }

    return {
      purchaseOrders: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    };
  },

  /**
   * Get a single purchase order with all items.
   */
  getPurchaseOrderById: async (poId: string) => {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items (
          id, product_id, product_name, qty, cost_price, sell_price, mrp,
          previous_cost, previous_sell, previous_mrp
        )
      `)
      .eq('id', poId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch purchase order: ${error.message}`);
    }

    return data;
  },

  /**
   * Get purchase history for a specific product (for Item History tab).
   */
  getProductPurchaseHistory: async (productId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select(`
        *,
        purchase_orders ( id, supplier_id, supplier_name, order_date, reference_number )
      `)
      .eq('product_id', productId)
      .order('purchase_orders(order_date)', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch product purchase history: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      date: item.purchase_orders?.order_date,
      supplier_name: item.purchase_orders?.supplier_name,
      supplier_id: item.purchase_orders?.supplier_id,
      qty: item.qty,
      cost_price: Number(item.cost_price),
      sell_price: item.sell_price ? Number(item.sell_price) : null,
      mrp: item.mrp ? Number(item.mrp) : null,
      previous_cost: item.previous_cost ? Number(item.previous_cost) : null,
      previous_sell: item.previous_sell ? Number(item.previous_sell) : null,
      previous_mrp: item.previous_mrp ? Number(item.previous_mrp) : null,
      reference_number: item.purchase_orders?.reference_number,
    }));
  },

  /**
   * Get supplier summary for a product — grouped stats per supplier.
   */
  getProductSupplierSummary: async (productId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_items')
      .select(`
        qty, cost_price,
        purchase_orders ( supplier_id, supplier_name )
      `)
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to fetch supplier summary: ${error.message}`);
    }

    // Group by supplier
    const supplierMap = new Map<string, {
      supplier_name: string;
      supplier_id: string | null;
      order_count: number;
      total_qty: number;
      avg_cost: number;
      total_cost: number;
    }>();

    for (const item of (data || [])) {
      const supplierName = (item as any).purchase_orders?.supplier_name || 'Unknown';
      const supplierId = (item as any).purchase_orders?.supplier_id || null;
      const key = supplierName;

      const existing = supplierMap.get(key) || {
        supplier_name: supplierName,
        supplier_id: supplierId,
        order_count: 0,
        total_qty: 0,
        avg_cost: 0,
        total_cost: 0,
      };

      existing.order_count += 1;
      existing.total_qty += item.qty;
      existing.total_cost += item.qty * Number(item.cost_price);
      existing.avg_cost = existing.total_cost / existing.total_qty;

      supplierMap.set(key, existing);
    }

    return Array.from(supplierMap.values())
      .sort((a, b) => b.total_qty - a.total_qty);
  },

  // ─── EXPENSES ────────────────────────────────────

  /**
   * Create a new expense entry.
   */
  createExpense: async (input: CreateExpenseInput, userId: string) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        supplier_id: input.supplier_id || null,
        supplier_name: input.supplier_name || null,
        category: input.category,
        amount: input.amount,
        description: input.description || null,
        expense_date: input.expense_date || new Date().toISOString().split('T')[0],
        created_by: userId,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }

    return data;
  },

  /**
   * Get paginated expense list with filters.
   */
  getExpenses: async (query: ExpenseQuery) => {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 20;
    const { category, date_from, date_to } = query;
    const offset = (pageNum - 1) * limitNum;

    let dbQuery = supabase
      .from('expenses')
      .select('*', { count: 'exact' });

    if (category) dbQuery = dbQuery.eq('category', category);
    if (date_from) dbQuery = dbQuery.gte('expense_date', date_from);
    if (date_to) dbQuery = dbQuery.lte('expense_date', date_to);

    const { data, error, count } = await dbQuery
      .order('expense_date', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return {
      expenses: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    };
  },
};
