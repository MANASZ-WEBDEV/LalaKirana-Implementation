import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useAllProductsAnalytics } from './analytics.queries';
import { useCategories } from '../inventory/inventory.queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { DateRangePreset } from '@/types/analytics.types';
import styles from './AllProductsAnalyticsPage.module.css';

// ─── Date range helpers ─────────────────────────────────

function getDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];

  switch (preset) {
    case 'today':
      return { from: to, to };
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split('T')[0], to };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: d.toISOString().split('T')[0], to };
    }
    case 'month': {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return { from, to };
    }
    case 'ytd': {
      return { from: `${now.getFullYear()}-01-01`, to };
    }
    default:
      return { from: to, to };
  }
}

// ─── Format helpers ─────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export default function AllProductsAnalyticsPage() {
  const user = useAuthStore((s) => s.user);

  // Owner-only guard
  if (user?.role !== 'owner') {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          Only the store owner can view detailed product analytics.
        </p>
      </div>
    );
  }

  return <AllProductsAnalyticsDashboard />;
}

function AllProductsAnalyticsDashboard() {
  const navigate = useNavigate();

  // 1. Date Range State
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { from, to } = useMemo(() => {
    if (preset === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  // 2. Table filters/search/pagination
  const [searchVal, setSearchVal] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('netRevenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const limit = 25;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]);

  // Fetch categories
  const { data: categories } = useCategories();

  // Fetch products analytics query
  const { data, isLoading } = useAllProductsAnalytics(
    from,
    to,
    sortBy,
    sortOrder,
    debouncedSearch,
    selectedCategory,
    page,
    limit
  );

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'ytd', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
  ];

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const renderSortArrow = (columnKey: string) => {
    if (sortBy !== columnKey) return null;
    return <span className={styles.sortIndicator}>{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className={styles.container}>
      {/* Header section */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <button className={styles.backBtn} onClick={() => navigate('/analytics')}>
            &larr; Back to Dashboard
          </button>
          <h1 className={styles.title}>All Products Analytics</h1>
          <p className={styles.subtitle}>Detailed sales performance metrics and dead stock detection.</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.presetPills}>
            {presets.map((p) => (
              <button
                key={p.key}
                className={`${styles.presetPill} ${preset === p.key ? styles.presetPillActive : ''}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className={styles.customDateRange}>
              <span className={styles.dateInputLabel}>From:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  setPage(1);
                }}
              />
              <span className={styles.dateInputLabel}>To:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Overview stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Products</span>
          <span className={styles.statValue}>{isLoading ? '...' : data?.summary.productCount ?? 0}</span>
          <span className={styles.statSubtext}>Active in catalog</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Net Sales</span>
          <span className={styles.statValue}>
            {isLoading ? '...' : formatCurrency(data?.summary.totalRevenue ?? 0)}
          </span>
          <span className={styles.statSubtext}>After special discounts</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Profit</span>
          <span className={styles.statValue}>
            {isLoading ? '...' : formatCurrency(data?.summary.totalProfit ?? 0)}
          </span>
          <span className={styles.statSubtext}>Gross margin profit</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Discounts Given</span>
          <span className={styles.statValue}>
            {isLoading ? '...' : formatCurrency(data?.summary.totalDiscount ?? 0)}
          </span>
          <span className={styles.statSubtext}>Applied by staff & owner</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Zero Sales Products</span>
          <span className={`${styles.statValue} ${data?.summary.zeroSalesCount && data.summary.zeroSalesCount > 0 ? styles.statSubtextAlert : ''}`}>
            {isLoading ? '...' : data?.summary.zeroSalesCount ?? 0}
          </span>
          <span className={styles.statSubtext}>Dead stock (0 sales in range)</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search product by name..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>
        <select
          className={styles.selectCategory}
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table grid */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingWrapper}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} width="100%" height={45} />
            ))}
          </div>
        ) : data && data.products.length > 0 ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Product Details</th>
                  <th className={styles.th}>Category</th>
                  <th
                    className={`${styles.th} ${styles.thSortable}`}
                    onClick={() => handleSort('totalQtySold')}
                  >
                    Qty Sold {renderSortArrow('totalQtySold')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable}`}
                    onClick={() => handleSort('netRevenue')}
                  >
                    Revenue {renderSortArrow('netRevenue')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable}`}
                    onClick={() => handleSort('totalDiscount')}
                  >
                    Discounts Given {renderSortArrow('totalDiscount')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable}`}
                    onClick={() => handleSort('netProfit')}
                  >
                    Profit {renderSortArrow('netProfit')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.thSortable}`}
                    onClick={() => handleSort('profitMargin')}
                  >
                    Margin {renderSortArrow('profitMargin')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => {
                  const isDeadStock = p.totalQtySold === 0;
                  return (
                    <tr
                      key={p.product_id}
                      className={`${styles.clickableRow} ${isDeadStock ? styles.deadStockRow : ''}`}
                      onClick={() => navigate(`/analytics/product/${p.product_id}?from=${from}&to=${to}`)}
                    >
                      <td className={styles.td}>
                        <div className={styles.rowName}>{p.product_name}</div>
                        {isDeadStock && (
                          <div className={styles.deadStockBadge}>
                            <span>🔴</span> Dead Stock
                          </div>
                        )}
                      </td>
                      <td className={styles.td}>
                        <span className={styles.rowCategory}>{p.category_name || 'Uncategorized'}</span>
                      </td>
                      <td className={`${styles.td} ${styles.rowNumber}`}>
                        {p.totalQtySold} {p.unit}
                      </td>
                      <td className={`${styles.td} ${styles.rowNumber}`}>
                        {formatCurrency(p.netRevenue)}
                      </td>
                      <td className={`${styles.td} ${styles.rowNumber}`}>
                        {p.totalDiscount > 0 ? (
                          <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>
                            -{formatCurrency(p.totalDiscount)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                        )}
                      </td>
                      <td className={`${styles.td} ${styles.rowNumber} ${styles.rowProfit} ${p.netProfit >= 0 ? styles.profitPositive : styles.profitNegative}`}>
                        {p.netProfit >= 0 ? '+' : ''}
                        {formatCurrency(p.netProfit)}
                      </td>
                      <td className={`${styles.td} ${styles.rowNumber} ${p.profitMargin >= 0 ? styles.profitPositive : styles.profitNegative}`}>
                        {p.profitMargin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination block */}
            <div className={styles.pagination}>
              <div className={styles.pageInfo}>
                Showing {Math.min((page - 1) * limit + 1, data.total)} to{' '}
                {Math.min(page * limit, data.total)} of {data.total} products
              </div>
              <div className={styles.pageBtns}>
                <button
                  className={styles.pageBtn}
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </button>
                <button
                  className={styles.pageBtn}
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, data.totalPages))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📦</div>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
              No products found matching the criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
