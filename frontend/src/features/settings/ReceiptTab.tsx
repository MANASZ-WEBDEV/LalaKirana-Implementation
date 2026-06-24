import { useState, useEffect } from 'react';
import { useStoreSettings, useUpdateStoreSettings } from './settings.queries';
import { Input } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { useToastStore } from '@/shared/store/toastStore';
import type { Language } from '@/features/billing/receiptTranslations';
import {
  getLabel,
  formatStoreName,
  formatFooterMessage,
  formatModeStatus,
} from '@/features/billing/receiptTranslations';
import styles from './ReceiptTab.module.css';

export function ReceiptTab() {
  const addToast = useToastStore((s) => s.addToast);
  const { data: currentSettings, isLoading } = useStoreSettings();
  const updateSettingsMutation = useUpdateStoreSettings();

  // Local Form state
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [receiptLanguage, setReceiptLanguage] = useState<Language>('english');

  // Sync state when data is loaded
  useEffect(() => {
    if (currentSettings) {
      setStoreName(currentSettings.store_name || '');
      setStoreAddress(currentSettings.store_address || '');
      setStorePhone(currentSettings.store_phone || '');
      setReceiptFooter(currentSettings.receipt_footer || '');
      setReceiptLanguage((currentSettings.receipt_language as Language) || 'english');
    }
  }, [currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync({
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_phone: storePhone.trim(),
        receipt_footer: receiptFooter.trim(),
        receipt_language: receiptLanguage,
      });
      addToast('success', 'Receipt layout settings updated successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update receipt settings.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading store configuration...</div>;
  }

  // Create simulated draft bill for preview
  const draftBill = {
    bill_number: 'LK/2526/00142',
    total: 350.0,
    mode: 'full' as const,
    status: 'paid' as const,
    created_at: new Date().toISOString(),
    customer_name: 'Amit Sharma',
    customer_phone: '9876543210',
    created_by_name: 'Cashier Staff',
    bill_items: [
      { product_name: 'Ch आशीर्वाद Atta 5kg', qty: 1, unit_price: 275.0, cost_price: 250.0 },
      { product_name: 'Tata Salt 1kg', qty: 2, unit_price: 28.0, cost_price: 24.0 },
      { product_name: 'Parle-G Gold Biscuits', qty: 1, unit_price: 19.0, cost_price: 16.0 },
    ],
  };

  return (
    <div className={styles.container}>
      <div className={styles.workspace}>
        {/* Left Side: Form Controls */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <h3 className={styles.sectionTitle}>Invoicing Details</h3>
          
          <div className={styles.formGroup}>
            <Input
              label="Store Name *"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              placeholder="e.g. LalaKirana General Store"
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Store Phone Contact"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Shop Address</label>
            <textarea
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className={styles.textarea}
              placeholder="Store address printed at top of receipts..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Receipt Footer Message"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="e.g. Thank you! Visit again"
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Receipt Language"
              value={receiptLanguage}
              onChange={(e) => setReceiptLanguage(e.target.value as Language)}
              options={[
                { value: 'english', label: 'English Only' },
                { value: 'hindi', label: 'Hindi Only (हिंदी केवल)' },
                { value: 'bilingual', label: 'Bilingual (Hindi + English / द्विभाषी)' },
              ]}
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" disabled={updateSettingsMutation.isPending} className={styles.saveBtn}>
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>

        {/* Right Side: Live Receipt Preview */}
        <div className={styles.previewPanel}>
          <h3 className={styles.sectionTitle}>Live Invoice Print Preview</h3>
          <div className={styles.previewContainer}>
            {/* Override store settings from local form state in preview */}
            <ReceiptPreviewOverride
              bill={draftBill}
              overrideSettings={{
                store_name: storeName,
                store_address: storeAddress,
                store_phone: storePhone,
                receipt_footer: receiptFooter,
              }}
              lang={receiptLanguage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper to inject local state into the preview
function ReceiptPreviewOverride({
  bill,
  overrideSettings,
  lang,
}: {
  bill: any;
  overrideSettings: any;
  lang: Language;
}) {
  const storeName = formatStoreName(overrideSettings.store_name || 'LalaKirana', lang);
  const footerMessage = formatFooterMessage(overrideSettings.receipt_footer || 'Thank you! Visit again', lang);

  return (
    <div className={styles.previewWrapper}>
      <div className={styles.receipt}>
        <div className={styles.header}>
          <h2 className={styles.storeName}>{storeName}</h2>
          {overrideSettings.store_address && <p className={styles.storeDetail}>{overrideSettings.store_address}</p>}
          {overrideSettings.store_phone && <p className={styles.storeDetail}>Ph: {overrideSettings.store_phone}</p>}
        </div>

        <div className={styles.divider}>--------------------------------</div>

        <div className={styles.metaGrid}>
          <div className={styles.metaRow}>
            <span>{getLabel('billNo', lang)}:</span>
            <span className={styles.bold}>{bill.bill_number}</span>
          </div>
          <div className={styles.metaRow}>
            <span>{getLabel('date', lang)}:</span>
            <span>{new Date(bill.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div className={styles.metaRow}>
            <span>{getLabel('cashier', lang)}:</span>
            <span>{bill.created_by_name}</span>
          </div>
          <div className={styles.metaRow}>
            <span>{getLabel('mode', lang)}:</span>
            <span className={styles.capitalize}>{formatModeStatus(bill.mode, bill.status, lang)}</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        <div className={styles.customerSection}>
          <div className={styles.metaRow}>
            <span>{getLabel('customer', lang)}:</span>
            <span className={styles.bold}>{bill.customer_name}</span>
          </div>
          <div className={styles.metaRow}>
            <span>{getLabel('phone', lang)}:</span>
            <span>{bill.customer_phone}</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        <div className={styles.itemsHeader}>
          <span className={styles.itemCol}>{getLabel('item', lang)}</span>
          <span className={styles.qtyCol}>{getLabel('qty', lang)}</span>
          <span className={styles.rateCol}>{getLabel('rate', lang)}</span>
          <span className={styles.totalCol}>{getLabel('total', lang)}</span>
        </div>
        <div className={styles.divider}>--------------------------------</div>
        <div className={styles.itemsList}>
          {bill.bill_items.map((item: any, idx: number) => (
            <div key={idx} className={styles.itemRow}>
              <span className={styles.itemColName}>{item.product_name}</span>
              <span className={styles.qtyCol}>{item.qty}</span>
              <span className={styles.rateCol}>₹{item.unit_price.toFixed(2)}</span>
              <span className={styles.totalCol}>₹{(item.qty * item.unit_price).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className={styles.divider}>--------------------------------</div>

        <div className={styles.totalSection}>
          <div className={styles.grandTotalRow}>
            <span>{getLabel('grandTotal', lang)}:</span>
            <span className={styles.grandTotal}>₹{bill.total.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        <div className={styles.footer}>
          <p className={styles.footerText}>{footerMessage}</p>
          <p className={styles.footerSub}>LalaKirana Khandwa, Madhya Pradesh</p>
        </div>
      </div>
    </div>
  );
}

export default ReceiptTab;
