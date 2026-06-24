import type { BillItem } from '@/types/billing.types';
import type { Product } from '@/types/product.types';

export interface SavingsResult {
  totalMRP: number;        // what customer would pay at MRP
  totalCharged: number;    // what you actually charged
  totalSaved: number;      // the difference
  savingsPercent: number;  // percentage saved
  hasSavings: boolean;     // whether to show the section at all
  itemSavings: ItemSaving[];
}

export interface ItemSaving {
  name: string;
  mrp: number;
  price: number;
  qty: number;
  saved: number;           // (mrp - price) * qty
}

export function calculateSavings(
  items: BillItem[],
  products: Product[]
): SavingsResult {
  let totalMRP = 0;
  let totalCharged = 0;
  const itemSavings: ItemSaving[] = [];

  for (const item of items) {
    const product = products.find(p => p.id === item.product_id);
    const mrp = product?.mrp ?? null;
    const subtotal = item.subtotal ?? (item.qty * item.unit_price);

    totalCharged += subtotal;

    if (mrp !== null && mrp > item.unit_price) {
      const itemMRP = mrp * item.qty;
      totalMRP += itemMRP;
      itemSavings.push({
        name: item.product_name,
        mrp,
        price: item.unit_price,
        qty: item.qty,
        saved: itemMRP - subtotal,
      });
    } else {
      totalMRP += subtotal; // no MRP or selling at MRP
    }
  }

  const totalSaved = totalMRP - totalCharged;
  const savingsPercent = totalMRP > 0
    ? Math.round((totalSaved / totalMRP) * 100)
    : 0;

  return {
    totalMRP,
    totalCharged,
    totalSaved,
    savingsPercent,
    hasSavings: totalSaved > 0,
    itemSavings,
  };
}
