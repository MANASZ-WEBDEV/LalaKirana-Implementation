import { z } from 'zod';

// Valid action types for the activity log
export const ActivityTypes = [
  'bill_confirmed',
  'bill_cancelled',
  'stock_adjusted',
  'purchase_created',
  'expense_logged',
  'price_changed',
  'product_created',
  'product_edited',
  'khata_repayment',
  'customer_created',
  'login',
  'logout',
  'password_changed',
] as const;

export type ActivityType = typeof ActivityTypes[number];

// Schema for GET /activity/summary
export const ActivitySummaryQuerySchema = z.object({
  query: z.object({
    date: z.string().optional(),        // 'YYYY-MM-DD', defaults to today
    period: z.enum(['day', 'month']).optional().default('day'),
  }),
});

// Schema for GET /activity/feed
export const ActivityFeedQuerySchema = z.object({
  query: z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    user_id: z.string().uuid().optional(),
    action_type: z.string().optional(),   // comma-separated action types
    search: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
  }),
});

// Schema for GET /activity/users/:id/profile
export const ActivityUserProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2020).optional(),
  }),
});

// Schema for GET /activity/logins
export const ActivityLoginsQuerySchema = z.object({
  query: z.object({
    user_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(50),
  }),
});

// TypeScript interfaces for response types
export interface ActivityLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action_type: ActivityType;
  reference_id: string | null;
  reference_label: string | null;
  amount: number | null;
  note: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface UserActivitySummary {
  user_id: string;
  user_name: string;
  user_role: string;
  bills_created: number;
  revenue_handled: number;
  avg_bill_value: number;
  stock_adjustments: number;
  price_changes: number;
  last_active: string | null;
}
