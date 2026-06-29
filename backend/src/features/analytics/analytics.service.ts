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
  noCostProductsCount: number;
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
  totalDiscount: number;
  netRevenue: number;
  netProfit: number;
  discountBillCount: number;
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
      bill_items ( qty, cost_price, subtotal )
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
        revenue += Number(item.subtotal || 0);
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

async function getNoCostProductsCount(): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .select('id, cost_price')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to count no-cost products: ${error.message}`);
  }

  return (data || []).filter(
    (p) => p.cost_price === null || p.cost_price === undefined || Number(p.cost_price) === 0
  ).length;
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
    const noCostProductsCount = await getNoCostProductsCount();

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
      noCostProductsCount,
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
        bill_items ( qty, cost_price, subtotal )
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
          bucket.revenue += Number(item.subtotal || 0);
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
        bill_items ( product_id, product_name, qty, unit_price, cost_price, discount, subtotal )
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
    const productMap = new Map<string, any>();

    const ensureProduct = (id: string, name: string): any => {
      if (!productMap.has(id)) {
        productMap.set(id, {
          product_id: id,
          product_name: name,
          category_name: null,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalQty: 0,
          totalDiscount: 0,
          netRevenue: 0,
          netProfit: 0,
          discountBillCount: 0,
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
        p.totalDiscount += Number(item.discount || 0);
        p.netRevenue += Number(item.subtotal || (qty * Number(item.unit_price) - Number(item.discount || 0)));
        if (Number(item.discount || 0) > 0) {
          p.discountBillCount += 1;
        }
      }
    }

    // Process EOD
    for (const e of eodEntries || []) {
      if (!e.product_id) continue;
      const p = ensureProduct(e.product_id, e.product_name);
      const qty = Number(e.qty_sold);
      const itemPrice = Number(e.unit_price || 0);
      p.totalRevenue += qty * itemPrice;
      p.totalCost += qty * Number(e.cost_price || 0);
      p.totalQty += qty;
      p.netRevenue += qty * itemPrice;
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

    // Calculate profit and sort by net revenue
    const result = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        totalCost: Math.round(p.totalCost * 100) / 100,
        totalQty: p.totalQty,
        totalDiscount: Math.round(p.totalDiscount * 100) / 100,
        netRevenue: Math.round(p.netRevenue * 100) / 100,
        netProfit: Math.round((p.netRevenue - p.totalCost) * 100) / 100,
        totalProfit: Math.round((p.netRevenue - p.totalCost) * 100) / 100,
        discountBillCount: p.discountBillCount,
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue)
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
   * Complete Net Profit calculation breakdown
   */
  getProfitBreakdown: async (from: string, to: string) => {
    // 1. Revenue components
    // Full bills
    const { data: fullBills, error: fullErr } = await supabase
      .from('bills')
      .select('total, mode, bill_items ( qty, unit_price, cost_price, subtotal )')
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    if (fullErr) throw new Error(`Failed to fetch breakdown bills: ${fullErr.message}`);

    let fullBillsRevenue = 0;
    let quickBillsRevenue = 0;
    for (const bill of fullBills || []) {
      if (bill.mode === 'full') {
        for (const item of (bill.bill_items as any[]) || []) {
          fullBillsRevenue += Number(item.subtotal || 0);
        }
      } else {
        quickBillsRevenue += Number(bill.total);
      }
    }

    // EOD
    const { data: eodEntries, error: eodErr } = await supabase
      .from('eod_entries')
      .select('qty_sold, unit_price')
      .gte('entry_date', from)
      .lte('entry_date', to);

    if (eodErr) throw new Error(`Failed to fetch breakdown EOD: ${eodErr.message}`);

    let eodRevenue = 0;
    for (const e of eodEntries || []) {
      eodRevenue += Number(e.qty_sold) * Number(e.unit_price || 0);
    }

    // 2. COGS breakdown (per product sold)
    const topProducts = await analyticsService.getTopProducts(from, to, 1000);
    const cogsItems = topProducts.map((p) => {
      const avgCost = p.totalQty > 0 ? p.totalCost / p.totalQty : 0;
      const avgPrice = p.totalQty > 0 ? p.netRevenue / p.totalQty : 0;
      return {
        product_name: p.product_name,
        qty: p.totalQty,
        cost_price: Math.round(avgCost * 100) / 100,
        price: Math.round(avgPrice * 100) / 100,
        total_cost: Math.round(p.totalCost * 100) / 100,
      };
    }).filter(item => item.qty > 0 && item.total_cost > 0);

    const totalCogs = cogsItems.reduce((sum, item) => sum + item.total_cost, 0);

    // 3. Operational Expenses
    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('id, category, amount, description, expense_date')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .order('expense_date', { ascending: true });

    if (expErr) throw new Error(`Failed to fetch breakdown expenses: ${expErr.message}`);

    const expensesList = (expenses || []).map(exp => ({
      id: exp.id,
      category: exp.category,
      amount: Number(exp.amount),
      description: exp.description,
      expense_date: exp.expense_date,
    }));

    const totalExpenses = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    // 4. Missing Cost Count
    const noCostProductsCount = await getNoCostProductsCount();

    const totalRevenue = Math.round((fullBillsRevenue + quickBillsRevenue + eodRevenue) * 100) / 100;
    const grossProfit = Math.round((totalRevenue - totalCogs) * 100) / 100;
    const netProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;

    return {
      revenue: {
        fullBills: Math.round(fullBillsRevenue * 100) / 100,
        quickBills: Math.round(quickBillsRevenue * 100) / 100,
        eod: Math.round(eodRevenue * 100) / 100,
        total: totalRevenue,
      },
      cogs: {
        total: Math.round(totalCogs * 100) / 100,
        items: cogsItems,
      },
      grossProfit,
      expenses: {
        total: Math.round(totalExpenses * 100) / 100,
        list: expensesList,
      },
      netProfit,
      noCostProductsCount,
    };
  },

  /**
   * Paginated, searchable, sortable list of all active products with analytics metrics
   */
  getAllProductsAnalytics: async (
    from: string,
    to: string,
    sortBy: string = 'netRevenue',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string,
    categoryName?: string,
    page: number = 1,
    limit: number = 25
  ) => {
    // 1. Fetch sales data from bills (paid, khata)
    const { data: bills, error: billErr } = await supabase
      .from('bills')
      .select(`
        bill_items ( product_id, product_name, qty, unit_price, cost_price, discount, subtotal, is_loose )
      `)
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    if (billErr) throw new Error(`Failed to fetch sales for product table: ${billErr.message}`);

    // 2. Fetch sales from EOD entries
    const { data: eodEntries, error: eodErr } = await supabase
      .from('eod_entries')
      .select('product_id, product_name, qty_sold, unit_price, cost_price')
      .gte('entry_date', from)
      .lte('entry_date', to);

    if (eodErr) throw new Error(`Failed to fetch EOD for product table: ${eodErr.message}`);

    // 3. Fetch all active products in DB
    const { data: activeProducts, error: prodErr } = await supabase
      .from('products')
      .select('id, name, unit, is_loose, categories ( name )')
      .eq('is_active', true);

    if (prodErr) throw new Error(`Failed to fetch products: ${prodErr.message}`);

    // Map for aggregates
    const productMap = new Map<string, any>();

    // Initialise with all active products
    for (const p of activeProducts || []) {
      productMap.set(p.id, {
        product_id: p.id,
        product_name: p.name,
        category_name: (p as any).categories?.name || null,
        is_loose: p.is_loose,
        unit: p.unit,
        totalQtySold: 0,
        grossRevenue: 0,
        totalDiscount: 0,
        netRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        profitMargin: 0,
        billCount: 0,
        discountBillCount: 0,
      });
    }

    // Process bill items
    for (const bill of bills || []) {
      if (!Array.isArray(bill.bill_items)) continue;
      
      const productsInThisBill = new Set<string>();
      const productsWithDiscountInThisBill = new Set<string>();

      for (const item of bill.bill_items as any[]) {
        if (!item.product_id) continue;
        
        let p = productMap.get(item.product_id);
        if (!p) {
          p = {
            product_id: item.product_id,
            product_name: item.product_name,
            category_name: null,
            is_loose: !!item.is_loose,
            unit: 'pcs',
            totalQtySold: 0,
            grossRevenue: 0,
            totalDiscount: 0,
            netRevenue: 0,
            totalCost: 0,
            netProfit: 0,
            profitMargin: 0,
            billCount: 0,
            discountBillCount: 0,
          };
          productMap.set(item.product_id, p);
        }

        const qty = Number(item.qty);
        p.totalQtySold += qty;
        p.grossRevenue += qty * Number(item.unit_price || 0);
        const itemDiscount = Number(item.discount || 0);
        p.totalDiscount += itemDiscount;
        p.netRevenue += Number(item.subtotal || (qty * Number(item.unit_price) - itemDiscount));
        p.totalCost += qty * Number(item.cost_price || 0);

        productsInThisBill.add(item.product_id);
        if (itemDiscount > 0) {
          productsWithDiscountInThisBill.add(item.product_id);
        }
      }

      for (const pid of productsInThisBill) {
        productMap.get(pid).billCount += 1;
      }
      for (const pid of productsWithDiscountInThisBill) {
        productMap.get(pid).discountBillCount += 1;
      }
    }

    // Process EOD
    for (const e of eodEntries || []) {
      if (!e.product_id) continue;
      let p = productMap.get(e.product_id);
      if (!p) {
        p = {
          product_id: e.product_id,
          product_name: e.product_name,
          category_name: null,
          is_loose: false,
          unit: 'pcs',
          totalQtySold: 0,
          grossRevenue: 0,
          totalDiscount: 0,
          netRevenue: 0,
          totalCost: 0,
          netProfit: 0,
          profitMargin: 0,
          billCount: 0,
          discountBillCount: 0,
        };
        productMap.set(e.product_id, p);
      }
      const qty = Number(e.qty_sold);
      const unitPrice = Number(e.unit_price || 0);
      p.totalQtySold += qty;
      p.grossRevenue += qty * unitPrice;
      p.netRevenue += qty * unitPrice;
      p.totalCost += qty * Number(e.cost_price || 0);
    }

    // Calculate profit margins & net profits
    let allProducts = Array.from(productMap.values()).map((p) => {
      p.netProfit = p.netRevenue - p.totalCost;
      p.profitMargin = p.netRevenue > 0 ? (p.netProfit / p.netRevenue) * 100 : 0;

      // Round values
      p.totalQtySold = Math.round(p.totalQtySold * 1000) / 1000;
      p.grossRevenue = Math.round(p.grossRevenue * 100) / 100;
      p.totalDiscount = Math.round(p.totalDiscount * 100) / 100;
      p.netRevenue = Math.round(p.netRevenue * 100) / 100;
      p.totalCost = Math.round(p.totalCost * 100) / 100;
      p.netProfit = Math.round(p.netProfit * 100) / 100;
      p.profitMargin = Math.round(p.profitMargin * 10) / 10;
      return p;
    });

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      allProducts = allProducts.filter(p => p.product_name.toLowerCase().includes(q));
    }

    // Apply category filter
    if (categoryName) {
      allProducts = allProducts.filter(p => p.category_name === categoryName);
    }

    // Sort
    allProducts.sort((a, b) => {
      let valA = a[sortBy] !== undefined ? a[sortBy] : 0;
      let valB = b[sortBy] !== undefined ? b[sortBy] : 0;

      if (typeof valA === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortOrder === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });

    // Global summary values
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalProfit = 0;
    let zeroSalesCount = 0;

    for (const p of allProducts) {
      totalRevenue += p.netRevenue;
      totalDiscount += p.totalDiscount;
      totalProfit += p.netProfit;
      if (p.totalQtySold === 0) {
        zeroSalesCount++;
      }
    }

    // Paginate
    const offset = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(offset, offset + limit);

    return {
      products: paginatedProducts,
      total: allProducts.length,
      page,
      limit,
      totalPages: Math.ceil(allProducts.length / limit),
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        productCount: allProducts.length,
        zeroSalesCount,
      }
    };
  },

  /**
   * Detailed analytics for a single product, including previous-period comparisons and staff discount breakdown
   */
  getProductAnalytics: async (productId: string, from: string, to: string) => {
    // Fetch product details
    const { data: prod, error: prodErr } = await supabase
      .from('products')
      .select('id, name, unit, is_loose, categories ( name )')
      .eq('id', productId)
      .single();

    if (prodErr || !prod) {
      throw new Error(`Product not found: ${prodErr?.message || 'ID matches nothing'}`);
    }

    const getPeriodStats = async (pFrom: string, pTo: string) => {
      // Fetch bills
      const { data: bills, error: billErr } = await supabase
        .from('bills')
        .select(`
          created_by,
          users:created_by ( name ),
          bill_items ( product_id, qty, unit_price, cost_price, discount, subtotal )
        `)
        .in('status', ['paid', 'khata'])
        .gte('created_at', `${pFrom}T00:00:00`)
        .lte('created_at', `${pTo}T23:59:59`);

      if (billErr) throw new Error(`Failed to fetch bill items: ${billErr.message}`);

      let totalQtySold = 0;
      let grossRevenue = 0;
      let totalDiscount = 0;
      let netRevenue = 0;
      let totalCost = 0;
      let billCount = 0;
      let discountBillCount = 0;

      const staffMap = new Map<string, { staff_id: string; staff_name: string; totalDiscount: number; billCount: number }>();

      for (const bill of bills || []) {
        if (!Array.isArray(bill.bill_items)) continue;

        let hasProduct = false;
        let hasDiscountOnProduct = false;
        let productDiscountInBill = 0;

        for (const item of bill.bill_items as any[]) {
          if (item.product_id !== productId) continue;

          hasProduct = true;
          const qty = Number(item.qty);
          totalQtySold += qty;
          grossRevenue += qty * Number(item.unit_price || 0);
          
          const disc = Number(item.discount || 0);
          totalDiscount += disc;
          if (disc > 0) {
            hasDiscountOnProduct = true;
            productDiscountInBill += disc;
          }
          netRevenue += Number(item.subtotal || (qty * Number(item.unit_price) - disc));
          totalCost += qty * Number(item.cost_price || 0);
        }

        if (hasProduct) {
          billCount++;
          if (hasDiscountOnProduct) {
            discountBillCount++;
          }

          const staffId = bill.created_by || 'unknown';
          const staffName = (bill.users as any)?.name || 'Unknown Staff';
          if (!staffMap.has(staffId)) {
            staffMap.set(staffId, {
              staff_id: staffId,
              staff_name: staffName,
              totalDiscount: 0,
              billCount: 0,
            });
          }
          const s = staffMap.get(staffId)!;
          s.totalDiscount += productDiscountInBill;
          s.billCount++;
        }
      }

      // EOD entries
      const { data: eodEntries, error: eodErr } = await supabase
        .from('eod_entries')
        .select('qty_sold, unit_price, cost_price')
        .eq('product_id', productId)
        .gte('entry_date', pFrom)
        .lte('entry_date', pTo);

      if (eodErr) throw new Error(`Failed to fetch EOD: ${eodErr.message}`);

      for (const e of eodEntries || []) {
        const qty = Number(e.qty_sold);
        const uPrice = Number(e.unit_price || 0);
        totalQtySold += qty;
        grossRevenue += qty * uPrice;
        netRevenue += qty * uPrice;
        totalCost += qty * Number(e.cost_price || 0);
      }

      const grossProfit = netRevenue - totalCost;
      const profitMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
      const avgSellingPrice = totalQtySold > 0 ? netRevenue / totalQtySold : 0;

      return {
        totalQtySold: Math.round(totalQtySold * 1000) / 1000,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        avgSellingPrice: Math.round(avgSellingPrice * 100) / 100,
        billCount,
        discountBillCount,
        staffDiscounts: Array.from(staffMap.values()).map(s => ({
          ...s,
          totalDiscount: Math.round(s.totalDiscount * 100) / 100,
        })),
      };
    };

    const current = await getPeriodStats(from, to);
    const { prevFrom, prevTo } = getPreviousPeriod(from, to);
    const previous = await getPeriodStats(prevFrom, prevTo);

    return {
      product_id: prod.id,
      product_name: prod.name,
      category_name: (prod as any).categories?.name || null,
      is_loose: prod.is_loose,
      unit: prod.unit,
      ...current,
      qtyDelta: calcDelta(current.totalQtySold, previous.totalQtySold),
      revenueDelta: calcDelta(current.netRevenue, previous.netRevenue),
      profitDelta: calcDelta(current.grossProfit, previous.grossProfit),
      discountDelta: calcDelta(current.totalDiscount, previous.totalDiscount),
    };
  },

  /**
   * Single product sales trend points
   */
  getProductTrend: async (
    productId: string,
    from: string,
    to: string,
    granularity: 'day' | 'week' | 'month' = 'day'
  ) => {
    // 1. Fetch bills
    const { data: bills, error: billErr } = await supabase
      .from('bills')
      .select(`
        id,
        created_at,
        bill_items ( product_id, qty, unit_price, cost_price, discount, subtotal )
      `)
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    if (billErr) throw new Error(`Failed to fetch trend bills: ${billErr.message}`);

    // 2. Fetch EOD entries
    const { data: eodEntries, error: eodErr } = await supabase
      .from('eod_entries')
      .select('entry_date, qty_sold, unit_price, cost_price')
      .eq('product_id', productId)
      .gte('entry_date', from)
      .lte('entry_date', to);

    if (eodErr) throw new Error(`Failed to fetch trend EOD: ${eodErr.message}`);

    const map = new Map<string, { qtySold: number; revenue: number; cost: number; discount: number }>();

    const getKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (granularity === 'day') {
        return d.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    const ensureBucket = (key: string) => {
      if (!map.has(key)) map.set(key, { qtySold: 0, revenue: 0, cost: 0, discount: 0 });
      return map.get(key)!;
    };

    for (const bill of bills || []) {
      if (!Array.isArray(bill.bill_items)) continue;

      const key = getKey(bill.created_at);
      const bucket = ensureBucket(key);

      for (const item of bill.bill_items as any[]) {
        if (item.product_id !== productId) continue;
        
        const qty = Number(item.qty);
        bucket.qtySold += qty;
        const disc = Number(item.discount || 0);
        bucket.discount += disc;
        bucket.revenue += Number(item.subtotal || (qty * Number(item.unit_price) - disc));
        bucket.cost += qty * Number(item.cost_price || 0);
      }
    }

    for (const e of eodEntries || []) {
      const key = getKey(e.entry_date);
      const bucket = ensureBucket(key);
      const qty = Number(e.qty_sold);
      bucket.qtySold += qty;
      bucket.revenue += qty * Number(e.unit_price || 0);
      bucket.cost += qty * Number(e.cost_price || 0);
    }

    const result: { date: string; qtySold: number; revenue: number; cost: number; profit: number; discount: number }[] = [];
    const startDate = new Date(from);
    const endDate = new Date(to);
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const key = getKey(cursor.toISOString());
      const bucket = map.get(key) || { qtySold: 0, revenue: 0, cost: 0, discount: 0 };

      if (!result.length || result[result.length - 1].date !== key) {
        result.push({
          date: key,
          qtySold: Math.round(bucket.qtySold * 1000) / 1000,
          revenue: Math.round(bucket.revenue * 100) / 100,
          cost: Math.round(bucket.cost * 100) / 100,
          profit: Math.round((bucket.revenue - bucket.cost) * 100) / 100,
          discount: Math.round(bucket.discount * 100) / 100,
        });
      }

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
   * Audit summary showing how much discount each staff member has given
   */
  getStaffDiscountAudit: async (
    from: string,
    to: string,
    granularity: 'day' | 'week' | 'month' = 'day'
  ) => {
    const { data: bills, error: billErr } = await supabase
      .from('bills')
      .select(`
        id,
        created_at,
        created_by,
        discount_total,
        users:created_by ( name, role ),
        bill_items ( product_id, product_name, qty, discount )
      `)
      .in('status', ['paid', 'khata'])
      .gt('discount_total', 0)
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);

    if (billErr) throw new Error(`Failed to fetch bills for staff audit: ${billErr.message}`);

    const getKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (granularity === 'day') {
        return d.toISOString().split('T')[0];
      } else if (granularity === 'week') {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      }
    };

    const staffMap = new Map<string, any>();

    const ensureStaff = (id: string, name: string, role: string) => {
      if (!staffMap.has(id)) {
        staffMap.set(id, {
          staff_id: id,
          staff_name: name,
          staff_role: role,
          totalDiscount: 0,
          billCount: 0,
          avgDiscountPerBill: 0,
          breakdownMap: new Map<string, { date: string; discount: number; billCount: number }>(),
          productsMap: new Map<string, { product_id: string; product_name: string; totalDiscount: number; billCount: number }>(),
        });
      }
      return staffMap.get(id)!;
    };

    for (const bill of bills || []) {
      const staffId = bill.created_by || 'unknown';
      const staffName = (bill.users as any)?.name || 'Unknown Staff';
      const staffRole = (bill.users as any)?.role || 'staff';

      const s = ensureStaff(staffId, staffName, staffRole);
      const discountVal = Number(bill.discount_total);

      s.totalDiscount += discountVal;
      s.billCount += 1;

      const dateKey = getKey(bill.created_at);
      if (!s.breakdownMap.has(dateKey)) {
        s.breakdownMap.set(dateKey, { date: dateKey, discount: 0, billCount: 0 });
      }
      const bEntry = s.breakdownMap.get(dateKey)!;
      bEntry.discount += discountVal;
      bEntry.billCount += 1;

      if (Array.isArray(bill.bill_items)) {
        for (const item of bill.bill_items as any[]) {
          const itemDisc = Number(item.discount || 0);
          if (itemDisc <= 0 || !item.product_id) continue;

          const itemTotalDisc = itemDisc;

          if (!s.productsMap.has(item.product_id)) {
            s.productsMap.set(item.product_id, {
              product_id: item.product_id,
              product_name: item.product_name,
              totalDiscount: 0,
              billCount: 0,
            });
          }
          const pEntry = s.productsMap.get(item.product_id)!;
          pEntry.totalDiscount += itemTotalDisc;
          pEntry.billCount += 1;
        }
      }
    }

    return Array.from(staffMap.values()).map(s => {
      s.totalDiscount = Math.round(s.totalDiscount * 100) / 100;
      s.avgDiscountPerBill = s.billCount > 0 ? Math.round((s.totalDiscount / s.billCount) * 100) / 100 : 0;
      
      s.breakdown = Array.from(s.breakdownMap.values())
        .map((b: any) => ({
          ...b,
          discount: Math.round(b.discount * 100) / 100,
        }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));

      s.topProducts = Array.from(s.productsMap.values())
        .map((p: any) => ({
          ...p,
          totalDiscount: Math.round(p.totalDiscount * 100) / 100,
        }))
        .sort((a: any, b: any) => b.totalDiscount - a.totalDiscount)
        .slice(0, 10);

      delete s.breakdownMap;
      delete s.productsMap;
      return s;
    });
  },

  /**
   * Get paginated bills with discounts for a specific staff member
   */
  getStaffDiscountBills: async (
    staffId: string,
    from: string,
    to: string,
    page: number = 1,
    limit: number = 20
  ) => {
    const offset = (page - 1) * limit;

    const { data, count, error } = await supabase
      .from('bills')
      .select(`
        id,
        bill_number,
        created_at,
        total,
        discount_total,
        customers ( name ),
        bill_items ( product_name, qty, unit_price, discount, subtotal )
      `, { count: 'exact' })
      .eq('created_by', staffId)
      .gt('discount_total', 0)
      .in('status', ['paid', 'khata'])
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`Failed to fetch staff discount bills: ${error.message}`);

    const bills = (data || []).map((bill: any) => ({
      bill_id: bill.id,
      bill_number: bill.bill_number,
      created_at: bill.created_at,
      total: Number(bill.total),
      discount_total: Number(bill.discount_total),
      customer_name: bill.customers?.name || 'Walk-in',
      items: (bill.bill_items || []).map((item: any) => ({
        product_name: item.product_name,
        qty: Number(item.qty),
        unit_price: Number(item.unit_price),
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
      })),
    }));

    return {
      bills,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  },

  /**
   * CSV export of sales data
   */
  exportCSV: async (from: string, to: string): Promise<string> => {
    const topProducts = await analyticsService.getTopProducts(from, to, 1000);

    const header = 'Product,Category,Qty Sold,Gross Revenue (₹),Discount Given (₹),Net Revenue (₹),Cost (₹),Profit (₹),Margin (%)';
    const rows = topProducts.map((p) => {
      const margin = p.netRevenue > 0
        ? Math.round(((p.netRevenue - p.totalCost) / p.netRevenue) * 1000) / 10
        : 0;
      return `"${p.product_name}","${p.category_name || 'Uncategorized'}",${p.totalQty},${p.totalRevenue},${p.totalDiscount},${p.netRevenue},${p.totalCost},${p.totalProfit},${margin}`;
    });

    return [header, ...rows].join('\n');
  },
};
