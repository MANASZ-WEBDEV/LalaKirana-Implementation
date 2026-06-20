export interface StockAdjustInput {
  type: 'add' | 'remove' | 'set';
  qty: number;
  reason: 'new_arrival' | 'damage' | 'returned' | 'audit' | 'other';
  note?: string;
}

export interface EODEntry {
  id: string;
  entry_date: string;
  product_id: string | null;
  product_name: string;
  qty_sold: number;
  created_by: string | null;
  created_at: string;
}

export interface EODProductRow {
  product_id: string;
  qty_sold: number;
  name?: string;
  price?: number;
  current_stock?: number;
  unit?: string;
}

export interface EODSubmitInput {
  entry_date: string;
  items: EODProductRow[];
}

export interface StockLogEntry {
  id: string;
  product_id: string;
  change_qty: number;
  reason: 'bill_confirm' | 'eod_entry' | 'manual_adjust' | 'damage' | 'audit' | 'returned';
  bill_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  created_by_name?: string;
  product_name?: string;
}
