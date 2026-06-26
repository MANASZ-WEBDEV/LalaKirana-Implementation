import { useState, useEffect, useRef } from 'react';
import { useSuppliers, useCreateSupplier } from './purchases.queries';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  // Fetch all active suppliers on mount (cached up to 30s)
  const { data, isLoading } = useSuppliers({
    limit: 100,
    active_only: true,
  });

  const createSupplierMutation = useCreateSupplier();
  const suppliers = data?.suppliers || [];

  // Filter suppliers in client-side, showing up to 10 matching results
  const filteredSuppliers = suppliers
    .filter((supplier) => {
      const searchStr = query.toLowerCase().trim();
      if (!searchStr) return true;
      return (
        supplier.name.toLowerCase().includes(searchStr) ||
        (supplier.phone && supplier.phone.includes(searchStr))
      );
    })
    .slice(0, 10);

  // Synchronize input query with the parent-provided selectedSupplier object
  useEffect(() => {
    setQuery(selectedSupplier?.name || '');
  }, [selectedSupplier]);

  // Reset active index when the filtered list size or query changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredSuppliers.length, query]);

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
      const maxIndex = filteredSuppliers.length;
      setActiveIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredSuppliers.length) {
        selectSupplier(filteredSuppliers[activeIndex]);
      } else if (activeIndex === filteredSuppliers.length && query.trim()) {
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

  const handleCreateSupplier = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    if (!newPhone.trim()) {
      addToast('error', 'Phone number is required');
      return;
    }

    try {
      const newSupplier = await createSupplierMutation.mutateAsync({
        name: query.trim(),
        phone: newPhone.trim(),
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

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateSupplier();
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
          onFocus={(e) => {
            setIsOpen(true);
            e.target.select();
          }}
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
            <div className={styles.addForm}>
              <div className={styles.addFormHeader}>Add New Supplier</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Supplier Name *</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={styles.formInput}
                  onKeyDown={handleInputKeyDown}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Phone *</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={styles.formInput}
                  onKeyDown={handleInputKeyDown}
                  required
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
                  onKeyDown={handleInputKeyDown}
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
                  type="button"
                  onClick={handleCreateSupplier}
                  disabled={createSupplierMutation.isPending}
                  className={styles.submitBtn}
                >
                  {createSupplierMutation.isPending ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </div>
          ) : (
            <ul className={styles.resultsList}>
              {isLoading ? (
                <li className={styles.loadingState}>Loading suppliers...</li>
              ) : (
                <>
                  {filteredSuppliers.map((supplier, index) => (
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
                        activeIndex === filteredSuppliers.length ? styles.activeItem : ''
                      }`}
                      onClick={() => setShowAddForm(true)}
                      onMouseEnter={() => setActiveIndex(filteredSuppliers.length)}
                    >
                      <span>➕ Add new supplier <strong>"{query}"</strong></span>
                    </li>
                  )}
                  {filteredSuppliers.length === 0 && !query.trim() && (
                    <li className={styles.noResults}>No active suppliers. Type to add a new one.</li>
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

