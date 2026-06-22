import { supabase } from '../../db/supabase.js';
import type { ConfirmBillInput, BillHistoryQuery } from './billing.schema.js';

export const billingService = {

  /**
   * Confirm a bill — the core billing function.
   * Creates the bill record, inserts items, deducts stock, and handles khata.
   * All operations are done in sequence with consistent error handling.
   */
  confirmBill: async (input: ConfirmBillInput, userId: string) => {
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
    return billingService.getBillById(billId as string);
  },

  /**
   * Cancel a confirmed bill.
   * Restores stock for full bills, reverses khata for credit bills.
   * Owner-only operation.
   */
  cancelBill: async (billId: string, reason: string, userId: string) => {
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
        bill_items ( id, product_name, qty, unit_price, cost_price, subtotal )
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
        customers ( id, name, phone ),
        bill_items ( id, product_id, product_name, qty, unit_price, cost_price, subtotal ),
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
