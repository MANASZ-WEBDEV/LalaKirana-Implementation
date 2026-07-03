import { api } from '@/shared/api/axios';

export type ActivityType =
  | 'bill_confirmed'
  | 'bill_cancelled'
  | 'stock_adjusted'
  | 'purchase_created'
  | 'expense_logged'
  | 'price_changed'
  | 'product_created'
  | 'product_edited'
  | 'khata_repayment'
  | 'customer_created'
  | 'login'
  | 'logout'
  | 'password_changed';

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

export interface ActivityFeedResponse {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLoginsResponse {
  entries: ActivityLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at: string;
  };
  month: number;
  year: number;
  stats: {
    bills_handled: number;
    revenue_processed: number;
    purchases_entered: number;
    stock_adjustments: number;
    khata_repayments: number;
    price_changes: number;
    expenses_logged: number;
  };
  recent_activity: ActivityLogEntry[];
  login_history: {
    created_at: string;
    ip_address: string | null;
  }[];
}

export interface ActivityFeedFilters {
  date_from?: string;
  date_to?: string;
  user_id?: string;
  action_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ActivityLoginFilters {
  user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export const activityApi = {
  getSummary: (date?: string) =>
    api.get<UserActivitySummary[]>('/activity/summary', { params: { date } }).then((r) => r.data),

  getFeed: (filters: ActivityFeedFilters) =>
    api.get<ActivityFeedResponse>('/activity/feed', { params: filters }).then((r) => r.data),

  getUserProfile: (userId: string, month?: number, year?: number) =>
    api.get<ActivityProfileResponse>(`/activity/users/${userId}/profile`, { params: { month, year } }).then((r) => r.data),

  getLoginHistory: (filters: ActivityLoginFilters) =>
    api.get<ActivityLoginsResponse>('/activity/logins', { params: filters }).then((r) => r.data),
};
