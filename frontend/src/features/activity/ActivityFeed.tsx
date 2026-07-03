import { useState } from 'react';
import { useActivityFeed } from './activity.queries';
import { useUsers } from '../settings/settings.queries';
import type { ActivityType } from './activity.api';
import styles from './ActivityFeed.module.css';

// Action type labels and helper metadata
const actionMetadata: Record<ActivityType, { label: string; icon: string; badgeClass: string }> = {
  bill_confirmed: { label: 'Bill Confirmed', icon: '📝', badgeClass: styles.badgeBillConfirm },
  bill_cancelled: { label: 'Bill Cancelled', icon: '❌', badgeClass: styles.badgeBillCancel },
  stock_adjusted: { label: 'Stock Adjusted', icon: '📦', badgeClass: styles.badgeStock },
  purchase_created: { label: 'Stock-In (PO)', icon: '📥', badgeClass: styles.badgePurchase },
  expense_logged: { label: 'Expense Logged', icon: '💸', badgeClass: styles.badgeExpense },
  price_changed: { label: 'Price Changed', icon: '🏷️', badgeClass: styles.badgePrice },
  product_created: { label: 'Product Created', icon: '🆕', badgeClass: styles.badgeProduct },
  product_edited: { label: 'Product Edited', icon: '✏️', badgeClass: styles.badgeProductEdit },
  khata_repayment: { label: 'Khata Repayment', icon: '💳', badgeClass: styles.badgeKhata },
  customer_created: { label: 'Customer Added', icon: '👤', badgeClass: styles.badgeCustomer },
  login: { label: 'Logged In', icon: '🔑', badgeClass: styles.badgeLogin },
  logout: { label: 'Logged Out', icon: '🚪', badgeClass: styles.badgeLogout },
  password_changed: { label: 'Password Updated', icon: '🔒', badgeClass: styles.badgePassword },
};

interface ActivityFeedProps {
  fixedUserId?: string; // Optional: restrict to a single user (e.g. inside staff profile)
  hideUserFilter?: boolean;
}

export function ActivityFeed({ fixedUserId, hideUserFilter = false }: ActivityFeedProps) {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState<string>('');
  const [userId, setUserId] = useState<string>(fixedUserId || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch users for the filter dropdown
  const { data: users } = useUsers();

  // Fetch paginated activity feed
  const { data: feedData, isLoading, isError } = useActivityFeed({
    page,
    limit,
    search: search || undefined,
    action_type: actionType || undefined,
    user_id: userId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
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

  const handleResetFilters = () => {
    setSearch('');
    setActionType('');
    if (!fixedUserId) setUserId('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className={styles.container}>
      {/* Filters Section */}
      <div className={styles.filtersCard}>
        <div className={styles.searchRow}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, bill number, notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button className={styles.resetBtn} onClick={handleResetFilters}>
            🔄 Reset
          </button>
        </div>

        <div className={styles.filterGrid}>
          {/* Action Type Filter */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Action Type</label>
            <select
              className={styles.selectInput}
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Actions</option>
              {Object.entries(actionMetadata).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.icon} {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          {!hideUserFilter && !fixedUserId && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>User</label>
              <select
                className={styles.selectInput}
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Users</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date From */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>From Date</label>
            <input
              type="date"
              className={styles.dateInput}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Date To */}
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>To Date</label>
            <input
              type="date"
              className={styles.dateInput}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Feed List */}
      {isLoading ? (
        <div className={styles.centerState}>⌛ Loading activity feed...</div>
      ) : isError ? (
        <div className={styles.centerStateError}>❌ Failed to load activity feed.</div>
      ) : !feedData || feedData.entries.length === 0 ? (
        <div className={styles.centerState}>📭 No matching activity records found.</div>
      ) : (
        <div className={styles.listContainer}>
          <div className={styles.feedList}>
            {feedData.entries.map((entry) => {
              const meta = actionMetadata[entry.action_type] || {
                label: entry.action_type,
                icon: '⚡',
                badgeClass: '',
              };

              return (
                <div key={entry.id} className={styles.feedCard}>
                  {/* Icon & Details */}
                  <div className={styles.feedLeft}>
                    <div className={`${styles.iconBadge} ${meta.badgeClass}`}>
                      {meta.icon}
                    </div>
                    <div className={styles.detailsBlock}>
                      <div className={styles.titleRow}>
                        <span className={styles.userName}>{entry.user_name}</span>
                        <span className={`${styles.roleBadge} ${getRoleBadgeClass(entry.user_role)}`}>
                          {entry.user_role}
                        </span>
                        <span className={styles.actionLabel}>
                          {meta.label.toLowerCase()}
                        </span>
                        {entry.reference_label && (
                          <span className={styles.referenceLabel}>
                            {entry.reference_label}
                          </span>
                        )}
                      </div>

                      {entry.note && <p className={styles.noteText}>{entry.note}</p>}

                      <div className={styles.metaRow}>
                        <span className={styles.timeText}>{formatDateTime(entry.created_at)}</span>
                        {entry.ip_address && (
                          <span className={styles.ipText}>IP: {entry.ip_address}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial amount on the right */}
                  {entry.amount !== null && (
                    <div className={styles.amountBlock}>
                      <span className={styles.amountVal}>
                        {formatCurrency(Number(entry.amount))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {feedData.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ◀ Previous
              </button>
              <span className={styles.pageIndicator}>
                Page <strong>{page}</strong> of <strong>{feedData.totalPages}</strong> ({feedData.total} logs)
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= feedData.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next ▶
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
