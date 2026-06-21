import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { usePriceHistory } from './inventory.queries';
import type { PriceHistoryEntry } from '@/types/product.types';
import styles from './PriceHistoryModal.module.css';

interface PriceHistoryModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PriceHistoryModal({
  productId,
  productName,
  isOpen,
  onClose,
}: PriceHistoryModalProps) {
  const { data: history, isLoading } = usePriceHistory(productId, { enabled: isOpen });

  const columns: ColumnConfig<PriceHistoryEntry>[] = [
    {
      key: 'changed_at',
      header: 'Date & Time',
      render: (entry) => {
        const date = new Date(entry.changed_at);
        return (
          <span className={styles.date}>
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        );
      },
    },
    {
      key: 'price',
      header: 'Price Change',
      render: (entry) => {
        const isUp = entry.new_price > entry.old_price;
        return (
          <div className={styles.priceContainer}>
            <span className={styles.oldPrice}>₹{entry.old_price.toFixed(2)}</span>
            <span className={styles.arrow}>→</span>
            <span className={`${styles.newPrice} ${isUp ? styles.up : styles.down}`}>
              ₹{entry.new_price.toFixed(2)} {isUp ? '▲' : '▼'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'changed_by_name',
      header: 'Updated By',
      render: (entry) => (
        <span className={styles.user}>{entry.changed_by_name || 'System'}</span>
      ),
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Price History: ${productName}`}>
      <div className={styles.modalBody}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <DataTable
              columns={columns}
              data={history || []}
              rowKey={(entry) => entry.id}
              emptyState={
                <EmptyState
                  heading="No Price Logs"
                  subtext="No price updates have been recorded for this product yet."
                />
              }
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
