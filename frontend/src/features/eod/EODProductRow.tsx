import styles from './EODProductRow.module.css';

interface EODProductRowProps {
  name: string;
  unit: string;
  currentStock: number;
  qtySold: number | string;
  onQtyChange: (value: string) => void;
  onRemove: () => void;
}

export function EODProductRow({
  name,
  unit,
  currentStock,
  qtySold,
  onQtyChange,
  onRemove,
}: EODProductRowProps) {
  const numQty = Number(qtySold);
  const isInvalid = qtySold !== '' && (numQty < 1 || !Number.isInteger(numQty) || numQty > currentStock);

  return (
    <tr className={`${styles.row} ${isInvalid ? styles.invalidRow : ''}`}>
      <td className={styles.productCell}>
        <div className={styles.productInfo}>
          <span className={styles.name}>{name}</span>
          <span className={styles.unitBadge}>{unit}</span>
        </div>
      </td>
      <td className={styles.stockCell}>
        <span className={styles.currentStock}>{currentStock} {unit}</span>
      </td>
      <td className={styles.inputCell}>
        <div className={styles.inputContainer}>
          <input
            type="number"
            min="1"
            step="1"
            className={styles.qtyInput}
            value={qtySold}
            placeholder="Enter qty sold..."
            onChange={(e) => onQtyChange(e.target.value)}
          />
        </div>
        {isInvalid && (
          <span className={styles.errorText}>
            {numQty > currentStock ? 'Exceeds stock' : 'Must be whole number ≥ 1'}
          </span>
        )}
      </td>
      <td className={styles.actionCell}>
        <button type="button" className={styles.removeBtn} onClick={onRemove} title="Remove product">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </td>
    </tr>
  );
}
