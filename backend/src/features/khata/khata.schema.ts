import { z } from 'zod';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Create a new customer
export const CreateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Customer name is required').max(100),
    phone: z.string().optional().nullable().refine(
      (val) => !val || /^\d{10}$/.test(val),
      { message: 'Phone number must be exactly 10 digits and contain only numbers' }
    ),
    address: z.string().max(200).optional().nullable(),
  }),
});

// Update customer details
export const UpdateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional().nullable().refine(
      (val) => !val || /^\d{10}$/.test(val),
      { message: 'Phone number must be exactly 10 digits and contain only numbers' }
    ),
    address: z.string().max(200).optional().nullable(),
  }),
});

// Log a repayment from customer
export const RepaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Repayment amount must be positive'),
    note: z.string().max(200).optional().nullable(),
  }),
});

// Query parameters for customer list
export const CustomerQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// Monthly statement query
export const StatementQuerySchema = z.object({
  query: z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2020).max(2100),
  }),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>['body'];
export type RepaymentInput = z.infer<typeof RepaymentSchema>['body'];
export type CustomerQuery = z.infer<typeof CustomerQuerySchema>['query'];
export type StatementQuery = z.infer<typeof StatementQuerySchema>['query'];
