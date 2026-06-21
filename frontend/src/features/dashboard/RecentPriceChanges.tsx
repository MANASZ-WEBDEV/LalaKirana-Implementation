import type { RecentPriceChange } from '@/types/dashboard.types';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import styles from './RecentPriceChanges.module.css';

interface RecentPriceChangesProps {
  changes: RecentPriceChange[];
}

export function RecentPriceChanges({ changes }: RecentPriceChangesProps) {
  const columns: ColumnConfig<RecentPriceChange>[] = [
    {
      key: 'product_name',
      header: 'Product',
      render: (c) => <span className={styles.productName}>{c.product_name}</span>,
    },
    {
      key: 'price',
      header: 'Price Change',
      render: (c) => {
        const isUp = c.new_price > c.old_price;
        return (
          <div className={styles.priceContainer}>
            <span className={styles.oldPrice}>₹{c.old_price.toFixed(2)}</span>
            <span className={styles.arrow}>→</span>
            <span className={`${styles.newPrice} ${isUp ? styles.up : styles.down}`}>
              ₹{c.new_price.toFixed(2)} {isUp ? '▲' : '▼'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'changed_by_name',
      header: 'Updated By',
      render: (c) => c.changed_by_name || <span style={{ opacity: 0.5 }}>System</span>,
    },
    {
      key: 'changed_at',
      header: 'Date & Time',
      render: (c) => {
        const date = new Date(c.changed_at);
        return (
          <span className={styles.date}>
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        );
      },
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>🏷️</span> Recent Price Changes
        </h3>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={changes}
          rowKey={(c) => c.id}
          emptyState={
            <EmptyState
              heading="No Price Changes"
              subtext="No price adjustments have been made recently."
            />
          }
        />
      </div>
    </div>
  );
}
