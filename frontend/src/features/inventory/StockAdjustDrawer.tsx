import React, { useState, useEffect } from 'react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useAdjustStock } from './inventory.queries';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './StockAdjustDrawer.module.css';

interface StockAdjustDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    stock_qty: number;
    unit: string;
    category_name?: string | null;
  } | null;
}

export function StockAdjustDrawer({ isOpen, onClose, product }: StockAdjustDrawerProps) {
  const addToast = useToastStore((s) => s.addToast);
  const adjustMutation = useAdjustStock();

  // Form states
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('add');
  const [qty, setQty] = useState<string>('0');
  const [reason, setReason] = useState<'new_arrival' | 'damage' | 'returned' | 'audit' | 'other'>('audit');
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset fields when product changes
  useEffect(() => {
    if (isOpen && product) {
      setMode('add');
      setQty('0');
      setReason('audit');
      setNote('');
      setValidationError(null);
    }
  }, [isOpen, product]);

  const currentStock = product ? Number(product.stock_qty) : 0;
  const qtyVal = parseInt(qty) || 0;

  // Live stock level calculation preview
  let previewStock = currentStock;
  if (mode === 'add') {
    previewStock = currentStock + qtyVal;
  } else if (mode === 'remove') {
    previewStock = currentStock - qtyVal;
  } else if (mode === 'set') {
    previewStock = qtyVal;
  }

  // Live validations
  useEffect(() => {
    if (qtyVal < 0) {
      setValidationError('Quantity must be greater than or equal to zero');
    } else if (mode === 'remove' && previewStock < 0) {
      setValidationError(`Deduction exceeds current stock level (${currentStock} ${product?.unit || ''})`);
    } else if (mode === 'set' && qtyVal < 0) {
      setValidationError('Target stock level cannot be negative');
    } else {
      setValidationError(null);
    }
  }, [mode, qtyVal, previewStock, currentStock, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (qtyVal < 0) {
      addToast('error', 'Adjustment quantity cannot be negative');
      return;
    }

    if (mode === 'remove' && previewStock < 0) {
      addToast('error', 'Deduction exceeds current stock level');
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        productId: product.id,
        data: {
          type: mode,
          qty: qtyVal,
          reason,
          note: note.trim() || undefined,
        },
      });

      addToast(
        'success',
        `Stock for "${product.name}" successfully updated from ${currentStock} to ${previewStock} ${product.unit}`
      );
      onClose();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || err.message || 'Failed to adjust stock');
    }
  };

  const reasonOptions = [
    { value: 'audit', label: 'Stock Audit / Correction' },
    { value: 'new_arrival', label: 'New Arrival / Delivery' },
    { value: 'damage', label: 'Damaged / Expired Goods' },
    { value: 'returned', label: 'Customer Return' },
    { value: 'other', label: 'Other Adjustment' },
  ];

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Adjust Inventory Stock">
      {product && (
        <form onSubmit={handleSubmit} className={styles.drawerForm}>
          <div className={styles.productDetail}>
            <div className={styles.productDetailRow}>
              <span>Product Name</span>
              <span className={styles.productDetailValue}>{product.name}</span>
            </div>
            <div className={styles.productDetailRow}>
              <span>Category</span>
              <span className={styles.productDetailValue}>{product.category_name || 'Uncategorized'}</span>
            </div>
            <div className={styles.productDetailRow}>
              <span>Current Stock</span>
              <span className={styles.productDetailValue}>
                {product.stock_qty} {product.unit}
              </span>
            </div>
          </div>

          <div className={styles.radioGroup}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
              Adjustment Action
            </span>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="adjustMode"
                value="add"
                checked={mode === 'add'}
                onChange={() => setMode('add')}
                className={styles.radioInput}
              />
              Add Stock (+)
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="adjustMode"
                value="remove"
                checked={mode === 'remove'}
                onChange={() => setMode('remove')}
                className={styles.radioInput}
              />
              Deduct Stock (-)
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="adjustMode"
                value="set"
                checked={mode === 'set'}
                onChange={() => setMode('set')}
                className={styles.radioInput}
              />
              Set Exact Quantity (=)
            </label>
          </div>

          <Input
            type="number"
            label={`Quantity (${product.unit})`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={validationError || undefined}
            min={0}
            required
          />

          <Select
            label="Reason"
            value={reason}
            onChange={(e: any) => setReason(e.target.value)}
            options={reasonOptions}
          />

          <Input
            type="text"
            label="Notes (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Received new shipment batch"
          />

          <div className={styles.preview}>
            <span>New Stock Level Preview</span>
            <span className={styles.previewValue}>
              {previewStock} {product.unit}
            </span>
          </div>

          <div className={styles.drawerActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={adjustMutation.isPending} disabled={!!validationError}>
              Save Stock
            </Button>
          </div>
        </form>
      )}
    </Drawer>
  );
}
