import { useState } from 'react';
import { useMonthlyStatement } from './khata.queries';
import { Select } from '@/shared/ui/Select';
import { useStoreSettings } from '@/features/settings/settings.queries';
import styles from './KhataStatement.module.css';

interface KhataStatementProps {
  customerId: string;
}

export function KhataStatement({ customerId }: KhataStatementProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed

  // State
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);

  // Queries
  const { data: statement, isLoading } = useMonthlyStatement(customerId, {
    month,
    year,
  });

  const { data: storeSettings } = useStoreSettings();

  const handlePrint = () => {
    window.print();
  };

  const monthsOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Year options: last 5 years
  const yearOptions = Array.from({ length: 5 }, (_, idx) => {
    const y = currentYear - idx;
    return { value: y.toString(), label: y.toString() };
  });

  if (isLoading) {
    return <div className={styles.loading}>Generating account statement...</div>;
  }

  if (!statement) {
    return <div className={styles.error}>No statement data found.</div>;
  }

  const { customer, opening_balance, closing_balance, entries, total_purchases, total_payments } =
    statement;

  const storeName = storeSettings?.store_name || 'LalaKirana';
  const storePhone = storeSettings?.store_phone || '';

  return (
    <div className={styles.container}>
      {/* Controls: Month/Year pickers (hidden on print) */}
      <div className={styles.controls}>
        <div className={styles.pickers}>
          <Select
            label="Month"
            value={month.toString()}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            options={monthsOptions}
          />
          <Select
            label="Year"
            value={year.toString()}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            options={yearOptions}
          />
        </div>
        <button onClick={handlePrint} className={styles.printBtn}>
          🖨️ Print Statement
        </button>
      </div>

      {/* Printable Sheet */}
      <div className={styles.sheet} id="statement-print-area">
        {/* Header info */}
        <div className={styles.sheetHeader}>
          <div>
            <h1 className={styles.storeName}>{storeName}</h1>
            <p className={styles.storeSub}>Monthly Credit Statement</p>
          </div>
          <div className={styles.sheetMeta}>
            <p>
              <strong>Period:</strong> {monthsOptions.find((m) => m.value === month.toString())?.label}{' '}
              {year}
            </p>
            {storePhone && <p><strong>Ph:</strong> {storePhone}</p>}
          </div>
        </div>

        <div className={styles.divider} />

        {/* Customer account info */}
        <div className={styles.accountInfo}>
          <div>
            <strong>Customer:</strong> {customer.name}
          </div>
          {customer.phone && <div><strong>Phone:</strong> {customer.phone}</div>}
          {customer.address && <div><strong>Address:</strong> {customer.address}</div>}
        </div>

        <div className={styles.divider} />

        {/* Summary grid */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryBox}>
            <div className={styles.boxLabel}>Opening Balance</div>
            <div className={styles.boxVal}>₹{opening_balance.toFixed(2)}</div>
          </div>
          <div className={styles.summaryBox}>
            <div className={styles.boxLabel}>Total Purchases</div>
            <div className={styles.boxVal}>+ ₹{total_purchases.toFixed(2)}</div>
          </div>
          <div className={styles.summaryBox}>
            <div className={styles.boxLabel}>Total Payments</div>
            <div className={styles.boxVal}>- ₹{total_payments.toFixed(2)}</div>
          </div>
          <div className={`${styles.summaryBox} ${styles.closingBox}`}>
            <div className={styles.boxLabel}>Closing Balance Due</div>
            <div className={styles.boxVal}>₹{closing_balance.toFixed(2)}</div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Transaction Table list */}
        <h3 className={styles.tableTitle}>Ledger Entries</h3>
        <table className={styles.ledgerTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Bill #</th>
              <th className={styles.rightAlign}>Purchase (+)</th>
              <th className={styles.rightAlign}>Payment (-)</th>
              <th className={styles.rightAlign}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr className={styles.openingRow}>
              <td>{new Date(year, month - 1, 1).toLocaleDateString('en-IN')}</td>
              <td>Opening Balance Forward</td>
              <td>-</td>
              <td className={styles.rightAlign}>-</td>
              <td className={styles.rightAlign}>-</td>
              <td className={styles.rightAlign}>₹{opening_balance.toFixed(2)}</td>
            </tr>

            {/* Transactions */}
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyRow}>
                  No ledger activity during this period.
                </td>
              </tr>
            ) : (
              (() => {
                let currentBal = opening_balance;
                return entries.map((entry) => {
                  if (entry.type === 'purchase') {
                    currentBal += entry.amount;
                  } else {
                    currentBal -= entry.amount;
                  }
                  return (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleDateString('en-IN')}</td>
                      <td>{entry.type === 'purchase' ? 'Catalog Purchase' : entry.note || 'Repayment'}</td>
                      <td>{entry.bill_number || '-'}</td>
                      <td className={`${styles.rightAlign} ${styles.purchaseText}`}>
                        {entry.type === 'purchase' ? `₹${entry.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className={`${styles.rightAlign} ${styles.repayText}`}>
                        {entry.type === 'payment' ? `₹${entry.amount.toFixed(2)}` : '-'}
                      </td>
                      <td className={`${styles.rightAlign} ${styles.bold}`}>
                        ₹{currentBal.toFixed(2)}
                      </td>
                    </tr>
                  );
                });
              })()
            )}

            {/* Closing Balance Row */}
            <tr className={styles.closingRow}>
              <td>{new Date(year, month, 0).toLocaleDateString('en-IN')}</td>
              <td>Closing Balance Due</td>
              <td>-</td>
              <td className={styles.rightAlign}>-</td>
              <td className={styles.rightAlign}>-</td>
              <td className={styles.rightAlign}>₹{closing_balance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Print signature footer */}
        <div className={styles.sheetFooter}>
          <div className={styles.signatureBox}>
            <div className={styles.sigLine} />
            <span>Store Representative</span>
          </div>
          <div className={styles.signatureBox}>
            <div className={styles.sigLine} />
            <span>Customer Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}
