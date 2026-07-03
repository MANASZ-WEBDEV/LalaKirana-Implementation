import { useState } from 'react';
import { useActivityProfile } from './activity.queries';
import styles from './StaffProfile.module.css';

interface StaffProfileProps {
  userId: string;
  onBack?: () => void;
}

export function StaffProfile({ userId, onBack }: StaffProfileProps) {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const { data: profile, isLoading, isError } = useActivityProfile(userId, month, year);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMonth(Number(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(Number(e.target.value));
  };

  return (
    <div className={styles.container}>
      {/* Header card with back button */}
      <div className={styles.headerCard}>
        <div className={styles.headerLeft}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>
              ⬅ Back
            </button>
          )}
          {profile && (
            <div>
              <div className={styles.userTitleRow}>
                <h2 className={styles.userName}>{profile.user.name}</h2>
                <span className={`${styles.roleBadge} ${getRoleBadgeClass(profile.user.role)}`}>
                  {profile.user.role}
                </span>
                <span className={`${styles.statusBadge} ${profile.user.is_active ? styles.statusActive : styles.statusInactive}`}>
                  {profile.user.is_active ? 'Active' : 'Deactivated'}
                </span>
              </div>
              <p className={styles.userEmail}>{profile.user.email}</p>
            </div>
          )}
        </div>

        {/* Date Selector */}
        <div className={styles.periodSelectors}>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Month</label>
            <select className={styles.selectInput} value={month} onChange={handleMonthChange}>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Year</label>
            <select className={styles.selectInput} value={year} onChange={handleYearChange}>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = now.getFullYear() - i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.centerState}>⌛ Loading staff profile details...</div>
      ) : isError ? (
        <div className={styles.centerStateError}>❌ Failed to load staff activity profile.</div>
      ) : !profile ? (
        <div className={styles.centerState}>📭 Staff member not found.</div>
      ) : (
        <div className={styles.profileGrid}>
          {/* Main Column: Stats & Recent activity */}
          <div className={styles.mainColumn}>
            {/* Stats Cards */}
            <div className={styles.statsSection}>
              <h3 className={styles.sectionTitle}>Monthly Stats Breakdown</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Bills Created</span>
                  <span className={styles.statVal}>{profile.stats.bills_handled}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Revenue Processed</span>
                  <span className={styles.statVal + ' ' + styles.moneyColor}>
                    {formatCurrency(profile.stats.revenue_processed)}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Purchases Logged</span>
                  <span className={styles.statVal}>{profile.stats.purchases_entered}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Stock Adjustments</span>
                  <span className={styles.statVal}>{profile.stats.stock_adjustments}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Khata Payments</span>
                  <span className={styles.statVal}>{profile.stats.khata_repayments}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Price Changes</span>
                  <span className={styles.statVal}>{profile.stats.price_changes}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity List */}
            <div className={styles.activitySection}>
              <h3 className={styles.sectionTitle}>Recent Activity (Last 20)</h3>
              {profile.recent_activity.length === 0 ? (
                <div className={styles.emptyText}>No recent activities logged for this user.</div>
              ) : (
                <div className={styles.activityList}>
                  {profile.recent_activity.map((act) => (
                    <div key={act.id} className={styles.activityItem}>
                      <div className={styles.activityHeader}>
                        <span className={styles.actionType}>
                          {act.action_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className={styles.activityTime}>{formatDateTime(act.created_at)}</span>
                      </div>
                      <div className={styles.activityBody}>
                        {act.reference_label && (
                          <span className={styles.refLabel}>{act.reference_label}</span>
                        )}
                        {act.amount !== null && (
                          <span className={styles.refAmount}>
                            {formatCurrency(Number(act.amount))}
                          </span>
                        )}
                        {act.note && <p className={styles.actNote}>{act.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Login History */}
          <div className={styles.sidebarColumn}>
            <div className={styles.loginCard}>
              <h3 className={styles.sectionTitle}>Login History</h3>
              {profile.login_history.length === 0 ? (
                <div className={styles.emptyText}>No login history records found.</div>
              ) : (
                <div className={styles.loginList}>
                  {profile.login_history.map((log, index) => (
                    <div key={index} className={styles.loginItem}>
                      <div className={styles.loginTime}>{formatDateTime(log.created_at)}</div>
                      <div className={styles.loginIp}>
                        IP: <code>{log.ip_address || 'unknown'}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
