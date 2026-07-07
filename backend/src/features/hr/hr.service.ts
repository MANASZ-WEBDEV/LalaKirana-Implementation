import { supabase } from '../../db/supabase.js';

export const hrService = {

  // ── Employee CRUD ─────────────────────────────────────────────────────

  listEmployees: async (filters?: { is_active?: boolean; type?: string }) => {
    let query = supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters?.type) {
      query = query.eq('employment_type', filters.type);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch employees: ${error.message}`);
    return data;
  },

  getEmployee: async (id: string) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Employee not found: ${error.message}`);
    return data;
  },

  createEmployee: async (employeeData: Record<string, any>) => {
    const { data, error } = await supabase
      .from('employees')
      .insert(employeeData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create employee: ${error.message}`);
    return data;
  },

  updateEmployee: async (id: string, updates: Record<string, any>) => {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update employee: ${error.message}`);
    return data;
  },

  deactivateEmployee: async (id: string) => {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: false, date_of_leaving: new Date().toISOString().split('T')[0] })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to deactivate employee: ${error.message}`);
    return data;
  },

  // ── Attendance ────────────────────────────────────────────────────────

  getTodayAttendance: async (date: string) => {
    // Get all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, name, designation')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (empError) throw new Error(`Failed to fetch employees: ${empError.message}`);

    // Get attendance records for the date
    const { data: records, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date);

    if (attError) throw new Error(`Failed to fetch attendance: ${attError.message}`);

    // Map: default is 'present' (no record = present)
    const recordMap = new Map(records?.map((r: any) => [r.employee_id, r]) || []);

    const result = employees?.map((emp: any) => {
      const record = recordMap.get(emp.id);
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        designation: emp.designation,
        status: record ? record.status : 'present',
        note: record?.note || null,
        attendance_id: record?.id || null,
      };
    });

    return result;
  },

  markAttendance: async (
    date: string,
    records: { employee_id: string; status: string; note?: string | null }[],
    markedBy: string
  ) => {
    const results: any[] = [];

    for (const record of records) {
      if (record.status === 'present') {
        // "Present" = delete any existing record (default is present)
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('employee_id', record.employee_id)
          .eq('date', date);

        if (error) throw new Error(`Failed to clear attendance: ${error.message}`);
        results.push({ employee_id: record.employee_id, status: 'present', action: 'cleared' });
      } else {
        // Upsert non-present records
        const { data, error } = await supabase
          .from('attendance')
          .upsert(
            {
              employee_id: record.employee_id,
              date,
              status: record.status,
              note: record.note || null,
              marked_by: markedBy,
              marked_at: new Date().toISOString(),
            },
            { onConflict: 'employee_id,date' }
          )
          .select()
          .single();

        if (error) throw new Error(`Failed to mark attendance: ${error.message}`);
        results.push(data);
      }
    }

    return results;
  },

  clearAttendance: async (attendanceId: string) => {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw new Error(`Failed to clear attendance: ${error.message}`);
    return { message: 'Attendance cleared (reverted to present)' };
  },

  getAttendanceHistory: async (
    employeeId: string,
    startDate: string,
    endDate: string
  ) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw new Error(`Failed to fetch attendance history: ${error.message}`);
    return data;
  },

  getAttendanceSummary: async (employeeId: string, startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('status')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) throw new Error(`Failed to fetch attendance summary: ${error.message}`);

    const summary = {
      absent: 0,
      half_day: 0,
      holiday: 0,
    };

    data?.forEach((r: any) => {
      if (r.status === 'absent') summary.absent++;
      else if (r.status === 'half_day') summary.half_day++;
      else if (r.status === 'holiday') summary.holiday++;
    });

    return summary;
  },

  // ── Salary Records ────────────────────────────────────────────────────

  getSalaryHistory: async (employeeId: string) => {
    const { data, error } = await supabase
      .from('salary_records')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (error) throw new Error(`Failed to fetch salary history: ${error.message}`);
    return data;
  },

  createSalaryRecord: async (salaryData: Record<string, any>) => {
    const { data, error } = await supabase
      .from('salary_records')
      .insert(salaryData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Salary record for this month already exists');
      }
      throw new Error(`Failed to create salary record: ${error.message}`);
    }
    return data;
  },

  markSalaryPaid: async (salaryId: string, paidBy: string, note?: string | null) => {
    const updateData: Record<string, any> = {
      paid: true,
      paid_at: new Date().toISOString(),
      paid_by: paidBy,
      is_locked: true,
    };
    if (note !== undefined) updateData.note = note;

    const { data, error } = await supabase
      .from('salary_records')
      .update(updateData)
      .eq('id', salaryId)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark salary as paid: ${error.message}`);
    return data;
  },

  // ── Salary Advances ───────────────────────────────────────────────────

  getAdvances: async (employeeId: string) => {
    const { data, error } = await supabase
      .from('salary_advance_payments')
      .select('*')
      .eq('employee_id', employeeId)
      .order('given_on', { ascending: false });

    if (error) throw new Error(`Failed to fetch advances: ${error.message}`);
    return data;
  },

  createAdvance: async (advanceData: Record<string, any>) => {
    const { data, error } = await supabase
      .from('salary_advance_payments')
      .insert(advanceData)
      .select()
      .single();

    if (error) throw new Error(`Failed to create advance: ${error.message}`);
    return data;
  },

  getOutstandingAdvances: async (employeeId: string) => {
    const { data, error } = await supabase
      .from('salary_advance_payments')
      .select('amount')
      .eq('employee_id', employeeId)
      .eq('recovered', false);

    if (error) throw new Error(`Failed to fetch outstanding advances: ${error.message}`);

    const total = data?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0;
    return { outstanding: Math.round(total * 100) / 100 };
  },

  markAdvancesRecovered: async (employeeId: string, month: number, year: number, deductionAmount: number) => {
    const { data: advances, error: fetchError } = await supabase
      .from('salary_advance_payments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('recovered', false)
      .order('given_on', { ascending: true });

    if (fetchError) throw new Error(`Failed to fetch outstanding advances: ${fetchError.message}`);

    let remainingDeduction = deductionAmount;

    for (const adv of (advances || [])) {
      if (remainingDeduction <= 0) break;

      const advAmount = Number(adv.amount);

      if (advAmount <= remainingDeduction) {
        // Fully recovered
        const { error: updateError } = await supabase
          .from('salary_advance_payments')
          .update({
            recovered: true,
            recovered_in_month: month,
            recovered_in_year: year,
          })
          .eq('id', adv.id);

        if (updateError) throw new Error(`Failed to update advance record: ${updateError.message}`);
        remainingDeduction -= advAmount;
      } else {
        // Partially recovered -> Split the record!
        const leftoverAmount = advAmount - remainingDeduction;
        
        // 1. Create new record with the leftover unrecovered amount
        const { error: insertError } = await supabase
          .from('salary_advance_payments')
          .insert({
            employee_id: employeeId,
            amount: leftoverAmount,
            given_on: adv.given_on,
            note: adv.note ? `${adv.note} (Carry-forward)` : 'Carry-forward',
            recovered: false,
            given_by: adv.given_by,
          });

        if (insertError) throw new Error(`Failed to insert carry-forward advance: ${insertError.message}`);

        // 2. Update the original record to represent the recovered amount
        const { error: updateError } = await supabase
          .from('salary_advance_payments')
          .update({
            amount: remainingDeduction,
            recovered: true,
            recovered_in_month: month,
            recovered_in_year: year,
          })
          .eq('id', adv.id);

        if (updateError) throw new Error(`Failed to update partial advance: ${updateError.message}`);

        remainingDeduction = 0;
      }
    }
  },
};
