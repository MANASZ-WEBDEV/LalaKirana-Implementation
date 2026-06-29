import { useBillingStore } from './billingStore';
import { ProductSearch } from '@/shared/ui/ProductSearch';
import { CustomerSearch } from '@/shared/ui/CustomerSearch';
import { Button } from '@/shared/ui/Button';
import { useAuthStore } from '@/shared/store/authStore';
import { useStoreSettings } from '@/features/settings/settings.queries';
import type { Product } from '@/types/product.types';
import styles from './FullBillMode.module.css';

interface FullBillModeProps {
  onCheckout: (status: 'paid' | 'khata') => void;
}

const getPresets = (item: any) => {
  const isLiquid = item.unit === 'litre' || item.unit === 'ml';
  const formatLabel = (v: number) => {
    if (isLiquid) {
      return v >= 1 ? `${v}L` : `${Math.round(v * 1000)}ml`;
    }
    return v >= 1 ? `${v}kg` : `${Math.round(v * 1000)}g`;
  };

  const standardValues = [0.05, 0.1, 0.25, 0.5, 1.0, 2.0];
  const uniqueValues = new Set(standardValues);

  // Add custom values configured on the product
  if (item.quick_weight_prices) {
    Object.keys(item.quick_weight_prices).forEach((k) => {
      const v = parseFloat(k);
      if (!isNaN(v)) {
        uniqueValues.add(v);
      }
    });
  }

  return Array.from(uniqueValues)
    .sort((a, b) => a - b)
    .map((v) => {
      // Determine price for this preset
      let price = v * item.base_price;
      if (item.quick_weight_prices) {
        // Find matching key within tolerance
        const matchedKey = Object.keys(item.quick_weight_prices).find(
          (k) => Math.abs(parseFloat(k) - v) < 0.0001
        );
        if (matchedKey && item.quick_weight_prices[matchedKey] > 0) {
          price = item.quick_weight_prices[matchedKey];
        }
      }
      return {
        value: v,
        label: `${formatLabel(v)} (₹${price.toFixed(2)})`,
        price,
      };
    });
};

