import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useForgotPassword, useResetPassword } from './auth.queries';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './ForgotPasswordModal.module.css';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const addToast = useToastStore((s) => s.addToast);

  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email) {
      setEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email address');
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync(email);
      addToast('success', 'OTP code sent to email');
      setStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP code';
      addToast('error', msg);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setPasswordError('');

    if (!otp || otp.length !== 6) {
      setOtpError('OTP must be exactly 6 digits');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        email,
        otp,
        newPassword,
      });
      addToast('success', 'Password reset successfully');
      setStep(3);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password';
      addToast('error', msg);
    }
  };

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailError('');
    setOtpError('');
    setPasswordError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={step === 3 ? "Success" : "Reset Password"} maxWidth="400px">
      {step === 1 && (
        <form onSubmit={handleSendOTP} className={styles.form}>
          <p className={styles.description}>
            Enter your email address and we will send you a 6-digit OTP code to reset your password.
          </p>
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            placeholder="owner@lalakirana.in"
            required
            autoFocus
          />
          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={forgotPasswordMutation.isPending}>
              Send OTP
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} className={styles.form}>
          <p className={styles.description}>
            We've sent an OTP code to <strong>{email}</strong>. Enter it below along with your new password.
          </p>
          <Input
            label="6-Digit OTP"
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            error={otpError}
            placeholder="000000"
            required
            autoFocus
          />
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordError}
            placeholder="••••••"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••"
            required
          />
          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" loading={resetPasswordMutation.isPending}>
              Reset Password
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className={styles.success}>
          <div className={styles.iconWrapper}>
            <svg
              className={styles.successIcon}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className={styles.successText}>
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Button type="button" onClick={handleClose} className={styles.successBtn}>
            Back to Sign In
          </Button>
        </div>
      )}
    </Modal>
  );
}
