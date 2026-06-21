import { useOnlineStatus } from '../hooks/useOnlineStatus';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className={styles.offlineBanner} role="alert" aria-live="polite">
      <span className={styles.icon}>📡</span>
      You are offline — changes will sync when connection returns
    </div>
  );
}
