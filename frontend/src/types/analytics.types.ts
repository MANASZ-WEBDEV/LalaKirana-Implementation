// ────────────────────────────────────────────────────────
// Analytics Types
// ────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  orderCount: number;
  avgOrderValue: number;
  revenueDelta: number | null;
  profitDelta: number | null;
  orderCountDelta: number | null;
  avgOrderValueDelta: number | null;
}

export interface TrendPoint {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  orderCount: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  category_name: string | null;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalQty: number;
}

export interface CategoryBreakdown {
  category_name: string;
  revenue: number;
  cost: number;
  profit: number;
  percentage: number;
}

export type DateRangePreset = 'today' | '7d' | '30d' | 'month' | 'ytd' | 'custom';
export type Granularity = 'day' | 'week' | 'month';
