import { useState, useRef } from 'react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useAuthStore } from '@/shared/store/authStore';
import type { Product } from '@/types/product.types';
import styles from './ProductActionMenu.module.css';

interface ProductActionMenuProps {
  product: Product;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onDeactivate: (product: Product) => void;
}

export function ProductActionMenu({
  product,
  onEdit,
  onAdjustStock,
  onViewHistory,
  onDeactivate,
}: ProductActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  useClickOutside(wrapperRef, () => setIsOpen(false));

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.kebabBtn}
        aria-label="Actions"
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
              onEdit(product);
              setIsOpen(false);
            }}
            className={styles.menuItem}
            role="menuitem"
          >
            ✏️ Edit Details
          </button>
          <button
            onClick={() => {
              onAdjustStock(product);
              setIsOpen(false);
            }}
            className={styles.menuItem}
            role="menuitem"
          >
            ⚖️ Adjust Stock
          </button>
          <button
            onClick={() => {
              onViewHistory(product);
              setIsOpen(false);
            }}
            className={styles.menuItem}
            role="menuitem"
          >
            📋 Price History
          </button>
          {isOwner && (
            <button
              onClick={() => {
                onDeactivate(product);
                setIsOpen(false);
              }}
              className={`${styles.menuItem} ${styles.danger}`}
              role="menuitem"
            >
              🚫 Deactivate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
