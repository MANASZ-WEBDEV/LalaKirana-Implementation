import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Drawer } from '@/shared/ui/Drawer';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { useBillsHistory, useCancelBill } from './billing.queries';
import { useAuthStore } from '@/shared/store/authStore';
import { ReceiptPreview } from '@/shared/ui/ReceiptPreview';
import { useToastStore } from '@/shared/store/toastStore';
import type { Bill } from '@/types/billing.types';
import styles from './BillHistoryDrawer.module.css';

interface BillHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'this_month' | 'last_month' | 'custom' | 'all';

export function BillHistoryDrawer({ isOpen, onClose }: BillHistoryDrawerProps) {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner' || user?.role === 'master';
  const addToast = useToastStore((s) => s.addToast);

  const [searchParams, setSearchParams] = useSearchParams();
  const billParam = searchParams.get('bill');

  // Filter States
  const [search, setSearch] = useState(billParam || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>(billParam ? 'all' : 'today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState<Bill['status'] | 'all'>('all');
  const [mode, setMode] = useState<Bill['mode'] | 'all'>('all');
  const [page, setPage] = useState(1);

  // Cancellation Modal State
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Expandable list state
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  // Reprint State
  const [reprintBill, setReprintBill] = useState<Bill | null>(null);

  // Prefill search filter if billParam changes
  useEffect(() => {
    if (isOpen && billParam) {
      setSearch(billParam);
      setDateFilter('all');
      setPage(1);
    }
  }, [isOpen, billParam]);

  const handleClose = () => {
    if (searchParams.has('bill')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('bill');
      setSearchParams(newParams);
    }
    onClose();
  };

  // Calculate dates based on filter
  const getDates = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let date_from: string | undefined;
    let date_to: string | undefined;

    switch (dateFilter) {
      case 'today':
        date_from = today;
        date_to = today;
        break;
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        date_from = yStr;
        date_to = yStr;
        break;
      }
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        date_from = d.toISOString().split('T')[0];
        break;
      }
      case 'month': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        date_from = d.toISOString().split('T')[0];
        break;
      }
      case 'this_month': {
        date_from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        date_to = today;
        break;
      }
      case 'last_month': {
        const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
        date_from = firstOfLast.toISOString().split('T')[0];
        date_to = lastOfLast.toISOString().split('T')[0];
        break;
      }
      case 'custom':
        date_from = customFrom || undefined;
        date_to = customTo || undefined;
        break;
      case 'all':
        // no filters
        break;
    }

    return { date_from, date_to };
  };

  const { date_from, date_to } = getDates();

  const { data, isLoading } = useBillsHistory({
    search: search.trim() || undefined,
    date_from,
    date_to,
    status: status !== 'all' ? status : undefined,
    mode: mode !== 'all' ? mode : undefined,
    page,
    limit: 10,
  });

  const cancelBillMutation = useCancelBill();

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingBill || cancelReason.trim().length < 3) return;

    try {
      await cancelBillMutation.mutateAsync({
        id: cancellingBill.id,
        reason: cancelReason.trim(),
      });
      addToast('success', `Bill ${cancellingBill.bill_number} has been cancelled.`);
      setCancellingBill(null);
      setCancelReason('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to cancel bill');
    }
  };

  const handleReprint = (bill: Bill) => {
    setReprintBill(bill);
  };

  const bills = data?.bills || [];
  const totalPages = data?.totalPages || 1;

  // Automatically expand if search leads to a single matching bill
  useEffect(() => {
    if (bills.length === 1 && search.trim() && bills[0].bill_number === search.trim()) {
      setExpandedBillId(bills[0].id);
    }
  }, [bills, search]);

  const getStatusBadge = (billStatus: Bill['status']) => {
    switch (billStatus) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'khata':
        return <Badge variant="warning">Khata</Badge>;
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Drawer isOpen={isOpen} onClose={handleClose} title="Billing History">
        <div className={styles.container}>
          {/* Filters Area */}
          <div className={styles.filtersCard}>
            <div className={styles.searchRow}>
              <Input
                placeholder="Search bill number or customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className={styles.selectsRow}>
              <Select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value as DateFilter);
                  setPage(1);
                }}
                options={isOwner ? [
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'month', label: 'Last 30 Days' },
                  { value: 'this_month', label: 'This Month' },
                  { value: 'last_month', label: 'Last Month' },
                  { value: 'custom', label: 'Custom Range' },
                  { value: 'all', label: 'All Time' },
                ] : [
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'Last 7 Days' },
                ]}
              />
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'khata', label: 'Khata' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <Select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as any);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All Modes' },
                  { value: 'full', label: 'Full Bill' },
                  { value: 'quick', label: 'Quick Bill' },
                ]}
              />
            </div>

            {/* Custom Date Range Pickers */}
            {dateFilter === 'custom' && (
              <div className={styles.customDateRow}>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                    className={styles.dateInput}
                    max={customTo || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className={styles.dateField}>
                  <label className={styles.dateLabel}>To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                    className={styles.dateInput}
                    min={customFrom}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>

          {/* List Area */}
          <div className={styles.listSection}>
            {isLoading ? (
              <div className={styles.loader}>Loading billing logs...</div>
            ) : bills.length === 0 ? (
              <div className={styles.emptyState}>No billing records match the filters.</div>
            ) : (
              <div className={styles.billsList}>
                {bills.map((bill) => {
                  const isExpanded = expandedBillId === bill.id;
                  const dateVal = new Date(bill.created_at).toLocaleTimeString('en-IN', {
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={bill.id}
                      className={`${styles.billCard} ${isExpanded ? styles.expandedCard : ''}`}
                    >
                      <div
                        className={styles.cardHeader}
                        onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                      >
                        <div className={styles.headerInfo}>
                          <span className={styles.billNumber}>{bill.bill_number}</span>
                          <span className={styles.billTime}>{dateVal}</span>
                        </div>
                        <div className={styles.headerRight}>
                          <span className={styles.billTotal}>₹{Number(bill.total).toFixed(2)}</span>
                          {getStatusBadge(bill.status)}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={styles.cardExpandedContent}>
                          <div className={styles.metaInfo}>
                            {bill.customer_name && (
                              <p>
                                <strong>Customer:</strong> {bill.customer_name}
                              </p>
                            )}
                            {bill.note && (
                              <p>
                                <strong>Note:</strong> {bill.note}
                              </p>
                            )}
                          </div>

                          {/* Items sub-list */}
                          {bill.mode === 'full' && bill.bill_items && bill.bill_items.length > 0 && (
                            <table className={styles.itemsTable}>
                              <thead>
                                <tr>
                                  <th>Item</th>
                                  <th>Qty</th>
                                  <th>Price</th>
                                  <th>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bill.bill_items.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.product_name}</td>
                                    <td>{item.qty}</td>
                                    <td>₹{Number(item.unit_price).toFixed(2)}</td>
                                    <td>₹{((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {/* Actions Inside Card */}
                          <div className={styles.cardActions}>
                            <button
                              type="button"
                              onClick={() => handleReprint(bill)}
                              className={styles.actionLinkBtn}
                            >
                              Reprint Receipt
                            </button>
                            {isOwner && bill.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => setCancellingBill(bill)}
                                className={`${styles.actionLinkBtn} ${styles.cancelLinkBtn}`}
                              >
                                Cancel Bill
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className={styles.pageBtn}
              >
                Previous
              </button>
              <span className={styles.pageLabel}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Drawer>

      {/* Bill Cancellation Dialog (Modal) */}
      {cancellingBill && (
        <Modal
          isOpen={cancellingBill !== null}
          onClose={() => {
            setCancellingBill(null);
            setCancelReason('');
          }}
          title={`Cancel Bill ${cancellingBill.bill_number}`}
          maxWidth="400px"
        >
          <form onSubmit={handleCancelSubmit} className={styles.cancelForm}>
            <p className={styles.warningText}>
              Warning: Cancelling this bill will reverse all stock deductions and credit entries. This
              action cannot be undone.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cancellation Reason (Required)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={styles.reasonTextarea}
                placeholder="Specify reason (e.g. Returned items, wrong checkout amount)..."
                required
                minLength={3}
              />
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setCancellingBill(null);
                  setCancelReason('');
                }}
              >
                Go Back
              </Button>
              <Button
                variant="danger"
                type="submit"
                disabled={cancelReason.trim().length < 3 || cancelBillMutation.isPending}
              >
                {cancelBillMutation.isPending ? 'Processing...' : 'Confirm Cancel'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Receipt Reprint Modal */}
      {reprintBill && (
        <Modal
          isOpen={reprintBill !== null}
          onClose={() => setReprintBill(null)}
          title="Print Preview"
          maxWidth="450px"
        >
          <div className={styles.reprintWrapper}>
            <ReceiptPreview bill={reprintBill} />
          </div>
        </Modal>
      )}
    </>
  );
}
