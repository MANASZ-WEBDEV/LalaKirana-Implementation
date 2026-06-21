export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  price: number;
  cost_price: number;
  stock_qty: number;
  low_stock_threshold: number;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs';
  is_active: boolean;
  price_updated_at: string;
  created_at: string;
  category_name?: string;
}

export interface PriceHistoryEntry {
  id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  changed_by: string | null;
  changed_at: string;
  changed_by_name?: string;
}

export interface ProductFilters {
  category_id?: string;
  search?: string;
  low_stock?: boolean;
}
