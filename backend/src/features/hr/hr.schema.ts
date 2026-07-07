import { z } from 'zod';

// ── Employee Schemas ──────────────────────────────────────────────────────

export const CreateEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    date_of_joining: z.string().optional(), // ISO date string
    designation: z.string().optional(),
    employment_type: z.enum(['full_time', 'part_time', 'daily_wage']).optional(),
    salary_type: z.enum(['monthly', 'daily']).optional(),
    salary_amount: z.number().min(0).optional(),
    works_sunday: z.boolean().optional(),
    works_saturday: z.boolean().optional(),
    user_id: z.string().uuid().optional().nullable(),
  }),
});

export const UpdateEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    emergency_contact_name: z.string().optional().nullable(),
    emergency_contact_phone: z.string().optional().nullable(),
    date_of_joining: z.string().optional(),
    date_of_leaving: z.string().optional().nullable(),
    is_active: z.boolean().optional(),
    designation: z.string().optional().nullable(),
    employment_type: z.enum(['full_time', 'part_time', 'daily_wage']).optional(),
    salary_type: z.enum(['monthly', 'daily']).optional(),
    salary_amount: z.number().min(0).optional(),
    works_sunday: z.boolean().optional(),
    works_saturday: z.boolean().optional(),
    user_id: z.string().uuid().optional().nullable(),
  }),
});

// ── Attendance Schemas ────────────────────────────────────────────────────

export const MarkAttendanceSchema = z.object({
  body: z.object({
    date: z.string().min(1, 'Date is required'), // ISO date string YYYY-MM-DD
    records: z.array(
      z.object({
        employee_id: z.string().uuid(),
        status: z.enum(['present', 'absent', 'half_day', 'holiday']),
        note: z.string().optional().nullable(),
      })
    ).min(1, 'At least one attendance record is required'),
  }),
});

// ── Salary Schemas ────────────────────────────────────────────────────────

export const CreateSalaryRecordSchema = z.object({
  body: z.object({
    employee_id: z.string().uuid(),
    period_month: z.number().int().min(1).max(12),
    period_year: z.number().int().min(2020).max(2099),
    working_days: z.number().int().min(0),
    present_days: z.number().int().min(0),
    absent_days: z.number().int().min(0),
    half_days: z.number().int().min(0).optional(),
    gross_salary: z.number().min(0),
    deductions: z.number().min(0).optional(),
    advances_deducted: z.number().min(0).optional(),
    net_salary: z.number().min(0),
    note: z.string().optional().nullable(),
  }),
});

export const MarkSalaryPaidSchema = z.object({
  body: z.object({
    note: z.string().optional().nullable(),
  }).optional(),
});

// ── Advance Schemas ───────────────────────────────────────────────────────

export const CreateAdvanceSchema = z.object({
  body: z.object({
    employee_id: z.string().uuid(),
    amount: z.number().positive('Amount must be greater than 0'),
    given_on: z.string().optional(), // ISO date string, defaults to today
    note: z.string().optional().nullable(),
  }),
});
