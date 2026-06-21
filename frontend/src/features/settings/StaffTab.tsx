import { useState } from 'react';
import { useUsers, useCreateUser, useResetUserPassword, useDeactivateUser } from './settings.queries';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Badge } from '@/shared/ui/Badge';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './StaffTab.module.css';

export function StaffTab() {
  const { data: users = [], isLoading } = useUsers();
  const createUserMutation = useCreateUser();
  const resetPasswordMutation = useResetUserPassword();
  const deactivateMutation = useDeactivateUser();
  const addToast = useToastStore((s) => s.addToast);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState<string | null>(null);

  // Add Staff form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'staff' | 'owner'>('staff');

  // Reset password form state
  const [resetPassword, setResetPassword] = useState('');

  const handleCreateUser = async () => {
    try {
      await createUserMutation.mutateAsync({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      addToast('success', `Staff member "${newName}" created successfully`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('staff');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetModal) return;
    try {
      await resetPasswordMutation.mutateAsync({ userId: showResetModal, newPassword: resetPassword });
      addToast('success', 'Password reset successfully');
      setShowResetModal(null);
      setResetPassword('');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleDeactivate = async () => {
    if (!showDeactivateDialog) return;
    try {
      await deactivateMutation.mutateAsync(showDeactivateDialog);
      addToast('success', 'User deactivated');
      setShowDeactivateDialog(null);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to deactivate user');
    }
  };

  if (isLoading) {
    return <div className={styles.loadingText}>Loading staff...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>Staff & Users</h2>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>+ Add Staff</Button>
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
            {users.map((user) => (
              <tr key={user.id}>
                <td className={styles.nameCell}>{user.name}</td>
                <td className={styles.emailCell}>{user.email}</td>
                <td>
                  <Badge variant={user.role === 'owner' ? 'info' : 'neutral'}>
                    {user.role}
                  </Badge>
                </td>
                <td>
                  <Badge variant={user.is_active !== false ? 'success' : 'error'}>
                    {user.is_active !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className={styles.actionsCell}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => setShowResetModal(user.id)}
                    title="Reset Password"
                  >
                    Reset Password
                  </button>
                  {user.is_active !== false && (
                    <button
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                      onClick={() => setShowDeactivateDialog(user.id)}
                      title="Deactivate User"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Staff Member"
      >
        <div className={styles.form}>
          <Input id="staff-name" label="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter staff name..." />
          <Input id="staff-email" label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="staff@example.com" />
          <Input id="staff-password" label="Temporary Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters..." />
          <Select
            id="staff-role"
            label="Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'staff' | 'owner')}
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'owner', label: 'Owner' },
            ]}
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateUser}
              loading={createUserMutation.isPending}
              disabled={!newName || !newEmail || newPassword.length < 6}
            >
              Create Staff
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!showResetModal}
        onClose={() => { setShowResetModal(null); setResetPassword(''); }}
        title="Reset User Password"
      >
        <div className={styles.form}>
          <Input
            id="reset-new-password"
            label="New Password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="Min 6 characters..."
          />
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowResetModal(null); setResetPassword(''); }}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleResetPassword}
              loading={resetPasswordMutation.isPending}
              disabled={resetPassword.length < 6}
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!showDeactivateDialog}
        title="Deactivate User"
        message="This will deactivate the user's account and terminate all their active sessions. Are you sure?"
        confirmText="Deactivate"
        onConfirm={handleDeactivate}
        onClose={() => setShowDeactivateDialog(null)}
        isDanger={true}
      />
    </div>
  );
}
