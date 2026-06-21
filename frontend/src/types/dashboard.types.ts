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
