import { useState, useEffect, useRef } from 'react';
import { useCustomers, useCreateCustomer } from '@/features/khata/khata.queries';
import { useDebounce } from '@/shared/hooks/useDebounce';
import type { Customer } from '@/types/khata.types';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './CustomerSearch.module.css';

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
  placeholder?: string;
  autoFocus?: boolean;
  value?: string;
  onChangeText?: (text: string) => void;
}

export function CustomerSearch({
  onSelect,
  placeholder = 'Search customer by name or phone...',
  autoFocus = false,
  value,
  onChangeText,
}: CustomerSearchProps) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addToast = useToastStore((s) => s.addToast);

  const isControlled = typeof value !== 'undefined';

  // Synchronize internal query state with value prop if controlled
  useEffect(() => {
    if (isControlled && value !== undefined) {
      setQuery(value);
    }
  }, [value, isControlled]);

  // Fetch customers
  const { data, isLoading } = useCustomers({
    search: debouncedQuery.trim() || undefined,
  });

  const createCustomerMutation = useCreateCustomer();
  const customers = data?.customers || [];

  // Reset active selection index when list results or query updates
  useEffect(() => {
    setActiveIndex(-1);
  }, [customers.length, debouncedQuery]);

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
    if (!isOpen || showAddForm) {
      console.log('CustomerSearch Keydown early exit:', { isOpen, showAddForm });
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = customers.length;
      setActiveIndex((prev) => {
        const next = prev < maxIndex ? prev + 1 : prev;
        console.log('CustomerSearch ArrowDown:', { prev, next, maxIndex, customersCount: customers.length });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev > 0 ? prev - 1 : prev;
        console.log('CustomerSearch ArrowUp:', { prev, next });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      console.log('CustomerSearch Enter:', { activeIndex, customersCount: customers.length });
      if (activeIndex >= 0 && activeIndex < customers.length) {
        selectCustomer(customers[activeIndex]);
      } else if (activeIndex === customers.length && query.trim()) {
        setShowAddForm(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const selectCustomer = (customer: Customer) => {
    onSelect(customer);
    if (!isControlled) {
      setQuery(customer.name);
    }
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const newCustomer = await createCustomerMutation.mutateAsync({
        name: query.trim(),
        phone: newPhone.trim() || null,
      });
      addToast('success', `Customer "${newCustomer.name}" created successfully`);
      onSelect(newCustomer);
      if (!isControlled) {
        setQuery(newCustomer.name);
      }
      setIsOpen(false);
      setShowAddForm(false);
      setNewPhone('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create customer');
    }
  };

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <span className={styles.searchIcon}>👤</span>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            if (!isControlled) {
              setQuery(val);
            }
            onChangeText?.(val);
            setIsOpen(true);
            setActiveIndex(-1);
            setShowAddForm(false);
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
              if (!isControlled) {
                setQuery('');
              }
              onChangeText?.('');
              setNewPhone('');
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
            <form onSubmit={handleCreateCustomer} className={styles.addForm}>
              <div className={styles.addFormHeader}>Add New Customer</div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className={styles.formInput}
                  required
                  placeholder="Customer Name"
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
                  disabled={createCustomerMutation.isPending}
                  className={styles.submitBtn}
                >
                  {createCustomerMutation.isPending ? 'Saving...' : 'Create & Select'}
                </button>
              </div>
            </form>
          ) : (
            <ul className={styles.resultsList}>
              {isLoading ? (
                <li className={styles.loadingState}>Searching customers...</li>
              ) : (
                <>
                  {customers.map((customer, index) => (
                    <li
                      key={customer.id}
                      className={`${styles.resultItem} ${index === activeIndex ? styles.activeItem : ''}`}
                      onClick={() => selectCustomer(customer)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className={styles.customerInfo}>
                        <span className={styles.customerName}>{customer.name}</span>
                        {customer.phone && <span className={styles.customerPhone}>📞 {customer.phone}</span>}
                      </div>
                      <div className={styles.customerMeta}>
                        <span
                          className={`${styles.customerBalance} ${
                            customer.total_balance > 0 ? styles.hasBalance : ''
                          }`}
                        >
                          ₹{Number(customer.total_balance).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                  {query.trim().length > 0 && (
                    <li
                      className={`${styles.resultItem} ${styles.addNewOption} ${
                        activeIndex === customers.length ? styles.activeItem : ''
                      }`}
                      onClick={() => setShowAddForm(true)}
                      onMouseEnter={() => setActiveIndex(customers.length)}
                    >
                      <span>➕ Add new customer <strong>"{query}"</strong></span>
                    </li>
                  )}
                  {customers.length === 0 && !query.trim() && (
                    <li className={styles.noResults}>Type to search customers...</li>
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
