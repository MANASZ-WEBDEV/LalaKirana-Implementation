import { supabase } from '../../db/supabase.js';

export interface ProductFilters {
  category_id?: string;
  search?: string;
  low_stock?: boolean;
}

export const productsService = {
  getAllProducts: async (filters: ProductFilters, includeInactive: boolean = false) => {
    let query = supabase
      .from('products')
      .select(`
        *,
        categories ( name )
      `);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data || []).map((p: any) => ({
      ...p,
      category_name: p.categories?.name || undefined,
    }));
  },

  getProductById: async (id: string) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories ( name )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }

    return {
      ...data,
      category_name: data.categories?.name || undefined,
    };
  },

  createProduct: async (productData: {
    name: string;
    category_id?: string | null;
    price: number;
    cost_price: number;
    stock_qty?: number;
    low_stock_threshold?: number;
    unit?: string;
    mrp?: number | null;
  }) => {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return data;
  },

  updateProduct: async (
    id: string,
    updateData: {
      name?: string;
      category_id?: string | null;
      price?: number;
      cost_price?: number;
      stock_qty?: number;
      low_stock_threshold?: number;
      unit?: string;
      is_active?: boolean;
      mrp?: number | null;
    },
    userId: string
  ) => {
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    // If the price was updated, associate the user with the trigger-generated price_history entry
    if (updateData.price !== undefined) {
      // Find the latest price history entry where changed_by is null
      const { data: historyData } = await supabase
        .from('price_history')
        .select('id')
        .eq('product_id', id)
        .is('changed_by', null)
        .order('changed_at', { ascending: false })
        .limit(1);

      if (historyData && historyData.length > 0) {
        await supabase
          .from('price_history')
          .update({ changed_by: userId })
          .eq('id', historyData[0].id);
      }
    }

    return data;
  },

  softDeleteProduct: async (id: string) => {
    // Soft delete means setting is_active = false
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to deactivate product: ${error.message}`);
    }

    return data;
  },

  bulkUpdatePrices: async (items: { id: string; price: number }[], userId: string) => {
    // Run updates sequentially or concurrently in a Promise.all (since SupabaseJS doesn't support batch update of individual values in a single query unless we use a custom function/rpc)
    // Concurrency is fast and fine for a few updates
    const updatePromises = items.map(async (item) => {
      // Get current price first to see if it changed
      const { data: currentProduct } = await supabase
        .from('products')
        .select('price')
        .eq('id', item.id)
        .single();

      if (currentProduct && Number(currentProduct.price) !== item.price) {
        return productsService.updateProduct(item.id, { price: item.price }, userId);
      }
      return null;
    });

    const results = await Promise.all(updatePromises);
    return results.filter(Boolean);
  },

  getCategories: async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    return data;
  },

  createCategory: async (name: string) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  },

  updateCategory: async (id: string, name: string) => {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    return data;
  },

  deleteCategory: async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    return { success: true };
  },

  getPriceHistory: async (productId: string) => {
    const { data, error } = await supabase
      .from('price_history')
      .select(`
        *,
        users:changed_by ( name )
      `)
      .eq('product_id', productId)
      .order('changed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch price history: ${error.message}`);
    }

    return (data || []).map((entry: any) => ({
      id: entry.id,
      product_id: entry.product_id,
      old_price: Number(entry.old_price),
      new_price: Number(entry.new_price),
      changed_by: entry.changed_by,
      changed_by_name: entry.users?.name || null,
      changed_at: entry.changed_at,
    }));
  },

  getStockHistory: async (productId: string) => {
    // 1. Fetch raw stock logs
    const { data: logs, error } = await supabase
      .from('stock_log')
      .select(`
        *,
        users:created_by ( name )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch stock log: ${error.message}`);
    }

    if (!logs || logs.length === 0) {
      return [];
    }

    // 2. Extract bill_ids and purchase_order_ids
    const billIds = logs.map(l => l.bill_id).filter(Boolean) as string[];
    const poIds = logs.map(l => l.purchase_order_id).filter(Boolean) as string[];

    // 3. Fetch bills and purchase orders in parallel if any exist
    const billsMap = new Map<string, string>();
    const poMap = new Map<string, string>();

    const fetchPromises: PromiseLike<any>[] = [];

    if (billIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('bills')
          .select('id, bill_number')
          .in('id', billIds)
          .then(({ data }) => {
            (data || []).forEach(b => billsMap.set(b.id, b.bill_number));
          })
      );
    }

    if (poIds.length > 0) {
      fetchPromises.push(
        supabase
          .from('purchase_orders')
          .select('id, reference_number')
          .in('id', poIds)
          .then(({ data }) => {
            (data || []).forEach(po => poMap.set(po.id, po.reference_number));
          })
      );
    }

    await Promise.all(fetchPromises);

    // 4. Map them together
    return logs.map((entry: any) => ({
      id: entry.id,
      product_id: entry.product_id,
      change_qty: Number(entry.change_qty),
      reason: entry.reason,
      bill_id: entry.bill_id,
      bill_number: entry.bill_id ? (billsMap.get(entry.bill_id) || null) : null,
      purchase_order_id: entry.purchase_order_id,
      po_reference: entry.purchase_order_id ? (poMap.get(entry.purchase_order_id) || null) : null,
      note: entry.note,
      created_by: entry.created_by,
      created_by_name: entry.users?.name || null,
      created_at: entry.created_at,
    }));
  },
};
