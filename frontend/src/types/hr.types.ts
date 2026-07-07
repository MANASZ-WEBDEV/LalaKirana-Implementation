export interface Employee {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_joining: string;
  date_of_leaving: string | null;
  is_active: boolean;
  designation: string | null;
  employment_type: 'full_time' | 'part_time' | 'daily_wage';
  salary_type: 'monthly' | 'daily';
  salary_amount: number;
  works_sunday: boolean;
  works_saturday: boolean;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'holiday';

export interface TodayAttendanceRecord {
  employee_id: string;
  employee_name: string;
  designation: string | null;
  status: AttendanceStatus;
  note: string | null;
  attendance_id: string | null;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
  marked_by: string | null;
  marked_at: string;
}

export interface AttendanceSummary {
  absent: number;
  half_day: number;
  holiday: number;
}

export interface SalaryRecord {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  half_days: number;
  gross_salary: number;
  deductions: number;
  advances_deducted: number;
  net_salary: number;
  paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
  note: string | null;
  is_locked: boolean;
  created_at: string;
}

export interface SalaryAdvance {
  id: string;
  employee_id: string;
  amount: number;
  given_on: string;
  note: string | null;
  recovered: boolean;
  recovered_in_month: number | null;
  recovered_in_year: number | null;
  given_by: string | null;
  created_at: string;
}

export interface CreateEmployeeInput {
  name: string;
  phone?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  date_of_joining?: string;
  designation?: string;
  employment_type?: 'full_time' | 'part_time' | 'daily_wage';
  salary_type?: 'monthly' | 'daily';
  salary_amount?: number;
  works_sunday?: boolean;
  works_saturday?: boolean;
  user_id?: string | null;
}

export interface MarkAttendanceInput {
  date: string;
  records: {
    employee_id: string;
    status: AttendanceStatus;
    note?: string | null;
  }[];
}

export interface CreateSalaryInput {
  employee_id: string;
  period_month: number;
  period_year: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  half_days?: number;
  gross_salary: number;
  deductions?: number;
  advances_deducted?: number;
  net_salary: number;
  note?: string | null;
}

export interface CreateAdvanceInput {
  employee_id: string;
  amount: number;
  given_on?: string;
  note?: string | null;
}
