import { useState } from 'react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useLogRepayment } from './khata.queries';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './RepaymentDrawer.module.css';

interface RepaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  outstandingBalance: number;
}

export function RepaymentDrawer({
  isOpen,
  onClose,
  customerId,
  customerName,
  outstandingBalance,
}: RepaymentDrawerProps) {
  const addToast = useToastStore((s) => s.addToast);
  const logRepaymentMutation = useLogRepayment(customerId);

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const repayAmt = parseFloat(amount);

    if (isNaN(repayAmt) || repayAmt <= 0) {
      addToast('error', 'Please enter a valid repayment amount');
      return;
    }

    if (repayAmt > outstandingBalance) {
      addToast('error', `Repayment cannot exceed outstanding balance of ₹${outstandingBalance}`);
      return;
    }

    try {
      await logRepaymentMutation.mutateAsync({
        amount: repayAmt,
        note: note.trim() || null,
      });
      addToast('success', `Logged repayment of ₹${repayAmt.toFixed(2)} for ${customerName}`);
      setAmount('');
      setNote('');
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to record repayment');
    }
  };

  const repayNum = parseFloat(amount) || 0;
  const newBalance = outstandingBalance - repayNum;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Log Customer Repayment">
      <form onSubmit={handleRepaySubmit} className={styles.form}>
        <div className={styles.customerSummary}>
          <div className={styles.summaryRow}>
            <span>Customer:</span>
            <strong>{customerName}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Current Outstanding:</span>
            <span className={styles.outstandingAmt}>₹{outstandingBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <Input
            label="Repayment Amount (₹) *"
            type="number"
            placeholder="Enter amount collected..."
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min={0.01}
            step="any"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Note / Memo (Optional)</label>
          <textarea
            placeholder="e.g. Received via GPay, Cash payment"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={styles.textarea}
            rows={3}
          />
        </div>

        <div className={styles.balancePreview}>
          <div className={styles.previewRow}>
            <span>New Balance Due:</span>
            <span className={newBalance > 0 ? styles.balanceDue : styles.balanceCleared}>
              ₹{newBalance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={repayNum <= 0 || repayNum > outstandingBalance || logRepaymentMutation.isPending}
            className={styles.submitBtn}
          >
            {logRepaymentMutation.isPending ? 'Saving...' : 'Confirm Repayment'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
