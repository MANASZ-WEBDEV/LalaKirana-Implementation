import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types/product.types';

export interface CartItem {
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  base_price: number;
  cost_price: number;
  unit: string;
  stock_qty: number;
  discount: number;
  is_loose: boolean;
  quick_weight_prices?: Record<string, number>;
}

export interface OrderSlot {
  id: number; // 1-indexed (1 to 10)
  mode: 'full' | 'quick';
  items: CartItem[];
  quickAmount: string;
  quickNote: string;
  customerName: string;
  customerId: string | null;
}

export function getEffectiveUnitPrice(
  qty: number,
  basePrice: number,
  quickPrices: Record<string, number> = {}
): number {
  if (!quickPrices) return basePrice;
  const matchedKey = Object.keys(quickPrices).find((k) => {
    const val = parseFloat(k);
    return !isNaN(val) && Math.abs(qty - val) < 0.0001;
  });

  if (matchedKey) {
    const flatPrice = quickPrices[matchedKey];
    if (flatPrice !== undefined && flatPrice > 0) {
      return flatPrice / qty;
    }
  }

  // Fallback to custom sub-1kg rate if quantity is below 1kg and not matched to a preset pill
  if (qty < 1.0 && quickPrices['under_1kg_rate'] !== undefined && quickPrices['under_1kg_rate'] > 0) {
    return quickPrices['under_1kg_rate'];
  }

  return basePrice;
}

interface BillingState {
  slots: OrderSlot[];
  activeSlotId: number; // currently active slot ID (1 to 10)
  addSlot: () => void;
  removeSlot: (id: number) => void;
  setActiveSlotId: (id: number) => void;
  addToCart: (productId: string, product: Product, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  updateQuickAmount: (amount: string) => void;
  updateQuickNote: (note: string) => void;
  setCustomer: (id: string | null, name: string) => void;
  switchMode: (mode: 'full' | 'quick') => void;
  clearSlot: (id: number) => void;
}

const DEFAULT_SLOT = (id: number): OrderSlot => ({
  id,
  mode: 'full',
  items: [],
  quickAmount: '',
  quickNote: '',
  customerName: '',
  customerId: null,
});

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      slots: [DEFAULT_SLOT(1)],
      activeSlotId: 1,

      addSlot: () => {
        const { slots } = get();
        if (slots.length >= 10) return; // Hard cap at 10

        // Find the lowest unused ID between 1 and 10
        const existingIds = slots.map((s) => s.id);
        let nextId = 1;
        for (let i = 1; i <= 10; i++) {
          if (!existingIds.includes(i)) {
            nextId = i;
            break;
          }
        }

        const newSlot = DEFAULT_SLOT(nextId);
        set({
          slots: [...slots, newSlot].sort((a, b) => a.id - b.id),
          activeSlotId: nextId,
        });
      },

      removeSlot: (id: number) => {
        const { slots, activeSlotId } = get();
        // Do not remove the last slot
        if (slots.length <= 1) {
          // Instead, clear it
          const clearedSlots = slots.map((s) => (s.id === id ? DEFAULT_SLOT(id) : s));
          set({ slots: clearedSlots });
          return;
        }

        const remainingSlots = slots.filter((s) => s.id !== id);
        let nextActive = activeSlotId;
        if (activeSlotId === id) {
          // Switch to the first remaining slot
          nextActive = remainingSlots[0].id;
        }

        set({
          slots: remainingSlots,
          activeSlotId: nextActive,
        });
      },

      setActiveSlotId: (id: number) => {
        const { slots } = get();
        if (slots.some((s) => s.id === id)) {
          set({ activeSlotId: id });
        }
      },

