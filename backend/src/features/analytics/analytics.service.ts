import { supabase } from '../../db/supabase.js';

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  orderCount: number;
  avgOrderValue: number;
  // Deltas vs previous period
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

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────

function getPreviousPeriod(from: string, to: string): { prevFrom: string; prevTo: string } {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevTo = new Date(fromDate.getTime() - 1); // day before 'from'
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return {
    prevFrom: prevFrom.toISOString().split('T')[0],
    prevTo: prevTo.toISOString().split('T')[0],
  };
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10; // one decimal
}

// ────────────────────────────────────────────────────────
// Revenue aggregation from all sources
// ────────────────────────────────────────────────────────

async function getBillRevenue(from: string, to: string) {
  // Full bills — revenue from bill_items
  const { data: fullBills, error: fullErr } = await supabase
    .from('bills')
    .select(`
      id,
      total,
      mode,
      created_at,
      bill_items ( qty, unit_price, cost_price )
    `)
    .in('status', ['paid', 'khata'])
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`);

  if (fullErr) throw new Error(`Failed to fetch bills: ${fullErr.message}`);

  let revenue = 0;
  let cost = 0;
  let orderCount = 0;

  for (const bill of fullBills || []) {
    orderCount++;
    if (bill.mode === 'full' && Array.isArray(bill.bill_items)) {
      for (const item of bill.bill_items as any[]) {
        const qty = Number(item.qty);
        revenue += qty * Number(item.unit_price);
        cost += qty * Number(item.cost_price || 0);
      }
    } else {
      // Quick bills — just use total as revenue, cost unknown
      revenue += Number(bill.total);
    }
  }

  return { revenue, cost, orderCount };
}

async function getEODRevenue(from: string, to: string) {
  const { data: entries, error } = await supabase
    .from('eod_entries')
    .select('qty_sold, unit_price, cost_price')
    .gte('entry_date', from)
    .lte('entry_date', to);

  if (error) throw new Error(`Failed to fetch EOD entries: ${error.message}`);

  let revenue = 0;
  let cost = 0;

  for (const e of entries || []) {
    const qty = Number(e.qty_sold);
    revenue += qty * Number(e.unit_price || 0);
    cost += qty * Number(e.cost_price || 0);
  }

  return { revenue, cost };
}

async function getExpensesTotal(from: string, to: string): Promise<number> {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .gte('expense_date', from)
    .lte('expense_date', to);

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return (data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

// ────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Overview stats for a date range + delta comparison with previous period
   */
  getOverview: async (from: string, to: string): Promise<AnalyticsOverview> => {
    const billData = await getBillRevenue(from, to);
    const eodData = await getEODRevenue(from, to);
    const expensesTotal = await getExpensesTotal(from, to);

    const totalRevenue = Math.round((billData.revenue + eodData.revenue) * 100) / 100;
    const totalCost = Math.round((billData.cost + eodData.cost) * 100) / 100;
    const totalProfit = Math.round((totalRevenue - totalCost - expensesTotal) * 100) / 100;
    const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 1000) / 10 : 0;
    const orderCount = billData.orderCount;
    const avgOrderValue = orderCount > 0 ? Math.round((billData.revenue / orderCount) * 100) / 100 : 0;

    // Previous period comparison
    const { prevFrom, prevTo } = getPreviousPeriod(from, to);
    const prevBill = await getBillRevenue(prevFrom, prevTo);
    const prevEod = await getEODRevenue(prevFrom, prevTo);
    const prevExpenses = await getExpensesTotal(prevFrom, prevTo);

    const prevRevenue = prevBill.revenue + prevEod.revenue;
    const prevProfit = (prevBill.revenue + prevEod.revenue) - (prevBill.cost + prevEod.cost) - prevExpenses;
    const prevOrderCount = prevBill.orderCount;
    const prevAvgOrder = prevOrderCount > 0 ? prevBill.revenue / prevOrderCount : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      orderCount,
      avgOrderValue,
      revenueDelta: calcDelta(totalRevenue, prevRevenue),
      profitDelta: calcDelta(totalProfit, prevProfit),
      orderCountDelta: calcDelta(orderCount, prevOrderCount),
      avgOrderValueDelta: calcDelta(avgOrderValue, prevAvgOrder),
    };
  },

  /**
   * Time-series trend data grouped by day/week/month
   */
  getTrend: async (from: string, to: string, granularity: 'day' | 'week' | 'month' = 'day'): Promise<TrendPoint[]> => {
    // Fetch all bill items with their bill date in range
    const { data: bills, error: billErr } = await supabase
      .from('bills')
      .select(`
        id,
        total,
        mode,
        created_at,
        bill_items ( qty, unit_price, cost_price )
      `)
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: true });

    if (billErr) throw new Error(`Failed to fetch trend bills: ${billErr.message}`);

    // Fetch EOD entries
    const { data: eodEntries, error: eodErr } = await supabase
      .from('eod_entries')
      .select('entry_date, qty_sold, unit_price, cost_price')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .order('entry_date', { ascending: true });

    if (eodErr) throw new Error(`Failed to fetch trend EOD: ${eodErr.message}`);

    // Fetch expenses
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('expense_date, amount')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date', { ascending: true });

    if (expErr) throw new Error(`Failed to fetch trend expenses: ${expErr.message}`);

    // Build a map of date → { revenue, cost, orderCount }
    const map = new Map<string, { revenue: number; cost: number; orderCount: number }>();

    const getKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (granularity === 'day') {
        return d.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        // ISO week start (Monday)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
      } else {
        // month
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { revenue: 0, cost: 0, orderCount: 0 });
      return map.get(key)!;
    };

    // Process bills
    for (const bill of bills || []) {
      const key = getKey(bill.created_at);
      const bucket = ensure(key);
      bucket.orderCount++;

      if (bill.mode === 'full' && Array.isArray(bill.bill_items)) {
        for (const item of bill.bill_items as any[]) {
          const qty = Number(item.qty);
          bucket.revenue += qty * Number(item.unit_price);
          bucket.cost += qty * Number(item.cost_price || 0);
        }
      } else {
        bucket.revenue += Number(bill.total);
      }
    }

    // Process EOD
    for (const e of eodEntries || []) {
      const key = getKey(e.entry_date);
      const bucket = ensure(key);
      const qty = Number(e.qty_sold);
      bucket.revenue += qty * Number(e.unit_price || 0);
      bucket.cost += qty * Number(e.cost_price || 0);
    }

    // Process expenses
    for (const exp of expenses || []) {
      const key = getKey(exp.expense_date);
      const bucket = ensure(key);
      bucket.cost += Number(exp.amount || 0);
    }

    // Fill gaps: generate all dates/weeks/months in range
    const result: TrendPoint[] = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const key = getKey(cursor.toISOString());
      const bucket = map.get(key) || { revenue: 0, cost: 0, orderCount: 0 };
      
      // Only add if we haven't already added this key
      if (!result.length || result[result.length - 1].date !== key) {
        result.push({
          date: key,
          revenue: Math.round(bucket.revenue * 100) / 100,
          cost: Math.round(bucket.cost * 100) / 100,
          profit: Math.round((bucket.revenue - bucket.cost) * 100) / 100,
          orderCount: bucket.orderCount,
        });
      }

      // Advance cursor
      if (granularity === 'day') {
        cursor.setDate(cursor.getDate() + 1);
      } else if (granularity === 'week') {
        cursor.setDate(cursor.getDate() + 7);
      } else {
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return result;
  },

  /**
   * Top N products by revenue
   */
  getTopProducts: async (from: string, to: string, limit: number = 10): Promise<TopProduct[]> => {
    // Bill items with product data
    const { data: bills, error: billErr } = await supabase
      .from('bills')
      .select(`
        bill_items ( product_id, product_name, qty, unit_price, cost_price )
      `)
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    if (billErr) throw new Error(`Failed to fetch top products: ${billErr.message}`);

    // EOD entries
    const { data: eodEntries, error: eodErr } = await supabase
      .from('eod_entries')
      .select('product_id, product_name, qty_sold, unit_price, cost_price')
      .gte('entry_date', from)
      .lte('entry_date', to);

    if (eodErr) throw new Error(`Failed to fetch EOD for top products: ${eodErr.message}`);

    // Aggregate by product_id
    const productMap = new Map<string, TopProduct>();

    const ensureProduct = (id: string, name: string): TopProduct => {
      if (!productMap.has(id)) {
        productMap.set(id, {
          product_id: id,
          product_name: name,
          category_name: null,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalQty: 0,
        });
      }
      return productMap.get(id)!;
    };

    // Process bill items
    for (const bill of bills || []) {
      if (!Array.isArray(bill.bill_items)) continue;
      for (const item of bill.bill_items as any[]) {
        if (!item.product_id) continue;
        const p = ensureProduct(item.product_id, item.product_name);
        const qty = Number(item.qty);
        p.totalRevenue += qty * Number(item.unit_price);
        p.totalCost += qty * Number(item.cost_price || 0);
        p.totalQty += qty;
      }
    }

    // Process EOD
    for (const e of eodEntries || []) {
      if (!e.product_id) continue;
      const p = ensureProduct(e.product_id, e.product_name);
      const qty = Number(e.qty_sold);
      p.totalRevenue += qty * Number(e.unit_price || 0);
      p.totalCost += qty * Number(e.cost_price || 0);
      p.totalQty += qty;
    }

    // Enrich with category names
    const productIds = Array.from(productMap.keys());
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, categories ( name )')
        .in('id', productIds);

      for (const prod of products || []) {
        const mapped = productMap.get(prod.id);
        if (mapped) {
          mapped.category_name = (prod as any).categories?.name || null;
        }
      }
    }

    // Calculate profit and sort by revenue
    const result = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        totalCost: Math.round(p.totalCost * 100) / 100,
        totalProfit: Math.round((p.totalRevenue - p.totalCost) * 100) / 100,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return result;
  },

  /**
   * Revenue breakdown by category
   */
  getCategoryBreakdown: async (from: string, to: string): Promise<CategoryBreakdown[]> => {
    const topProducts = await analyticsService.getTopProducts(from, to, 1000);

    // Group by category
    const catMap = new Map<string, { revenue: number; cost: number }>();

    for (const p of topProducts) {
      const catName = p.category_name || 'Uncategorized';
      if (!catMap.has(catName)) catMap.set(catName, { revenue: 0, cost: 0 });
      const cat = catMap.get(catName)!;
      cat.revenue += p.totalRevenue;
      cat.cost += p.totalCost;
    }

    const totalRevenue = Array.from(catMap.values()).reduce((sum, c) => sum + c.revenue, 0);

    return Array.from(catMap.entries())
      .map(([name, data]) => ({
        category_name: name,
        revenue: Math.round(data.revenue * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        profit: Math.round((data.revenue - data.cost) * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  },

  /**
   * CSV export of sales data
   */
  exportCSV: async (from: string, to: string): Promise<string> => {
    const topProducts = await analyticsService.getTopProducts(from, to, 1000);

    const header = 'Product,Category,Qty Sold,Revenue (₹),Cost (₹),Profit (₹),Margin (%)';
    const rows = topProducts.map((p) => {
      const margin = p.totalRevenue > 0
        ? Math.round(((p.totalRevenue - p.totalCost) / p.totalRevenue) * 1000) / 10
        : 0;
      return `"${p.product_name}","${p.category_name || 'Uncategorized'}",${p.totalQty},${p.totalRevenue},${p.totalCost},${p.totalProfit},${margin}`;
    });

    return [header, ...rows].join('\n');
  },
};
