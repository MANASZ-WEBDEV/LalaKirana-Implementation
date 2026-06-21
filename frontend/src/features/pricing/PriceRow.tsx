import type { Product } from '@/types/product.types';
import styles from './PriceRow.module.css';

interface PriceRowProps {
  product: Product;
  newValue: string;
  onChange: (value: string) => void;
}

export function PriceRow({ product, newValue, onChange }: PriceRowProps) {
  const isChanged = newValue !== '' && Number(newValue) !== product.price;

  return (
    <tr className={`${styles.row} ${isChanged ? styles.changedRow : ''}`}>
      <td className={styles.productCell}>
        <div className={styles.productInfo}>
          <span className={styles.name}>{product.name}</span>
          {product.category_name && (
            <span className={styles.category}>{product.category_name}</span>
          )}
        </div>
      </td>
      <td className={styles.priceCell}>
        <span className={styles.currentPrice}>₹{Number(product.price).toFixed(2)}</span>
      </td>
      <td className={styles.inputCell}>
        <div className={styles.inputContainer}>
          <span className={styles.currencySymbol}>₹</span>
          <input
            type="number"
            step="0.01"
            min="0"
            className={styles.priceInput}
            value={newValue}
            placeholder={Number(product.price).toFixed(2)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </td>
      <td className={styles.statusCell}>
        {isChanged ? (
          <span className={styles.changeBadge}>
            ₹{(Number(newValue) - product.price) >= 0 ? '+' : ''}
            {(Number(newValue) - product.price).toFixed(2)}
          </span>
        ) : (
          <span className={styles.noChangeText}>No change</span>
        )}
      </td>
    </tr>
  );
}
