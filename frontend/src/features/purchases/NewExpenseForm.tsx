import { useState } from 'react';
import { useCreateExpense } from './purchases.queries';
import { SupplierSelect } from './SupplierSelect';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useToastStore } from '@/shared/store/toastStore';
import type { Supplier } from '@/types/purchases.types';
import styles from './NewExpenseForm.module.css';

interface NewExpenseFormProps {
  onClose: () => void;
}

export function NewExpenseForm({ onClose }: NewExpenseFormProps) {
  const addToast = useToastStore((s) => s.addToast);
  const createExpenseMutation = useCreateExpense();

  // Form States
  const [category, setCategory] = useState<'packaging' | 'transport' | 'maintenance' | 'utilities' | 'other'>('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const handleSelectSupplier = (supplier: Supplier | null) => {
    setSelectedSupplier(supplier);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);

    if (isNaN(amtNum) || amtNum <= 0) {
      addToast('error', 'Please enter a valid expense amount');
      return;
    }

    try {
      const payload = {
        category,
        amount: amtNum,
        description: description.trim() || null,
        expense_date: expenseDate,
        supplier_id: selectedSupplier?.id || null,
        supplier_name: selectedSupplier?.name || null,
      };

      await createExpenseMutation.mutateAsync(payload);
      addToast('success', 'Expense recorded successfully');
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Failed to record expense');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <Select
          label="Category *"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          options={[
            { value: 'packaging', label: 'Packaging' },
            { value: 'transport', label: 'Transport / Freight' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'utilities', label: 'Utilities (Electricity/Water)' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input
          label="Amount (₹) *"
          type="number"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min={0.01}
        />
      </div>

      <div className={styles.formRow}>
        <Input
          label="Expense Date *"
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
        <div className={styles.supplierSelectWrapper}>
          <label className={styles.label}>Link Supplier (Optional)</label>
          <SupplierSelect
            onSelect={handleSelectSupplier}
            selectedSupplier={selectedSupplier}
            placeholder="Search linked supplier..."
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Description / Details</label>
        <textarea
          placeholder="Enter expense details (e.g. Electricity bill for June, transport cost for bulk order)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={styles.textarea}
          rows={3}
        />
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createExpenseMutation.isPending}>
          {createExpenseMutation.isPending ? 'Recording...' : 'Record Expense'}
        </Button>
      </div>
    </form>
  );
}
