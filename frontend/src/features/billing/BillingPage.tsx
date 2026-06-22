import { useState } from 'react';
import { useBillingStore } from './billingStore';
import { OrderSlot } from './OrderSlot';
import { FullBillMode } from './FullBillMode';
import { QuickBillMode } from './QuickBillMode';
import { BillConfirmDrawer } from './BillConfirmDrawer';
import { BillHistoryDrawer } from './BillHistoryDrawer';
import { Button } from '@/shared/ui/Button';
import { useKeyboardShortcuts } from '@/shared/hooks/useKeyboardShortcuts';
import styles from './BillingPage.module.css';

export default function BillingPage() {
  const { slots, activeSlotId, addSlot, setActiveSlotId } = useBillingStore();

  // Dialog / Drawer states
  const [showConfirmDrawer, setShowConfirmDrawer] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<'paid' | 'khata'>('paid');
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

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

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Register Checkout</h1>
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
            {slots.map((slot) => (
              <OrderSlot
                key={slot.id}
                id={slot.id}
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
            title="Create new slot (Ctrl+N)"
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
