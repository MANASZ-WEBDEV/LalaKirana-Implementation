import { useSessions, useDeleteSession, useDeleteAllSessions } from './settings.queries';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useToastStore } from '@/shared/store/toastStore';
import { useState } from 'react';
import styles from './SessionsTab.module.css';

export function SessionsTab() {
  const { data: sessions = [], isLoading } = useSessions();
  const deleteSessionMutation = useDeleteSession();
  const deleteAllMutation = useDeleteAllSessions();
  const addToast = useToastStore((s) => s.addToast);
  const [showDeleteAll, setShowDeleteAll] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteSessionMutation.mutateAsync(id);
      addToast('success', 'Session terminated');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to terminate session');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllMutation.mutateAsync();
      addToast('success', 'All other sessions terminated');
      setShowDeleteAll(false);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to terminate sessions');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { hour12: false, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return <div className={styles.loadingText}>Loading sessions...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>Active Sessions</h2>
        {sessions.length > 1 && (
          <Button variant="ghost" onClick={() => setShowDeleteAll(true)}>Log Out All Others</Button>
        )}
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Device</th>
              <th>IP Address</th>
              <th>Last Seen</th>
              <th className={styles.alignRight}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session: any) => (
              <tr key={session.id}>
                <td className={styles.deviceCell}>
                  <span>{session.device_hint || 'Unknown device'}</span>
                  {session.isCurrent && (
                  <Badge variant="info">This device</Badge>
                  )}
                </td>
                <td className={styles.ipCell}>{session.ip_address || '—'}</td>
                <td className={styles.dateCell}>{formatDate(session.last_seen || session.created_at)}</td>
                <td className={styles.actionsCell}>
                  {!session.isCurrent && (
                    <button
                      className={styles.logoutBtn}
                      onClick={() => handleDelete(session.id)}
                      disabled={deleteSessionMutation.isPending}
                    >
                      Log Out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={showDeleteAll}
        title="Log Out All Other Sessions"
        message="This will terminate all sessions except the current one. Any active users will be logged out."
        confirmText="Log Out All"
        onConfirm={handleDeleteAll}
        onClose={() => setShowDeleteAll(false)}
        isDanger={true}
      />
    </div>
  );
}
