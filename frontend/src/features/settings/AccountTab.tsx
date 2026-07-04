import { useState } from 'react';
import { useChangePassword, useUpdatePin } from './settings.queries';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useToastStore } from '@/shared/store/toastStore';
import { useAuthStore } from '@/shared/store/authStore';
import { useNavigate } from 'react-router-dom';
import styles from './AccountTab.module.css';

export function AccountTab() {
  const changePasswordMutation = useChangePassword();
  const updatePinMutation = useUpdatePin();
  const addToast = useToastStore((s) => s.addToast);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = currentPassword.length >= 6 && newPassword.length >= 6 && passwordsMatch;

  const isPinValid = /^\d{4}$/.test(pin) && pin === confirmPin;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      addToast('success', 'Password changed successfully. Please log in again.');
      logout();
      navigate('/login');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to change password');
    }
  };

  const handlePinSubmit = async () => {
    if (!isPinValid) return;
    try {
      await updatePinMutation.mutateAsync(pin);
      addToast('success', 'Unlock PIN updated successfully');
      setPin('');
      setConfirmPin('');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to update PIN');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Change Password</h2>
      <p className={styles.description}>
        After changing your password, all other sessions will be logged out and you will need to log in again.
      </p>

      <div className={styles.form}>
        <Input
          id="current-password"
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Enter current password..."
        />
        <Input
          id="new-password"
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 6 characters..."
          error={newPassword.length > 0 && newPassword.length < 6 ? 'Must be at least 6 characters' : undefined}
        />
        <Input
          id="confirm-password"
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password..."
          error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
        />

        <div className={styles.formActions}>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={changePasswordMutation.isPending}
            disabled={!isValid}
          >
            Change Password
          </Button>
        </div>
      </div>

      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--color-outline-variant)', paddingTop: '2rem' }}>
        <h2 className={styles.sectionTitle}>Screen Lock PIN</h2>
        <p className={styles.description}>
          Set a 4-digit numeric PIN to quickly unlock your session on this terminal when locked due to inactivity.
        </p>

        <div className={styles.form}>
          <Input
            id="unlock-pin"
            label="4-Digit PIN"
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 1234"
            error={pin.length > 0 && pin.length < 4 ? 'Must be exactly 4 digits' : undefined}
          />
          <Input
            id="confirm-unlock-pin"
            label="Confirm 4-Digit PIN"
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Repeat 4-digit PIN..."
            error={confirmPin.length > 0 && pin !== confirmPin ? 'PINs do not match' : undefined}
          />

          <div className={styles.formActions}>
            <Button
              variant="primary"
              onClick={handlePinSubmit}
              loading={updatePinMutation.isPending}
              disabled={!isPinValid}
            >
              Update PIN
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
