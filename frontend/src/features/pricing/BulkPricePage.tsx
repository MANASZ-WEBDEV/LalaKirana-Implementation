import { useState, useMemo } from 'react';
import { usePricingProducts, usePricingCategories, useBulkUpdatePrices } from './pricing.queries';
import { PriceRow } from './PriceRow';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Input } from '@/shared/ui/Input';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './BulkPricePage.module.css';

export default function BulkPricePage() {
  const { data: products = [], isLoading: productsLoading } = usePricingProducts();
  const { data: categories = [], isLoading: categoriesLoading } = usePricingCategories();
  const bulkUpdateMutation = useBulkUpdatePrices();
  const addToast = useToastStore((state) => state.addToast);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});

  // Reset all manual changes
  const handleReset = () => {
    setNewPrices({});
    addToast('info', 'All price changes have been reset');
  };

  const handlePriceChange = (productId: string, value: string) => {
    setNewPrices((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  // Filter products by search term and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategoryId === 'all' || product.category_id === selectedCategoryId;
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category_name &&
          product.category_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch && product.is_active;
    });
  }, [products, selectedCategoryId, searchTerm]);

  // Compute live change statistics
  const stats = useMemo(() => {
    let changed = 0;
    const itemsToSave: { id: string; price: number }[] = [];
    let hasInvalid = false;

    // Check all products, not just filtered ones, so we don't lose changes on filter change
    products.forEach((product) => {
      const val = newPrices[product.id];
      if (val !== undefined && val !== '') {
        const numVal = Number(val);
        if (numVal < 0 || isNaN(numVal)) {
          hasInvalid = true;
        } else if (numVal !== product.price) {
          changed++;
          itemsToSave.push({ id: product.id, price: numVal });
        }
      }
    });

    return {
      changed,
      total: filteredProducts.length,
      unchanged: filteredProducts.length - changed,
      itemsToSave,
      hasInvalid,
    };
  }, [products, newPrices, filteredProducts]);

  const handleSave = async () => {
    if (stats.itemsToSave.length === 0) return;

    try {
      await bulkUpdateMutation.mutateAsync(stats.itemsToSave);
      addToast('success', `Successfully updated prices for ${stats.itemsToSave.length} product(s)`);
      setNewPrices({}); // Clear manual entries on success
    } catch (err: any) {
      addToast('error', err.response?.data?.message || err.message || 'Failed to update prices');
    }
  };

  const categoryOptions = useMemo(() => {
    const opts = [{ value: 'all', label: 'All Categories' }];
    categories.forEach((cat) => {
      opts.push({ value: cat.id, label: cat.name });
    });
    return opts;
  }, [categories]);

  const isLoading = productsLoading || categoriesLoading;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>Bulk Price Update</h1>
          <p className={styles.subtitle}>Update multiple product prices at once. Price changes are logged to history.</p>
        </div>
      </header>

      {/* Filter and Stats Bar */}
      <div className={styles.controlBar}>
        <div className={styles.filters}>
          <div className={styles.filterSelect}>
            <Select
              id="category-filter"
              label="Filter by Category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              options={categoryOptions}
            />
          </div>
          <div className={styles.filterInput}>
            <Input
              id="search-filter"
              label="Search Products"
              placeholder="Type name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Counter Summary Panel */}
        <div className={styles.statsCard}>
          <div className={styles.statGroup}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Changed</span>
              <span className={`${styles.statValue} ${stats.changed > 0 ? styles.highlightText : ''}`}>
                {stats.changed}
              </span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Unchanged</span>
              <span className={styles.statValue}>{stats.unchanged}</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Filtered Total</span>
              <span className={styles.statValue}>{stats.total}</span>
            </div>
          </div>

          <div className={styles.actionButtons}>
            <Button
              variant="ghost"
              onClick={handleReset}
              disabled={stats.changed === 0 || bulkUpdateMutation.isPending}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={stats.changed === 0 || stats.hasInvalid || bulkUpdateMutation.isPending}
              loading={bulkUpdateMutation.isPending}
            >
              Save All Changes
            </Button>
          </div>
        </div>
      </div>

      {stats.hasInvalid && (
        <div className={styles.errorMessage}>
          ⚠️ One or more entered prices are invalid. Please check for negative values.
        </div>
      )}

      {/* Main pricing table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyContainer}>
            <EmptyState
              heading="No Products Found"
              subtext={searchTerm ? "Try adjusting your search filters." : "There are no products in this category."}
            />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead className={styles.thead}>
                <tr>
                  <th className={styles.th}>Product Details</th>
                  <th className={`${styles.th} ${styles.alignRight}`}>Current Price</th>
                  <th className={`${styles.th} ${styles.alignRight}`}>New Price</th>
                  <th className={`${styles.th} ${styles.alignRight}`}>Price Difference</th>
                </tr>
              </thead>
              <tbody className={styles.tbody}>
                {filteredProducts.map((product) => (
                  <PriceRow
                    key={product.id}
                    product={product}
                    newValue={newPrices[product.id] ?? ''}
                    onChange={(val) => handlePriceChange(product.id, val)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
