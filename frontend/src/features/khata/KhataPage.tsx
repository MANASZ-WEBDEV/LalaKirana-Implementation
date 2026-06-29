import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers, useCreateCustomer } from './khata.queries';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { useToastStore } from '@/shared/store/toastStore';
import type { Customer } from '@/types/khata.types';
import styles from './KhataPage.module.css';

export default function KhataPage() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  // States
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Fetch customers
  const { data, isLoading } = useCustomers({
    search: search.trim() || undefined,
    page,
    limit: 20,
  });

  const createCustomerMutation = useCreateCustomer();

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) {
      addToast('error', 'Phone number must be exactly 10 digits and contain only numbers.');
      return;
    }

    try {
      await createCustomerMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      addToast('success', `Customer "${name}" created successfully`);
      setShowAddModal(false);
      setName('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create customer');
    }
  };

  const customers = data?.customers || [];
  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.total_balance), 0);
  const totalPages = data?.totalPages || 1;

  // Columns config
  const columns: ColumnConfig<Customer>[] = [
    {
      key: 'name',
      header: 'Customer Name',
      render: (c) => (
        <div className={styles.customerNameCol}>
          <span className={styles.customerName}>{c.name}</span>
          {c.phone && <span className={styles.customerPhone}>📞 {c.phone}</span>}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (c) => <span>{c.address || <span style={{ opacity: 0.5 }}>-</span>}</span>,
    },
    {
      key: 'total_balance',
      header: 'Outstanding Balance',
      align: 'right',
      render: (c) => {
        const bal = Number(c.total_balance);
        return (
          <span className={`${styles.balance} ${bal > 0 ? styles.hasBalance : ''}`}>
            ₹{bal.toFixed(2)}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created On',
      render: (c) => <span>{new Date(c.created_at).toLocaleDateString('en-IN')}</span>,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Khata Accounts</h1>
          <p className={styles.subtitle}>
            Manage credit ledgers, track customer repayments, and view statement sheets.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          ➕ Create Customer Account
        </Button>
      </header>

      {/* Summary Dashboard Card */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryLabel}>Total Credit Outstanding</div>
        <div className={styles.summaryVal}>₹{totalOutstanding.toFixed(2)}</div>
        <p className={styles.summarySub}>Aggregated balance across all customer accounts</p>
      </div>

      {/* Filters & Control bar */}
      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Search customer by name or phone number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Customer Ledger Table */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loader}>Loading customer ledgers...</div>
        ) : (
          <DataTable
            columns={columns}
            data={customers}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`/khata/${c.id}`)}
          />
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Create New Khata Account"
          maxWidth="450px"
        >
          <form onSubmit={handleAddSubmit} className={styles.addForm}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Customer Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.formInput}
                required
                placeholder="e.g. Ramesh Kumar"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Phone Number (Optional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={styles.formInput}
                maxLength={10}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Address (Optional)</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={styles.formTextarea}
                placeholder="Enter customer address details..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomerMutation.isPending}>
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
