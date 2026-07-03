import { useState } from 'react';
import { useActivitySummary } from './activity.queries';
import styles from './StaffSummaryTable.module.css';

interface StaffSummaryTableProps {
  onSelectUser?: (userId: string) => void;
}

export function StaffSummaryTable({ onSelectUser }: StaffSummaryTableProps) {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { data: summary, isLoading, isError } = useActivitySummary(date);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return 'Never';
    const d = new Date(timeStr);
    const today = new Date().toDateString();
    
    if (d.toDateString() === today) {
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'master':
        return styles.roleMaster;
      case 'owner':
        return styles.roleOwner;
      default:
        return styles.roleStaff;
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  return (
    <div className={styles.container}>
      {/* Table Header Filter Row */}
      <div className={styles.headerRow}>
        <h3 className={styles.title}>Daily Performance Summary</h3>
        <div className={styles.controls}>
          <label className={styles.dateLabel}>Select Date:</label>
          <input
            type="date"
            className={styles.dateInput}
            value={date}
            onChange={handleDateChange}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Table Data */}
      {isLoading ? (
        <div className={styles.loadingText}>⌛ Loading performance summary...</div>
      ) : isError ? (
        <div className={styles.errorText}>❌ Failed to load performance summary.</div>
      ) : !summary || summary.length === 0 ? (
        <div className={styles.emptyText}>📭 No operational activities recorded on this date.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th className={styles.alignCenter}>Bills Created</th>
                <th className={styles.alignRight}>Revenue Handled</th>
                <th className={styles.alignRight}>Avg Bill Value</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    {onSelectUser ? (
                      <button
                        className={styles.nameLinkBtn}
                        onClick={() => onSelectUser(user.user_id)}
                        title="Click to view full activity profile"
                      >
                        {user.user_name}
                      </button>
                    ) : (
                      <span className={styles.nameLabel}>{user.user_name}</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.roleBadge} ${getRoleBadgeClass(user.user_role)}`}>
                      {user.user_role}
                    </span>
                  </td>
                  <td className={styles.alignCenter}>{user.bills_created}</td>
                  <td className={styles.alignRight + ' ' + styles.moneyCell}>
                    {formatCurrency(user.revenue_handled)}
                  </td>
                  <td className={styles.alignRight + ' ' + styles.moneyCell}>
                    {formatCurrency(user.avg_bill_value)}
                  </td>
                  <td className={styles.timeCell}>{formatTime(user.last_active)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
