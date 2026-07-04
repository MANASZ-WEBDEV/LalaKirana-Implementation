import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBillingStore } from './billingStore';
import { OrderSlot } from './OrderSlot';
import { FullBillMode } from './FullBillMode';
import { QuickBillMode } from './QuickBillMode';
import { BillConfirmDrawer } from './BillConfirmDrawer';
import { BillHistoryDrawer } from './BillHistoryDrawer';
import { Button } from '@/shared/ui/Button';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import { api } from '@/shared/api/axios';
import { useAuthStore } from '@/shared/store/authStore';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './BillingPage.module.css';

export default function BillingPage() {
  const { slots, activeSlotId, addSlot, setActiveSlotId } = useBillingStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const addToast = useToastStore((s) => s.addToast);

  // Dialog / Drawer states
  const [showConfirmDrawer, setShowConfirmDrawer] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'paid' | 'khata'>('paid');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  // Lock screen states
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [pinDigits, setPinDigits] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Inactivity lock handler (30 minutes)
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    let timer: any;

    const resetTimer = () => {
      clearTimeout(timer);
      if (!isScreenLocked) {
        timer = setTimeout(() => {
          setIsScreenLocked(true);
        }, INACTIVITY_TIMEOUT);
      }
    };

    if (!isScreenLocked) {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keypress', resetTimer);
      resetTimer();
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
    };
  }, [isScreenLocked]);

  // Focus hidden input when screen is locked
  useEffect(() => {
    if (isScreenLocked) {
      setPinDigits('');
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [isScreenLocked]);

  const handlePinChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPinDigits(value);

    if (value.length === 4) {
      setIsVerifyingPin(true);
      try {
        await api.post('/auth/verify-pin', { pin: value });
        setIsScreenLocked(false);
        setPinDigits('');
        addToast('success', 'Terminal unlocked successfully');
      } catch (err: any) {
        setPinDigits('');
        addToast('error', err.response?.data?.message || 'Incorrect PIN');
        // Refocus input
        setTimeout(() => {
          pinInputRef.current?.focus();
        }, 100);
      } finally {
        setIsVerifyingPin(false);
      }
    }
  };

  const handleDifferentUser = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (searchParams.get('bill')) {
      setShowHistoryDrawer(true);
    }
  }, [searchParams]);

  const activeSlot = slots.find((s) => s.id === activeSlotId);

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onConfirm: () => {
      // Only open confirm if active slot has content
      if (activeSlot) {
        const isFull = activeSlot.mode === 'full';
        const total = isFull
          ? activeSlot.items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)
          : parseFloat(activeSlot.quickAmount) || 0;

        if (total > 0) {
          setCheckoutMode('paid');
          setShowConfirmDrawer(true);
        }
      }
    },
    onEscape: () => {
      setShowConfirmDrawer(false);
      setShowHistoryDrawer(false);
    },
  });

  const handleCheckoutClick = (status: 'paid' | 'khata') => {
    setCheckoutMode(status);
    setShowConfirmDrawer(true);
  };

  if (isScreenLocked) {
    return (
      <div className={styles.lockOverlay} onClick={() => pinInputRef.current?.focus()}>
        <div className={styles.lockCard} onClick={(e) => e.stopPropagation()}>
          <div className={styles.lockIcon}>🔒</div>
          <h2 className={styles.lockTitle}>Screen Locked</h2>
          <p className={styles.lockSubtitle}>Inactive for 30 minutes</p>

          <div className={styles.pinContainer}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-outline)' }}>
              Enter PIN to continue
            </span>
            <div className={styles.pinInputWrapper}>
              <input
                ref={pinInputRef}
                type="password"
                maxLength={4}
                value={pinDigits}
                onChange={handlePinChange}
                disabled={isVerifyingPin}
                className={styles.hiddenInput}
                autoFocus
              />
              <div className={styles.pinDigitsRow}>
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pinDigits.length > index;
                  return (
                    <div
                      key={index}
                      className={`${styles.pinDigit} ${isFilled ? styles.pinDigitFilled : ''}`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button type="button" onClick={handleDifferentUser} className={styles.differentUserBtn}>
            Or: Sign in as different user
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Billing Counter</h1>
          <p className={styles.subtitle}>
            Process transactions, record ledger updates, and print customer invoices.
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => setShowHistoryDrawer(true)}>
            📜 Sales History
          </Button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className={styles.workspace}>
        {/* Left Column: Order Slots List */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Order Queue</span>
            <span className={styles.sidebarCount}>{slots.length}/10</span>
          </div>

          <div className={styles.slotsList}>
            {slots.map((slot, index) => (
              <OrderSlot
                key={slot.id}
                id={slot.id}
                displayNumber={index + 1}
                isActive={slot.id === activeSlotId}
                onSelect={() => setActiveSlotId(slot.id)}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.addSlotBtn}
            onClick={addSlot}
            disabled={slots.length >= 10}
            title="Create new slot (Alt+N)"
          >
            ➕ New Order Slot
          </button>
        </aside>

        {/* Right Column: Active Checkout Workspace */}
        <main className={styles.mainContent}>
          {activeSlot ? (
            <div className={styles.activePanel}>
              {/* Tab Selector inside Panel */}
              <div className={styles.modeTabs}>
                <button
                  type="button"
                  className={`${styles.modeTab} ${activeSlot.mode === 'full' ? styles.modeTabActive : ''}`}
                  onClick={() => {
                    useBillingStore.getState().switchMode('full');
                  }}
                >
                  📦 Full Catalog Checkout
                </button>
                <button
                  type="button"
                  className={`${styles.modeTab} ${activeSlot.mode === 'quick' ? styles.modeTabActive : ''}`}
                  onClick={() => {
                    useBillingStore.getState().switchMode('quick');
                  }}
                >
                  ⚡ Quick Rupee Numpad (F2)
                </button>
              </div>

              {/* Renders Active checkout Panel */}
              <div className={styles.checkoutModeWrapper}>
                {activeSlot.mode === 'full' ? (
                  <FullBillMode onCheckout={handleCheckoutClick} />
                ) : (
                  <QuickBillMode onCheckout={handleCheckoutClick} />
                )}
              </div>
            </div>
          ) : (
            <div className={styles.noActiveSlot}>
              <p>No active order slots. Create one from the sidebar queue.</p>
            </div>
          )}
        </main>
      </div>

      {/* Confirm Drawer Overlay */}
      {showConfirmDrawer && (
        <BillConfirmDrawer
          isOpen={showConfirmDrawer}
          onClose={() => setShowConfirmDrawer(false)}
          statusMode={checkoutMode}
        />
      )}

      {/* History Drawer Overlay */}
      {showHistoryDrawer && (
        <BillHistoryDrawer isOpen={showHistoryDrawer} onClose={() => setShowHistoryDrawer(false)} />
      )}
    </div>
  );
}
