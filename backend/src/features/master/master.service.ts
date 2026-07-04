import bcrypt from 'bcrypt';
import { supabase } from '../../db/supabase.js';

export const masterService = {
  logAction: async (masterId: string, action: string, targetId: string | null, note?: string) => {
    const { error } = await supabase
      .from('master_audit_log')
      .insert({
        master_id: masterId,
        action,
        target_id: targetId,
        note,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`Failed to create master audit log: ${error.message}`);
    }
  },

  getAllUsers: async () => {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, role, phone, is_active, locked_until, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return users;
  },

  createOwner: async (ownerData: { name: string; email: string; phone: string; password: string }) => {
    const hashedPassword = await bcrypt.hash(ownerData.password, 12);
    
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name: ownerData.name,
        email: ownerData.email,
        phone: ownerData.phone,
        password: hashedPassword,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
      })
      .select('id, name, email, role, phone, is_active')
      .single();

    if (error) throw error;
    return user;
  },

  changeUserRole: async (userId: string, role: 'owner' | 'staff') => {
    const { data: user, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select('id, name, email, role')
      .single();

    if (error) throw error;
    return user;
  },

  deactivateUser: async (userId: string) => {
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId)
      .select('id, name, email, is_active')
      .single();

    if (error) throw error;

    // Revoke all active sessions of this user
    await supabase.from('sessions').delete().eq('user_id', userId);

    return user;
  },

  resetUserPassword: async (userId: string, newPassword: string) => {
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const { data: user, error } = await supabase
      .from('users')
      .update({ password: hashedPassword, failed_attempts: 0, locked_until: null })
      .eq('id', userId)
      .select('id, name, email')
      .single();

    if (error) throw error;

    // Revoke all active sessions of this user (forces them to log in with new password)
    await supabase.from('sessions').delete().eq('user_id', userId);

    return user;
  },

  getShopOverview: async () => {
    // 1. Get owners list
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('role', 'owner');

    if (ownersError) throw ownersError;

    // 2. Get active staff count
    const { count: staffCount, error: staffError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'staff')
      .eq('is_active', true);

    if (staffError) throw staffError;

    // 3. Get today's stats (revenue and order count)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('total')
      .gte('created_at', todayStart.toISOString());

    if (billsError) throw billsError;

    const revenueToday = bills.reduce((sum, bill) => sum + Number(bill.total || 0), 0);
    const ordersToday = bills.length;

    // 4. Get last 20 audit log actions
    const { data: auditLogs, error: auditLogsError } = await supabase
      .from('master_audit_log')
      .select('id, action, note, created_at, users(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (auditLogsError) throw auditLogsError;

    const formattedLogs = auditLogs.map((log: any) => ({
      id: log.id,
      action: log.action,
      note: log.note,
      created_at: log.created_at,
      master_name: log.users?.name || 'Unknown Master',
    }));

    return {
      owners,
      activeStaffCount: staffCount || 0,
      revenueToday,
      ordersToday,
      recentLogs: formattedLogs,
    };
  },
};
