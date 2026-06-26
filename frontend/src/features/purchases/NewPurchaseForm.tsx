import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConfirmPurchase } from './purchases.queries';
import { SupplierSelect } from './SupplierSelect';
import { ProductSearch } from '@/shared/ui/ProductSearch';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useToastStore } from '@/shared/store/toastStore';
import { useProduct } from '@/features/inventory/inventory.queries';
import type { Product } from '@/types/product.types';
import type { Supplier } from '@/types/purchases.types';
import styles from './NewPurchaseForm.module.css';

interface PurchaseOrderItemInput {
  product_id: string;
  product_name: string;
  qty: number;
  cost_price: number;
  sell_price: number | null;
  mrp: number | null;
  unit: string;
  current_sell_price: number;
  current_mrp: number | null;
}

export function NewPurchaseForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const addToast = useToastStore((s) => s.addToast);
  const confirmPurchaseMutation = useConfirmPurchase();

  // Parse restock product ID from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const restockProductId = searchParams.get('restockProductId') || searchParams.get('productId');

  // Query details if preloaded ID exists
  const { data: preloadedProduct } = useProduct(restockProductId || '', {
    enabled: !!restockProductId,
  });

  const [hasAddedPreloaded, setHasAddedPreloaded] = useState(false);

  // Form Header States
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');

  // Cart/Items State
  const [items, setItems] = useState<PurchaseOrderItemInput[]>([]);

  // Effect to populate item if navigated from Restock trigger
  useEffect(() => {
    if (preloadedProduct && !hasAddedPreloaded) {
      setItems([
        {
          product_id: preloadedProduct.id,
          product_name: preloadedProduct.name,
          qty: 1,
          cost_price: preloadedProduct.cost_price,
          sell_price: null,
          mrp: null,
          unit: preloadedProduct.unit,
          current_sell_price: preloadedProduct.price,
          current_mrp: preloadedProduct.mrp,
        },
      ]);
      setHasAddedPreloaded(true);
    }
  }, [preloadedProduct, hasAddedPreloaded]);

  // Footer/Payment States
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'credit' | 'partial'>('paid');
  const [amountPaid, setAmountPaid] = useState('');
  const [note, setNote] = useState('');

  const handleSelectSupplier = (supplier: Supplier | null) => {
    setSelectedSupplier(supplier);
  };

  const handleSelectProduct = (product: Product) => {
    // Avoid duplicates
    if (items.some((item) => item.product_id === product.id)) {
      addToast('warn', 'Product is already in the list. Adjust quantity instead.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        qty: 1,
        cost_price: product.cost_price,
        sell_price: null, // Keep existing unless specified
        mrp: null,
        unit: product.unit,
        current_sell_price: product.price,
        current_mrp: product.mrp,
      },
    ]);
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const handleItemFieldChange = (
    productId: string,
    field: 'qty' | 'cost_price' | 'sell_price' | 'mrp',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;

        let cleanValue = value;
        if (field === 'qty') {
          cleanValue = value.replace(/^0+(?=\d)/, '');
        }

        let parsedVal: number | null = parseFloat(cleanValue);
        if (isNaN(parsedVal)) {
          parsedVal = (field === 'sell_price' || field === 'mrp') ? null : 0;
        }

        return {
          ...item,
          [field]: parsedVal,
        };
      })
    );
  };

  // Calculations
  const totalCost = items.reduce((sum, item) => sum + item.qty * item.cost_price, 0);
  const estimatedRevenue = items.reduce((sum, item) => {
    const sellPrice = item.sell_price !== null ? item.sell_price : item.current_sell_price;
    return sum + item.qty * sellPrice;
  }, 0);

  const estimatedProfit = estimatedRevenue - totalCost;
  const estimatedMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplier) {
      addToast('error', 'Please select a supplier first.');
      return;
    }

    if (items.length === 0) {
      addToast('error', 'Please add at least one item to purchase.');
      return;
    }

    const hasInvalidItems = items.some((item) => item.qty <= 0 || item.cost_price <= 0);
    if (hasInvalidItems) {
      addToast('error', 'All items must have a quantity and cost price greater than 0.');
      return;
    }

    const paidVal = parseFloat(amountPaid) || 0;
    if (paymentStatus === 'partial' && (paidVal <= 0 || paidVal >= totalCost)) {
      addToast('error', `Partial amount paid must be between 0 and total cost ₹${totalCost.toFixed(2)}.`);
      return;
    }

    try {
      const payload = {
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        order_date: orderDate,
        reference_number: referenceNumber.trim() || null,
        payment_status: paymentStatus,
        amount_paid:
          paymentStatus === 'paid'
            ? totalCost
            : paymentStatus === 'credit'
            ? 0
            : paidVal,
        note: note.trim() || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          qty: item.qty,
          cost_price: item.cost_price,
          sell_price: item.sell_price,
          mrp: item.mrp,
        })),
      };

      await confirmPurchaseMutation.mutateAsync(payload);
      addToast('success', 'Purchase order logged and stock updated successfully.');
      navigate('/purchases');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to confirm purchase order');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/purchases')} className={styles.backBtn}>
          ← Back to Purchases
        </button>
        <h2 className={styles.title}>New Stock-In Purchase</h2>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Header Fields Section */}
        <div className={styles.headerCard}>
          <div className={styles.supplierWrapper}>
            <label className={styles.fieldLabel}>Supplier *</label>
            <SupplierSelect
              onSelect={handleSelectSupplier}
              selectedSupplier={selectedSupplier}
            />
          </div>
          <div className={styles.headerGrid}>
            <Input
              label="Purchase Date *"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />
            <Input
              label="Reference Invoice Bill #"
              placeholder="e.g. INV-2831"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Add Products Selection */}
        <div className={styles.searchCard}>
          <label className={styles.fieldLabel}>Search & Add Products</label>
          <ProductSearch onSelect={handleSelectProduct} placeholder="Type product name to add to order..." allowOutOfStock={true} />
        </div>

        {/* Inbound Items Table List */}
        <div className={styles.tableCard}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th className={styles.itemCol}>Product Item</th>
                <th className={styles.qtyCol}>Qty</th>
                <th className={styles.costCol}>Cost Price (₹)</th>
                <th className={styles.mrpCol}>MRP (₹)</th>
                <th className={styles.sellCol}>Sell Price (₹)</th>
                <th className={styles.marginCol}>Est. Margin %</th>
                <th className={styles.actionCol}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTable}>
                    No products added. Use the search bar above to add products.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const sellPrice = item.sell_price !== null ? item.sell_price : item.current_sell_price;
                  const profit = sellPrice - item.cost_price;
                  const margin = sellPrice > 0 ? (profit / sellPrice) * 100 : 0;

                  return (
                    <tr key={item.product_id}>
                      <td className={styles.itemCol}>
                        <div className={styles.itemNameWrapper}>
                          <span className={styles.itemName}>{item.product_name}</span>
                          <span className={styles.itemUnit}>Unit: {item.unit}</span>
                        </div>
                      </td>
                      <td className={styles.qtyCol}>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemFieldChange(item.product_id, 'qty', e.target.value)}
                          className={styles.tableInput}
                          min={1}
                          required
                        />
                      </td>
                      <td className={styles.costCol}>
                        <input
                          type="number"
                          step="any"
                          value={item.cost_price || ''}
                          onChange={(e) => handleItemFieldChange(item.product_id, 'cost_price', e.target.value)}
                          className={styles.tableInput}
                          placeholder="Cost Price"
                          min={0.01}
                          required
                        />
                      </td>
                      <td className={styles.mrpCol}>
                        <input
                          type="number"
                          step="any"
                          value={item.mrp === null ? '' : item.mrp}
                          onChange={(e) => handleItemFieldChange(item.product_id, 'mrp', e.target.value)}
                          className={styles.tableInput}
                          placeholder={item.current_mrp ? `Current: ${item.current_mrp}` : 'MRP'}
                          min={0.01}
                        />
                      </td>
                      <td className={styles.sellCol}>
                        <input
                          type="number"
                          step="any"
                          value={item.sell_price === null ? '' : item.sell_price}
                          onChange={(e) => handleItemFieldChange(item.product_id, 'sell_price', e.target.value)}
                          className={styles.tableInput}
                          placeholder={`Current: ${item.current_sell_price}`}
                          min={0.01}
                        />
                      </td>
                      <td className={`${styles.marginCol} ${margin < 0 ? styles.negativeMargin : ''}`}>
                        {margin.toFixed(1)}%
                      </td>
                      <td className={styles.actionCol}>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className={styles.deleteBtn}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary & Payment info */}
        {items.length > 0 && (
          <div className={styles.footer}>
            {/* Calculation summary metrics */}
            <div className={styles.summarySection}>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Total Inbound Cost</span>
                <span className={styles.metricVal}>₹{totalCost.toFixed(2)}</span>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Est. Revenue</span>
                <span className={styles.metricVal}>₹{estimatedRevenue.toFixed(2)}</span>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Est. Profit Margin</span>
                <span className={`${styles.metricVal} ${estimatedMargin < 0 ? styles.negativeMargin : ''}`}>
                  {estimatedMargin.toFixed(1)}% (₹{estimatedProfit.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Payment & note card */}
            <div className={styles.paymentSection}>
              <div className={styles.paymentFields}>
                <Select
                  label="Payment Status *"
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  options={[
                    { value: 'paid', label: 'Fully Paid (Cash/UPI)' },
                    { value: 'credit', label: 'Owe Full Credit' },
                    { value: 'partial', label: 'Partially Paid' },
                  ]}
                />

                {paymentStatus === 'partial' && (
                  <Input
                    label="Amount Paid Now (₹) *"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    required
                    min={0.01}
                    step="any"
                  />
                )}

                <div className={styles.notesWrapper}>
                  <label className={styles.fieldLabel}>Order notes / details</label>
                  <textarea
                    placeholder="Enter purchase details (e.g. festival batch stock, wholesale discount)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={styles.textarea}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => navigate('/purchases')}>
                Cancel
              </Button>
              <Button type="submit" disabled={confirmPurchaseMutation.isPending} className={styles.submitBtn}>
                {confirmPurchaseMutation.isPending ? 'Saving...' : 'Confirm Inbound Purchase'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
export default NewPurchaseForm;
