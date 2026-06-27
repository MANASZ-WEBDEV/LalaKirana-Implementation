import { Drawer } from '@/shared/ui/Drawer';
import { useProfitBreakdown } from './analytics.queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import styles from './ProfitBreakdownDrawer.module.css';

interface ProfitBreakdownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  from: string;
  to: string;
  onRedirectToInventory: () => void;
}

export function ProfitBreakdownDrawer({
  isOpen,
  onClose,
  from,
  to,
  onRedirectToInventory,
}: ProfitBreakdownDrawerProps) {
  const { data: breakdown, isLoading, error } = useProfitBreakdown(from, to);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const displayDateText = () => {
    if (from === to) {
      return formatDate(from);
    }
    return `${formatDate(from)} to ${formatDate(to)}`;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Profit Breakdown — ${displayDateText()}`}
    >
      {isLoading ? (
        <div className={styles.loader}>
          <Skeleton height={40} />
          <Skeleton height={80} />
          <Skeleton height={150} />
          <Skeleton height={100} />
        </div>
      ) : error ? (
        <div className={styles.errorText}>
          Failed to load profit breakdown. Please try again.
        </div>
      ) : breakdown ? (
        <div className={styles.container}>
          {/* REVENUE SECTION */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>REVENUE</h4>
            <div className={styles.row}>
              <span>Full POS Bills</span>
              <span className={styles.amount}>+{formatCurrency(breakdown.revenue.fullBills)}</span>
            </div>
            <div className={styles.row}>
              <span>Quick Bills</span>
              <span className={styles.amount}>+{formatCurrency(breakdown.revenue.quickBills)}</span>
            </div>
            <div className={styles.row}>
              <span>EOD Diary Sales</span>
              <span className={styles.amount}>+{formatCurrency(breakdown.revenue.eod)}</span>
            </div>
            <div className={`${styles.row} ${styles.totalRow}`}>
              <strong>Total Revenue</strong>
              <strong className={styles.amount}>+{formatCurrency(breakdown.revenue.total)}</strong>
            </div>
          </div>

          <div className={styles.divider} />

          {/* COGS SECTION */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>COST OF GOODS SOLD (COGS)</h4>
            {breakdown.cogs.items.length > 0 ? (
              <div className={styles.cogsTable}>
                {breakdown.cogs.items.map((item, idx) => (
                  <div key={idx} className={styles.cogsRow}>
                    <div className={styles.cogsDetails}>
                      <span className={styles.productName}>{item.product_name}</span>
                      <span className={styles.productMath}>
                        {item.qty} units @ {formatCurrency(item.cost_price)} cost (sold @ {formatCurrency(item.price)})
                      </span>
                    </div>
                    <span className={styles.cogsAmount}>-{formatCurrency(item.total_cost)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyText}>No product sales registered in this range.</div>
            )}
            <div className={`${styles.row} ${styles.totalRow}`}>
              <strong>Total COGS</strong>
              <strong className={styles.cogsTotal}>-{formatCurrency(breakdown.cogs.total)}</strong>
            </div>
          </div>

          <div className={styles.divider} />

          {/* GROSS PROFIT SUMMARY */}
          <div className={styles.section}>
            <div className={`${styles.row} ${styles.profitSummaryRow}`}>
              <strong>GROSS PROFIT</strong>
              <strong className={styles.positiveAmount}>+{formatCurrency(breakdown.grossProfit)}</strong>
            </div>
            <div className={styles.subtitleRow}>
              <span>Gross Margin</span>
              <span>
                {breakdown.revenue.total > 0
                  ? `${Math.round((breakdown.grossProfit / breakdown.revenue.total) * 1000) / 10}%`
                  : '0%'}
              </span>
            </div>
          </div>

          <div className={styles.divider} />

          {/* OPERATIONAL EXPENSES SECTION */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>OPERATIONAL EXPENSES</h4>
            {breakdown.expenses.list.length > 0 ? (
              <div className={styles.expensesList}>
                {breakdown.expenses.list.map((exp) => (
                  <div key={exp.id} className={styles.expenseRow}>
                    <div className={styles.expenseInfo}>
                      <span className={styles.expenseCategory}>{exp.category}</span>
                      <span className={styles.expenseDate}>
                        {formatDate(exp.expense_date)}
                        {exp.description ? ` — ${exp.description}` : ''}
                      </span>
                    </div>
                    <span className={styles.expenseAmount}>-{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyText}>No shop expenses logged in this range.</div>
            )}
            <div className={`${styles.row} ${styles.totalRow}`}>
              <strong>Total Expenses</strong>
              <strong className={styles.expenseTotal}>-{formatCurrency(breakdown.expenses.total)}</strong>
            </div>
          </div>

          <div className={styles.divider} />

          {/* NET PROFIT SUMMARY */}
          <div className={styles.section}>
            <div className={`${styles.row} ${styles.profitSummaryRow}`}>
              <strong>NET PROFIT</strong>
              <strong className={breakdown.netProfit >= 0 ? styles.positiveAmount : styles.negativeAmount}>
                {breakdown.netProfit >= 0 ? '+' : ''}
                {formatCurrency(breakdown.netProfit)}
              </strong>
            </div>
            <div className={styles.subtitleRow}>
              <span>Net Margin</span>
              <span className={breakdown.netProfit >= 0 ? styles.positiveText : styles.negativeText}>
                {breakdown.revenue.total > 0
                  ? `${Math.round((breakdown.netProfit / breakdown.revenue.total) * 1000) / 10}%`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* FOOTER WARNINGS */}
          {breakdown.noCostProductsCount > 0 && (
            <div className={styles.warningFooter}>
              <div className={styles.warningContent}>
                <span>⚠️ <strong>{breakdown.noCostProductsCount} products</strong> have no cost price set. Profit figures may be understated.</span>
                <button
                  onClick={() => {
                    onClose();
                    onRedirectToInventory();
                  }}
                  className={styles.fixButton}
                >
                  Set cost prices in Inventory &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
