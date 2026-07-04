import { useState, useEffect } from 'react';
import {
  useStoreSettings,
  useUpdateStoreSettings,
  useTranslations,
  useCreateTranslation,
  useUpdateTranslation,
  useDeleteTranslation,
} from './settings.queries';
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
  useTranslateProductName,
} from '@/features/billing/receiptTranslations';
import styles from './ReceiptTab.module.css';

export function ReceiptTab() {
  const addToast = useToastStore((s) => s.addToast);
  const { data: currentSettings, isLoading } = useStoreSettings();
  const updateSettingsMutation = useUpdateStoreSettings();

  // Translations queries & mutations
  const { data: dbTranslations, isLoading: isTranslationsLoading } = useTranslations();
  const createTranslationMutation = useCreateTranslation();
  const updateTranslationMutation = useUpdateTranslation();
  const deleteTranslationMutation = useDeleteTranslation();

  // Local Form state
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');
  const [receiptLanguage, setReceiptLanguage] = useState<Language>('english');
  const [staffDiscountLimit, setStaffDiscountLimit] = useState('50');

  // Translation manager state
  const [transSearch, setTransSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'brand' | 'product' | 'qualifier' | 'general'>('all');
  
  // Add new translation state
  const [newEnglish, setNewEnglish] = useState('');
  const [newHindi, setNewHindi] = useState('');
  const [newCategory, setNewCategory] = useState<'brand' | 'product' | 'qualifier' | 'general'>('product');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHindi, setEditHindi] = useState('');
  const [editCategory, setEditCategory] = useState<'brand' | 'product' | 'qualifier' | 'general'>('product');

  // Sync state when data is loaded
  useEffect(() => {
    if (currentSettings) {
      setStoreName(currentSettings.store_name || '');
      setStoreAddress(currentSettings.store_address || '');
      setStorePhone((currentSettings.store_phone || '').replace(/\D/g, '').slice(-10));
      setReceiptFooter(currentSettings.receipt_footer || '');
      setReceiptLanguage((currentSettings.receipt_language as Language) || 'english');
      setStaffDiscountLimit(currentSettings.staff_discount_limit || '50');
    }
  }, [currentSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storePhone.trim() && !/^\d{10}$/.test(storePhone.trim())) {
      addToast('error', 'Store phone number must be exactly 10 digits and contain only numbers.');
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        store_phone: storePhone.trim(),
        receipt_footer: receiptFooter.trim(),
        receipt_language: receiptLanguage,
        staff_discount_limit: staffDiscountLimit.trim(),
      });
      addToast('success', 'Receipt layout settings updated successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update receipt settings.');
    }
  };

  const handleAddTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = newEnglish.trim().toLowerCase();
    const hindi = newHindi.trim();

    if (!token || !hindi) {
      addToast('error', 'Both English word and Hindi translation are required.');
      return;
    }

    // Check if token already exists in db
    const exists = (dbTranslations || []).some((t) => t.token.toLowerCase() === token);
    if (exists) {
      addToast('error', `A translation for word "${token}" already exists. Use the edit action to modify it.`);
      return;
    }

    try {
      await createTranslationMutation.mutateAsync({
        token,
        hindi,
        category: newCategory,
      });
      addToast('success', `Added translation for "${token}" successfully.`);
      setNewEnglish('');
      setNewHindi('');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save translation.');
    }
  };

  const handleStartEdit = (id: string, currentHindi: string, currentCat: 'brand' | 'product' | 'qualifier' | 'general') => {
    setEditingId(id);
    setEditHindi(currentHindi);
    setEditCategory(currentCat);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editHindi.trim()) {
      addToast('error', 'Hindi translation cannot be empty.');
      return;
    }

    try {
      await updateTranslationMutation.mutateAsync({
        id,
        data: {
          hindi: editHindi.trim(),
          category: editCategory,
        },
      });
      addToast('success', 'Translation updated successfully.');
      setEditingId(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to update translation.');
    }
  };

  const handleDeleteTranslation = async (id: string, token: string) => {
    if (!window.confirm(`Are you sure you want to delete the receipt translation for "${token}"?`)) {
      return;
    }

    try {
      await deleteTranslationMutation.mutateAsync(id);
      addToast('success', `Translation for "${token}" removed.`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete translation.');
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
      { product_name: 'Ch Ashirvaad Atta 5kg', qty: 1, unit_price: 275.0, cost_price: 250.0 },
      { product_name: 'Tata Salt 1kg', qty: 2, unit_price: 28.0, cost_price: 24.0 },
      { product_name: 'Parle-G Gold Biscuits', qty: 1, unit_price: 19.0, cost_price: 16.0 },
    ],
  };

  // Filter translations
  const filteredTranslations = (dbTranslations || []).filter((t) => {
    const matchesSearch =
      t.token.toLowerCase().includes(transSearch.toLowerCase()) ||
      t.hindi.toLowerCase().includes(transSearch.toLowerCase());
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
              onChange={(e) => setStorePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              placeholder="e.g. 9876543210"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Shop Address</label>
            <textarea
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className={styles.textarea}
              placeholder="Store address printed at top of receipts..."
              rows={2}
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

          <h3 className={styles.sectionTitle} style={{ marginTop: '2rem' }}>Billing & Discount Rules</h3>
          
          <div className={styles.formGroup}>
            <Input
              label="Staff Discount Limit per Item (₹) *"
              type="number"
              min={0}
              value={staffDiscountLimit}
              onChange={(e) => setStaffDiscountLimit(e.target.value)}
              required
              placeholder="e.g. 50"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              The maximum discount amount (₹) a staff member can apply to any single item on a bill. Owners have unlimited discount capability.
            </p>
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

      {/* Dynamic Receipt Translations dictionary manager */}
      <div className={styles.translationManagerCard}>
        <div className={styles.managerHeader}>
          <div>
            <h3 className={styles.managerTitle}>Receipt Product Translation Dictionary</h3>
            <p className={styles.managerSubtitle}>
              Define custom Hindi translations for product brand names and grocery descriptors. Translations are computed dynamically at receipt printing time.
            </p>
          </div>
          <div className={styles.searchBar}>
            <Input
              value={transSearch}
              onChange={(e) => setTransSearch(e.target.value)}
              placeholder="Search words or Hindi..."
              type="text"
            />
          </div>
        </div>

        {/* Add translation inline form */}
        <form onSubmit={handleAddTranslation} className={styles.addFormInline}>
          <div className={styles.formGroup}>
            <Input
              label="English Word (e.g. kurkure)"
              value={newEnglish}
              onChange={(e) => setNewEnglish(e.target.value)}
              required
              placeholder="Case-insensitive keyword"
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Hindi Translation (e.g. कुरकुरे)"
              value={newHindi}
              onChange={(e) => setNewHindi(e.target.value)}
              required
              placeholder="हिंदी शब्द"
            />
          </div>
          <div className={styles.formGroup}>
            <Select
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              options={[
                { value: 'brand', label: 'Brand (ब्रांड)' },
                { value: 'product', label: 'Product (उत्पाद)' },
                { value: 'qualifier', label: 'Qualifier (विशेषण)' },
                { value: 'general', label: 'General (सामान्य)' },
              ]}
            />
          </div>
          <Button type="submit" disabled={createTranslationMutation.isPending}>
            {createTranslationMutation.isPending ? 'Adding...' : 'Add Mapping'}
          </Button>
        </form>

        {/* Category Filters */}
        <div className={styles.categoryFilters}>
          {(['all', 'brand', 'product', 'qualifier', 'general'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterBtn} ${activeCategory === cat ? styles.filterBtnActive : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Table list */}
        <div className={styles.translationsTableWrapper}>
          {isTranslationsLoading ? (
            <div className={styles.loading}>Loading translation dictionary...</div>
          ) : filteredTranslations.length === 0 ? (
            <div className={styles.loading}>No translation tokens found matching the criteria.</div>
          ) : (
            <table className={styles.translationsTable}>
              <thead>
                <tr>
                  <th>English Word (Key)</th>
                  <th>Hindi Translation</th>
                  <th>Category</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTranslations.map((item) => {
                  const isEditing = editingId === item.id;
                  let badgeClass = styles.badgeGeneral;
                  if (item.category === 'brand') badgeClass = styles.badgeBrand;
                  else if (item.category === 'product') badgeClass = styles.badgeProduct;
                  else if (item.category === 'qualifier') badgeClass = styles.badgeQualifier;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.token}</td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editHindi}
                            onChange={(e) => setEditHindi(e.target.value)}
                            className={styles.editInput}
                            autoFocus
                          />
                        ) : (
                          item.hindi
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as any)}
                            className={styles.editInput}
                          >
                            <option value="brand">Brand</option>
                            <option value="product">Product</option>
                            <option value="qualifier">Qualifier</option>
                            <option value="general">General</option>
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${badgeClass}`}>{item.category}</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.actionCell}>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => handleSaveEdit(item.id)}
                                title="Save changes"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => setEditingId(null)}
                                title="Cancel"
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2.5">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => handleStartEdit(item.id, item.hindi, item.category)}
                                title="Edit translation"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => handleDeleteTranslation(item.id, item.token)}
                                title="Delete translation"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  <line x1="10" y1="11" x2="10" y2="17"></line>
                                  <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper to inject local state and translations into the live settings preview
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
  const translateProductName = useTranslateProductName();

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
          {bill.bill_items.map((item: any, idx: number) => {
            const hindiName = translateProductName(item.product_name, 'hindi');
            const isBilingual = lang === 'bilingual';
            const showStacked = isBilingual && hindiName !== item.product_name;

            return (
              <div key={idx} className={styles.itemRow}>
                <span className={styles.itemColName}>
                  {showStacked ? (
                    <div className={styles.stackedName}>
                      <span className={styles.primaryName}>{hindiName}</span>
                      <span className={styles.secondaryName}>{item.product_name}</span>
                    </div>
                  ) : (
                    lang === 'hindi' ? hindiName : item.product_name
                  )}
                </span>
                <span className={styles.qtyCol}>{item.qty}</span>
                <span className={styles.rateCol}>₹{item.unit_price.toFixed(2)}</span>
                <span className={styles.totalCol}>₹{(item.qty * item.unit_price).toFixed(2)}</span>
              </div>
            );
          })}
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
