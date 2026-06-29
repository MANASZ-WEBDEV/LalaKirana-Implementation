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

  const cartTotal = slot.items.reduce((sum, item) => sum + item.qty * (item.unit_price - (item.discount || 0)), 0);
  const totalSavings = slot.items.reduce((sum, item) => sum + item.qty * (item.discount || 0), 0);
  const hasStockErrors = slot.items.some((item) => item.qty > item.stock_qty);
  const hasDiscountErrors = isStaff && slot.items.some((item) => (item.discount || 0) > staffLimit);
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
                  <th className={styles.discountCol}>Discount (₹/unit)</th>
                  <th className={styles.totalCol}>Subtotal</th>
                  <th className={styles.actionCol}></th>
                </tr>
              </thead>
              <tbody>
                {slot.items.map((item) => {
                  const isLowStock = item.stock_qty <= item.qty;
                  const isOverLimit = isStaff && (item.discount || 0) > staffLimit;
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
                          <div className={styles.looseQtyWrapper}>
                            <div className={styles.looseInputRow}>
                              <input
                                type="number"
                                value={Math.round(item.qty * 1000)}
                                min={1}
                                step="1"
                                onChange={(e) => {
                                  const grams = parseInt(e.target.value, 10);
                                  updateCartQty(item.product_id, isNaN(grams) ? 0 : grams / 1000);
                                }}
                                className={styles.looseQtyInput}
                              />
                              <span className={styles.looseQtyLabel}>g</span>
                            </div>
                            <div className={styles.quickWeightPills}>
                              {(() => {
                                // Build pills from standard defaults + any custom weights configured on the product
                                const standardPills = [
                                  { label: '50g', value: 0.05 },
                                  { label: '100g', value: 0.1 },
                                  { label: '250g', value: 0.25 },
                                  { label: '500g', value: 0.5 },
                                  { label: '1kg', value: 1.0 },
                                  { label: '2kg', value: 2.0 },
                                ];
                                const standardValues = new Set(standardPills.map((p) => p.value));

                                // Add custom weight pills from product config
                                const customPills = Object.keys(item.quick_weight_prices || {})
                                  .map((k) => parseFloat(k))
                                  .filter((v) => !isNaN(v) && !standardValues.has(v))
                                  .map((v) => ({
                                    label: v >= 1 ? `${v}kg` : `${Math.round(v * 1000)}g`,
                                    value: v,
                                  }));

                                const allPills = [...standardPills, ...customPills].sort(
                                  (a, b) => a.value - b.value
                                );

                                const hasFixedPrice = (val: number) => {
                                  if (!item.quick_weight_prices) return false;
                                  return Object.keys(item.quick_weight_prices).some(
                                    (k) => Math.abs(parseFloat(k) - val) < 0.0001
                                  );
                                };

                                return allPills.map((pill) => (
                                  <button
                                    key={pill.value}
                                    type="button"
                                    onClick={() => updateCartQty(item.product_id, pill.value)}
                                    className={`${styles.weightPill} ${
                                      Math.abs(item.qty - pill.value) < 0.0001 ? styles.weightPillActive : ''
                                    } ${hasFixedPrice(pill.value) ? styles.weightPillFixed : ''}`}
                                  >
                                    {pill.label}
                                  </button>
                                ));
                              })()}
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
                            max={item.unit_price}
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
                      <td className={styles.totalCol}>₹{(item.qty * (item.unit_price - (item.discount || 0))).toFixed(2)}</td>
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
