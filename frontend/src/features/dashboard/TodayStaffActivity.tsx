import { useActivitySummary } from '../activity/activity.queries';
import styles from './TodayStaffActivity.module.css';

export function TodayStaffActivity() {
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: summary, isLoading, isError } = useActivitySummary(todayStr);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>👥 Today's Staff Activity</h3>
      </div>

      {isLoading ? (
        <div className={styles.loading}>Loading staff activity...</div>
      ) : isError ? (
        <div className={styles.error}>Failed to load staff activity.</div>
      ) : !summary || summary.length === 0 ? (
        <div className={styles.empty}>No active staff logged in today.</div>
      ) : (
        <div className={styles.list}>
          {summary.map((user) => (
            <div key={user.user_id} className={styles.item}>
              <div className={styles.userDetails}>
                <span className={styles.userName}>{user.user_name}</span>
                <span className={styles.userRole}>{user.user_role}</span>
              </div>
              <div className={styles.stats}>
                <span className={styles.statItem}>
                  <strong>{user.bills_created}</strong> bills
                </span>
                <span className={styles.divider}>|</span>
                <span className={styles.statItem}>
                  <strong>{formatCurrency(user.revenue_handled)}</strong> handled
                </span>
                <span className={styles.divider}>|</span>
                <span className={styles.time}>
                  Last active: <strong>{formatTime(user.last_active)}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
