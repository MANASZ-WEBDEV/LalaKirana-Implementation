import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin, useVerify2fa } from './auth.queries';
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
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpSetup, setTotpSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [preAuthToken, setPreAuthToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');

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
        rememberMe,
        ...(showRecovery ? { recoveryCode } : {}),
      });

      if (resData.requires2FA) {
        setRequires2FA(true);
        setTotpSetup(resData.totpSetup || false);
        setQrCode(resData.qrCode || '');
        setTotpSecret(resData.secret || '');
        setPreAuthToken(resData.preAuthToken || '');
        addToast('info', 'Two-factor authentication is required');
        return;
      }

      addToast('success', 'Logged in successfully');
      
      if (resData.user?.role === 'staff') {
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

  const verify2faMutation = useVerify2fa();

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');

    if (!/^\d{6}$/.test(totpCode)) {
      setTotpError('Verification code must be exactly 6 digits');
      return;
    }

    try {
      await verify2faMutation.mutateAsync({
        code: totpCode,
        preAuthToken,
      });
      addToast('success', 'Logged in successfully');
      navigate('/dashboard');
    } catch (err: any) {
      setTotpError(err.response?.data?.message || 'Invalid 2FA verification code');
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
          {requires2FA ? (
            <form onSubmit={handleVerify2fa} className={styles.form}>
              <div className={styles.cardHeader} style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h2 className={styles.heading}>Two-Factor Security</h2>
                <p className={styles.subheading}>
                  {totpSetup ? 'Scan the QR code to set up 2FA' : 'Enter the code from your Authenticator app'}
                </p>
              </div>

              {totpSetup && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  {qrCode && (
                    <img
                      src={qrCode}
                      alt="2FA QR Code"
                      style={{
                        border: '1px solid var(--color-outline-variant)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.5rem',
                        background: '#ffffff',
                        width: '180px',
                        height: '180px',
                      }}
                    />
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                    <p style={{ fontWeight: 500 }}>Scan in Google Authenticator or Authy</p>
                    <p style={{ marginTop: '0.25rem' }}>
                      Secret key: <code style={{ fontWeight: 600, background: 'var(--color-surface-variant)', padding: '2px 4px', borderRadius: '4px' }}>{totpSecret}</code>
                    </p>
                  </div>
                </div>
              )}

              <Input
                label="6-Digit Verification Code"
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                error={totpError}
                placeholder="e.g. 123456"
                required
                autoFocus
                autoComplete="one-time-code"
              />

              <Button
                type="submit"
                className={styles.submitBtn}
                loading={verify2faMutation.isPending}
                disabled={totpCode.length < 6}
              >
                Verify & Login
              </Button>

              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpCode('');
                  setTotpError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '0.5rem',
                  width: '100%',
                }}
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            <>
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

                <div className={styles.rememberMeContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className={styles.checkboxInput}
                    />
                    <span>Keep me logged in on this device</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className={styles.submitBtn}
                  loading={loginMutation.isPending}
                >
                  Sign In
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
