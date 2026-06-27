import { useNavigate } from 'react-router-dom';
import { useDashboardStats, useLowStockProducts, useRecentPriceChanges } from './dashboard.queries';
import { StatCard } from '@/shared/ui/StatCard';
import { LowStockAlert } from './LowStockAlert';
import { RecentPriceChanges } from './RecentPriceChanges';
import { Skeleton } from '@/shared/ui/Skeleton';
import { Button } from '@/shared/ui/Button';
import { useAuthStore } from '@/shared/store/authStore';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: lowStock, isLoading: lowStockLoading } = useLowStockProducts();
  const { data: priceChanges, isLoading: priceChangesLoading } = useRecentPriceChanges(8);

  const isLoading = statsLoading || lowStockLoading || priceChangesLoading;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Skeleton width={200} height={36} />
            <Skeleton width={320} height={20} />
          </div>
        </div>

        <div className={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={32} />
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.skeletonList}>
            <Skeleton width={200} height={24} />
            <Skeleton width="100%" height={250} />
          </div>
          <div className={styles.skeletonList}>
            <Skeleton width={200} height={24} />
            <Skeleton width="100%" height={250} />
          </div>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Overview of products, current stock alerts, and recent price changes.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/pricing')}>
          🏷️ Bulk Price Update
        </Button>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          label="Total Products"
          value={stats?.totalProducts ?? 0}
        />
        <StatCard
          label="Low Stock Alerts"
          value={stats?.lowStockCount ?? 0}
          className={stats && stats.lowStockCount > 0 ? 'border-warn' : ''}
          onClick={() => navigate('/inventory?status=low')}
        />
        <StatCard
          label="Out of Stock"
          value={stats?.outOfStockCount ?? 0}
          className={stats && stats.outOfStockCount > 0 ? 'border-error' : ''}
          onClick={() => navigate('/inventory?status=out')}
        />
        <StatCard
          label="Inventory Value"
          value={stats?.inventoryValue !== null && stats?.inventoryValue !== undefined ? formatCurrency(stats.inventoryValue) : '₹0'}
          locked={!isOwner}
        />
      </div>

      <div className={styles.mainGrid}>
        <LowStockAlert
          products={lowStock || []}
          onRestock={(p) => navigate(`/purchases/new?restockProductId=${p.id}`)}
        />
        <RecentPriceChanges
          changes={priceChanges || []}
        />
      </div>
    </div>
  );
}
