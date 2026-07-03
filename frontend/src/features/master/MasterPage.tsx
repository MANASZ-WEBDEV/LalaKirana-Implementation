import { useState } from 'react';
import {
  useMasterOverview,
  useMasterUsers,
  useMasterCreateOwner,
  useMasterChangeRole,
  useMasterDeactivateUser,
  useMasterResetPassword,
} from './master.queries';
import { StatCard } from '@/shared/ui/StatCard';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Badge } from '@/shared/ui/Badge';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './MasterPage.module.css';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'owner' | 'staff';
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export default function MasterPage() {
  const addToast = useToastStore((s) => s.addToast);

  // Queries
  const { data: overview, isLoading: isOverviewLoading } = useMasterOverview();
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useMasterUsers();

  // Mutations
  const createOwnerMutation = useMasterCreateOwner();
  const changeRoleMutation = useMasterChangeRole();
  const deactivateMutation = useMasterDeactivateUser();
  const resetPasswordMutation = useMasterResetPassword();

  // Modals & Dialogs State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState<string | null>(null);

  // Create Owner Form State
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');

  const isLoading = isOverviewLoading || isUsersLoading;

  // Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Actions
  const handleCreateOwner = async () => {
    if (!ownerPhone.trim()) {
      addToast('error', 'Phone number is required');
      return;
    }
    if (!/^\d{10}$/.test(ownerPhone.trim())) {
      addToast('error', 'Phone number must be exactly 10 digits and contain only numbers');
      return;
    }

    try {
      await createOwnerMutation.mutateAsync({
        name: ownerName,
        email: ownerEmail,
        password: ownerPassword,
        phone: ownerPhone.trim(),
      });
      addToast('success', `Owner "${ownerName}" created successfully!`);
      setShowAddModal(false);
      setOwnerName('');
      setOwnerEmail('');
      setOwnerPassword('');
      setOwnerPhone('');
      refetchUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create owner');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetModal) return;
    try {
      await resetPasswordMutation.mutateAsync({
        userId: showResetModal,
        newPassword,
      });
      addToast('success', 'Password reset successfully. Active sessions revoked.');
      setShowResetModal(null);
      setNewPassword('');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeactivateUser = async () => {
    if (!showDeactivateDialog) return;
    try {
      await deactivateMutation.mutateAsync(showDeactivateDialog);
      addToast('success', 'User deactivated and sessions terminated.');
      setShowDeactivateDialog(null);
      refetchUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  const handleToggleRole = async (user: UserItem) => {
    const nextRole = user.role === 'owner' ? 'staff' : 'owner';
    try {
      await changeRoleMutation.mutateAsync({
        userId: user.id,
        role: nextRole,
      });
      addToast('success', `Changed role of "${user.name}" to ${nextRole}`);
      refetchUsers();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to change role');
    }
  };

  if (isLoading) {
    return <div className={styles.loadingText}>Loading master panel...</div>;
  }

  // Find active owners
  const activeOwners = overview?.owners?.filter((o: any) => o.is_active).map((o: any) => o.name).join(', ') || 'None';

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🔑 Master Admin Panel</h1>
          <p className={styles.subtitle}>Manage shop owners, roles, security overrides, and track superuser audit logs.</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          + Create Shop Owner
        </Button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Today's Revenue"
          value={overview ? formatCurrency(overview.revenueToday) : '₹0'}
        />
        <StatCard
          label="Today's Order Count"
          value={overview?.ordersToday ?? 0}
        />
        <StatCard
          label="Shop Owner(s)"
          value={activeOwners}
        />
        <StatCard
          label="Active Staff Count"
          value={overview?.activeStaffCount ?? 0}
        />
      </div>

      {/* Users Management Grid */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>User Administration</h2>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className={styles.alignRight}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: UserItem) => (
                <tr key={user.id}>
                  <td className={styles.nameCell}>
                    <strong>{user.name}</strong>
                    {user.phone && <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginTop: '0.15rem' }}>📞 {user.phone}</div>}
                  </td>
                  <td className={styles.emailCell}>{user.email}</td>
                  <td>
                    <Badge variant={user.role === 'master' ? 'error' : user.role === 'owner' ? 'info' : 'neutral'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={user.is_active !== false ? 'success' : 'error'}>
                      {user.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className={styles.actionsCell}>
                    {user.role !== 'master' && (
                      <>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleToggleRole(user)}
                          title="Toggle between Staff and Owner"
                        >
                          Make {user.role === 'owner' ? 'Staff' : 'Owner'}
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => setShowResetModal(user.id)}
                          title="Override and Reset Password"
                        >
                          Reset Password
                        </button>
                        {user.is_active !== false && (
                          <button
                            className={`${styles.actionBtn} ${styles.dangerBtn}`}
                            onClick={() => setShowDeactivateDialog(user.id)}
                            title="Deactivate and revoke active sessions"
                          >
                            Deactivate
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs list */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Master Action Audit Trail</h2>
        </div>
        <div className={styles.auditLogList}>
          {overview?.recentLogs && overview.recentLogs.length > 0 ? (
            overview.recentLogs.map((log: any) => (
              <div key={log.id} className={styles.auditLogItem}>
                <div className={styles.auditLogContent}>
                  <span className={styles.auditLogAction}>
                    {log.action.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={styles.auditLogNote}>{log.note}</span>
                </div>
                <div className={styles.auditLogMeta}>
                  <span className={styles.auditLogUser}>By: {log.master_name}</span>
                  <span>{formatDateTime(log.created_at)}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-outline)' }}>
              No master actions logged yet.
            </div>
          )}
        </div>
      </div>

      {/* Add Owner Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create New Shop Owner"
      >
        <div className={styles.form}>
          <Input
            id="owner-name"
            label="Full Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Enter owner's name..."
          />
          <Input
            id="owner-email"
            label="Email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@lalakirana.in"
          />
          <Input
            id="owner-phone"
            label="Phone Number"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            maxLength={10}
            placeholder="e.g. 9876543210"
          />
          <Input
            id="owner-password"
            label="Temporary Password"
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder="Min 6 characters..."
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateOwner}
              loading={createOwnerMutation.isPending}
              disabled={!ownerName || !ownerEmail || !ownerPhone || ownerPassword.length < 6}
            >
              Create Owner
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!showResetModal}
        onClose={() => {
          setShowResetModal(null);
          setNewPassword('');
        }}
        title="Override User Password"
      >
        <div className={styles.form}>
          <Input
            id="new-password"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 6 characters..."
          />
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowResetModal(null);
                setNewPassword('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResetPassword}
              loading={resetPasswordMutation.isPending}
              disabled={newPassword.length < 6}
            >
              Update Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!showDeactivateDialog}
        title="Deactivate User"
        message="Are you sure you want to deactivate this account? This will log them out immediately from all active devices and revoke access."
        confirmText="Deactivate"
        onConfirm={handleDeactivateUser}
        onClose={() => setShowDeactivateDialog(null)}
        isDanger={true}
      />
    </div>
  );
}
