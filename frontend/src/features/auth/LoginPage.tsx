import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from './auth.queries';
import { useToastStore } from '@/shared/store/toastStore';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const loginMutation = useLogin();
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setRecoveryError('');

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
      const resData = await loginMutation.mutateAsync({
        email,
        password,
        ...(showRecovery ? { recoveryCode } : {}),
      });
      addToast('success', 'Logged in successfully');
      
      if (resData.user.role === 'staff') {
        addToast('info', 'Your activity is logged for shop management purposes');
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      const showRecoveryField = err.response?.data?.showRecoveryCode === true;
      if (showRecoveryField) {
        setShowRecovery(true);
      }
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
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordError}
              placeholder="••••••"
              required
              autoComplete="current-password"
            />

            {showRecovery && (
              <Input
                label="Recovery Override Code"
                type="text"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                error={recoveryError}
                placeholder="Enter ENV recovery code..."
                required
                autoFocus
              />
            )}

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
    </div>
  );
}
