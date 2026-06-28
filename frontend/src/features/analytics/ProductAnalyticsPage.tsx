import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/shared/store/authStore';
import { useProductAnalytics, useProductTrend } from './analytics.queries';
import { StatCard } from '@/shared/ui/StatCard';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StaffDiscountBillsDrawer } from './StaffDiscountBillsDrawer';
import type { DateRangePreset, Granularity } from '@/types/analytics.types';
import styles from './ProductAnalyticsPage.module.css';

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

const formatCurrencyShort = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
};

const formatDateLabel = (dateStr: string, granularity: Granularity) => {
  const d = new Date(dateStr);
  if (granularity === 'month') {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function ProductAnalyticsPage() {
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

  return <ProductAnalyticsDashboard />;
}

function ProductAnalyticsDashboard() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Initialise date range from URL query parameters if present, else fallback
  const initialPreset = (searchParams.get('preset') as DateRangePreset) || 'month';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';

  const [preset, setPreset] = useState<DateRangePreset>(() => {
    if (initialFrom && initialTo && !searchParams.get('preset')) {
      return 'custom';
    }
    return initialPreset;
  });

  const [customFrom, setCustomFrom] = useState(() => {
    if (initialFrom) return initialFrom;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });

  const [customTo, setCustomTo] = useState(() => {
    if (initialTo) return initialTo;
    return new Date().toISOString().split('T')[0];
  });

  const { from, to } = useMemo(() => {
    if (preset === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return getDateRange(preset);
  }, [preset, customFrom, customTo]);

  // 2. Trend granularity
  const [granularity, setGranularity] = useState<Granularity>('day');

  // 3. Drilldown drawer state for staff discounts
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  // 4. React Query
  const { data: detail, isLoading: detailLoading } = useProductAnalytics(productId || '', from, to);
  const { data: trend, isLoading: trendLoading } = useProductTrend(productId || '', from, to, granularity);

  const isLoading = detailLoading;

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'ytd', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
  ];

  const mapDelta = (val: number | null) => {
    if (val === null || val === undefined) return undefined;
    return {
      value: `${Math.abs(val)}%`,
      isPositive: val >= 0,
      isNegative: val < 0,
      label: ' vs prev period',
    };
  };

  return (
    <div className={styles.container}>
      {/* Header Controls */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <button className={styles.backBtn} onClick={() => navigate('/analytics/products')}>
            &larr; Back to Product Table
          </button>
          <h1 className={styles.title}>{isLoading ? 'Loading...' : detail?.product_name}</h1>
          <p className={styles.subtitle}>
            {isLoading ? 'Fetching details...' : `${detail?.category_name || 'Uncategorized'}  •  Sold by ${detail?.unit}`}
          </p>
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
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className={styles.dateInputLabel}>To:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton width={100} height={14} />
              <Skeleton width={130} height={30} />
              <Skeleton width={80} height={16} />
            </div>
          ))}
        </div>
      ) : detail ? (
        <div className={styles.statsGrid}>
          <StatCard
            label="Total Qty Sold"
            value={`${detail.totalQtySold} ${detail.unit}`}
            delta={mapDelta(detail.qtyDelta)}
          />
          <StatCard
            label="Net Revenue"
            value={formatCurrency(detail.netRevenue)}
            delta={mapDelta(detail.revenueDelta)}
          />
          <StatCard
            label="Gross Profit"
            value={formatCurrency(detail.grossProfit)}
            delta={mapDelta(detail.profitDelta)}
          />
          <StatCard
            label="Special Discounts Given"
            value={formatCurrency(detail.totalDiscount)}
            delta={mapDelta(detail.discountDelta)}
          />
        </div>
      ) : null}

      {/* Trend Chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Revenue, Profit & Discount Trend</h2>
          <div className={styles.chartControlsGroup}>
            <div className={styles.granularityPills}>
              {(['day', 'week', 'month'] as Granularity[]).map((g) => (
                <button
                  key={g}
                  className={`${styles.granularityBtn} ${granularity === g ? styles.granularityBtnActive : ''}`}
                  onClick={() => setGranularity(g)}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.chartContainer}>
          {trendLoading ? (
            <Skeleton width="100%" height={320} />
          ) : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006763" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#006763" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradDiscount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => formatDateLabel(d, granularity)}
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={{ stroke: 'var(--color-outline-variant)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatCurrencyShort}
                  tick={{ fontSize: 11, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                    fontSize: '0.8rem',
                  }}
                  labelFormatter={(d) => formatDateLabel(d as string, granularity)}
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value)),
                    name === 'revenue'
                      ? 'Net Revenue'
                      : name === 'profit'
                      ? 'Profit'
                      : 'Special Discount',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#006763"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                  name="revenue"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#gradProfit)"
                  name="profit"
                />
                <Area
                  type="monotone"
                  dataKey="discount"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#gradDiscount)"
                  name="discount"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyText}>No sales transactions found in this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Grid containing metrics and staff attributions */}
      <div className={styles.detailsGrid}>
        {/* Key Metrics Panel */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Sales & Profit Metrics</h2>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} width="100%" height={30} />)}
            </div>
          ) : detail ? (
            <div className={styles.metricsList}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Average Selling Price</span>
                <span className={styles.metricValue}>
                  {formatCurrency(detail.avgSellingPrice)} / {detail.unit}
                </span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Profit Margin</span>
                <span className={`${styles.metricValue} ${detail.profitMargin >= 0 ? styles.metricValuePositive : styles.metricValueAlert}`}>
                  {detail.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Total Bills Count</span>
                <span className={styles.metricValue}>{detail.billCount} bills</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Discounted Bills Count</span>
                <span className={styles.metricValue}>
                  {detail.discountBillCount} bills ({detail.billCount > 0 ? Math.round((detail.discountBillCount / detail.billCount) * 100) : 0}%)
                </span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Earning Potential (Profit without discount)</span>
                <span className={styles.metricValue} style={{ color: 'var(--color-primary)' }}>
                  {formatCurrency(detail.grossProfit + detail.totalDiscount)}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Staff Discounts Table */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Discounts Given by Staff</h2>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width="100%" height={40} />)}
            </div>
          ) : detail && detail.staffDiscounts.length > 0 ? (
            <div className={styles.staffList}>
              <div className={styles.staffHeaderRow}>
                <span>Staff Name</span>
                <span>Total Discount</span>
                <span>Bill Count</span>
              </div>
              {detail.staffDiscounts.map((staff) => (
                <div
                  key={staff.staff_id}
                  className={`${styles.staffRow} ${styles.staffRowClickable}`}
                  onClick={() => {
                    setSelectedStaffId(staff.staff_id);
                    setSelectedStaffName(staff.staff_name);
                  }}
                  title="Click to view detailed bills"
                >
                  <span className={styles.staffName}>{staff.staff_name}</span>
                  <span className={styles.staffDiscount}>{formatCurrency(staff.totalDiscount)}</span>
                  <span className={styles.staffBills}>{staff.billCount} bills</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <p className={styles.emptyText}>No special discounts applied to this product by staff.</p>
            </div>
          )}
        </div>
      </div>

      {/* Staff discount bills drill down drawer */}
      {selectedStaffId && (
        <StaffDiscountBillsDrawer
          isOpen={!!selectedStaffId}
          onClose={() => setSelectedStaffId(null)}
          staffId={selectedStaffId}
          staffName={selectedStaffName}
          from={from}
          to={to}
        />
      )}
    </div>
  );
}
