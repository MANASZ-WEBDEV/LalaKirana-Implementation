import { useState, useRef } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import type { Category } from '@/types/product.types';
import styles from './CategoryActionMenu.module.css';

interface CategoryActionMenuProps {
  category: Category;
  onRename: (category: Category) => void;
  onViewProducts: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryActionMenu({
  category,
  onRename,
  onViewProducts,
  onDelete,
}: CategoryActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setIsOpen(false));

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.kebabBtn}
        aria-label="Category Actions"
        aria-expanded={isOpen}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu">
          <button
            onClick={() => {
              onRename(category);
              setIsOpen(false);
            }}
            className={styles.menuItem}
            role="menuitem"
          >
            ✏️ Rename
          </button>
          <button
            onClick={() => {
              onViewProducts(category);
              setIsOpen(false);
            }}
            className={styles.menuItem}
            role="menuitem"
          >
            📦 View products in Inventory &rarr;
          </button>
          <button
            onClick={() => {
              onDelete(category);
              setIsOpen(false);
            }}
            className={`${styles.menuItem} ${styles.danger}`}
            role="menuitem"
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}
