import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from './hr.api';
import { useToastStore } from '@/shared/store/toastStore';

export const hrKeys = {
  all: ['hr'] as const,
  employees: (filters?: { is_active?: boolean; type?: string }) => [...hrKeys.all, 'employees', filters || {}] as const,
  employee: (id: string) => [...hrKeys.all, 'employee', id] as const,
  attendanceToday: (date: string) => [...hrKeys.all, 'attendance', 'today', date] as const,
  attendanceHistory: (empId: string, startDate: string, endDate: string) =>
    [...hrKeys.all, 'attendance', 'history', empId, { startDate, endDate }] as const,
  attendanceSummary: (empId: string, startDate: string, endDate: string) =>
    [...hrKeys.all, 'attendance', 'summary', empId, { startDate, endDate }] as const,
  salaryHistory: (empId: string) => [...hrKeys.all, 'salary', 'history', empId] as const,
  advances: (empId: string) => [...hrKeys.all, 'advances', empId] as const,
  outstandingAdvances: (empId: string) => [...hrKeys.all, 'outstanding-advances', empId] as const,
};

// ── Employees Hooks ───────────────────────────────────────────────────

export function useEmployees(filters?: { is_active?: boolean; type?: string }) {
  return useQuery({
    queryKey: hrKeys.employees(filters),
    queryFn: () => hrApi.listEmployees(filters),
  });
}

export function useEmployee(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: hrKeys.employee(id),
    queryFn: () => hrApi.getEmployee(id),
    ...options,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: hrApi.createEmployee,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      addToast('success', data.message || 'Employee created successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create employee');
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrApi.updateEmployee(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrKeys.employee(variables.id) });
      addToast('success', data.message || 'Employee updated successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to update employee');
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: hrApi.deactivateEmployee,
    onSuccess: (data, empId) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      queryClient.invalidateQueries({ queryKey: hrKeys.employee(empId) });
      addToast('success', data.message || 'Employee deactivated successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to deactivate employee');
    },
  });
}

// ── Attendance Hooks ──────────────────────────────────────────────────

export function useTodayAttendance(date: string) {
  return useQuery({
    queryKey: hrKeys.attendanceToday(date),
    queryFn: () => hrApi.getTodayAttendance(date),
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: hrApi.markAttendance,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.attendanceToday(variables.date) });
      // Invalidate all history & summaries since attendance changed
      queryClient.invalidateQueries({ queryKey: [...hrKeys.all, 'attendance'] });
      // Also invalidating employee list query since it shows active attendance count
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      addToast('success', data.message || 'Attendance saved successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to save attendance');
    },
  });
}

export function useAttendanceHistory(empId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: hrKeys.attendanceHistory(empId, startDate, endDate),
    queryFn: () => hrApi.getAttendanceHistory(empId, startDate, endDate),
    enabled: !!empId && !!startDate && !!endDate,
  });
}

export function useAttendanceSummary(empId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: hrKeys.attendanceSummary(empId, startDate, endDate),
    queryFn: () => hrApi.getAttendanceSummary(empId, startDate, endDate),
    enabled: !!empId && !!startDate && !!endDate,
  });
}

// ── Salary Records Hooks ──────────────────────────────────────────────

export function useSalaryHistory(empId: string) {
  return useQuery({
    queryKey: hrKeys.salaryHistory(empId),
    queryFn: () => hrApi.getSalaryHistory(empId),
    enabled: !!empId,
  });
}

export function useCreateSalary() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: hrApi.createSalaryRecord,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.salaryHistory(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.outstandingAdvances(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.advances(variables.employee_id) });
      addToast('success', data.message || 'Salary record created successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create salary record');
    },
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) => hrApi.markSalaryPaid(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...hrKeys.all, 'salary'] });
      addToast('success', data.message || 'Salary marked as paid successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to mark salary as paid');
    },
  });
}

// ── Advances Hooks ────────────────────────────────────────────────────

export function useAdvances(empId: string) {
  return useQuery({
    queryKey: hrKeys.advances(empId),
    queryFn: () => hrApi.getAdvances(empId),
    enabled: !!empId,
  });
}

export function useOutstandingAdvances(empId: string) {
  return useQuery({
    queryKey: hrKeys.outstandingAdvances(empId),
    queryFn: () => hrApi.getOutstandingAdvances(empId),
    enabled: !!empId,
  });
}

export function useCreateAdvance() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  return useMutation({
    mutationFn: hrApi.createAdvance,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: hrKeys.advances(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.outstandingAdvances(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: hrKeys.employees() });
      addToast('success', data.message || 'Advance payment recorded successfully');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to record advance');
    },
  });
}
