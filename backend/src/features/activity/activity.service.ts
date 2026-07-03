import { supabase } from '../../db/supabase.js';
import type { ActivityType, ActivityLogEntry, UserActivitySummary } from './activity.schema.js';

/**
 * Log an activity event to the activity_log table.
 * Called from other services after successful operations.
 * Fire-and-forget: errors are logged but never thrown to avoid breaking the parent operation.
 */
export async function logActivity(params: {
  userId: string;
  userName?: string;
  userRole?: string;
  actionType: ActivityType;
  referenceId?: string;
  referenceLabel?: string;
  amount?: number;
  note?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    let userName = params.userName;
    let userRole = params.userRole;

    if (!userName || !userRole) {
      const { data: user } = await supabase
        .from('users')
        .select('name, role')
        .eq('id', params.userId)
        .maybeSingle();

      if (user) {
        userName = userName || user.name;
        userRole = userRole || user.role;
      }
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        user_id: params.userId,
        user_name: userName || 'Unknown User',
        user_role: userRole || 'staff',
        action_type: params.actionType,
        reference_id: params.referenceId || null,
        reference_label: params.referenceLabel || null,
        amount: params.amount ?? null,
        note: params.note || null,
        ip_address: params.ipAddress || null,
      });

    if (error) {
      console.error(`[ActivityLog] Failed to log activity: ${error.message}`, {
        actionType: params.actionType,
        userId: params.userId,
      });
    }
  } catch (err: any) {
    // Never throw — activity logging must not break the parent operation
    console.error(`[ActivityLog] Unexpected error: ${err.message}`);
  }
}

/**
 * Query methods for the activity API endpoints.
 */
export const activityService = {

  /**
   * Get per-user activity summary for a given date (or today).
   * Returns: bills count, revenue, avg bill value, stock adjustments, price changes, last active.
   */
  getSummary: async (date?: string, currentUserRole?: string): Promise<UserActivitySummary[]> => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00`;
    const endOfDay = `${targetDate}T23:59:59`;

    // Fetch all activity for the day
    let query = supabase
      .from('activity_log')
      .select('*')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (currentUserRole === 'owner') {
      query = query.neq('user_role', 'master');
    }

    const { data: logs, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch activity summary: ${error.message}`);
    }

    // Group by user
    const userMap = new Map<string, {
      user_id: string;
      user_name: string;
      user_role: string;
      bills_created: number;
      revenue_handled: number;
      stock_adjustments: number;
      price_changes: number;
      last_active: string | null;
    }>();

    for (const log of (logs || [])) {
      if (!userMap.has(log.user_id)) {
        userMap.set(log.user_id, {
          user_id: log.user_id,
          user_name: log.user_name,
          user_role: log.user_role,
          bills_created: 0,
          revenue_handled: 0,
          stock_adjustments: 0,
          price_changes: 0,
          last_active: log.created_at,
        });
      }

      const entry = userMap.get(log.user_id)!;

      if (log.action_type === 'bill_confirmed') {
        entry.bills_created++;
        entry.revenue_handled += Number(log.amount) || 0;
      } else if (log.action_type === 'stock_adjusted') {
        entry.stock_adjustments++;
      } else if (log.action_type === 'price_changed') {
        entry.price_changes++;
      }

      // Update last_active if this log is more recent
      if (!entry.last_active || log.created_at > entry.last_active) {
        entry.last_active = log.created_at;
      }
    }

    // Calculate avg bill value and return as array
    const summaries: UserActivitySummary[] = [];
    for (const entry of userMap.values()) {
      summaries.push({
        ...entry,
        avg_bill_value: entry.bills_created > 0
          ? Math.round(entry.revenue_handled / entry.bills_created)
          : 0,
      });
    }

    // Sort by revenue descending
    summaries.sort((a, b) => b.revenue_handled - a.revenue_handled);
    return summaries;
  },

  /**
   * Get paginated activity feed with filters.
   * Supports: date range, user filter, action type filter, search.
   */
  getFeed: async (filters: {
    date_from?: string;
    date_to?: string;
    user_id?: string;
    action_type?: string;
    search?: string;
    page: number;
    limit: number;
    currentUserRole?: string;
  }) => {
    const { page, limit, date_from, date_to, user_id, action_type, search, currentUserRole } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' });

    if (currentUserRole === 'owner') {
      query = query.neq('user_role', 'master');
    }

    if (date_from) {
      query = query.gte('created_at', `${date_from}T00:00:00`);
    }
    if (date_to) {
      query = query.lte('created_at', `${date_to}T23:59:59`);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (action_type) {
      const types = action_type.split(',').map(t => t.trim());
      query = query.in('action_type', types);
    }
    if (search) {
      query = query.or(
        `reference_label.ilike.%${search}%,user_name.ilike.%${search}%,note.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch activity feed: ${error.message}`);
    }

    return {
      entries: (data || []) as ActivityLogEntry[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * Get individual user's activity profile.
   * Shows: this month's stats breakdown + recent 20 activity entries.
   */
  getUserProfile: async (userId: string, month?: number, year?: number) => {
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Fetch user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role, is_active, created_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error('User not found');
    }

    // Fetch monthly activity
    const { data: monthLogs, error: monthError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())
      .order('created_at', { ascending: false });

    if (monthError) {
      throw new Error(`Failed to fetch user activity: ${monthError.message}`);
    }

    const logs = monthLogs || [];

    // Calculate stats
    const billLogs = logs.filter(l => l.action_type === 'bill_confirmed');
    const stats = {
      bills_handled: billLogs.length,
      revenue_processed: billLogs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0),
      purchases_entered: logs.filter(l => l.action_type === 'purchase_created').length,
      stock_adjustments: logs.filter(l => l.action_type === 'stock_adjusted').length,
      khata_repayments: logs.filter(l => l.action_type === 'khata_repayment').length,
      price_changes: logs.filter(l => l.action_type === 'price_changed').length,
      expenses_logged: logs.filter(l => l.action_type === 'expense_logged').length,
    };

    // Get recent 20 activity entries (across all time)
    const { data: recentLogs } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get login history
    const { data: loginLogs } = await supabase
      .from('activity_log')
      .select('created_at, ip_address')
      .eq('user_id', userId)
      .in('action_type', ['login', 'logout'])
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      user,
      month: targetMonth,
      year: targetYear,
      stats,
      recent_activity: (recentLogs || []) as ActivityLogEntry[],
      login_history: loginLogs || [],
    };
  },

  /**
   * Get login/logout history with pagination.
   */
  getLoginHistory: async (filters: {
    user_id?: string;
    date_from?: string;
    date_to?: string;
    page: number;
    limit: number;
    currentUserRole?: string;
  }) => {
    const { page, limit, user_id, date_from, date_to, currentUserRole } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .in('action_type', ['login', 'logout']);

    if (currentUserRole === 'owner') {
      query = query.neq('user_role', 'master');
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    if (date_from) {
      query = query.gte('created_at', `${date_from}T00:00:00`);
    }
    if (date_to) {
      query = query.lte('created_at', `${date_to}T23:59:59`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch login history: ${error.message}`);
    }

    return {
      entries: (data || []) as ActivityLogEntry[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },
};
