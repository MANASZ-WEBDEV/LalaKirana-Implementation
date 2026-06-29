import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  usePurchaseOrders,
  useExpenses,
  useSuppliers,
  useCancelPurchase,
  useCreateSupplier,
  useSupplierRepayment,
  usePurchaseDetail,
  usePayPurchase,
  useSupplierLedger,
  useUpdateSupplier,
  useRecordPOPayment,
} from './purchases.queries';
import { NewExpenseForm } from './NewExpenseForm';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { useToastStore } from '@/shared/store/toastStore';
import { useAuthStore } from '@/shared/store/authStore';
import type { PurchaseOrder, Expense, Supplier } from '@/types/purchases.types';
import styles from './PurchasesPage.module.css';

type TabId = 'stock_in' | 'expenses' | 'suppliers';

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const poParam = searchParams.get('po');

  const { data: queryPOData } = usePurchaseDetail(poParam || '', {
    enabled: !!poParam,
  });
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';
  const addToast = useToastStore((s) => s.addToast);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>('stock_in');

  // Search & Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Repayment Modal
  const [payingSupplier, setPayingSupplier] = useState<Supplier | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayNote, setRepayNote] = useState('');

  // Cancellation Modal
  const [cancellingPO, setCancellingPO] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Expanded PO State
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Direct PO Payment Modal State
  const [poToPay, setPoToPay] = useState<PurchaseOrder | null>(null);
  const [poPaymentAmount, setPoPaymentAmount] = useState('');
  const [poPaymentNote, setPoPaymentNote] = useState('');

  // Supplier Details/Edit Modal State
  const [selectedSupplierForDetails, setSelectedSupplierForDetails] = useState<Supplier | null>(null);
  const [supplierModalTab, setSupplierModalTab] = useState<'edit' | 'ledger'>('edit');
  const [editSupName, setEditSupName] = useState('');
  const [editSupPhone, setEditSupPhone] = useState('');
  const [editSupProductRange, setEditSupProductRange] = useState('');
  const [editSupAddress, setEditSupAddress] = useState('');
  const [editSupNote, setEditSupNote] = useState('');

  useEffect(() => {
    if (selectedSupplierForDetails) {
      setEditSupName(selectedSupplierForDetails.name || '');
      setEditSupPhone(selectedSupplierForDetails.phone || '');
      setEditSupProductRange(selectedSupplierForDetails.product_range || '');
      setEditSupAddress(selectedSupplierForDetails.address || '');
      setEditSupNote(selectedSupplierForDetails.note || '');
      setSupplierModalTab('edit');
    }
  }, [selectedSupplierForDetails]);



  // Form States (Supplier Creation)
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supProductRange, setSupProductRange] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNote, setSupNote] = useState('');

  // Queries
  const { data: poData, isLoading: poLoading } = usePurchaseOrders({ page, limit: 12 });
  const { data: expData, isLoading: expLoading } = useExpenses({ page, limit: 12 });
  const { data: supData, isLoading: supLoading } = useSuppliers({ page, limit: 12 });
  const { data: ledgerData, isLoading: ledgerLoading } = useSupplierLedger(
    selectedSupplierForDetails?.id || '',
    { enabled: !!selectedSupplierForDetails && supplierModalTab === 'ledger' }
  );

  // Mutations
  const cancelPOMutation = useCancelPurchase();
  const createSupplierMutation = useCreateSupplier();
  const logSupplierRepayMutation = useSupplierRepayment(payingSupplier?.id || '');
  const updateSupplierMutation = useUpdateSupplier(selectedSupplierForDetails?.id || '');

  // Handlers
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (!supPhone.trim()) {
      addToast('error', 'Phone number is required.');
      return;
    }

    if (!/^\d{10}$/.test(supPhone.trim())) {
      addToast('error', 'Phone number must be exactly 10 digits and contain only numbers.');
      return;
    }

    try {
      await createSupplierMutation.mutateAsync({
        name: supName.trim(),
        phone: supPhone.trim() || null,
        product_range: supProductRange.trim() || null,
        address: supAddress.trim() || null,
        note: supNote.trim() || null,
      });
      addToast('success', 'Supplier created successfully!');
      setShowSupplierModal(false);
      setSupName('');
      setSupPhone('');
      setSupProductRange('');
      setSupAddress('');
      setSupNote('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create supplier.');
    }
  };

  const handleEditSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForDetails) return;
    if (!editSupName.trim()) {
      addToast('error', 'Supplier name is required.');
      return;
    }
    if (!editSupPhone.trim()) {
      addToast('error', 'Phone number is required.');
      return;
    }

    if (!/^\d{10}$/.test(editSupPhone.trim())) {
      addToast('error', 'Phone number must be exactly 10 digits and contain only numbers.');
      return;
    }

    try {
      await updateSupplierMutation.mutateAsync({
        name: editSupName.trim(),
        phone: editSupPhone.trim() || null,
        product_range: editSupProductRange.trim() || null,
        address: editSupAddress.trim() || null,
        note: editSupNote.trim() || null,
      });
      addToast('success', 'Supplier profile updated successfully.');
      setSelectedSupplierForDetails(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update supplier profile.');
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingSupplier) return;
    const amt = parseFloat(repayAmount);

    if (isNaN(amt) || amt <= 0) {
      addToast('error', 'Please enter a valid repayment amount.');
      return;
    }

    if (amt > Number(payingSupplier.total_balance)) {
      addToast('error', `Repayment cannot exceed owed balance of ₹${payingSupplier.total_balance}`);
      return;
    }

    try {
      await logSupplierRepayMutation.mutateAsync({
        amount: amt,
        note: repayNote.trim() || null,
      });
      addToast('success', `Logged repayment of ₹${amt.toFixed(2)} to ${payingSupplier.name}`);
      setPayingSupplier(null);
      setRepayAmount('');
      setRepayNote('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to log supplier repayment.');
    }
  };

  const handleCancelPOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPO || cancelReason.trim().length < 3) return;

    try {
      await cancelPOMutation.mutateAsync({
        id: cancellingPO.id,
        reason: cancelReason.trim(),
      });
      addToast('success', `Purchase order cancelled successfully.`);
      setCancellingPO(null);
      setCancelReason('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to cancel purchase order');
    }
  };

  // Rendering Helper Column Configs
  const stockInColumns: ColumnConfig<PurchaseOrder>[] = [
    {
      key: 'order_date',
      header: 'Date',
      render: (po) => <span>{new Date(po.order_date).toLocaleDateString('en-IN')}</span>,
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (po) => <strong>{po.supplier_name}</strong>,
    },
    {
      key: 'reference_number',
      header: 'Bill Ref #',
      render: (po) => <span>{po.reference_number || '-'}</span>,
    },
    {
      key: 'total',
      header: 'Total Cost',
      align: 'right',
      render: (po) => <span>₹{Number(po.total).toFixed(2)}</span>,
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (po) => {
        const unpaid = Number(po.total) - Number(po.amount_paid || 0);
        const isUnpaid = po.payment_status !== 'paid' && po.status !== 'cancelled' && unpaid > 0;
        return (
          <div className={styles.poPaymentCell}>
            <Badge variant={po.payment_status === 'paid' ? 'success' : po.payment_status === 'partial' ? 'warning' : 'error'}>
              {po.payment_status}
            </Badge>
            {isUnpaid && (
              <>
                <span className={styles.poRemainingAmt}>₹{unpaid.toFixed(0)} due</span>
                {isOwner && (
                  <button
                    className={styles.poInlinePayBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPoToPay(po);
                      setPoPaymentAmount('');
                      setPoPaymentNote('');
                    }}
                  >
                    Pay
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => (
        <Badge variant={po.status === 'confirmed' ? 'success' : 'neutral'}>
          {po.status}
        </Badge>
      ),
    },
  ];

  const expensesColumns: ColumnConfig<Expense>[] = [
    {
      key: 'expense_date',
      header: 'Date',
      render: (ex) => <span>{new Date(ex.expense_date).toLocaleDateString('en-IN')}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (ex) => <span className={styles.capitalize}>{ex.category}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (ex) => <strong style={{ color: '#ba1a1a' }}>₹{Number(ex.amount).toFixed(2)}</strong>,
    },
    {
      key: 'supplier_name',
      header: 'Linked Supplier',
      render: (ex) => <span>{ex.supplier_name || '-'}</span>,
    },
    {
      key: 'description',
      header: 'Details/Description',
      render: (ex) => <span>{ex.description || '-'}</span>,
    },
  ];

  const truncateWords = (text: string | null | undefined, maxWords = 3) => {
    if (!text) return '—';
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const suppliersColumns: ColumnConfig<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      render: (s) => (
        <div>
          <strong>{s.name}</strong>
          {s.phone && <div className={styles.subtext}>📞 {s.phone}</div>}
        </div>
      ),
    },
    {
      key: 'product_range',
      header: 'Product Range',
      render: (s) => (
        <span className={styles.productRangeText} title={s.product_range || undefined}>
          {truncateWords(s.product_range, 3)}
        </span>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (s) => (
        <span title={s.address || undefined}>
          {truncateWords(s.address, 3)}
        </span>
      ),
    },
    {
      key: 'total_balance',
      header: 'Balance Owed (₹)',
      align: 'right',
      render: (s) => {
        const bal = Number(s.total_balance);
        return (
          <span className={`${styles.owedAmt} ${bal > 0 ? styles.hasOwed : ''}`}>
            ₹{bal.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (s) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={Number(s.total_balance) <= 0}
          onClick={(e) => {
            e.stopPropagation();
            setPayingSupplier(s);
          }}
        >
          Pay Supplier
        </Button>
      ),
    },
  ];

  const handleRowClick = (po: PurchaseOrder) => {
    setSelectedPO(po);
  };

  const activePOFromList = poData?.purchaseOrders?.find((p) => p.id === selectedPO?.id);
  const activePO = activePOFromList || selectedPO || queryPOData;
  const payPurchaseMutation = usePayPurchase(activePO?.id || '');
  const recordPOPaymentMutation = useRecordPOPayment(poToPay?.id || '');

  const handleClosePO = () => {
    setSelectedPO(null);
    if (searchParams.has('po')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('po');
      setSearchParams(newParams);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!activePO) return;
    try {
      await payPurchaseMutation.mutateAsync();
      addToast('success', 'Purchase order marked as paid and supplier balance adjusted.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update payment status.');
    }
  };

  const handlePOPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poToPay) return;
    const amt = parseFloat(poPaymentAmount);
    const unpaid = Number(poToPay.total) - Number(poToPay.amount_paid || 0);

    if (isNaN(amt) || amt <= 0) {
      addToast('error', 'Please enter a valid payment amount.');
      return;
    }

    if (amt > unpaid) {
      addToast('error', `Payment cannot exceed remaining balance of ₹${unpaid.toFixed(2)}`);
      return;
    }

    try {
      await recordPOPaymentMutation.mutateAsync({
        amount: amt,
        note: poPaymentNote.trim() || null,
      });
      addToast('success', `Successfully logged payment of ₹${amt.toFixed(2)} for PO-${poToPay.id.slice(0, 8).toUpperCase()}`);
      setPoToPay(null);
      setPoPaymentAmount('');
      setPoPaymentNote('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to log purchase payment.');
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'stock_in':
        return (
          <div className={styles.tableCard}>
            {poLoading ? (
              <div className={styles.loader}>Loading purchase log...</div>
            ) : (
              <DataTable
                columns={stockInColumns}
                data={poData?.purchaseOrders || []}
                rowKey={(po) => po.id}
                onRowClick={handleRowClick}
              />
            )}
          </div>
        );
      case 'expenses':
        return (
          <div className={styles.tableCard}>
            {expLoading ? (
              <div className={styles.loader}>Loading shop expenses...</div>
            ) : (
              <DataTable
                columns={expensesColumns}
                data={expData?.expenses || []}
                rowKey={(ex) => ex.id}
              />
            )}
          </div>
        );
      case 'suppliers':
        return (
          <div className={styles.tableCard}>
            {supLoading ? (
              <div className={styles.loader}>Loading supplier list...</div>
            ) : (
              <DataTable
                columns={suppliersColumns}
                data={supData?.suppliers || []}
                rowKey={(s) => s.id}
                onRowClick={(s) => setSelectedSupplierForDetails(s)}
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const getPageData = () => {
    if (activeTab === 'stock_in') return poData;
    if (activeTab === 'expenses') return expData;
    return supData;
  };
  const totalPages = getPageData()?.totalPages || 1;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Purchases & Inbound</h1>
          <p className={styles.subtitle}>
            Inbound inventory supply orders, manage business expenses, and track supplier khata debts.
          </p>
        </div>
        <div className={styles.headerActions}>
          {activeTab === 'stock_in' && (
            <Button onClick={() => navigate('/purchases/new')}>
              ➕ Inbound Stock Purchase
            </Button>
          )}
          {activeTab === 'expenses' && (
            <Button onClick={() => setShowExpenseModal(true)}>
              ➕ Record Shop Expense
            </Button>
          )}
          {activeTab === 'suppliers' && (
            <Button onClick={() => setShowSupplierModal(true)}>
              ➕ Create Supplier Profile
            </Button>
          )}
        </div>
      </header>

      {/* Tab Selectors */}
      <nav className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'stock_in' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('stock_in');
            setPage(1);
          }}
        >
          🚚 Stock-In Purchases
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'expenses' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('expenses');
            setPage(1);
          }}
        >
          💸 Shop Expenses
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'suppliers' ? styles.tabActive : ''}`}
          onClick={() => {
            setActiveTab('suppliers');
            setPage(1);
          }}
        >
          💼 Supplier Registry
        </button>
      </nav>

      {/* Active Tab Workspace */}
      <div className={styles.tabContent}>{renderActiveTab()}</div>

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

      {/* New Expense Modal */}
      {showExpenseModal && (
        <Modal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          title="Record Shop Expense"
          maxWidth="550px"
        >
          <NewExpenseForm onClose={() => setShowExpenseModal(false)} />
        </Modal>
      )}

      {/* Create Supplier Modal */}
      {showSupplierModal && (
        <Modal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          title="Create New Supplier Profile"
          maxWidth="450px"
        >
          <form onSubmit={handleCreateSupplierSubmit} className={styles.modalForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Supplier / Agency Name *</label>
              <input
                type="text"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                className={styles.formInput}
                required
                placeholder="e.g. Balaji Wholesale Traders"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number *</label>
              <input
                type="text"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={styles.formInput}
                required
                maxLength={10}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Product Range (Optional)</label>
              <input
                type="text"
                value={supProductRange}
                onChange={(e) => setSupProductRange(e.target.value)}
                className={styles.formInput}
                placeholder="e.g. Dairy, Oil, Snacks, Beverages"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Address (Optional)</label>
              <input
                type="text"
                value={supAddress}
                onChange={(e) => setSupAddress(e.target.value)}
                className={styles.formInput}
                placeholder="Agency Address"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Note (Optional)</label>
              <input
                type="text"
                value={supNote}
                onChange={(e) => setSupNote(e.target.value)}
                className={styles.formInput}
                placeholder="e.g. Milk & dairy agency, deliveries on Tuesday"
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" type="button" onClick={() => setShowSupplierModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSupplierMutation.isPending}>
                {createSupplierMutation.isPending ? 'Creating...' : 'Create Supplier'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Repayment to Supplier Modal */}
      {payingSupplier && (
        <Modal
          isOpen={payingSupplier !== null}
          onClose={() => setPayingSupplier(null)}
          title={`Log Repayment to ${payingSupplier.name}`}
          maxWidth="450px"
        >
          <form onSubmit={handleRepaySubmit} className={styles.modalForm}>
            <div className={styles.debtHeader}>
              <span>Outstanding Debt:</span>
              <strong>₹{Number(payingSupplier.total_balance).toFixed(2)}</strong>
            </div>
            <div className={styles.formGroup}>
              <Input
                label="Repayment Amount (₹) *"
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                required
                min={0.01}
                step="any"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Note (Optional)</label>
              <input
                type="text"
                value={repayNote}
                onChange={(e) => setRepayNote(e.target.value)}
                className={styles.formInput}
                placeholder="e.g. Paid via GPay bank transfer"
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" type="button" onClick={() => setPayingSupplier(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={logSupplierRepayMutation.isPending}>
                {logSupplierRepayMutation.isPending ? 'Saving...' : 'Confirm Repayment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Repayment to Purchase Order Modal */}
      {poToPay && (
        <Modal
          isOpen={poToPay !== null}
          onClose={() => setPoToPay(null)}
          title={`Log Repayment for PO-${poToPay.id.slice(0, 8).toUpperCase()}`}
          maxWidth="450px"
        >
          <form onSubmit={handlePOPaymentSubmit} className={styles.modalForm}>
            <div className={styles.debtHeader}>
              <span>Outstanding Balance:</span>
              <strong>₹{(Number(poToPay.total) - Number(poToPay.amount_paid || 0)).toFixed(2)}</strong>
            </div>
            <div className={styles.formGroup}>
              <Input
                label="Repayment Amount (₹) *"
                type="number"
                value={poPaymentAmount}
                onChange={(e) => setPoPaymentAmount(e.target.value)}
                required
                min={0.01}
                max={Number(poToPay.total) - Number(poToPay.amount_paid || 0)}
                step="any"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Note (Optional)</label>
              <input
                type="text"
                value={poPaymentNote}
                onChange={(e) => setPoPaymentNote(e.target.value)}
                className={styles.formInput}
                placeholder="e.g. Paid via GPay bank transfer"
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" type="button" onClick={() => setPoToPay(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPOPaymentMutation.isPending}>
                {recordPOPaymentMutation.isPending ? 'Saving...' : 'Confirm Repayment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Detailed PO Modal */}
      {activePO && (
        <Modal
          isOpen={activePO !== null}
          onClose={handleClosePO}
          title={`Purchase Order Details — ${activePO.supplier_name}`}
          maxWidth="600px"
        >
          <div className={styles.poDetailContainer}>
            <div className={styles.poMetaCard}>
              <p>
                <strong>Order ID:</strong>{' '}
                <span
                  className={styles.poIdBadge}
                  title="Click to copy full ID"
                  onClick={() => {
                    navigator.clipboard.writeText(activePO.id);
                    addToast('success', 'Full Order ID copied to clipboard');
                  }}
                >
                  PO-{activePO.id.slice(0, 8).toUpperCase()}{' '}
                  <span className={styles.copyIcon}>📋</span>
                </span>
              </p>
              <p><strong>Date:</strong> {new Date(activePO.order_date).toLocaleDateString('en-IN')}</p>
              <p><strong>Total Cost:</strong> ₹{Number(activePO.total).toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> ₹{Number(activePO.amount_paid || 0).toFixed(2)}</p>
              {Number(activePO.total) - Number(activePO.amount_paid || 0) > 0 && (
                <p style={{ color: 'var(--color-error)' }}>
                  <strong>Remaining Amount:</strong> ₹{(Number(activePO.total) - Number(activePO.amount_paid || 0)).toFixed(2)}
                </p>
              )}
              <p><strong>Total Units:</strong> {activePO.item_count}</p>
              <div className={styles.poStatusRow}>
                <strong>Payment Status:</strong>
                <Badge variant={activePO.payment_status === 'paid' ? 'success' : activePO.payment_status === 'partial' ? 'warning' : 'error'}>
                  {activePO.payment_status.toUpperCase()}
                </Badge>
                {isOwner && activePO.payment_status !== 'paid' && activePO.status !== 'cancelled' && (
                  <div className={styles.poActionButtons}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPoToPay(activePO);
                        setPoPaymentAmount('');
                        setPoPaymentNote('');
                      }}
                      className={styles.logPaymentBtn}
                    >
                      Log Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleMarkAsPaid}
                      loading={payPurchaseMutation.isPending}
                      className={styles.markPaidBtn}
                    >
                      Mark as Paid
                    </Button>
                  </div>
                )}
              </div>
              {activePO.note && <p><strong>Note:</strong> {activePO.note}</p>}
            </div>

            {/* List items */}
            <div className={styles.poItemsWrapper}>
              <h4>Inbound Products:</h4>
              {poLoading ? (
                <div>Loading items...</div>
              ) : (
                <div className={styles.poTableScroll}>
                  <PurchaseOrderItemsList poId={activePO.id} />
                </div>
              )}
            </div>

            <div className={styles.poModalActions}>
              {isOwner && activePO.status !== 'cancelled' && (
                <Button
                  variant="secondary"
                  style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
                  onClick={() => {
                    setCancellingPO(activePO);
                    setSelectedPO(null); // Clear selectedPO so it can render cancelling modal
                  }}
                >
                  Cancel Purchase Order
                </Button>
              )}
              <Button variant="secondary" onClick={handleClosePO} style={{ marginLeft: 'auto' }}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel PO Modal */}
      {cancellingPO && (
        <Modal
          isOpen={cancellingPO !== null}
          onClose={() => {
            setCancellingPO(null);
            setCancelReason('');
          }}
          title={`Cancel Purchase Order`}
          maxWidth="420px"
        >
          <form onSubmit={handleCancelPOSubmit} className={styles.modalForm}>
            <p className={styles.warningText}>
              Warning: Cancelling this purchase order will reverse all inbound stock increments and
              adjust supplier credit debt balances.
            </p>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Cancellation Reason (Required)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className={styles.formTextarea}
                placeholder="Specify reason..."
                required
                minLength={3}
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setCancellingPO(null);
                  setCancelReason('');
                }}
              >
                Go Back
              </Button>
              <Button
                variant="danger"
                type="submit"
                disabled={cancelReason.trim().length < 3 || cancelPOMutation.isPending}
              >
                {cancelPOMutation.isPending ? 'Processing...' : 'Confirm Cancel'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Supplier Details & History Modal */}
      {selectedSupplierForDetails && (
        <Modal
          isOpen={selectedSupplierForDetails !== null}
          onClose={() => setSelectedSupplierForDetails(null)}
          title={`Supplier File — ${selectedSupplierForDetails.name}`}
          maxWidth="600px"
        >
          <div className={styles.supplierDetailContainer}>
            <div className={styles.modalTabs}>
              <button
                type="button"
                className={`${styles.modalTabBtn} ${supplierModalTab === 'edit' ? styles.modalTabActive : ''}`}
                onClick={() => setSupplierModalTab('edit')}
              >
                ✏️ Edit Profile
              </button>
              <button
                type="button"
                className={`${styles.modalTabBtn} ${supplierModalTab === 'ledger' ? styles.modalTabActive : ''}`}
                onClick={() => setSupplierModalTab('ledger')}
              >
                📜 Ledger Statement
              </button>
            </div>

            {supplierModalTab === 'edit' && (
              <form onSubmit={handleEditSupplierSubmit} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Supplier Name *</label>
                  <Input
                    value={editSupName}
                    onChange={(e) => setEditSupName(e.target.value)}
                    required
                    placeholder="e.g. Tata Supplier"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number *</label>
                  <Input
                    value={editSupPhone}
                    onChange={(e) => setEditSupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Product Range</label>
                  <Input
                    value={editSupProductRange}
                    onChange={(e) => setEditSupProductRange(e.target.value)}
                    placeholder="e.g. Dairy, Oil, Snacks, Beverages"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Address</label>
                  <Input
                    value={editSupAddress}
                    onChange={(e) => setEditSupAddress(e.target.value)}
                    placeholder="e.g. Sindhi Colony"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Private Notes</label>
                  <textarea
                    value={editSupNote}
                    onChange={(e) => setEditSupNote(e.target.value)}
                    className={styles.formTextarea}
                    placeholder="e.g. Delivery schedules or pricing agreements..."
                    rows={3}
                  />
                </div>
                <div className={styles.poModalActions}>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setSelectedSupplierForDetails(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSupplierMutation.isPending}>
                    {updateSupplierMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}

            {supplierModalTab === 'ledger' && (
              <div className={styles.ledgerWrapper}>
                {ledgerLoading ? (
                  <div className={styles.loader}>Loading transaction history...</div>
                ) : !ledgerData || ledgerData.length === 0 ? (
                  <div className={styles.emptyLedger}>
                    No purchases or repayments logged for this supplier.
                  </div>
                ) : (
                  <div className={styles.ledgerTableScroll}>
                    <table className={styles.ledgerTable}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type / Reference</th>
                          <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                          <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                          <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerData.map((log: any) => {
                          const isCredit = log.type === 'repayment' || log.type === 'upfront_payment';
                          const debit = Number(log.debit || 0);
                          const credit = Number(log.credit || 0);
                          return (
                            <tr key={log.id} className={isCredit ? styles.repaymentRow : ''}>
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {new Date(log.date).toLocaleDateString('en-IN')}
                              </td>
                              <td>
                                <strong style={{ color: isCredit ? 'var(--color-primary)' : 'inherit' }}>
                                  {log.label}
                                </strong>
                                {log.note && <div className={styles.ledgerNote}>{log.note}</div>}
                              </td>
                              <td style={{ textAlign: 'right', color: debit > 0 ? 'var(--color-error)' : 'inherit', fontWeight: debit > 0 ? 600 : 400 }}>
                                {debit > 0 ? `+${debit.toFixed(2)}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', color: credit > 0 ? 'var(--color-primary)' : 'inherit', fontWeight: credit > 0 ? 600 : 400 }}>
                                {credit > 0 ? `-${credit.toFixed(2)}` : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: log.balance > 0 ? 'var(--color-error)' : log.balance < 0 ? 'var(--color-primary)' : 'inherit' }}>
                                {log.balance.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className={styles.poModalActions}>
                  <Button variant="secondary" onClick={() => setSelectedSupplierForDetails(null)} style={{ marginLeft: 'auto' }}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// Inner helper component to fetch PO details and render item sub-list
function PurchaseOrderItemsList({ poId }: { poId: string }) {
  const { data: po, isLoading } = usePurchaseDetail(poId);

  if (isLoading) return <div>Loading order items...</div>;
  if (!po || !po.purchase_order_items || po.purchase_order_items.length === 0) {
    return <div>No items listed.</div>;
  }

  return (
    <table className={styles.poTable}>
      <thead>
        <tr>
          <th>Product</th>
          <th style={{ textAlign: 'center' }}>Qty</th>
          <th style={{ textAlign: 'right' }}>Cost Price</th>
          <th style={{ textAlign: 'right' }}>MRP</th>
          <th style={{ textAlign: 'right' }}>Sell Price</th>
          <th style={{ textAlign: 'right' }}>Margin</th>
        </tr>
      </thead>
      <tbody>
        {po.purchase_order_items.map((item) => {
          const cost = Number(item.cost_price);
          const sell = item.sell_price ? Number(item.sell_price) : 0;
          const marginVal = sell > 0 ? Math.round(((sell - cost) / sell) * 100) : null;
          const displayMargin = marginVal !== null ? `${marginVal}%` : '-';

          return (
            <tr key={item.id}>
              <td style={{ fontWeight: 500 }}>{item.product_name}</td>
              <td style={{ textAlign: 'center' }}>{item.qty}</td>
              <td style={{ textAlign: 'right' }}>₹{cost.toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>
                {item.mrp ? `₹${Number(item.mrp).toFixed(2)}` : <span style={{ color: 'var(--color-outline)', fontWeight: 400 }}>—</span>}
              </td>
              <td style={{ textAlign: 'right' }}>
                {item.sell_price ? `₹${sell.toFixed(2)}` : <span style={{ color: 'var(--color-outline)', fontWeight: 400 }}>—</span>}
              </td>
              <td style={{ 
                textAlign: 'right', 
                fontWeight: 600,
                color: marginVal !== null && marginVal > 0 ? '#006763' : marginVal !== null && marginVal < 0 ? '#ba1a1a' : 'inherit'
              }}>
                {displayMargin}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
