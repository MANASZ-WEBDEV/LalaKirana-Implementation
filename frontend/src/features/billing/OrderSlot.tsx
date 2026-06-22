import { useBillingStore } from './billingStore';
import styles from './OrderSlot.module.css';

interface OrderSlotProps {
  id: number;
  isActive: boolean;
  onSelect: () => void;
}

export function OrderSlot({ id, isActive, onSelect }: OrderSlotProps) {
  const { slots, removeSlot } = useBillingStore();
  const slot = slots.find((s) => s.id === id);

  if (!slot) return null;

  // Calculate totals
  const isFull = slot.mode === 'full';
  const itemCount = isFull ? slot.items.reduce((sum, item) => sum + item.qty, 0) : 0;
  const totalAmount = isFull
    ? slot.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
    : parseFloat(slot.quickAmount) || 0;

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeSlot(id);
  };

  const displayName = slot.customerName ? slot.customerName : 'Walk-in';

  return (
    <div
      className={`${styles.slotCard} ${isActive ? styles.activeSlot : ''}`}
      onClick={onSelect}
    >
      <div className={styles.slotHeader}>
        <span className={styles.slotLabel}>Slot {id}</span>
        <span className={`${styles.modeBadge} ${isFull ? styles.fullBadge : styles.quickBadge}`}>
          {isFull ? 'Full' : 'Quick'}
        </span>
      </div>
      <div className={styles.slotBody}>
        <div className={styles.customerName}>{displayName}</div>
        <div className={styles.totalRow}>
          <span className={styles.itemCount}>
            {isFull ? `${itemCount} items` : 'Numpad'}
          </span>
          <span className={styles.totalAmount}>₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>
      {slots.length > 1 && (
        <button
          type="button"
          onClick={handleClose}
          className={styles.closeBtn}
          title="Close slot"
          aria-label={`Close Slot ${id}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
