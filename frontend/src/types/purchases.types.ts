export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  total_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  purchase_order_id?: string;
  product_id: string;
  product_name: string;
  qty: number;
  cost_price: number;
  sell_price: number | null;
  previous_cost?: number;
  previous_sell?: number;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  order_date: string;
  reference_number: string | null;
  total: number;
  item_count: number;
  payment_status: 'paid' | 'credit' | 'partial';
  amount_paid: number;
  note: string | null;
  status: 'confirmed' | 'cancelled';
  created_by: string;
  created_at: string;
  purchase_order_items?: PurchaseItem[];
}

export interface Expense {
  id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  category: 'packaging' | 'transport' | 'maintenance' | 'utilities' | 'other';
  amount: number;
  description: string | null;
  expense_date: string;
  created_by: string;
  created_at: string;
}

export interface SupplierRepaymentInput {
  amount: number;
  note?: string | null;
}
export interface CreatePurchaseItemInput {
  product_id: string;
  product_name: string;
  qty: number;
  cost_price: number;
  sell_price?: number | null;
}

export interface CreatePurchaseOrderInput {
  supplier_id?: string | null;
  supplier_name: string;
  order_date?: string;
  reference_number?: string | null;
  payment_status: 'paid' | 'credit' | 'partial';
  amount_paid?: number;
  note?: string | null;
  items: CreatePurchaseItemInput[];
}

export interface CreateExpenseInput {
  supplier_id?: string | null;
  supplier_name?: string | null;
  category: 'packaging' | 'transport' | 'maintenance' | 'utilities' | 'other';
  amount: number;
  description?: string | null;
  expense_date?: string;
}

export interface SupplierRepaymentInput {
  amount: number;
  note?: string | null;
}

export interface PurchaseQuery {
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  payment_status?: 'paid' | 'credit' | 'partial';
  status?: 'confirmed' | 'cancelled';
  page?: number;
  limit?: number;
}

export interface ExpenseQuery {
  category?: 'packaging' | 'transport' | 'maintenance' | 'utilities' | 'other';
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface SupplierQuery {
  search?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}
