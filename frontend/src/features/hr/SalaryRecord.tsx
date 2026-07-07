import { useSalaryHistory, useMarkPaid } from './hr.queries';
import styles from './SalaryRecord.module.css';

interface SalaryRecordProps {
  employeeId: string;
}

export default function SalaryRecordList({ employeeId }: SalaryRecordProps) {
  const { data: salaryHistory, isLoading } = useSalaryHistory(employeeId);
  const markPaidMutation = useMarkPaid();

  // Helper: Get month name
  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Mark record as paid
  const handleMarkPaid = (recordId: string) => {
    if (window.confirm('Mark this salary record as fully paid? This will lock the record from further changes.')) {
      markPaidMutation.mutate({ id: recordId });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Salary Payment History</h3>
      </div>

      {isLoading ? (
        <div style={{ height: '120px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
      ) : salaryHistory && salaryHistory.length > 0 ? (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Days (Pres/Half/Abs)</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Advances</th>
                <th>Net Payable</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ fontWeight: 700 }}>
                    {getMonthName(rec.period_month)} {rec.period_year}
                  </td>
                  <td>
                    {rec.present_days}d / {rec.half_days}d / {rec.absent_days}d
                  </td>
                  <td>{formatCurrency(rec.gross_salary)}</td>
                  <td style={{ color: rec.deductions > 0 ? 'var(--color-error)' : 'inherit' }}>
                    {rec.deductions > 0 ? `-${formatCurrency(rec.deductions)}` : 'Nil'}
                  </td>
                  <td style={{ color: rec.advances_deducted > 0 ? 'var(--color-error)' : 'inherit' }}>
                    {rec.advances_deducted > 0 ? `-${formatCurrency(rec.advances_deducted)}` : 'Nil'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatCurrency(rec.net_salary)}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${rec.paid ? styles.badgePaid : styles.badgeUnpaid}`}>
                      {rec.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td>
                    {rec.paid ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)' }} title={rec.note || undefined}>
                        Paid {rec.paid_at ? formatDate(rec.paid_at) : ''}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleMarkPaid(rec.id)}
                        disabled={markPaidMutation.isPending}
                        className={styles.payBtn}
                      >
                        {markPaidMutation.isPending ? 'Marking...' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.emptyState}>No salary records generated yet for this employee.</div>
      )}
    </div>
  );
}
