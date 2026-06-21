import type { LowStockProduct } from '@/types/dashboard.types';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import styles from './LowStockAlert.module.css';

interface LowStockAlertProps {
  products: LowStockProduct[];
  onAdjustStock: (product: LowStockProduct) => void;
}

export function LowStockAlert({ products, onAdjustStock }: LowStockAlertProps) {
  const columns: ColumnConfig<LowStockProduct>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => <span className={styles.productName}>{p.name}</span>,
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (p) => p.category_name || <span style={{ opacity: 0.5 }}>—</span>,
    },
    {
      key: 'stock_qty',
      header: 'Stock',
      align: 'right',
      render: (p) => (
        <Badge variant="warning" className={styles.stockBadge}>
          {p.stock_qty} {p.unit}
        </Badge>
      ),
    },
    {
      key: 'low_stock_threshold',
      header: 'Threshold',
      align: 'right',
      render: (p) => <span>{p.low_stock_threshold} {p.unit}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAdjustStock(p)}
          className={styles.adjustBtn}
        >
          Adjust Stock
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>⚠️</span> Low Stock Alerts
        </h3>
        <Badge variant="error">{products.length} Items</Badge>
      </div>

      <div className={styles.tableWrapper}>
        <DataTable
          columns={columns}
          data={products}
          rowKey={(p) => p.id}
          emptyState={
            <EmptyState
              heading="No Low Stock Alerts"
              subtext="All active products have stock levels above their thresholds."
            />
          }
        />
      </div>
    </div>
  );
}