      addToCart: (productId: string, product: Product, qty = 1) => {
        const { slots, activeSlotId } = get();
        const activeSlot = slots.find((s) => s.id === activeSlotId);
        if (!activeSlot || activeSlot.mode !== 'full') return;

        const existingItem = activeSlot.items.find((item) => item.product_id === productId);
        let newItems: CartItem[];

        if (existingItem) {
          newItems = activeSlot.items.map((item) => {
            if (item.product_id === productId) {
              const clampedQty = Math.min(item.qty + qty, item.stock_qty);
              const newUnitPrice = getEffectiveUnitPrice(clampedQty, item.base_price, item.quick_weight_prices);
              return { ...item, qty: clampedQty, unit_price: newUnitPrice };
            }
            return item;
          });
        } else {
          if (product.stock_qty <= 0) return; // Out of stock, don't add
          const initialQty = Math.min(qty, product.stock_qty);
          const initialUnitPrice = getEffectiveUnitPrice(initialQty, product.price, product.quick_weight_prices);
          newItems = [
            ...activeSlot.items,
            {
              product_id: product.id,
              product_name: product.name,
              qty: initialQty,
              unit_price: initialUnitPrice,
              base_price: product.price,
              cost_price: product.cost_price,
              unit: product.unit,
              stock_qty: product.stock_qty,
              discount: 0,
              is_loose: !!product.is_loose,
              quick_weight_prices: product.quick_weight_prices,
            },
          ];
        }

        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, items: newItems } : s
        );

        set({ slots: updatedSlots });
      },

      updateCartQty: (productId: string, qty: number) => {
        const { slots, activeSlotId } = get();
        const activeSlot = slots.find((s) => s.id === activeSlotId);
        if (!activeSlot || activeSlot.mode !== 'full') return;

        if (qty <= 0) {
          get().removeFromCart(productId);
          return;
        }

        const newItems = activeSlot.items.map((item) => {
          if (item.product_id === productId) {
            const clampedQty = Math.min(qty, item.stock_qty);
            const newUnitPrice = getEffectiveUnitPrice(clampedQty, item.base_price, item.quick_weight_prices);
            return { ...item, qty: clampedQty, unit_price: newUnitPrice };
          }
          return item;
        });

        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, items: newItems } : s
        );

        set({ slots: updatedSlots });
      },

      updateCartDiscount: (productId: string, discount: number) => {
        const { slots, activeSlotId } = get();
        const activeSlot = slots.find((s) => s.id === activeSlotId);
        if (!activeSlot || activeSlot.mode !== 'full') return;

        const newItems = activeSlot.items.map((item) => {
          if (item.product_id === productId) {
            const clampedDiscount = Math.max(0, Math.min(discount, item.qty * item.unit_price));
            return { ...item, discount: clampedDiscount };
          }
          return item;
        });

        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, items: newItems } : s
        );

        set({ slots: updatedSlots });
      },

      removeFromCart: (productId: string) => {
        const { slots, activeSlotId } = get();
        const activeSlot = slots.find((s) => s.id === activeSlotId);
        if (!activeSlot || activeSlot.mode !== 'full') return;

        const newItems = activeSlot.items.filter((item) => item.product_id !== productId);

        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, items: newItems } : s
        );

        set({ slots: updatedSlots });
      },

      clearCart: () => {
        const { slots, activeSlotId } = get();
        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, items: [] } : s
        );
        set({ slots: updatedSlots });
      },

      updateQuickAmount: (amount: string) => {
        const { slots, activeSlotId } = get();
        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, quickAmount: amount } : s
        );
        set({ slots: updatedSlots });
      },

      updateQuickNote: (note: string) => {
        const { slots, activeSlotId } = get();
        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, quickNote: note } : s
        );
        set({ slots: updatedSlots });
      },

      setCustomer: (id: string | null, name: string) => {
        const { slots, activeSlotId } = get();
        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, customerId: id, customerName: name } : s
        );
        set({ slots: updatedSlots });
      },

      switchMode: (mode: 'full' | 'quick') => {
        const { slots, activeSlotId } = get();
        const updatedSlots = slots.map((s) =>
          s.id === activeSlotId ? { ...s, mode } : s
        );
        set({ slots: updatedSlots });
      },

      clearSlot: (id: number) => {
        const { slots } = get();
        const updatedSlots = slots.map((s) => (s.id === id ? DEFAULT_SLOT(id) : s));
        set({ slots: updatedSlots });
      },
    }),
    {
      name: 'lk_billing_slots',
    }
  )
);
