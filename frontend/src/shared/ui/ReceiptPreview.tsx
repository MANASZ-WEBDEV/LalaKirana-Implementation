import { useStoreSettings } from '@/features/settings/settings.queries';
import type { Bill } from '@/types/billing.types';
import styles from './ReceiptPreview.module.css';

interface ReceiptPreviewProps {
  bill: Partial<Bill> & {
    customer_name?: string | null;
    customer_phone?: string | null;
    created_by_name?: string | null;
  };
}

export function ReceiptPreview({ bill }: ReceiptPreviewProps) {
  const { data: storeSettings, isLoading } = useStoreSettings();

  const storeName = storeSettings?.store_name || 'LalaKirana';
  const storeAddress = storeSettings?.store_address || '';
  const storePhone = storeSettings?.store_phone || '';
  const footerMessage = storeSettings?.receipt_footer || 'Thank you! Visit again';

  const items = bill.bill_items || [];
  const dateStr = bill.created_at
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

  if (isLoading) {
    return <div className={styles.loading}>Loading receipt details...</div>;
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
            <span>Bill No:</span>
            <span className={styles.bold}>{bill.bill_number || 'LK/XXXXX/XXXX'}</span>
          </div>
          <div className={styles.metaRow}>
            <span>Date:</span>
            <span>{dateStr}</span>
          </div>
          {bill.created_by_name && (
            <div className={styles.metaRow}>
              <span>Cashier:</span>
              <span>{bill.created_by_name}</span>
            </div>
          )}
          <div className={styles.metaRow}>
            <span>Mode:</span>
            <span className={styles.capitalize}>{bill.mode} ({bill.status})</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        {/* Customer info (if available) */}
        {(bill.customer_name || bill.customers?.name) && (
          <>
            <div className={styles.customerSection}>
              <div className={styles.metaRow}>
                <span>Customer:</span>
                <span className={styles.bold}>{bill.customer_name || bill.customers?.name}</span>
              </div>
              {(bill.customer_phone || bill.customers?.phone) && (
                <div className={styles.metaRow}>
                  <span>Phone:</span>
                  <span>{bill.customer_phone || bill.customers?.phone}</span>
                </div>
              )}
            </div>
            <div className={styles.divider}>--------------------------------</div>
          </>
        )}

        {/* Items Table */}
        {bill.mode === 'full' && items.length > 0 ? (
          <>
            <div className={styles.itemsHeader}>
              <span className={styles.itemCol}>Item</span>
              <span className={styles.qtyCol}>Qty</span>
              <span className={styles.rateCol}>Rate</span>
              <span className={styles.totalCol}>Total</span>
            </div>
            <div className={styles.divider}>--------------------------------</div>
            <div className={styles.itemsList}>
              {items.map((item, idx) => (
                <div key={idx} className={styles.itemRow}>
                  <span className={styles.itemColName}>{item.product_name}</span>
                  <span className={styles.qtyCol}>{item.qty}</span>
                  <span className={styles.rateCol}>₹{Number(item.unit_price).toFixed(2)}</span>
                  <span className={styles.totalCol}>₹{((item.qty || 0) * (item.unit_price || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className={styles.divider}>--------------------------------</div>
          </>
        ) : (
          bill.mode === 'quick' && (
            <>
              <div className={styles.quickBillRow}>
                <span>Quick Sale {bill.note ? `(${bill.note})` : ''}</span>
                <span>₹{Number(bill.total).toFixed(2)}</span>
              </div>
              <div className={styles.divider}>--------------------------------</div>
            </>
          )
        )}

        {/* Total */}
        <div className={styles.totalSection}>
          <div className={styles.grandTotalRow}>
            <span>GRAND TOTAL:</span>
            <span className={styles.grandTotal}>₹{Number(bill.total).toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.divider}>--------------------------------</div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>{footerMessage}</p>
          <p className={styles.footerSub}>LalaKirana shop tracker</p>
        </div>
      </div>
    </div>
  );
}
