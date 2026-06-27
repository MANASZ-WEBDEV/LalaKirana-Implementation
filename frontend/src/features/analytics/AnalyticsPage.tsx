import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '@/shared/store/authStore';
import {
  useAnalyticsOverview,
  useAnalyticsTrend,
  useTopProducts,
  useCategoryBreakdown,
} from './analytics.queries';
import { analyticsApi } from './analytics.api';
import { Skeleton } from '@/shared/ui/Skeleton';
import { ProfitBreakdownDrawer } from './ProfitBreakdownDrawer';
import type { DateRangePreset, Granularity } from '@/types/analytics.types';
import styles from './AnalyticsPage.module.css';

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

// ─── Colors ─────────────────────────────────────────────

const CHART_COLORS = ['#006763', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

// ─── Component ──────────────────────────────────────────

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);

  // Owner-only guard
  if (user?.role !== 'owner') {
    return (
      <div className={styles.guardContainer}>
        <div className={styles.guardIcon}>🔒</div>
        <h2 className={styles.guardTitle}>Analytics Restricted</h2>
        <p className={styles.guardText}>
          Only the store owner can view analytics data. Contact your administrator for access.
        </p>
      </div>
    );
  }

  return <AnalyticsDashboard />;
}

function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DateRangePreset>('month');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [chartView, setChartView] = useState<'combined' | 'revenue' | 'profit'>('combined');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const { from, to } = useMemo(() => getDateRange(preset), [preset]);

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview(from, to);
  const { data: trend, isLoading: trendLoading } = useAnalyticsTrend(from, to, granularity);
  const { data: topProducts, isLoading: topLoading } = useTopProducts(from, to);
  const { data: categories, isLoading: catLoading } = useCategoryBreakdown(from, to);

  const isLoading = overviewLoading || trendLoading || topLoading || catLoading;

  const handleExportCSV = useCallback(async () => {
    try {
      const blob = await analyticsApi.exportCSV(from, to);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `lalakirana-sales-${from}-to-${to}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      console.error('CSV export failed');
    }
  }, [from, to]);

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'ytd', label: 'YTD' },
  ];

  // ─── Render ───────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>Sales performance, revenue trends, and profit insights.</p>
        </div>
        <div className={styles.controls}>
          <div className={styles.presetPillsDesktop}>
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
          <select
            className={styles.presetSelectMobile}
            value={preset}
            onChange={(e) => setPreset(e.target.value as DateRangePreset)}
          >
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
          <button className={styles.exportBtn} onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span>CSV</span>
          </button>
        </div>
      </div>

      {overview && overview.noCostProductsCount && overview.noCostProductsCount > 0 ? (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'rgba(217, 119, 6, 0.05)',
          border: '1px solid rgba(217, 119, 6, 0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          fontSize: '14px',
          color: '#b45309',
          fontWeight: 500,
          marginTop: '-8px',
          marginBottom: '8px'
        }}>
          <span>⚠️ {overview.noCostProductsCount} products have no cost price set. Profit figures may be understated.</span>
          <button 
            onClick={() => navigate('/inventory?no_cost=true')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            Set cost prices in Inventory &rarr;
          </button>
        </div>
      ) : null}

      {/* KPI Stat Cards */}
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
      ) : (
        <div className={styles.statsGrid}>
          <StatCard
            className={styles.statRevenue}
            label="Total Revenue"
            value={formatCurrency(overview?.totalRevenue ?? 0)}
            delta={overview?.revenueDelta}
          />
          <StatCard
            className={styles.statOrders}
            label="Total Orders"
            value={String(overview?.orderCount ?? 0)}
            delta={overview?.orderCountDelta}
          />
          <StatCard
            className={styles.statProfit}
            label="Net Profit (View Breakdown)"
            value={formatCurrency(overview?.totalProfit ?? 0)}
            delta={overview?.profitDelta}
            suffix={overview?.profitMargin ? `${overview.profitMargin}% margin` : undefined}
            onClick={() => setIsBreakdownOpen(true)}
          />
          <StatCard
            className={styles.statAvg}
            label="Avg Order Value"
            value={formatCurrency(overview?.avgOrderValue ?? 0)}
            delta={overview?.avgOrderValueDelta}
          />
        </div>
      )}

      {/* Revenue & Profit Trend Chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Revenue & Profit Trend</h2>
          <div className={styles.chartControlsGroup}>
            <div className={styles.viewControls}>
              <div className={styles.viewPillsDesktop}>
                {(['combined', 'revenue', 'profit'] as const).map((view) => (
                  <button
                    key={view}
                    className={`${styles.viewBtn} ${chartView === view ? styles.viewBtnActive : ''}`}
                    onClick={() => setChartView(view)}
                  >
                    {view === 'combined' ? 'Combined' : view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
              <select
                className={styles.viewSelectMobile}
                value={chartView}
                onChange={(e) => setChartView(e.target.value as any)}
              >
                <option value="combined">Combined</option>
                <option value="revenue">Revenue</option>
                <option value="profit">Profit</option>
              </select>
            </div>

            <div className={styles.divider} />

            <div className={styles.granularityControls}>
              <div className={styles.granularityPillsDesktop}>
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
              <select
                className={styles.granularitySelectMobile}
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as Granularity)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          {trendLoading ? (
            <Skeleton width="100%" height={300} />
          ) : trend && trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006763" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#006763" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.5} />
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
                  formatter={(value: any, name: any) => [formatCurrency(Number(value)), name === 'revenue' ? 'Revenue' : 'Profit']}
                  itemSorter={(item: any) => (item.dataKey === 'revenue' ? -1 : 1)}
                />
                {(chartView === 'combined' || chartView === 'revenue') && (
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#006763"
                    strokeWidth={2.5}
                    fill="url(#gradRevenue)"
                    animationDuration={800}
                  />
                )}
                {(chartView === 'combined' || chartView === 'profit') && (
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#gradProfit)"
                    animationDuration={1000}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyText}>No sales data for this period. Start billing to see trends here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Top Products + Category Breakdown */}
      <div className={styles.bottomGrid}>
        {/* Top Products */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Top Products by Revenue</h2>
          {topLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} width="100%" height={42} />)}
            </div>
          ) : topProducts && topProducts.length > 0 ? (
            <div className={styles.topProductsList}>
              <div className={styles.productHeaderRow}>
                <span className={styles.productRank}>#</span>
                <span>Product Details</span>
                <span className={styles.productRevenue}>Revenue</span>
                <span className={styles.productProfit} style={{ color: 'inherit' }}>Profit</span>
              </div>
              {topProducts.slice(0, 10).map((p, idx) => (
                <div key={p.product_id} className={styles.productRow}>
                  <span className={styles.productRank}>{idx + 1}</span>
                  <div className={styles.productInfo}>
                    <span className={styles.productName}>{p.product_name}</span>
                    <span className={styles.productCategory}>{p.category_name || 'Uncategorized'}</span>
                  </div>
                  <span className={styles.productRevenue}>{formatCurrency(p.totalRevenue)}</span>
                  <span className={`${styles.productProfit} ${p.totalProfit >= 0 ? styles.productProfitPositive : styles.productProfitNegative}`}>
                    {p.totalProfit >= 0 ? '+' : ''}{formatCurrency(p.totalProfit)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <p className={styles.emptyText}>No product sales in this period.</p>
            </div>
          )}
        </div>

        {/* Category Donut */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Category Breakdown</h2>
          {catLoading ? (
            <Skeleton width="100%" height={280} />
          ) : categories && categories.length > 0 ? (
            <div className={styles.donutContainer}>
              <div className={styles.donutChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="revenue"
                      nameKey="category_name"
                      animationDuration={800}
                    >
                      {categories.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-white)',
                        border: '1px solid var(--color-outline-variant)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-md)',
                        fontSize: '0.8rem',
                      }}
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.categoryLegend}>
                {categories.map((cat, idx) => (
                  <div key={cat.category_name} className={styles.legendItem}>
                    <div className={styles.legendDot} style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className={styles.legendName}>{cat.category_name}</span>
                    <span className={styles.legendValue}>{formatCurrency(cat.revenue)}</span>
                    <span className={styles.legendPercent}>{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🗂️</div>
              <p className={styles.emptyText}>No category data for this period.</p>
            </div>
          )}
        </div>
      </div>

      <ProfitBreakdownDrawer
        isOpen={isBreakdownOpen}
        onClose={() => setIsBreakdownOpen(false)}
        from={from}
        to={to}
        onRedirectToInventory={() => navigate('/inventory?no_cost=true')}
      />
    </div>
  );
}

// ─── Internal StatCard ──────────────────────────────────

function StatCard({
  className,
  label,
  value,
  delta,
  suffix,
  onClick,
  style,
}: {
  className: string;
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const getDeltaClass = () => {
    if (delta === null || delta === undefined) return styles.deltaNeutral;
    return delta >= 0 ? styles.deltaUp : styles.deltaDown;
  };

  return (
    <div
      className={`${styles.statCard} ${className} ${onClick ? styles.clickableCard : ''}`}
      onClick={onClick}
      style={style}
    >
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {delta !== null && delta !== undefined && (
        <span className={`${styles.statDelta} ${getDeltaClass()}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
          <span className={styles.deltaLabel}>vs prev</span>
        </span>
      )}
      {suffix && (
        <span className={styles.statDelta} style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
