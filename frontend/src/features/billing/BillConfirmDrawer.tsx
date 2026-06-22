import { useState } from 'react';
import { Drawer } from '@/shared/ui/Drawer';
import { CustomerSearch } from '@/shared/ui/CustomerSearch';
import { ReceiptPreview } from '@/shared/ui/ReceiptPreview';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useConfirmBill } from './billing.queries';
import { useBillingStore } from './billingStore';
import { useToastStore } from '@/shared/store/toastStore';
import type { Customer } from '@/types/khata.types';
import type { Bill } from '@/types/billing.types';
import styles from './BillConfirmDrawer.module.css';

interface BillConfirmDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  statusMode: 'paid' | 'khata';
}

export function BillConfirmDrawer({ isOpen, onClose, statusMode }: BillConfirmDrawerProps) {
  const { slots, activeSlotId, clearSlot, setCustomer } = useBillingStore();
  const slot = slots.find((s) => s.id === activeSlotId);
  const confirmBillMutation = useConfirmBill();
  const addToast = useToastStore((s) => s.addToast);

  // States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    if (slot?.customerId && slot?.customerName) {
      return {
        id: slot.customerId,
        name: slot.customerName,
        phone: '',
        total_balance: 0,
        address: '',
        is_active: true,
        created_at: '',
      } as Customer;
    }
    return null;
  });
  const [cashReceived, setCashReceived] = useState('');
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);

  if (!slot) return null;

  const isFull = slot.mode === 'full';
  const total = isFull
    ? slot.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
    : parseFloat(slot.quickAmount) || 0;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomer(customer.id, customer.name);
  };

  const handleUnlinkCustomer = () => {
    setSelectedCustomer(null);
    setCustomer(null, '');
  };

  const handleConfirm = async () => {
    if (statusMode === 'khata' && !selectedCustomer) {
      addToast('error', 'A registered customer ledger account is required for Khata bookings.');
      return;
    }

    try {
      const payload = {
        mode: slot.mode,
        status: statusMode,
        total,
        note: slot.quickNote || null,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || null,
        items: isFull
          ? slot.items.map((item) => ({
              product_id: item.product_id,
              product_name: item.product_name,
              qty: item.qty,
              unit_price: item.unit_price,
              cost_price: item.cost_price,
            }))
          : [],
      };

      const bill = await confirmBillMutation.mutateAsync(payload);
      addToast('success', `Bill ${bill.bill_number} confirmed!`);
      setConfirmedBill(bill);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to confirm bill');
    }
  };

  const handleDone = () => {
    if (slot) {
      clearSlot(slot.id);
    }
    setConfirmedBill(null);
    setSelectedCustomer(null);
    setCashReceived('');
    onClose();
  };

  // Payment calculations
  const cashNum = parseFloat(cashReceived) || 0;
  const changeDue = cashNum > total ? cashNum - total : 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={confirmedBill ? handleDone : onClose}
      title={confirmedBill ? 'Receipt Generated' : `Confirm Checkout — ${statusMode === 'paid' ? 'Paid' : 'Khata'}`}
    >
      <div className={styles.drawerBody}>
        {confirmedBill ? (
          <div className={styles.successView}>
            <div className={styles.successHeader}>
              <span className={styles.successIcon}>✅</span>
              <h3>Bill Saved Successfully</h3>
              <p>Total amount received: ₹{confirmedBill.total.toFixed(2)}</p>
            </div>
            <div className={styles.receiptWrapper}>
              <ReceiptPreview bill={confirmedBill} />
            </div>
            <div className={styles.doneBtnWrapper}>
              <Button onClick={handleDone} className={styles.doneBtn}>
                Done & Clear Slot
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.confirmFlow}>
            {/* Bill Summary */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>Bill Summary</div>
              <div className={styles.summaryRow}>
                <span>Order Mode:</span>
                <span className={styles.capitalize}>{slot.mode} bill</span>
              </div>
              {isFull && (
                <div className={styles.summaryItems}>
                  {slot.items.map((item) => (
                    <div key={item.product_id} className={styles.summaryItemRow}>
                      <span>
                        {item.product_name} x {item.qty}
                      </span>
                      <span>₹{(item.qty * item.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.summaryRowTotal}>
                <span>Grand Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Khata Flow: Select Customer */}
            {statusMode === 'khata' && (
              <div className={styles.section}>
                <label className={styles.sectionLabel}>Select Khata Customer</label>
                <CustomerSearch
                  onSelect={handleSelectCustomer}
                  placeholder="Search ledger accounts..."
                />
                {selectedCustomer && (
                  <div className={styles.selectedCustomerCard}>
                    <div className={styles.selectedCustomerHeader}>
                      <strong>{selectedCustomer.name}</strong>
                      <button
                        type="button"
                        onClick={handleUnlinkCustomer}
                        className={styles.unlinkBtn}
                        title="Deselect customer"
                      >
                        ✕
                      </button>
                    </div>
                    {selectedCustomer.phone && <div className={styles.subtext}>📞 {selectedCustomer.phone}</div>}
                    <div className={styles.balanceText}>
                      Current outstanding balance: <span>₹{Number(selectedCustomer.total_balance).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Paid Flow: Cash received calculator */}
            {statusMode === 'paid' && (
              <div className={styles.section}>
                <div className={styles.calculator}>
                  <Input
                    label="Cash Received (₹)"
                    type="number"
                    placeholder="Enter cash received..."
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                  {/* Quick cash selector buttons */}
                  <div className={styles.quickCashGrid}>
                    {[total, 100, 200, 500, 2000].map((amt) => {
                      const roundedAmt = Math.ceil(amt);
                      if (roundedAmt < total) return null;
                      return (
                        <button
                          key={amt}
                          type="button"
                          className={styles.quickCashBtn}
                          onClick={() => setCashReceived(roundedAmt.toString())}
                        >
                          ₹{roundedAmt}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.changeDueRow}>
                    <span>Change Due:</span>
                    <span className={changeDue > 0 ? styles.changeActive : ''}>
                      ₹{changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Optional Customer Link for Paid Bills */}
                <div className={styles.customerLinkWrapper}>
                  <label className={styles.sectionLabel}>Link Customer to Receipt (Optional)</label>
                  <CustomerSearch
                    onSelect={handleSelectCustomer}
                    placeholder="Search customer name..."
                  />
                  {selectedCustomer && (
                    <div className={styles.linkedCustomerTag}>
                      Linked: {selectedCustomer.name}
                      <button
                        type="button"
                        onClick={handleUnlinkCustomer}
                        className={styles.unlinkBtn}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Confirm Actions */}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose} className={styles.cancelBtn}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  confirmBillMutation.isPending ||
                  (statusMode === 'khata' && !selectedCustomer)
                }
                className={styles.confirmBtn}
              >
                {confirmBillMutation.isPending ? 'Confirming...' : 'Confirm & Print'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
