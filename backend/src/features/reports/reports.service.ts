import { supabase } from '../../db/supabase.js';

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  category_name: string | null;
  stock_qty: number;
  low_stock_threshold: number;
  unit: string;
  price: number;
}

export interface RecentPriceChange {
  id: string;
  product_name: string;
  old_price: number;
  new_price: number;
  changed_by_name: string | null;
  changed_at: string;
}

export const reportsService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data: products, error } = await supabase
      .from('products')
      .select('price, stock_qty, low_stock_threshold')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }

    const totalProducts = products?.length || 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let inventoryValue = 0;

    for (const p of products || []) {
      const stock = Number(p.stock_qty);
      const threshold = Number(p.low_stock_threshold);
      const price = Number(p.price);

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= threshold) {
        lowStockCount++;
      }

      if (stock > 0) {
        inventoryValue += price * stock;
      }
    }

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      inventoryValue: Math.round(inventoryValue * 100) / 100,
    };
  },

  getLowStockProducts: async (): Promise<LowStockProduct[]> => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        stock_qty,
        low_stock_threshold,
        unit,
        price,
        categories ( name )
      `)
      .eq('is_active', true)
      .order('stock_qty', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch low stock products: ${error.message}`);
    }

    return (data || [])
      .filter((p: any) => p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold)
      .slice(0, 20)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        category_name: p.categories?.name || null,
        stock_qty: p.stock_qty,
        low_stock_threshold: p.low_stock_threshold,
        unit: p.unit,
        price: Number(p.price),
      }));
  },

  getRecentPriceChanges: async (limit: number = 10): Promise<RecentPriceChange[]> => {
    // Fetch a larger pool of changes to allow deduplication of products in memory
    const fetchLimit = Math.max(limit * 5, 100);
    const { data, error } = await supabase
      .from('price_history')
      .select(`
        id,
        product_id,
        old_price,
        new_price,
        changed_at,
        products ( name ),
        users:changed_by ( name )
      `)
      .order('changed_at', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      throw new Error(`Failed to fetch recent price changes: ${error.message}`);
    }

        const seenProducts = new Set<string>();
    const uniqueChanges: RecentPriceChange[] = [];

    for (const entry of (data as any) || []) {
      const productId = entry.product_id;
      if (!seenProducts.has(productId)) {
        seenProducts.add(productId);
        uniqueChanges.push({
          id: entry.id,
          product_name: entry.products?.name || 'Unknown Product',
          old_price: Number(entry.old_price),
          new_price: Number(entry.new_price),
          changed_by_name: entry.users?.name || null,
          changed_at: entry.changed_at,
        });
        if (uniqueChanges.length >= limit) {
          break;
        }
      }
    }

    return uniqueChanges;
  },
};
