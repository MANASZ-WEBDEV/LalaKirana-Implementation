import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCustomerProfile,
  useKhataEntries,
  useUpdateCustomer,
} from './khata.queries';
import { RepaymentDrawer } from './RepaymentDrawer';
import { KhataStatement } from './KhataStatement';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Badge } from '@/shared/ui/Badge';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { useToastStore } from '@/shared/store/toastStore';
import { useAuthStore } from '@/shared/store/authStore';
import type { KhataEntry } from '@/types/khata.types';
import styles from './CustomerProfile.module.css';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner' || user?.role === 'master';

  // States
  const [showRepayDrawer, setShowRepayDrawer] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [page, setPage] = useState(1);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Queries
  const { data: profile, isLoading: isProfileLoading } = useCustomerProfile(id || '');
  const { data: entriesData, isLoading: isEntriesLoading } = useKhataEntries(id || '', page, 15);

  const updateCustomerMutation = useUpdateCustomer(id || '');

  if (!id) {
    return (
      <div className={styles.errorView}>
        <h3>Customer ID is missing</h3>
        <Button onClick={() => navigate('/khata')}>Back to accounts</Button>
      </div>
    );
  }

  const handleEditClick = () => {
    if (profile) {
      setEditName(profile.name);
      setEditPhone(profile.phone || '');
      setEditAddress(profile.address || '');
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editPhone.trim() && !/^\d{10}$/.test(editPhone.trim())) {
      addToast('error', 'Phone number must be exactly 10 digits and contain only numbers.');
      return;
    }

    try {
      await updateCustomerMutation.mutateAsync({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        address: editAddress.trim() || null,
      });
      addToast('success', 'Customer profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      const error = err as Error;
      addToast('error', error.message || 'Failed to update customer profile');
    }
  };

  if (isProfileLoading) {
    return <div className={styles.loader}>Loading customer profile...</div>;
  }

  if (!profile) {
    return (
      <div className={styles.errorView}>
        <h3>Customer account not found</h3>
        <Button onClick={() => navigate('/khata')}>Back to accounts</Button>
      </div>
    );
  }

  const entries = entriesData?.entries || [];
  const totalPages = entriesData?.totalPages || 1;

  // Columns for ledger
  const columns: ColumnConfig<KhataEntry>[] = [
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (e) => (
        <span>
          {new Date(e.created_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (e) =>
        e.type === 'purchase' ? (
          <Badge variant="warning">Purchase</Badge>
        ) : (
          <Badge variant="success">Repayment</Badge>
        ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (e) => (
        <span className={e.type === 'purchase' ? styles.purchaseAmt : styles.repayAmt}>
          {e.type === 'purchase' ? '+' : '-'} ₹{Number(e.amount).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Reference/Note',
      render: (e) => (
        <span>
          {e.bill_number ? `Bill: ${e.bill_number}` : e.note || '-'}
        </span>
      ),
    },
    {
      key: 'created_by',
      header: 'Cashier',
      render: (e) => <span>{e.created_by_name || '-'}</span>,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Back button and title */}
      <header className={styles.header}>
        <button onClick={() => navigate('/khata')} className={styles.backBtn}>
          ← Back to Accounts
        </button>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setShowStatementModal(true)}>
            📋 Monthly Statement
          </Button>
          {isOwner && (
            <Button onClick={() => setShowRepayDrawer(true)} disabled={Number(profile.total_balance) <= 0}>
              💰 Log Repayment
            </Button>
          )}
        </div>
      </header>

      {/* Profile Card / Edit form */}
      <div className={styles.profileSection}>
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className={styles.editForm}>
            <div className={styles.editGrid}>
              <Input
                label="Customer Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
              <div className={styles.textareaWrapper}>
                <label className={styles.textareaLabel}>Address</label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className={styles.textarea}
                  rows={2}
                />
              </div>
            </div>
            <div className={styles.editActions}>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCustomerMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className={styles.profileCard}>
            <div className={styles.profileInfo}>
              <h2 className={styles.customerName}>{profile.name}</h2>
              {profile.phone && <p className={styles.profileText}>📞 Phone: {profile.phone}</p>}
              {profile.address && <p className={styles.profileText}>📍 Address: {profile.address}</p>}
            </div>
            <button onClick={handleEditClick} className={styles.editBtn}>
              Edit Info
            </button>
          </div>
        )}
      </div>

      {/* Aggregate Stats cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Purchased Balance</span>
          <span className={styles.statVal}>₹{Number(profile.stats?.total_purchases || 0).toFixed(2)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Repayments</span>
          <span className={styles.statVal}>₹{Number(profile.stats?.total_payments || 0).toFixed(2)}</span>
        </div>
        <div className={`${styles.statCard} ${styles.outstandingCard}`}>
          <span className={styles.statLabel}>Outstanding Due</span>
          <span className={styles.statVal}>₹{Number(profile.total_balance).toFixed(2)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Last Transaction</span>
          <span className={styles.statValSub}>
            {profile.stats?.last_transaction
              ? new Date(profile.stats.last_transaction).toLocaleDateString('en-IN')
              : 'No transaction history'}
          </span>
        </div>
      </div>

      {/* Ledger Log entries */}
      <div className={styles.tableCard}>
        <h3 className={styles.tableTitle}>Account Credit Ledger</h3>
        {isEntriesLoading ? (
          <div className={styles.loader}>Loading ledger entries...</div>
        ) : entries.length === 0 ? (
          <div className={styles.emptyLedger}>No ledger entries recorded for this account.</div>
        ) : (
          <DataTable columns={columns} data={entries} rowKey={(e) => e.id} />
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

      {/* Repayment Drawer */}
      {showRepayDrawer && (
        <RepaymentDrawer
          isOpen={showRepayDrawer}
          onClose={() => setShowRepayDrawer(false)}
          customerId={id}
          customerName={profile.name}
          outstandingBalance={Number(profile.total_balance)}
          customerPhone={profile.phone}
        />
      )}

      {/* Monthly Statement Printable Modal */}
      {showStatementModal && (
        <Modal
          isOpen={showStatementModal}
          onClose={() => setShowStatementModal(false)}
          title="Print Monthly Statement"
          maxWidth="700px"
        >
          <KhataStatement customerId={id} />
        </Modal>
      )}
    </div>
  );
}
