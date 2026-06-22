export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomerProfileStats extends Customer {
  stats?: {
    total_purchases: number;
    total_payments: number;
    net_outstanding: number;
    last_transaction: string | null;
    transaction_count: number;
  };
}

export interface KhataEntry {
  id: string;
  customer_id: string;
  bill_id: string | null;
  type: 'purchase' | 'payment';
  amount: number;
  note: string | null;
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  bill_number?: string | null;
  created_by_name?: string | null;
}

export interface CustomerQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface StatementQuery {
  month: number;
  year: number;
}

export interface MonthlyStatementResult {
  customer: Customer;
  month: number;
  year: number;
  opening_balance: number;
  closing_balance: number;
  total_purchases: number;
  total_payments: number;
  entries: KhataEntry[];
}
