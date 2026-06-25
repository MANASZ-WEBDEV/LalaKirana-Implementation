import { supabase } from '../../db/supabase.js';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  RepaymentInput,
  CustomerQuery,
  StatementQuery,
} from './khata.schema.js';

export const khataService = {

  /**
   * Get paginated customer list with search, ordered by total_balance desc.
   */
  getCustomers: async (query: CustomerQuery) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const search = query.search;
    const offset = (page - 1) * limit;

    let dbQuery = supabase
      .from('customers')
      .select('*', { count: 'exact' });

    if (search) {
      dbQuery = dbQuery.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await dbQuery
      .order('total_balance', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }

    const customers = (data || []).map((c: any) => ({
      ...c,
      total_balance: Number(c.total_balance),
      wallet_balance: Number(c.wallet_balance),
    }));
    return {
      customers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * Create a new customer.
   */
  createCustomer: async (input: CreateCustomerInput) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        name: input.name.trim(),
        phone: input.phone || null,
        address: input.address || null,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }

    return data;
  },

  /**
   * Get customer profile with aggregated stats.
   */
  getCustomerProfile: async (customerId: string) => {
    // Get customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (custError || !customer) {
      throw new Error('Customer not found');
    }

    // Get aggregated khata stats
    const { data: entries } = await supabase
      .from('khata_entries')
      .select('type, amount')
      .eq('customer_id', customerId)
      .eq('is_deleted', false);

    const khataEntries = entries || [];
    const totalPurchases = khataEntries
      .filter(e => e.type === 'purchase')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    const totalPayments = khataEntries
      .filter(e => e.type === 'payment')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    // Get last transaction date
    const { data: lastEntry } = await supabase
      .from('khata_entries')
      .select('created_at')
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      ...customer,
      total_balance: Number(customer.total_balance),
      wallet_balance: Number(customer.wallet_balance),
      stats: {
        total_purchases: totalPurchases,
        total_payments: totalPayments,
        net_outstanding: Number(customer.total_balance),
        last_transaction: lastEntry?.[0]?.created_at || null,
        transaction_count: khataEntries.length,
      },
    };
  },

  /**
   * Update customer details.
   */
  updateCustomer: async (customerId: string, input: UpdateCustomerInput) => {
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    return data;
  },

  /**
   * Get paginated khata ledger entries for a customer.
   */
  getKhataEntries: async (customerId: string, page: number = 1, limit: number = 20) => {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('khata_entries')
      .select(`
        *,
        bills ( bill_number, mode, total ),
        users:created_by ( name )
      `, { count: 'exact' })
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .order('type', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch khata entries: ${error.message}`);
    }

    return {
      entries: (data || []).map((e: any) => ({
        ...e,
        amount: Number(e.amount),
        bill_number: e.bills?.bill_number || null,
        created_by_name: e.users?.name || null,
      })),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * Log a repayment from customer.
   * Inserts khata entry with type='payment' and decreases customer balance.
   */
  logRepayment: async (customerId: string, input: RepaymentInput, userId: string) => {
    // Call transactional PostgreSQL function
    const { data, error } = await supabase
      .rpc('log_repayment_transaction', {
        p_customer_id: customerId,
        p_amount: input.amount,
        p_note: input.note || null,
        p_user_id: userId,
      });

    if (error) {
      throw new Error(`Failed to log repayment: ${error.message}`);
    }

    return data as any;
  },

  /**
   * Get monthly khata statement for a customer.
   * Shows opening balance, all transactions, and closing balance.
   */
  getMonthlyStatement: async (customerId: string, query: StatementQuery) => {
    const { month, year } = query;

    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('id', customerId)
      .single();

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get all khata entries BEFORE this month for opening balance
    const { data: priorEntries } = await supabase
      .from('khata_entries')
      .select('type, amount')
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .lt('created_at', startDate.toISOString());

    const openingBalance = (priorEntries || []).reduce((balance, e) => {
      return e.type === 'purchase'
        ? balance + Number(e.amount)
        : balance - Number(e.amount);
    }, 0);

    // Get entries for this month
    const { data: monthEntries } = await supabase
      .from('khata_entries')
      .select(`
        *,
        bills ( bill_number )
      `)
      .eq('customer_id', customerId)
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })
      .order('type', { ascending: false });

    const entries = (monthEntries || []).map((e: any) => ({
      ...e,
      amount: Number(e.amount),
      bill_number: e.bills?.bill_number || null,
    }));

    // Calculate closing balance
    const monthTotal = entries.reduce((balance, e) => {
      return e.type === 'purchase'
        ? balance + e.amount
        : balance - e.amount;
    }, 0);

    const closingBalance = openingBalance + monthTotal;

    return {
      customer,
      month,
      year,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_purchases: entries.filter(e => e.type === 'purchase').reduce((s, e) => s + e.amount, 0),
      total_payments: entries.filter(e => e.type === 'payment').reduce((s, e) => s + e.amount, 0),
      entries,
    };
  },
};
