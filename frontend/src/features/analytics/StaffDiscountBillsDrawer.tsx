import { useState, useEffect } from 'react';
import { Drawer } from '@/shared/ui/Drawer';
import { useStaffDiscountBills } from './analytics.queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import type { StaffDiscountBill } from '@/types/analytics.types';
import styles from './StaffDiscountBillsDrawer.module.css';

interface StaffDiscountBillsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffName: string;
  from: string;
  to: string;
  productId?: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

export function StaffDiscountBillsDrawer({
  isOpen,
  onClose,
  staffId,
  staffName,
  from,
  to,
  productId,
}: StaffDiscountBillsDrawerProps) {
  const [page, setPage] = useState(1);
  const [accumulatedBills, setAccumulatedBills] = useState<StaffDiscountBill[]>([]);
  const limit = 10; // Load 10 bills at a time for fast loading

  const { data, isLoading, isFetching } = useStaffDiscountBills(staffId, from, to, page, limit, productId);

  // Reset list if parameters change
  useEffect(() => {
    setAccumulatedBills([]);
    setPage(1);
  }, [staffId, from, to]);

  // Append new page data
  useEffect(() => {
    if (data?.bills) {
      setAccumulatedBills((prev) => {
        const existingIds = new Set(prev.map((b) => b.bill_id));
        const filteredNew = data.bills.filter((b) => !existingIds.has(b.bill_id));
        return [...prev, ...filteredNew];
      });
    }
  }, [data]);

  const hasMore = data ? page < data.totalPages : false;

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Bills by ${staffName}`}>
      <div className={styles.container}>
        <p className={styles.subHeader}>
          Showing discount bills from {new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to{' '}
          {new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.
        </p>

        <div className={styles.billsList}>
          {accumulatedBills.map((bill) => (
            <div key={bill.bill_id} className={styles.billCard}>
              <div className={styles.billHeader}>
                <div className={styles.billMeta}>
                  <span className={styles.billNumber}>{bill.bill_number}</span>
                  <span className={styles.billDate}>
                    {new Date(bill.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>
                <span className={styles.billCustomer}>{bill.customer_name}</span>
              </div>

              {/* Items in this bill */}
              <div className={styles.itemsGrid}>
                <div className={`${styles.itemRow} ${styles.itemHeaderRow}`}>
                  <span>Item</span>
                  <span>Rate</span>
                  <span>Disc</span>
                  <span style={{ textAlign: 'right' }}>Subtotal</span>
                </div>
                {bill.items.map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <span className={styles.itemName} title={item.product_name}>
                      {item.product_name}
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                        x{item.qty}
                      </span>
                    </span>
                    <span className={styles.itemRate}>{formatCurrency(item.unit_price)}</span>
                    <span className={styles.itemDiscount}>
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
                    </span>
                    <span className={styles.itemTotal}>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Summary row */}
              <div className={styles.billSummary}>
                <span className={styles.summaryTotal}>
                  Bill Total: <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(bill.total)}</span>
                </span>
                <span className={styles.summaryDiscount}>
                  Total Discount: -{formatCurrency(bill.discount_total)}
                </span>
              </div>
            </div>
          ))}

          {/* Loading placeholders */}
          {isLoading && accumulatedBills.length === 0 && (
            <div className={styles.loadingSkeleton}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={120} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && accumulatedBills.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📄</div>
              <p className={styles.emptyText}>No bills found with discounts by this staff member in this range.</p>
            </div>
          )}

          {/* Load more controls */}
          {hasMore && (
            <div className={styles.loadMoreWrapper}>
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? 'Loading more...' : 'Load More Bills'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}
