import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from './auth.queries';
import { useToastStore } from '@/shared/store/toastStore';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const loginMutation = useLogin();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');

    let isValid = true;
    if (!email) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email address');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    if (!isValid) return;

    try {
      await loginMutation.mutateAsync({ email, password });
      addToast('success', 'Logged in successfully');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      addToast('error', msg);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Branding Panel */}
      <div className={styles.brandPanel}>
        <div className={styles.brandContent}>
          <h1 className={styles.logoText}>LalaKirana</h1>
          <p className={styles.logoSubtext}>Retail Inventory Management</p>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className={styles.formPanel}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.heading}>Welcome Back</h2>
            <p className={styles.subheading}>Sign in to manage your store inventory</p>
          </div>

          <form onSubmit={handleLogin} className={styles.form}>
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

            <div className={styles.passwordWrapper}>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={passwordError}
                placeholder="••••••"
                required
              />
              <button
                type="button"
                className={styles.forgotBtn}
                onClick={() => setIsForgotOpen(true)}
              >
                Forgot?
              </button>
            </div>

            <Button
              type="submit"
              className={styles.submitBtn}
              loading={loginMutation.isPending}
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
      />
    </div>
  );
}
