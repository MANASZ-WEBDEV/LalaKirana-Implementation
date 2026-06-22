import { z } from 'zod';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Full bill item schema
const BillItemSchema = z.object({
  product_id: z.string().regex(uuidRegex, 'Invalid product ID'),
  product_name: z.string().min(1, 'Product name is required'),
  qty: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
});

// Confirm a bill (create + confirm in one step — no draft in DB)
export const ConfirmBillSchema = z.object({
  body: z.object({
    mode: z.enum(['full', 'quick']),
    status: z.enum(['paid', 'khata']),
    items: z.array(BillItemSchema).default([]),
    // items required for full bills, empty for quick bills
    customer_id: z.string().regex(uuidRegex).optional().nullable(),
    customer_name: z.string().optional().nullable(),
    // For khata bills, at least customer_name or customer_id is required
    total: z.number().min(0, 'Total must be non-negative'),
    note: z.string().optional().nullable(),
    // Used for quick bills: short description of what was sold
  }).refine(
    (data) => {
      // Full bills must have at least one item
      if (data.mode === 'full' && data.items.length === 0) return false;
      return true;
    },
    { message: 'Full bills must have at least one item' }
  ).refine(
    (data) => {
      // Khata bills must have a registered customer ID
      if (data.status === 'khata' && !data.customer_id) return false;
      return true;
    },
    { message: 'Khata bills require a registered customer account ID' }
  ).refine(
    (data) => {
      // Quick bills must have a positive total
      if (data.mode === 'quick' && data.total <= 0) return false;
      return true;
    },
    { message: 'Quick bills must have a positive total amount' }
  ),
});

// Cancel a confirmed bill
export const CancelBillSchema = z.object({
  body: z.object({
    reason: z.string().min(3, 'Cancellation reason must be at least 3 characters'),
  }),
});

// Query parameters for bill history
export const BillHistoryQuerySchema = z.object({
  query: z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    status: z.enum(['paid', 'khata', 'cancelled']).optional(),
    mode: z.enum(['full', 'quick']).optional(),
    search: z.string().optional(),
    // search by bill number or customer name
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

export type ConfirmBillInput = z.infer<typeof ConfirmBillSchema>['body'];
export type CancelBillInput = z.infer<typeof CancelBillSchema>['body'];
export type BillHistoryQuery = z.infer<typeof BillHistoryQuerySchema>['query'];
