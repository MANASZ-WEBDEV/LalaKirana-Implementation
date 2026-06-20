import { z } from 'zod';

export const StockAdjustSchema = z.object({
  body: z.object({
    type: z.enum(['add', 'remove', 'set']),
    qty: z.number().int().min(0, 'Quantity must be non-negative'),
    reason: z.enum(['new_arrival', 'damage', 'returned', 'audit', 'other']),
    note: z.string().optional(),
  }),
});

export const EODProductRowSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  qty_sold: z.number().int().min(1, 'Quantity sold must be at least 1'),
});

export const EODEntrySchema = z.object({
  body: z.object({
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    items: z.array(EODProductRowSchema).min(1, 'At least one product must be entered'),
  }),
});
