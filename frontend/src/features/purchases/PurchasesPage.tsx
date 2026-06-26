import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePurchaseOrders,
  useExpenses,
  useSuppliers,
  useCancelPurchase,
  useCreateSupplier,
  useSupplierRepayment,
  usePurchaseDetail,
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

  // Form States (Supplier Creation)
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNote, setSupNote] = useState('');

  // Queries
  const { data: poData, isLoading: poLoading } = usePurchaseOrders({ page, limit: 15 });
  const { data: expData, isLoading: expLoading } = useExpenses({ page, limit: 15 });
  const { data: supData, isLoading: supLoading } = useSuppliers({ page, limit: 15 });

  // Mutations
  const cancelPOMutation = useCancelPurchase();
  const createSupplierMutation = useCreateSupplier();
  const logSupplierRepayMutation = useSupplierRepayment(payingSupplier?.id || '');

  // Handlers
  const handleCreateSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (!supPhone.trim()) {
      addToast('error', 'Phone number is required.');
      return;
    }

    try {
      await createSupplierMutation.mutateAsync({
        name: supName.trim(),
        phone: supPhone.trim(),
        address: supAddress.trim() || null,
        note: supNote.trim() || null,
      });
      addToast('success', `Supplier "${supName}" created successfully.`);
      setShowSupplierModal(false);
      setSupName('');
      setSupPhone('');
      setSupAddress('');
      setSupNote('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create supplier.');
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
      render: (po) => (
        <Badge variant={po.payment_status === 'paid' ? 'success' : po.payment_status === 'partial' ? 'warning' : 'error'}>
          {po.payment_status}
        </Badge>
      ),
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
      key: 'address',
      header: 'Address & Notes',
      render: (s) => (
        <div>
          <div>{s.address || '-'}</div>
          {s.note && <div className={styles.noteTip}>{s.note}</div>}
        </div>
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
                onChange={(e) => setSupPhone(e.target.value)}
                className={styles.formInput}
                required
                placeholder="e.g. 9876543210"
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

      {/* Detailed PO Modal */}
      {selectedPO && (
        <Modal
          isOpen={selectedPO !== null}
          onClose={() => setSelectedPO(null)}
          title={`Purchase Order Details — ${selectedPO.supplier_name}`}
          maxWidth="600px"
        >
          <div className={styles.poDetailContainer}>
            <div className={styles.poMetaCard}>
              <p><strong>Order ID:</strong> {selectedPO.id}</p>
              <p><strong>Date:</strong> {new Date(selectedPO.order_date).toLocaleDateString('en-IN')}</p>
              <p><strong>Total Cost:</strong> ₹{Number(selectedPO.total).toFixed(2)}</p>
              <p><strong>Items:</strong> {selectedPO.item_count}</p>
              <p><strong>Payment Status:</strong> {selectedPO.payment_status}</p>
              {selectedPO.note && <p><strong>Note:</strong> {selectedPO.note}</p>}
            </div>

            {/* List items */}
            <div className={styles.poItemsWrapper}>
              <h4>Inbound Products:</h4>
              {poLoading ? (
                <div>Loading items...</div>
              ) : (
                <ul className={styles.poItemsList}>
                  {/* Fetch PO detail inline or load it if the endpoint returns items. In purchases.routes.ts: GET /purchases/:id returns PO with items! Let's display the items from the row if preloaded, or load if they are linked. Wait! Purchases page list query does NOT return items nested by default. But let's check `PurchasesPage` poData. We can fetch using `usePurchaseDetail` hook! */}
                  <PurchaseOrderItemsList poId={selectedPO.id} />
                </ul>
              )}
            </div>

            <div className={styles.poModalActions}>
              <Button variant="secondary" onClick={() => setSelectedPO(null)}>
                Close
              </Button>
              {isOwner && selectedPO.status !== 'cancelled' && (
                <Button
                  variant="danger"
                  onClick={() => {
                    setCancellingPO(selectedPO);
                    setSelectedPO(null);
                  }}
                >
                  Cancel Purchase Order
                </Button>
              )}
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
          <th>Qty</th>
          <th>Cost Price</th>
          <th>MRP</th>
          <th>Sell Price</th>
        </tr>
      </thead>
      <tbody>
        {po.purchase_order_items.map((item) => (
          <tr key={item.id}>
            <td>{item.product_name}</td>
            <td>{item.qty}</td>
            <td>₹{Number(item.cost_price).toFixed(2)}</td>
            <td>{item.mrp ? `₹${Number(item.mrp).toFixed(2)}` : 'Keep Existing'}</td>
            <td>{item.sell_price ? `₹${Number(item.sell_price).toFixed(2)}` : 'Keep Existing'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
