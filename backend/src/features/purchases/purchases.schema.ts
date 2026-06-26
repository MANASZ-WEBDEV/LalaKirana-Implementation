import { z } from 'zod';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ------ Suppliers ------

export const CreateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Supplier name is required').max(100),
    phone: z.string().max(15).optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    note: z.string().max(300).optional().nullable(),
  }),
});

export const UpdateSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().max(15).optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    note: z.string().max(300).optional().nullable(),
    is_active: z.boolean().optional(),
  }),
});

export const SupplierQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    active_only: z.coerce.boolean().default(true),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

export const SupplierRepaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive('Repayment amount must be positive'),
    note: z.string().max(300).optional().nullable(),
  }),
});

// ------ Purchase Orders ------

const PurchaseItemSchema = z.object({
  product_id: z.string().regex(uuidRegex, 'Invalid product ID'),
  product_name: z.string().min(1, 'Product name required'),
  qty: z.number().int().positive('Quantity must be positive'),
  cost_price: z.number().min(0, 'Cost price must be non-negative'),
  sell_price: z.number().min(0, 'Sell price must be non-negative').optional().nullable(),
  mrp: z.number().min(0, 'MRP must be non-negative').optional().nullable(),
  // null = keep existing sell price / MRP
});

export const CreatePurchaseOrderSchema = z.object({
  body: z.object({
    supplier_id: z.string().regex(uuidRegex, 'Invalid supplier ID').optional().nullable(),
    supplier_name: z.string().min(1, 'Supplier name is required'),
    order_date: z.string().optional(),
    // ISO date string, defaults to today
    reference_number: z.string().min(1, 'Reference invoice bill number is required').max(50),
    // seller's paper bill number
    payment_status: z.enum(['paid', 'credit', 'partial']).default('paid'),
    amount_paid: z.number().min(0).optional().default(0),
    note: z.string().max(300).optional().nullable(),
    items: z.array(PurchaseItemSchema).min(1, 'At least one item required'),
  }).refine(
    (data) => {
      const total = data.items.reduce((sum, item) => sum + item.qty * item.cost_price, 0);
      if (data.payment_status === 'paid') {
        return data.amount_paid === 0 || Math.abs(data.amount_paid - total) < 0.01;
      }
      if (data.payment_status === 'credit') {
        return data.amount_paid === 0;
      }
      if (data.payment_status === 'partial') {
        return data.amount_paid > 0 && data.amount_paid < total;
      }
      return true;
    },
    { message: 'Amount paid is inconsistent with the selected payment status' }
  ),
});

export const CancelPurchaseSchema = z.object({
  body: z.object({
    reason: z.string().min(3, 'Cancellation reason must be at least 3 characters'),
  }),
});

export const PurchaseQuerySchema = z.object({
  query: z.object({
    supplier_id: z.string().regex(uuidRegex).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    payment_status: z.enum(['paid', 'credit', 'partial']).optional(),
    status: z.enum(['confirmed', 'cancelled']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ------ Expenses ------

export const CreateExpenseSchema = z.object({
  body: z.object({
    supplier_id: z.string().regex(uuidRegex).optional().nullable(),
    supplier_name: z.string().max(100).optional().nullable(),
    category: z.enum(['packaging', 'transport', 'maintenance', 'utilities', 'other']).default('other'),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().max(300).optional().nullable(),
    expense_date: z.string().optional(),
  }),
});

export const ExpenseQuerySchema = z.object({
  query: z.object({
    category: z.enum(['packaging', 'transport', 'maintenance', 'utilities', 'other']).optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

// ------ Type exports ------

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>['body'];
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>['body'];
export type SupplierQuery = z.infer<typeof SupplierQuerySchema>['query'];
export type SupplierRepaymentInput = z.infer<typeof SupplierRepaymentSchema>['body'];
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>['body'];
export type PurchaseQuery = z.infer<typeof PurchaseQuerySchema>['query'];
export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>['body'];
export type ExpenseQuery = z.infer<typeof ExpenseQuerySchema>['query'];
