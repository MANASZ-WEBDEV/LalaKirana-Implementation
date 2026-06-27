import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import {
  usePriceHistory,
  useProductPurchaseHistory,
  useProductSupplierSummary,
  useProductStockLog,
} from './inventory.queries';
import type { PriceHistoryEntry, StockLogEntry } from '@/types/product.types';
import styles from './PriceHistoryModal.module.css';

interface PriceHistoryModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'prices' | 'stock' | 'suppliers';

export function PriceHistoryModal({
  productId,
  productName,
  isOpen,
  onClose,
}: PriceHistoryModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('prices');

  // Queries
  const { data: priceHistory, isLoading: isPriceHistoryLoading } = usePriceHistory(productId, { enabled: isOpen && activeTab === 'prices' });
  const { data: stockHistory = [], isLoading: isStockHistoryLoading } = useProductStockLog(productId, { enabled: isOpen && activeTab === 'stock' });
  const { data: purchaseHistory = [], isLoading: isPurchaseHistoryLoading } = useProductPurchaseHistory(productId, { enabled: isOpen && activeTab === 'suppliers' });
  const { data: supplierSummary = [], isLoading: isSupplierSummaryLoading } = useProductSupplierSummary(productId, { enabled: isOpen && activeTab === 'suppliers' });

  // Column definitions for Price History
  const priceColumns: ColumnConfig<PriceHistoryEntry>[] = [
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

  // Column definitions for Stock Log
  const stockColumns: ColumnConfig<StockLogEntry>[] = [
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (entry) => {
        const date = new Date(entry.created_at);
        return (
          <span className={styles.date}>
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
            {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        );
      },
    },
    {
      key: 'change_qty',
      header: 'Change Qty',
      align: 'right',
      render: (entry) => {
        const isPositive = entry.change_qty > 0;
        return (
          <span className={isPositive ? styles.qtyPositive : styles.qtyNegative}>
            {isPositive ? `+${entry.change_qty}` : entry.change_qty}
          </span>
        );
      },
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (entry) => {
        const reasonLabels: Record<string, string> = {
          bill_confirm: 'POS Checkout',
          bill_cancel: 'Bill Cancelled',
          eod_entry: 'EOD Sync',
          manual_adjust: 'Manual Adjustment',
          damage: 'Damaged / Defective',
          audit: 'Audit Correction',
          returned: 'Returned Items',
          purchase_order: 'Inbound Stock (PO)',
          purchase_cancel: 'PO Cancelled',
        };
        return <span className={styles.reasonBadge}>{reasonLabels[entry.reason] || entry.reason}</span>;
      },
    },
    {
      key: 'note',
      header: 'Reference / Note',
      render: (entry) => {
        if (entry.bill_number) {
          return (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/billing?bill=${entry.bill_number}`);
              }}
              className={styles.linkButton}
            >
              Bill #{entry.bill_number}
            </button>
          );
        }
        if (entry.purchase_order_id) {
          const displayText = entry.po_reference 
            ? `PO Ref: ${entry.po_reference}` 
            : (entry.note || 'View Purchase Order');
          return (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/purchases?po=${entry.purchase_order_id}`);
              }}
              className={styles.linkButton}
            >
              {displayText}
            </button>
          );
        }
        if (entry.po_reference) {
          return (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/purchases?po=${entry.po_reference}`);
              }}
              className={styles.linkButton}
            >
              PO Ref: {entry.po_reference}
            </button>
          );
        }
        return <span className={styles.note}>{entry.note || <span style={{ opacity: 0.5 }}>-</span>}</span>;
      },
    },
    {
      key: 'created_by_name',
      header: 'Handled By',
      render: (entry) => <span className={styles.user}>{entry.created_by_name || 'System'}</span>,
    },
  ];

  // Column definitions for Supplier History
  const purchaseColumns: ColumnConfig<any>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => <span>{new Date(entry.date).toLocaleDateString('en-IN')}</span>,
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (entry) => <strong>{entry.supplier_name}</strong>,
    },
    {
      key: 'qty',
      header: 'Qty Inbound',
      align: 'right',
      render: (entry) => <span>{entry.qty}</span>,
    },
    {
      key: 'cost_price',
      header: 'Inbound Cost',
      align: 'right',
      render: (entry) => <strong>₹{entry.cost_price.toFixed(2)}</strong>,
    },
    {
      key: 'sell_price',
      header: 'New Sell Snap',
      align: 'right',
      render: (entry) => (
        <span>
          {entry.sell_price ? `₹${entry.sell_price.toFixed(2)}` : <span style={{ opacity: 0.5 }}>-</span>}
        </span>
      ),
    },
  ];

  const isLoading =
    isPriceHistoryLoading ||
    isStockHistoryLoading ||
    isPurchaseHistoryLoading ||
    isSupplierSummaryLoading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Product Audit Logs: ${productName}`} maxWidth="650px">
      <div className={styles.modalBody}>
        {/* Tab Header Selector */}
        <div className={styles.modalTabs}>
          <button
            type="button"
            className={`${styles.modalTab} ${activeTab === 'prices' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('prices')}
          >
            🏷️ Price History
          </button>
          <button
            type="button"
            className={`${styles.modalTab} ${activeTab === 'stock' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            📈 Stock Logs
          </button>
          <button
            type="button"
            className={`${styles.modalTab} ${activeTab === 'suppliers' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            🚚 Supplier stock-in history
          </button>
        </div>

        {/* Tab Body */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={100} />
            <Skeleton width="100%" height={40} />
          </div>
        ) : activeTab === 'prices' ? (
          <div className={styles.tableWrapper}>
            <DataTable
              columns={priceColumns}
              data={priceHistory || []}
              rowKey={(entry) => entry.id}
              emptyState={
                <EmptyState
                  heading="No Price Logs"
                  subtext="No price updates have been recorded for this product yet."
                />
              }
            />
          </div>
        ) : activeTab === 'stock' ? (
          <div className={styles.tableWrapper}>
            <DataTable
              columns={stockColumns}
              data={stockHistory || []}
              rowKey={(entry) => entry.id}
              emptyState={
                <EmptyState
                  heading="No Stock Logs"
                  subtext="No stock movements have been recorded for this product yet."
                />
              }
            />
          </div>
        ) : (
          <div className={styles.suppliersTab}>
            {/* Supplier Group Summary Card */}
            {supplierSummary.length > 0 && (
              <div className={styles.summarySection}>
                <h4>Supplier Summary Statistics</h4>
                <div className={styles.summaryGrid}>
                  {supplierSummary.map((s: any, idx: number) => (
                    <div key={idx} className={styles.summaryCard}>
                      <span className={styles.summaryCardTitle}>{s.supplier_name}</span>
                      <div className={styles.summaryCardMetrics}>
                        <div>
                          <span>Orders:</span> <strong>{s.order_count}</strong>
                        </div>
                        <div>
                          <span>Total Qty:</span> <strong>{s.total_qty}</strong>
                        </div>
                        <div>
                          <span>Avg Cost:</span> <strong>₹{s.avg_cost.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inbound Purchases log */}
            <div className={styles.tableWrapper}>
              <h4>Purchase Log History</h4>
              <DataTable
                columns={purchaseColumns}
                data={purchaseHistory}
                rowKey={(entry: any) => `${entry.date}-${entry.supplier_name}-${entry.qty}-${entry.cost_price}`}
                emptyState={
                  <EmptyState
                    heading="No Purchase Logs"
                    subtext="No supplier purchase history recorded for this product."
                  />
                }
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
