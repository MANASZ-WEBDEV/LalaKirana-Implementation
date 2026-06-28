import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuthStore } from '@/shared/store/authStore';
import { useStaffDiscountAudit } from './analytics.queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StaffDiscountBillsDrawer } from './StaffDiscountBillsDrawer';
import type { DateRangePreset, Granularity } from '@/types/analytics.types';
import styles from './StaffDiscountAuditPage.module.css';

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

const CHART_COLORS = ['#006763', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

export default function StaffDiscountAuditPage() {
  const user = useAuthStore((s) => s.user);

  // Owner-only guard
  if (user?.role !== 'owner') {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>
          Only the store owner can access staff discount audits.
        </p>
      </div>
    );
  }

  return <StaffDiscountAuditDashboard />;
}

function StaffDiscountAuditDashboard() {
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

  // 2. Trend Granularity
  const [granularity, setGranularity] = useState<Granularity>('day');

  // 3. Drilldown Drawer State
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  // 4. Fetch Staff Audit Query
  const { data: staffData, isLoading } = useStaffDiscountAudit(from, to, granularity);

  const presets: { key: DateRangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'ytd', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
  ];

  // 5. Total Discount given across all staff
  const totalSummary = useMemo(() => {
    if (!staffData) return { totalDiscount: 0, totalBills: 0 };
    return staffData.reduce(
      (sum, staff) => ({
        totalDiscount: sum.totalDiscount + staff.totalDiscount,
        totalBills: sum.totalBills + staff.billCount,
      }),
      { totalDiscount: 0, totalBills: 0 }
    );
  }, [staffData]);

  // 6. Transform data for Recharts Stacked Bar Chart
  const chartData = useMemo(() => {
    if (!staffData) return [];

    const dateMap = new Map<string, any>();

    for (const staff of staffData) {
      for (const b of staff.breakdown) {
        if (!dateMap.has(b.date)) {
          dateMap.set(b.date, { date: b.date });
        }
        const entry = dateMap.get(b.date);
        entry[staff.staff_name] = b.discount;
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [staffData]);

  // 7. Combine top discounted products across all staff
  const topDiscountedProducts = useMemo(() => {
    if (!staffData) return [];
    const productMap = new Map<string, { product_id: string; product_name: string; totalDiscount: number; billCount: number }>();

    for (const staff of staffData) {
      for (const p of staff.topProducts) {
        if (!productMap.has(p.product_id)) {
          productMap.set(p.product_id, {
            product_id: p.product_id,
            product_name: p.product_name,
            totalDiscount: 0,
            billCount: 0,
          });
        }
        const entry = productMap.get(p.product_id)!;
        entry.totalDiscount += p.totalDiscount;
        entry.billCount += p.billCount;
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.totalDiscount - a.totalDiscount)
      .slice(0, 10);
  }, [staffData]);

  return (
    <div className={styles.container}>
      {/* Header Controls */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <button className={styles.backBtn} onClick={() => navigate('/analytics')}>
            &larr; Back to Dashboard
          </button>
          <h1 className={styles.title}>Staff Discount Audit</h1>
          <p className={styles.subtitle}>Audit special checkout discounts applied by staff members.</p>
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

      {/* Summary KPI Banner */}
      <div className={styles.summaryCard}>
        <span className={styles.summaryLabel}>Total Staff Discounts Given</span>
        <span className={styles.summaryVal}>
          {isLoading ? '...' : formatCurrency(totalSummary.totalDiscount)}
        </span>
        <span className={styles.summarySubtext}>
          {isLoading ? '...' : `Applied across ${totalSummary.totalBills} bills in this period`}
        </span>
      </div>

      {/* Staff summary list */}
      <div className={styles.auditCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Staff Summary</h2>
        </div>
        <div className={styles.tableWrapper}>
          {isLoading ? (
            <div style={{ padding: '1.5rem' }}>
              <Skeleton width="100%" height={120} />
            </div>
          ) : staffData && staffData.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Staff Member</th>
                  <th className={styles.th}>Total Discount Given</th>
                  <th className={styles.th}>Bills Count</th>
                  <th className={styles.th}>Average Discount/Bill</th>
                  <th className={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {staffData.map((staff) => (
                  <tr key={staff.staff_id}>
                    <td className={styles.td}>
                      <div className={styles.staffName}>
                        {staff.staff_name}
                        <span className={styles.roleBadge}>{staff.staff_role}</span>
                      </div>
                    </td>
                    <td className={`${styles.td} ${styles.discountVal}`}>
                      {formatCurrency(staff.totalDiscount)}
                    </td>
                    <td className={styles.td}>{staff.billCount} bills</td>
                    <td className={styles.td}>{formatCurrency(staff.avgDiscountPerBill)}</td>
                    <td className={styles.td}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => {
                          setSelectedStaffId(staff.staff_id);
                          setSelectedStaffName(staff.staff_name);
                        }}
                      >
                        View Bills &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <p className={styles.emptyText}>No discounts applied by staff in this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* Day-wise stacked bar trend chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>Discount Distribution Trend</h2>
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
          {isLoading ? (
            <Skeleton width="100%" height={320} />
          ) : chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
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
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Discount Given']}
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                {staffData?.map((staff, idx) => (
                  <Bar
                    key={staff.staff_id}
                    dataKey={staff.staff_name}
                    stackId="a"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[2, 2, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <p className={styles.emptyText}>No discount distribution trend available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top discounted products grid */}
      <div className={styles.productsCard}>
        <h2 className={styles.chartTitle} style={{ borderBottom: '1px solid var(--color-outline-variant)', paddingBottom: '0.75rem' }}>
          Top Discounted Products (All Staff)
        </h2>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} width="100%" height={40} />)}
          </div>
        ) : topDiscountedProducts.length > 0 ? (
          <div className={styles.productsList}>
            <div className={styles.productHeaderRow}>
              <span>Product Name</span>
              <span>Total Discount Given</span>
              <span>Discounted Bills</span>
            </div>
            {topDiscountedProducts.map((p) => (
              <div
                key={p.product_id}
                className={styles.productRow}
                onClick={() => navigate(`/analytics/product/${p.product_id}?from=${from}&to=${to}`)}
                title="Click to view product analytics"
              >
                <span className={styles.productName}>{p.product_name}</span>
                <span className={styles.productDiscount}>{formatCurrency(p.totalDiscount)}</span>
                <span className={styles.productBills}>{p.billCount} bills</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📦</div>
            <p className={styles.emptyText}>No products have been discounted in this range.</p>
          </div>
        )}
      </div>

      {/* Bills drill down drawer */}
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
