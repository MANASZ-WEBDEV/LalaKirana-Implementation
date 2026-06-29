import { z } from 'zod';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const CreateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required'),
    category_id: z.string().regex(uuidRegex, 'Invalid category ID').optional().nullable(),
    price: z.number().min(0, 'Price must be non-negative'),
    cost_price: z.number().min(0, 'Cost price must be non-negative').optional().nullable(),
    stock_qty: z.number().min(0, 'Stock quantity must be non-negative').default(0),
    low_stock_threshold: z.number().int().min(0, 'Threshold must be non-negative').default(5),
    unit: z.enum(['kg', 'g', 'litre', 'ml', 'pcs']).default('pcs'),
    mrp: z.number().min(0, 'MRP must be non-negative').optional().nullable(),
    is_loose: z.boolean().default(false),
    quick_weight_prices: z.record(
      z.string(),
      z.number().min(0, 'Price must be non-negative')
    ).optional().nullable(),
  }),
});

export const UpdateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Product name is required').optional(),
    category_id: z.string().regex(uuidRegex, 'Invalid category ID').optional().nullable(),
    price: z.number().min(0, 'Price must be non-negative').optional(),
    cost_price: z.number().min(0, 'Cost price must be non-negative').optional(),
    stock_qty: z.number().min(0, 'Stock quantity must be non-negative').optional(),
    low_stock_threshold: z.number().int().min(0, 'Threshold must be non-negative').optional(),
    unit: z.enum(['kg', 'g', 'litre', 'ml', 'pcs']).optional(),
    is_active: z.boolean().optional(),
    mrp: z.number().min(0, 'MRP must be non-negative').optional().nullable(),
    is_loose: z.boolean().optional(),
    quick_weight_prices: z.record(
      z.string(),
      z.number().min(0, 'Price must be non-negative')
    ).optional().nullable(),
  }),
});

export const BulkPriceSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        id: z.string().regex(uuidRegex, 'Invalid product ID'),
        price: z.number().min(0, 'Price must be non-negative'),
      })
    ).min(1, 'At least one product price must be provided'),
  }),
});
