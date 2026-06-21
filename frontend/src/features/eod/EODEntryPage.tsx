import { useState, useEffect, useMemo } from 'react';
import { useEODProducts, useEODEntry, useSubmitEOD } from './eod.queries';
import { EODProductRow } from './EODProductRow';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useToastStore } from '@/shared/store/toastStore';
import type { EODProductRow as EODProductRowType } from '@/types/inventory.types';
import styles from './EODEntryPage.module.css';

export default function EODEntryPage() {
  const addToast = useToastStore((state) => state.addToast);
  
  // 1. Manage current date (default to today in local timezone YYYY-MM-DD format)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [entryDate, setEntryDate] = useState<string>(getTodayString());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rows, setRows] = useState<Record<string, string>>({}); // Mapping product_id -> qty_sold (as string)

  // 2. Fetch all products and EOD entries for selected date
  const { data: products = [], isLoading: productsLoading } = useEODProducts();
  const { data: existingEntries = [], isLoading: entryLoading, isFetching: entryFetching } = useEODEntry(entryDate);
  const submitEODMutation = useSubmitEOD();

  // 3. Pre-fill rows when existing entries are loaded for the date
  useEffect(() => {
    if (existingEntries && existingEntries.length > 0) {
      const initialRows: Record<string, string> = {};
      existingEntries.forEach((entry) => {
        if (entry.product_id) {
          initialRows[entry.product_id] = String(entry.qty_sold);
        }
      });
      setRows(initialRows);
    } else {
      setRows({});
    }
  }, [existingEntries, entryDate]);

  // 4. Product autocomplete / search filtered by input text and not already selected
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return products
      .filter((p) => p.is_active && p.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [products, searchTerm]);

  // Add product to the diary entries list
  const handleAddProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setRows((prev) => ({
      ...prev,
      [productId]: prev[productId] || '',
    }));
    setSearchTerm('');
    addToast('success', `Added "${product.name}" to sales diary`);
  };

  // Remove product from entries list
  const handleRemoveProduct = (productId: string) => {
    setRows((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  // Handle sales qty change for a product
  const handleQtyChange = (productId: string, val: string) => {
    setRows((prev) => ({
      ...prev,
      [productId]: val,
    }));
  };

  // 5. Compute stats and validation
  const stats = useMemo(() => {
    let itemsCount = 0;
    let totalSalesValue = 0;
    let hasErrors = false;
    const itemsToSubmit: EODProductRowType[] = [];

    Object.entries(rows).forEach(([productId, qtyStr]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      itemsCount++;
      const qty = Number(qtyStr);
      
      // Calculate errors
      const isInvalid = qtyStr === '' || qty < 1 || !Number.isInteger(qty) || qty > product.stock_qty;
      if (isInvalid) {
        hasErrors = true;
      } else {
        totalSalesValue += qty * Number(product.price);
        itemsToSubmit.push({
          product_id: productId,
          qty_sold: qty,
        });
      }
    });

    return {
      itemsCount,
      totalSalesValue,
      hasErrors,
      itemsToSubmit,
    };
  }, [rows, products]);

  // Reset current entries on screen
  const handleReset = () => {
    setRows({});
    addToast('info', 'Sales diary entries cleared');
  };

  // Submit EOD entries to backend
  const handleSave = async () => {
    if (stats.itemsCount === 0 || stats.hasErrors) return;

    try {
      await submitEODMutation.mutateAsync({
        entry_date: entryDate,
        items: stats.itemsToSubmit,
      });
      addToast('success', `Daily sales entry saved successfully for ${entryDate}`);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || err.message || 'Failed to save EOD entry');
    }
  };

  const isLoading = productsLoading || entryLoading;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>Daily Sales Diary (EOD)</h1>
          <p className={styles.subtitle}>
            Enter daily paper-diary sales to deduct from digital inventory. Same-day entries will overwrite.
          </p>
        </div>
      </header>

      {/* Control Panel: Date and Search */}
      <div className={styles.controlBar}>
        <div className={styles.dateSelectorCard}>
          <label htmlFor="eod-date" className={styles.dateLabel}>Sales Entry Date</label>
          <input
            id="eod-date"
            type="date"
            className={styles.dateInput}
            value={entryDate}
            max={getTodayString()}
            onChange={(e) => setEntryDate(e.target.value)}
          />
          {entryFetching && <span className={styles.fetchingBadge}>Loading entries...</span>}
        </div>

        <div className={styles.searchCard}>
          <div className={styles.searchInputContainer}>
            <Input
              id="product-search"
              label="Add Product to Diary"
              placeholder="Search product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && searchResults.length > 0 && (
              <ul className={styles.searchResultsList}>
                {searchResults.map((product) => {
                  const isAlreadyAdded = rows[product.id] !== undefined;
                  return (
                    <li key={product.id} className={styles.searchResultItem}>
                      <button
                        type="button"
                        className={styles.searchResultBtn}
                        onClick={() => handleAddProduct(product.id)}
                        disabled={isAlreadyAdded}
                      >
                        <span className={styles.searchProdName}>{product.name}</span>
                        <span className={styles.searchProdStock}>
                          Stock: {product.stock_qty} {product.unit} {isAlreadyAdded && '(Added)'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {searchTerm && searchResults.length === 0 && (
              <div className={styles.noResultsDropdown}>No active products match search</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className={styles.summaryBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Items Listed</span>
          <span className={styles.statValue}>{stats.itemsCount}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Est. Sales Value</span>
          <span className={styles.statValue}>₹{stats.totalSalesValue.toFixed(2)}</span>
        </div>
        <div className={styles.actionButtons}>
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={stats.itemsCount === 0 || submitEODMutation.isPending}
          >
            Clear All
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={stats.itemsCount === 0 || stats.hasErrors || submitEODMutation.isPending}
            loading={submitEODMutation.isPending}
          >
            Confirm Entry
          </Button>
        </div>
      </div>

      {/* Main Form Entry Diary */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading diary data...</p>
          </div>
        ) : Object.keys(rows).length === 0 ? (
          <div className={styles.emptyContainer}>
            <EmptyState
              heading="Diary is Empty"
              subtext="Search and select products to record today's diary sales."
            />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Product Details</th>
                  <th className={styles.th}>Current Stock</th>
                  <th className={styles.th}>Qty Sold Today</th>
                  <th className={`${styles.th} ${styles.alignRight}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {Object.keys(rows).map((productId) => {
                  const product = products.find((p) => p.id === productId);
                  if (!product) return null;
                  return (
                    <EODProductRow
                      key={productId}
                      name={product.name}
                      unit={product.unit}
                      currentStock={product.stock_qty}
                      qtySold={rows[productId]}
                      onQtyChange={(val) => handleQtyChange(productId, val)}
                      onRemove={() => handleRemoveProduct(productId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