export function FullBillMode({ onCheckout }: FullBillModeProps) {
  const { slots, activeSlotId, addToCart, updateCartQty, updateCartDiscount, removeFromCart, clearCart, setCustomer } =
    useBillingStore();

  const user = useAuthStore((s) => s.user);
  const { data: storeSettings } = useStoreSettings();

  const isStaff = user?.role === 'staff';
  const staffLimit = parseFloat(storeSettings?.staff_discount_limit || '50');

  const slot = slots.find((s) => s.id === activeSlotId);

  if (!slot || slot.mode !== 'full') return null;

  const handleSelectProduct = (product: Product) => {
    addToCart(product.id, product, 1);
  };

  const handleQtyChange = (productId: string, val: string) => {
    const qty = parseInt(val, 10);
    if (!isNaN(qty)) {
      updateCartQty(productId, qty);
    }
  };

  const cartTotal = slot.items.reduce((sum, item) => sum + (item.qty * item.unit_price - (item.discount || 0)), 0);
  const totalSavings = slot.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  const hasStockErrors = slot.items.some((item) => item.qty > item.stock_qty);
  const hasDiscountErrors = isStaff && slot.items.some((item) => ((item.discount || 0) / item.qty) > staffLimit);
  const isCheckoutDisabled = slot.items.length === 0 || hasStockErrors || hasDiscountErrors;

  return (
    <div className={styles.container}>
      {/* Customer and Search Section */}
      <div className={styles.topBar}>
        <div className={styles.customerInputWrapper}>
          <label className={styles.customerInputLabel}>Order Label / Slot Name</label>
          <CustomerSearch
            value={slot.customerName}
            onSelect={(customer) => setCustomer(customer.id, customer.name)}
            onChangeText={(text) => setCustomer(null, text)}
            placeholder="Search / type name..."
          />
        </div>
        <div className={styles.searchWrapper}>
          <label className={styles.searchLabel}>Add Items to Bill</label>
          <ProductSearch onSelect={handleSelectProduct} placeholder="Type product name or scan barcode..." />
        </div>
      </div>

      {/* Cart Items List */}
      <div className={styles.cartSection}>
        {slot.items.length === 0 ? (
          <div className={styles.emptyCart}>
            <div className={styles.emptyIcon}>🛒</div>
            <h3>Cart is empty</h3>
            <p>Search and select products above to build the bill.</p>
          </div>
        ) : (
          <div className={styles.cartTableWrapper}>
            <table className={styles.cartTable}>
              <thead>
                <tr>
                  <th className={styles.itemCol}>Product Item</th>
                  <th className={styles.qtyCol}>Quantity</th>
                  <th className={styles.rateCol}>Unit Price</th>
                  <th className={styles.discountCol}>Discount</th>
                  <th className={styles.totalCol}>Subtotal</th>
                  <th className={styles.actionCol}></th>
                </tr>
              </thead>
              <tbody>
                {slot.items.map((item) => {
                  const isLowStock = item.stock_qty <= item.qty;
                  const isOverLimit = isStaff && ((item.discount || 0) / item.qty) > staffLimit;
                  return (
                    <tr key={item.product_id} className={isLowStock ? styles.lowStockRow : ''}>
                      <td className={styles.itemCol}>
                        <div className={styles.itemNameWrapper}>
                          <span className={styles.itemName}>{item.product_name}</span>
                          <span className={styles.itemUnit}>Per {item.unit}</span>
                          {isLowStock && (
                            <span className={styles.stockWarning} title={`Only ${item.stock_qty} left in stock`}>
                              ⚠️ Max Stock: {item.stock_qty}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.qtyCol}>
                        {item.is_loose ? (
                          <div className={styles.looseQtyContainer}>
                            <select
                              value={
                                getPresets(item).some((p) => Math.abs(p.value - item.qty) < 0.0001)
                                  ? getPresets(item).find((p) => Math.abs(p.value - item.qty) < 0.0001)!.value.toString()
                                  : 'custom'
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== 'custom') {
                                  updateCartQty(item.product_id, parseFloat(val));
                                }
                              }}
                              className={styles.presetSelect}
                            >
                              {getPresets(item).map((p) => (
                                <option key={p.value} value={p.value}>
                                  {p.label}
                                </option>
                              ))}
                              <option value="custom">Custom Weight...</option>
                            </select>

                            <div className={styles.customInputWrapper}>
                              <input
                                type="number"
                                value={Math.round(item.qty * 1000)}
                                min={1}
                                step="1"
                                onChange={(e) => {
                                  const grams = parseInt(e.target.value, 10);
                                  updateCartQty(item.product_id, isNaN(grams) ? 0 : grams / 1000);
                                }}
                                className={styles.customQtyInput}
                                placeholder="Custom"
                              />
                              <span className={styles.customQtyUnit}>
                                {item.unit === 'litre' || item.unit === 'ml' ? 'ml' : 'g'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.qtyControls}>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product_id, item.qty - 1)}
                              className={styles.qtyBtn}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={item.qty}
                              min={1}
                              onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                              className={styles.qtyInput}
                            />
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product_id, item.qty + 1)}
                              className={styles.qtyBtn}
                            >
                              +
                            </button>
                          </div>
                        )}
                      </td>
                      <td className={styles.rateCol}>₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className={styles.discountCol}>
                        <div className={styles.discountInputWrapper}>
                          <input
                            type="number"
                            step="any"
                            min={0}
                            max={item.qty * item.unit_price}
                            value={item.discount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateCartDiscount(item.product_id, isNaN(val) ? 0 : val);
                            }}
                            className={`${styles.discountInput} ${isOverLimit ? styles.discountInputError : ''}`}
                            placeholder="0.00"
                          />
                          {isOverLimit && (
                            <span className={styles.limitError} title={`Staff discount cannot exceed ₹${staffLimit}`}>
                              Max ₹{staffLimit}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.totalCol}>₹{(item.qty * item.unit_price - (item.discount || 0)).toFixed(2)}</td>
                      <td className={styles.actionCol}>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                          className={styles.deleteBtn}
                          aria-label="Remove item"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cart Summary & Actions Footer */}
      <div className={styles.footer}>
        <div className={styles.summaryInfo}>
          <Button variant="secondary" onClick={clearCart} disabled={slot.items.length === 0}>
            🧹 Clear Cart
          </Button>
          <div className={styles.totalWrapper}>
            {totalSavings > 0 && (
              <div className={styles.savingsWrapper}>
                <span className={styles.savingsLabel}>Savings:</span>
                <span className={styles.savingsVal}>-₹{totalSavings.toFixed(2)}</span>
              </div>
            )}
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalVal}>₹{cartTotal.toFixed(2)}</span>
          </div>
        </div>
        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            className={styles.khataBtn}
            onClick={() => onCheckout('khata')}
            disabled={isCheckoutDisabled}
          >
            📒 Book to Khata
          </Button>
          <Button
            onClick={() => onCheckout('paid')}
            disabled={isCheckoutDisabled}
            className={styles.paidBtn}
          >
            💰 Paid (Cash/UPI)
          </Button>
        </div>
      </div>
    </div>
  );
}
