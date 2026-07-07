import { useState } from 'react';
import { useCreateAdvance, useOutstandingAdvances } from './hr.queries';
import styles from './GiveAdvanceModal.module.css';

interface GiveAdvanceModalProps {
  employeeId: string;
  onClose: () => void;
}

export default function GiveAdvanceModal({ employeeId, onClose }: GiveAdvanceModalProps) {
  const [amount, setAmount] = useState('');
  const [givenOn, setGivenOn] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Queries & Mutations
  const { data: outstandingData } = useOutstandingAdvances(employeeId);
  const createAdvanceMutation = useCreateAdvance();

  const currentOutstanding = outstandingData?.outstanding || 0;
  const inputAmount = parseFloat(amount) || 0;
  const newOutstanding = currentOutstanding + inputAmount;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAmount <= 0) return;

    createAdvanceMutation.mutate(
      {
        employee_id: employeeId,
        amount: inputAmount,
        given_on: givenOn,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className={styles.title}>Give Salary Advance</h3>

        <div className={styles.formGroup}>
          <label className={styles.label}>Advance Amount (₹)</label>
          <input
            type="number"
            className={styles.input}
            placeholder="e.g. 2000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            required
            autoFocus
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Payment Date</label>
          <input
            type="date"
            className={styles.input}
            value={givenOn}
            onChange={(e) => setGivenOn(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Note / Reason</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. Medical emergency, Festival prep"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.projectionBox}>
          <div className={styles.projectionRow}>
            <span>Current Outstanding</span>
            <span>{formatCurrency(currentOutstanding)}</span>
          </div>
          <div className={styles.projectionRow}>
            <span>Deduction / Addition</span>
            <span style={{ color: inputAmount > 0 ? 'var(--color-error)' : 'inherit' }}>
              {inputAmount > 0 ? `+${formatCurrency(inputAmount)}` : 'Nil'}
            </span>
          </div>
          <div className={`${styles.projectionRow} ${styles.projectionResult}`}>
            <span>New Outstanding Balance</span>
            <span style={{ color: newOutstanding > 0 ? 'var(--color-error)' : 'inherit' }}>
              {formatCurrency(newOutstanding)}
            </span>
          </div>
        </div>

        <div className={styles.btnRow}>
          <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnSubmit}`}
            disabled={inputAmount <= 0 || createAdvanceMutation.isPending}
          >
            {createAdvanceMutation.isPending ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}
