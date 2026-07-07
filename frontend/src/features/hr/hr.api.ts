import { api } from '@/shared/api/axios';
import type {
  Employee,
  TodayAttendanceRecord,
  AttendanceRecord,
  AttendanceSummary,
  SalaryRecord,
  SalaryAdvance,
  CreateEmployeeInput,
  MarkAttendanceInput,
  CreateSalaryInput,
  CreateAdvanceInput,
} from '@/types/hr.types';

export const hrApi = {
  // ── Employees ─────────────────────────────────────────────────────────
  listEmployees: (params?: { is_active?: boolean; type?: string }) =>
    api.get<Employee[]>('/hr/employees', { params }).then((r) => r.data),

  getEmployee: (id: string) =>
    api.get<Employee>(`/hr/employees/${id}`).then((r) => r.data),

  createEmployee: (data: CreateEmployeeInput) =>
    api.post<{ message: string; employee: Employee }>('/hr/employees', data).then((r) => r.data),

  updateEmployee: (id: string, data: Partial<CreateEmployeeInput> & { date_of_leaving?: string | null }) =>
    api.put<{ message: string; employee: Employee }>(`/hr/employees/${id}`, data).then((r) => r.data),

  deactivateEmployee: (id: string) =>
    api.delete<{ message: string; employee: Employee }>(`/hr/employees/${id}`).then((r) => r.data),

  // ── Attendance ────────────────────────────────────────────────────────
  getTodayAttendance: (date: string) =>
    api.get<TodayAttendanceRecord[]>('/hr/attendance/today', { params: { date } }).then((r) => r.data),

  markAttendance: (data: MarkAttendanceInput) =>
    api.post<{ message: string; records: AttendanceRecord[] }>('/hr/attendance', data).then((r) => r.data),

  clearAttendance: (id: string) =>
    api.delete<{ message: string }>(`/hr/attendance/${id}`).then((r) => r.data),

  getAttendanceHistory: (empId: string, startDate: string, endDate: string) =>
    api.get<AttendanceRecord[]>(`/hr/attendance/${empId}/history`, { params: { startDate, endDate } }).then((r) => r.data),

  getAttendanceSummary: (empId: string, startDate: string, endDate: string) =>
    api.get<AttendanceSummary>(`/hr/attendance/${empId}/summary`, { params: { startDate, endDate } }).then((r) => r.data),

  // ── Salary Records ────────────────────────────────────────────────────
  getSalaryHistory: (empId: string) =>
    api.get<SalaryRecord[]>(`/hr/salary/${empId}`).then((r) => r.data),

  createSalaryRecord: (data: CreateSalaryInput) =>
    api.post<{ message: string; record: SalaryRecord }>('/hr/salary', data).then((r) => r.data),

  markSalaryPaid: (id: string, data?: { note?: string | null }) =>
    api.put<{ message: string; record: SalaryRecord }>(`/hr/salary/${id}/mark-paid`, data).then((r) => r.data),

  // ── Salary Advances ───────────────────────────────────────────────────
  getAdvances: (empId: string) =>
    api.get<SalaryAdvance[]>(`/hr/advances/${empId}`).then((r) => r.data),

  createAdvance: (data: CreateAdvanceInput) =>
    api.post<{ message: string; advance: SalaryAdvance }>('/hr/advances', data).then((r) => r.data),

  getOutstandingAdvances: (empId: string) =>
    api.get<{ outstanding: number }>(`/hr/advances/${empId}/outstanding`).then((r) => r.data),
};
