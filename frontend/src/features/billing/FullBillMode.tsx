import { useBillingStore } from './billingStore';
import { ProductSearch } from '@/shared/ui/ProductSearch';
import { Button } from '@/shared/ui/Button';
import type { Product } from '@/types/product.types';
import styles from './FullBillMode.module.css';

interface FullBillModeProps {
  onCheckout: (status: 'paid' | 'khata') => void;
}

export function FullBillMode({ onCheckout }: FullBillModeProps) {
  const { slots, activeSlotId, addToCart, updateCartQty, removeFromCart, clearCart, setCustomer } =
    useBillingStore();

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

  const cartTotal = slot.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const hasStockErrors = slot.items.some((item) => item.qty > item.stock_qty);
  const isCheckoutDisabled = slot.items.length === 0 || hasStockErrors;

  return (
    <div className={styles.container}>
      {/* Customer and Search Section */}
      <div className={styles.topBar}>
        <div className={styles.customerInputWrapper}>
          <label className={styles.customerInputLabel}>Order Label / Slot Name</label>
          <input
            type="text"
            className={styles.plainInput}
            value={slot.customerName}
            onChange={(e) => setCustomer(null, e.target.value)}
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
                  <th className={styles.totalCol}>Subtotal</th>
                  <th className={styles.actionCol}></th>
                </tr>
              </thead>
              <tbody>
                {slot.items.map((item) => {
                  const isLowStock = item.stock_qty <= item.qty;
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
                      </td>
                      <td className={styles.rateCol}>₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className={styles.totalCol}>₹{(item.qty * item.unit_price).toFixed(2)}</td>
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
