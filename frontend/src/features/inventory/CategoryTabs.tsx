import type { Category } from '@/types/product.types';
import styles from './CategoryTabs.module.css';

interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId?: string;
  onChange: (id?: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onChange,
}: CategoryTabsProps) {
  return (
    <div className={styles.container}>
      <button
        onClick={() => onChange(undefined)}
        className={`${styles.tab} ${!activeCategoryId ? styles.active : ''}`}
      >
        All Products
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`${styles.tab} ${activeCategoryId === cat.id ? styles.active : ''}`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
