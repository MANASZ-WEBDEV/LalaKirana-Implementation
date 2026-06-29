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
  mrp: number | null;
  stock_qty: number;
  low_stock_threshold: number;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs';
  is_active: boolean;
  is_loose: boolean;
  quick_weight_prices?: Record<string, number>;
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

export interface StockLogEntry {
  id: string;
  product_id: string;
  change_qty: number;
  reason: 'bill_confirm' | 'eod_entry' | 'manual_adjust' | 'damage' | 'audit' | 'returned' | 'purchase_order' | 'bill_cancel' | 'purchase_cancel';
  bill_id: string | null;
  bill_number: string | null;
  purchase_order_id: string | null;
  po_reference: string | null;
  note: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}
