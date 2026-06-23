import { useState, useEffect, useRef } from 'react';
import { useProducts } from '@/features/inventory/inventory.queries';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { Product } from '@/types/product.types';
import styles from './ProductSearch.module.css';

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
  autoFocus?: boolean;
  allowOutOfStock?: boolean;
}

export function ProductSearch({
  onSelect,
  placeholder = 'Search product by name...',
  autoFocus = false,
  allowOutOfStock = false,
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch products with search filter
  const { data: products = [], isLoading } = useProducts({
    search: debouncedQuery.trim() || undefined,
  });

  // Only show active products that match search query (or top 5 active products if query is empty but focused)
  const matchedProducts = products.filter((p) => p.is_active);

  // Reset active selection index when list results or query updates
  useEffect(() => {
    setActiveIndex(-1);
  }, [matchedProducts.length, debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < matchedProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < matchedProducts.length) {
        selectProduct(matchedProducts[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const selectProduct = (product: Product) => {
    if (!allowOutOfStock && product.stock_qty <= 0) return;
    onSelect(product);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={styles.searchContainer} ref={searchContainerRef}>
      <div className={styles.inputWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
        />
        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setQuery('');
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (query.trim().length > 0 || isLoading) && (
        <ul className={styles.resultsList}>
          {isLoading ? (
            <li className={styles.loadingState}>Searching products...</li>
          ) : matchedProducts.length === 0 ? (
            <li className={styles.noResults}>No products found</li>
          ) : (
            matchedProducts.map((product, index) => (
              <li
                key={product.id}
                className={`${styles.resultItem} ${index === activeIndex ? styles.activeItem : ''} ${
                  product.stock_qty > 0 && product.stock_qty <= product.low_stock_threshold
                    ? styles.lowStockItem
                    : ''
                } ${
                  product.stock_qty <= 0 ? styles.outOfStockBorder : ''
                } ${!allowOutOfStock && product.stock_qty <= 0 ? styles.outOfStockItem : ''}`}
                onClick={() => selectProduct(product)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{product.name}</span>
                  <span className={styles.productCategory}>{product.category_name || 'Uncategorized'}</span>
                </div>
                <div className={styles.productMeta}>
                  <span className={styles.productPrice}>
                    ₹{product.price.toFixed(2)} / {product.unit}
                  </span>
                  <span
                    className={`${styles.productStock} ${
                      !allowOutOfStock && product.stock_qty === 0
                        ? styles.outOfStockText
                        : product.stock_qty <= product.low_stock_threshold
                        ? styles.lowStockText
                        : ''
                    }`}
                  >
                    Stock: {product.stock_qty} {product.unit}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
