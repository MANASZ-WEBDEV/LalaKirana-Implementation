import { useState, useEffect, useRef } from 'react';
import { useSuppliers, useCreateSupplier } from './purchases.queries';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { Supplier } from '@/types/purchases.types';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './SupplierSelect.module.css';

interface SupplierSelectProps {
  onSelect: (supplier: Supplier | null) => void;
  selectedSupplier: Supplier | null;
  placeholder?: string;
}

export function SupplierSelect({ onSelect, selectedSupplier, placeholder = 'Search supplier...' }: SupplierSelectProps) {
  const [query, setQuery] = useState(selectedSupplier?.name || '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  // Fetch suppliers list
  const { data, isLoading } = useSuppliers({
    search: debouncedQuery.trim() || undefined,
  });

  const createSupplierMutation = useCreateSupplier();
  const suppliers = data?.suppliers || [];

  // Synchronize input query with the parent-provided selectedSupplier object
  useEffect(() => {
    setQuery(selectedSupplier?.name || '');
  }, [selectedSupplier]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
        setShowAddForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || showAddForm) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = suppliers.length;
      setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suppliers.length) {
        selectSupplier(suppliers[activeIndex]);
      } else if (activeIndex === suppliers.length && query.trim()) {
        setShowAddForm(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const selectSupplier = (supplier: Supplier) => {
    onSelect(supplier);
    setQuery(supplier.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const newSupplier = await createSupplierMutation.mutateAsync({
        name: query.trim(),
        phone: newPhone.trim() || null,
        address: newAddress.trim() || null,
      });
      addToast('success', `Supplier "${newSupplier.name}" created successfully`);
      onSelect(newSupplier);
      setQuery(newSupplier.name);
      setIsOpen(false);
      setShowAddForm(false);
      setNewPhone('');
      setNewAddress('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create supplier');
    }
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <span className={styles.searchIcon}>🚚</span>
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
            setShowAddForm(false);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setQuery('');
              onSelect(null);
              setActiveIndex(-1);
              setShowAddForm(false);
              inputRef.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {showAddForm ? (
            <form onSubmit={handleCreateSupplier} className={styles.addForm}>
              <div className={styles.addFormHeader}>Add New Supplier</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Supplier Name *</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone (Optional)</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={styles.formInput}
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Address (Optional)</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className={styles.formInput}
                  placeholder="Address details"
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSupplierMutation.isPending}
                  className={styles.submitBtn}
                >
                  {createSupplierMutation.isPending ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </form>
          ) : (
            <ul className={styles.resultsList}>
              {isLoading ? (
                <li className={styles.loadingState}>Searching suppliers...</li>
              ) : (
                <>
                  {suppliers.map((supplier, index) => (
                    <li
                      key={supplier.id}
                      className={`${styles.resultItem} ${index === activeIndex ? styles.activeItem : ''}`}
                      onClick={() => selectSupplier(supplier)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className={styles.supplierInfo}>
                        <span className={styles.supplierName}>{supplier.name}</span>
                        {supplier.phone && <span className={styles.supplierPhone}>📞 {supplier.phone}</span>}
                      </div>
                      <div className={styles.supplierMeta}>
                        <span className={styles.supplierBalance}>
                          Owed: ₹{Number(supplier.total_balance).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {query.trim().length > 0 && (
                    <li
                      className={`${styles.resultItem} ${styles.addNewOption} ${
                        activeIndex === suppliers.length ? styles.activeItem : ''
                      }`}
                      onClick={() => setShowAddForm(true)}
                      onMouseEnter={() => setActiveIndex(suppliers.length)}
                    >
                      <span>➕ Add new supplier <strong>"{query}"</strong></span>
                    </li>
                  )}
                  {suppliers.length === 0 && !query.trim() && (
                    <li className={styles.noResults}>Type to search suppliers...</li>
                  )}
                </>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
