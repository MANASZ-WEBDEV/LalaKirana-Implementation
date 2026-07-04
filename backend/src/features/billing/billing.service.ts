import { supabase } from '../../db/supabase.js';
import type { ConfirmBillInput, BillHistoryQuery } from './billing.schema.js';
import { storeSettingsService } from '../settings/settings.service.js';
import { logActivity } from '../activity/activity.service.js';

export const billingService = {

  /**
   * Confirm a bill — the core billing function.
   * Creates the bill record, inserts items, deducts stock, and handles khata.
   * All operations are done in sequence with consistent error handling.
   */
  confirmBill: async (input: ConfirmBillInput, userId: string, userRole: string) => {
    // For staff, enforce discount cap from store settings
    if (userRole === 'staff' && input.mode === 'full') {
      const settings = await storeSettingsService.getStoreSettings();
      const staffDiscountLimit = parseFloat(settings.staff_discount_limit || '50');

      for (const item of input.items || []) {
        if (item.discount && (item.discount / item.qty) > staffDiscountLimit) {
          throw new Error(
            `Staff discount limit exceeded: Maximum allowed discount is ₹${staffDiscountLimit} per item.`
          );
        }
      }
    }

    // Populate actual cost_prices from products table to prevent client-side spoofing or nulls
    if (input.mode === 'full' && input.items && input.items.length > 0) {
      const productIds = input.items.map(item => item.product_id);
      const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', productIds);

      if (dbError || !dbProducts) {
        throw new Error(`Failed to validate products: ${dbError?.message || 'Products not found'}`);
      }

      const costPriceMap = new Map<string, number>();
      for (const p of dbProducts) {
        costPriceMap.set(p.id, Number(p.cost_price));
      }

      for (const item of input.items) {
        const dbCostPrice = costPriceMap.get(item.product_id);
        if (dbCostPrice === undefined) {
          throw new Error(`Product not found: ${item.product_name}`);
        }
        item.cost_price = dbCostPrice;
      }
    }

    // Call transactional PostgreSQL function
    const { data: billId, error: txError } = await supabase
      .rpc('confirm_bill_transaction', {
        p_mode: input.mode,
        p_status: input.status,
        p_total: input.total,
        p_note: input.note || null,
        p_customer_id: input.customer_id || null,
        p_customer_name: input.customer_name || null,
        p_items: input.items || [],
        p_user_id: userId,
      });

    if (txError) {
      throw new Error(`Failed to confirm bill: ${txError.message}`);
    }

    // Fetch the fully populated bill to return to the frontend
    const bill = await billingService.getBillById(billId as string);

    // Log the activity
    void logActivity({
      userId,
      userRole,
      actionType: 'bill_confirmed',
      referenceId: bill.id,
      referenceLabel: bill.bill_number,
      amount: Number(bill.total),
    });

    return bill;
  },

  /**
   * Cancel a confirmed bill.
   * Restores stock for full bills, reverses khata for credit bills.
   * Owner-only operation.
   */
  cancelBill: async (billId: string, reason: string, userId: string) => {
    // Fetch bill details for logging
    const { data: bill } = await supabase
      .from('bills')
      .select('bill_number, total')
      .eq('id', billId)
      .maybeSingle();

    // Call transactional PostgreSQL function
    const { error: txError } = await supabase
      .rpc('cancel_bill_transaction', {
        p_bill_id: billId,
        p_reason: reason,
        p_user_id: userId,
      });

    if (txError) {
      throw new Error(`Failed to cancel bill: ${txError.message}`);
    }

    // Log the activity
    void logActivity({
      userId,
      actionType: 'bill_cancelled',
      referenceId: billId,
      referenceLabel: bill?.bill_number || 'Unknown Bill',
      amount: bill ? Number(bill.total) : undefined,
      note: reason,
    });

    return { message: 'Bill cancelled successfully' };
  },

  /**
   * Get paginated bill history with filters.
   */
  getBills: async (query: BillHistoryQuery) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { date_from, date_to, status, mode, search } = query;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('bills')
      .select(`
        *,
        customers ( id, name, phone ),
        bill_items ( id, product_name, qty, unit_price, cost_price, discount, subtotal, is_loose )
      `, { count: 'exact' });

    if (date_from) {
      dbQuery = dbQuery.gte('created_at', `${date_from}T00:00:00`);
    }
    if (date_to) {
      dbQuery = dbQuery.lte('created_at', `${date_to}T23:59:59`);
    }
    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }
    if (mode) {
      dbQuery = dbQuery.eq('mode', mode);
    }
    if (search) {
      const { data: matchedCustomers } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', `%${search}%`);

      const customerIds = (matchedCustomers || []).map((c: any) => c.id);

      let orFilter = `bill_number.ilike.%${search}%,note.ilike.%${search}%`;
      for (const id of customerIds) {
        orFilter += `,customer_id.eq.${id}`;
      }
      dbQuery = dbQuery.or(orFilter);
    }

    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch bills: ${error.message}`);
    }

    return {
      bills: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * Get a single bill by ID with full details.
   */
  getBillById: async (billId: string) => {
    const { data, error } = await supabase
      .from('bills')
      .select(`
        *,
        customers ( id, name, phone, total_balance ),
        bill_items ( id, product_id, product_name, qty, unit_price, cost_price, discount, subtotal, is_loose ),
        users:created_by ( name )
      `)
      .eq('id', billId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch bill: ${error.message}`);
    }

    return {
      ...data,
      created_by_name: (data as any).users?.name || null,
      customer_name: (data as any).customers?.name || null,
      customer_phone: (data as any).customers?.phone || null,
    };
  },

  /**
   * Get today's billing summary (for dashboard/EOD integration).
   */
  getTodaySummary: async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('bills')
      .select('mode, status, total')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .neq('status', 'cancelled');

    if (error) {
      throw new Error(`Failed to fetch today's summary: ${error.message}`);
    }

    const bills = data || [];
    const fullBills = bills.filter(b => b.mode === 'full');
    const quickBills = bills.filter(b => b.mode === 'quick');

    return {
      total_revenue: bills.reduce((sum, b) => sum + Number(b.total), 0),
      full_bill_count: fullBills.length,
      full_bill_total: fullBills.reduce((sum, b) => sum + Number(b.total), 0),
      quick_bill_count: quickBills.length,
      quick_bill_total: quickBills.reduce((sum, b) => sum + Number(b.total), 0),
      paid_count: bills.filter(b => b.status === 'paid').length,
      khata_count: bills.filter(b => b.status === 'khata').length,
    };
  },
};
