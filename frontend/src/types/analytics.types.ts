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
  noCostProductsCount?: number;
  revenueDelta: number | null;
  profitDelta: number | null;
  orderCountDelta: number | null;
  avgOrderValueDelta: number | null;
}

export interface ProfitBreakdown {
  revenue: {
    fullBills: number;
    quickBills: number;
    eod: number;
    total: number;
  };
  cogs: {
    total: number;
    items: {
      product_name: string;
      qty: number;
      cost_price: number;
      price: number;
      total_cost: number;
    }[];
  };
  grossProfit: number;
  expenses: {
    total: number;
    list: {
      id: string;
      category: string;
      amount: number;
      description: string | null;
      expense_date: string;
    }[];
  };
  netProfit: number;
  noCostProductsCount: number;
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
