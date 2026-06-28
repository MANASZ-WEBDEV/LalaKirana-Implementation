import { useStoreSettings } from '@/features/settings/settings.queries';
import { useProducts } from '@/features/inventory/inventory.queries';
import { calculateSavings } from '@/shared/utils/savings';
import type { Bill } from '@/types/billing.types';
import styles from './ReceiptPreview.module.css';
import type { Language } from '@/features/billing/receiptTranslations';
import {
  getLabel,
  formatStoreName,
  formatFooterMessage,
  formatModeStatus,
  formatThankYouPayment,
} from '@/features/billing/receiptTranslations';

interface ReceiptPreviewProps {
  bill?: Partial<Bill> & {
    customer_name?: string | null;
    customer_phone?: string | null;
    created_by_name?: string | null;
  };
  repayment?: {
    customerName: string;
    customerPhone?: string | null;
    previousBalance: number;
    amountPaid: number;
    remainingBalance: number;
    date?: string;
  };
}

export function ReceiptPreview({ bill, repayment }: ReceiptPreviewProps) {
  const { data: storeSettings, isLoading: isSettingsLoading } = useStoreSettings();
  const { data: productsData, isLoading: isProductsLoading } = useProducts();

  const showRepayment = !!repayment;
  const lang = (storeSettings?.receipt_language || 'english') as Language;
  const storeName = formatStoreName(storeSettings?.store_name || 'LalaKirana', lang);
  const storeAddress = storeSettings?.store_address || '';
  const storePhone = storeSettings?.store_phone || '';
  const footerMessage = formatFooterMessage(storeSettings?.receipt_footer || 'Thank you! Visit again', lang);

  const items = bill?.bill_items || [];
  const products = productsData || [];
  const savings = calculateSavings(items, products);
  const belowMrpLabel = getLabel('belowMRP', lang).replace(/%/g, savings.savingsPercent.toString() + '%');

  const hasKhataData = bill?.status === 'khata' && !!bill?.customers;
  const currentBalance = Number(bill?.customers?.total_balance) || 0;
  const thisPurchase = Number(bill?.total) || 0;
  const previousBalance = Math.max(0, currentBalance - thisPurchase);

  const dateStr = repayment?.date
    ? new Date(repayment.date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : bill?.created_at
    ? new Date(bill.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

  const handlePrint = () => {
    window.print();
  };

  if (isSettingsLoading || (!showRepayment && isProductsLoading)) {
    return <div className={styles.loading}>Loading receipt details...</div>;
  }

  if (showRepayment && repayment) {
    const thankYouRepay = formatThankYouPayment(repayment.customerName, lang);
    return (
      <div className={styles.container}>
        <div className={styles.printActionArea}>
          <button onClick={handlePrint} className={styles.printBtn}>
            🖨️ Print Receipt
          </button>
        </div>

        <div className={styles.receipt} id="receipt-print-area">
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.storeName}>{storeName}</h2>
            {storeAddress && <p className={styles.storeDetail}>{storeAddress}</p>}
            {storePhone && <p className={styles.storeDetail}>Ph: {storePhone}</p>}
          </div>

          <div className={styles.divider}>--------------------------------</div>

          {/* Metadata */}
          <div className={styles.metaGrid}>
            <div className={styles.metaRow}>
              <span>{getLabel('date', lang)}:</span>
              <span>{dateStr}</span>
            </div>
            <div className={styles.metaRow}>
              <span>{getLabel('customer', lang)}:</span>
              <span className={styles.bold}>{repayment.customerName}</span>
            </div>
            {repayment.customerPhone && (
              <div className={styles.metaRow}>
                <span>{getLabel('phone', lang)}:</span>
                <span>{repayment.customerPhone}</span>
              </div>
            )}
          </div>

          <div className={styles.divider}>--------------------------------</div>

          {/* Khata Update Section */}
          <div className={styles.khataSummarySection}>
            <div className={styles.khataSummaryHeader}>
              📒 {getLabel('khataUpdate', lang)}
            </div>
            <div className={styles.khataSummaryRow}>
              <span>{getLabel('prevBalance', lang)}:</span>
              <span>₹{repayment.previousBalance.toFixed(2)}</span>
            </div>
            <div className={styles.khataSummaryRow}>
              <span>{getLabel('paymentReceived', lang)}:</span>
              <span>-₹{repayment.amountPaid.toFixed(2)}</span>
            </div>
            <div className={styles.khataSummaryRow}>
              <span>{getLabel('remainingBalance', lang)}:</span>
              <span className={styles.bold}>₹{repayment.remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className={styles.divider}>--------------------------------</div>

          {/* Footer */}
          <div className={styles.footer}>
            <p className={styles.footerText}>{thankYouRepay}</p>
            <p className={styles.footerSub}>LalaKirana Khandwa, Madhya Pradesh</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.printActionArea}>
        <button onClick={handlePrint} className={styles.printBtn}>
          🖨️ Print Receipt
        </button>
      </div>

      <div className={styles.receipt} id="receipt-print-area">
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.storeName}>{storeName}</h2>
          {storeAddress && <p className={styles.storeDetail}>{storeAddress}</p>}
          {storePhone && <p className={styles.storeDetail}>Ph: {storePhone}</p>}
        </div>

        <div className={styles.divider}>--------------------------------</div>

        {/* Bill Metadata */}
        <div className={styles.metaGrid}>
          <div className={styles.metaRow}>
            <span>{getLabel('billNo', lang)}:</span>
            <span className={styles.bold}>{bill?.bill_number || 'LK/XXXXX/XXXX'}</span>
          </div>
          <div className={styles.metaRow}>
            <span>{getLabel('date', lang)}:</span>
            <span>{dateStr}</span>
          </div>
          {bill?.created_by_name && (
            <div className={styles.metaRow}>
              <span>{getLabel('cashier', lang)}:</span>
              <span>{bill?.created_by_name}</span>
            </div>
          )}
          <div className={styles.metaRow}>
            <span>{getLabel('mode', lang)}:</span>
            <span className={styles.capitalize}>{formatModeStatus(bill?.mode, bill?.status, lang)}</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        {/* Customer info (if available) */}
        {(bill?.customer_name || bill?.customers?.name) && (
          <>
            <div className={styles.customerSection}>
              <div className={styles.metaRow}>
                <span>{getLabel('customer', lang)}:</span>
                <span className={styles.bold}>{bill?.customer_name || bill?.customers?.name}</span>
              </div>
              {(bill?.customer_phone || bill?.customers?.phone) && (
                <div className={styles.metaRow}>
                  <span>{getLabel('phone', lang)}:</span>
                  <span>{bill?.customer_phone || bill?.customers?.phone}</span>
                </div>
              )}
            </div>
            <div className={styles.divider}>--------------------------------</div>
          </>
        )}

        {/* Items Table */}
        {bill?.mode === 'full' && items.length > 0 ? (
          <>
            <div className={styles.itemsHeader}>
              <span className={styles.itemCol}>{getLabel('item', lang)}</span>
              <span className={styles.qtyCol}>{getLabel('qty', lang)}</span>
              <span className={styles.rateCol}>{getLabel('rate', lang)}</span>
              <span className={styles.totalCol}>{getLabel('total', lang)}</span>
            </div>
            <div className={styles.divider}>--------------------------------</div>
            <div className={styles.itemsList}>
              {items.map((item, idx) => {
                const discountVal = Number(item.discount || 0);
                const subtotalVal = item.subtotal ?? ((item.qty || 0) * (Number(item.unit_price) - discountVal));
                return (
                  <div key={idx} className={styles.itemRow}>
                    <span className={styles.itemColName}>
                      {item.product_name}
                      {discountVal > 0 && (
                        <span className={styles.itemDiscountLabel}>
                          (Disc: -₹{discountVal.toFixed(2)})
                        </span>
                      )}
                    </span>
                    <span className={styles.qtyCol}>{item.qty}</span>
                    <span className={styles.rateCol}>₹{Number(item.unit_price).toFixed(2)}</span>
                    <span className={styles.totalCol}>₹{Number(subtotalVal).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.divider}>--------------------------------</div>
          </>
        ) : (
          bill?.mode === 'quick' && (
            <>
              <div className={styles.quickBillRow}>
                <span>{getLabel('quickSale', lang)} {bill?.note ? `(${bill.note})` : ''}</span>
                <span>₹{Number(bill?.total).toFixed(2)}</span>
              </div>
              <div className={styles.divider}>--------------------------------</div>
            </>
          )
        )}

        {/* Total */}
        <div className={styles.totalSection}>
          {Number(bill?.discount_total) > 0 && (
            <div className={styles.discountRow}>
              <span>{getLabel('specialDiscount', lang)}:</span>
              <span>-₹{Number(bill?.discount_total).toFixed(2)}</span>
            </div>
          )}
          <div className={bill?.status === 'khata' ? styles.grandTotalRowNoBorderBottom : styles.grandTotalRow}>
            <span>{getLabel('grandTotal', lang)}:</span>
            <span className={styles.grandTotal}>₹{Number(bill?.total).toFixed(2)}</span>
          </div>
          {bill?.status === 'khata' && (
            <div className={styles.khataAddedRow}>
              <span>  {getLabel('addedToKhata', lang)}:</span>
              <span>₹{Number(bill?.total).toFixed(2)}</span>
            </div>
          )}
        </div>

        {savings.hasSavings && (
          <div className={styles.savingsSection}>
            <span className={styles.savingsLabel}>{getLabel('youSaved', lang)}:</span>
            <span className={styles.savingsValue}>
              ₹{savings.totalSaved.toFixed(2)} ({belowMrpLabel})
            </span>
          </div>
        )}

        {hasKhataData && (
          <>
            <div className={styles.divider}>--------------------------------</div>
            <div className={styles.khataSummarySection}>
              <div className={styles.khataSummaryHeader}>
                📒 {getLabel('khataSummary', lang)}
              </div>
              <div className={styles.khataSummaryRow}>
                <span>{getLabel('prevBalance', lang)}:</span>
                <span>₹{previousBalance.toFixed(2)}</span>
              </div>
              <div className={styles.khataSummaryRow}>
                <span>{getLabel('thisPurchase', lang)}:</span>
                <span>+₹{thisPurchase.toFixed(2)}</span>
              </div>
              <div className={styles.khataSummaryRow}>
                <span>{getLabel('currentBalance', lang)}:</span>
                <span className={styles.bold}>₹{currentBalance.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        <div className={styles.divider}>--------------------------------</div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>{footerMessage}</p>
          <p className={styles.footerSub}>LalaKirana Khandwa, Madhya Pradesh</p>
        </div>
      </div>
    </div>
  );
}
