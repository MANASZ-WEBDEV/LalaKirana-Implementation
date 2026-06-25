import { useBillingStore } from './billingStore';
import { CustomerSearch } from '@/shared/ui/CustomerSearch';
import { Button } from '@/shared/ui/Button';
import styles from './QuickBillMode.module.css';

interface QuickBillModeProps {
  onCheckout: (status: 'paid' | 'khata') => void;
}

export function QuickBillMode({ onCheckout }: QuickBillModeProps) {
  const { slots, activeSlotId, updateQuickAmount, updateQuickNote, setCustomer } = useBillingStore();
  const slot = slots.find((s) => s.id === activeSlotId);

  if (!slot || slot.mode !== 'quick') return null;

  const handleNumClick = (val: string) => {
    let current = slot.quickAmount;
    if (val === '⌫') {
      current = current.slice(0, -1);
    } else if (val === '.') {
      if (!current.includes('.')) {
        current = current === '' ? '0.' : current + '.';
      }
    } else {
      // Prevent leading double zeros
      if (current === '0') {
        current = val;
      } else {
        current = current + val;
      }
    }
    updateQuickAmount(current);
  };

  const amountNum = parseFloat(slot.quickAmount) || 0;

  return (
    <div className={styles.container}>
      {/* Customer Name input at top */}
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
      </div>

      <div className={styles.quickGrid}>
        {/* Left Side: Display & Note */}
        <div className={styles.displayPane}>
          <div className={styles.amountDisplay}>
            <span className={styles.currencySymbol}>₹</span>
            <span className={styles.amountValue}>{slot.quickAmount || '0.00'}</span>
          </div>
          <div className={styles.noteInputWrapper}>
            <textarea
              placeholder="What was sold? Add notes here... (e.g. Loose grocery items)"
              value={slot.quickNote}
              onChange={(e) => updateQuickNote(e.target.value)}
              className={styles.noteTextarea}
            />
          </div>
        </div>

        {/* Right Side: Virtual Numpad */}
        <div className={styles.numpadWrapper}>
          <div className={styles.numpadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((btn) => (
              <button
                key={btn}
                type="button"
                className={`${styles.numBtn} ${btn === '⌫' ? styles.backspaceBtn : ''}`}
                onClick={() => handleNumClick(btn)}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary & Checkout Actions Footer */}
      <div className={styles.footer}>
        <div className={styles.summaryInfo}>
          <Button
            variant="secondary"
            onClick={() => {
              updateQuickAmount('');
              updateQuickNote('');
            }}
            disabled={!slot.quickAmount}
          >
            🧹 Clear
          </Button>
          <div className={styles.totalWrapper}>
            <span className={styles.totalLabel}>Total Amount:</span>
            <span className={styles.totalVal}>₹{amountNum.toFixed(2)}</span>
          </div>
        </div>
        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            className={styles.khataBtn}
            onClick={() => onCheckout('khata')}
            disabled={amountNum <= 0}
          >
            📒 Book to Khata
          </Button>
          <Button
            onClick={() => onCheckout('paid')}
            disabled={amountNum <= 0}
            className={styles.paidBtn}
          >
            💰 Paid (Cash/UPI)
          </Button>
        </div>
      </div>
    </div>
  );
}
