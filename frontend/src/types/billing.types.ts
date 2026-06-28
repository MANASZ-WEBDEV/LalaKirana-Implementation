export interface BillItem {
  id?: string;
  bill_id?: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  cost_price: number;
  discount?: number;
  subtotal?: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  customer_id: string | null;
  total: number;
  mode: 'full' | 'quick';
  status: 'paid' | 'khata' | 'cancelled';
  note: string | null;
  synced: boolean;
  created_by: string;
  created_at: string;
  discount_total?: number;
  customers?: {
    id: string;
    name: string;
    phone: string | null;
    total_balance?: number | null;
  } | null;
  bill_items?: BillItem[];
  created_by_name?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

export interface ConfirmBillInput {
  mode: 'full' | 'quick';
  status: 'paid' | 'khata';
  items?: {
    product_id: string;
    product_name: string;
    qty: number;
    unit_price: number;
    cost_price: number;
    discount?: number;
  }[];
  customer_id?: string | null;
  customer_name?: string | null;
  total: number;
  note?: string | null;
}

export interface CancelBillInput {
  reason: string;
}

export interface BillHistoryQuery {
  date_from?: string;
  date_to?: string;
  status?: 'paid' | 'khata' | 'cancelled';
  mode?: 'full' | 'quick';
  search?: string;
  page?: number;
  limit?: number;
}

export interface TodayBillingSummary {
  total_revenue: number;
  full_bill_count: number;
  full_bill_total: number;
  quick_bill_count: number;
  quick_bill_total: number;
  paid_count: number;
  khata_count: number;
}
