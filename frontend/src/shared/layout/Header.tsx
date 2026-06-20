import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import styles from './Header.module.css';

export function Header() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/inventory')) return 'Inventory Catalog';
    if (path.startsWith('/pricing')) return 'Bulk Price Editor';
    if (path.startsWith('/eod')) return 'Daily Sales Entry';
    if (path.startsWith('/settings')) return 'Settings';
    return 'LalaKirana';
  };

  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button className={styles.menuBtn} aria-label="Toggle Navigation Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 className={styles.title}>{getPageTitle()}</h1>
      </div>
      
      <div className={styles.actions}>
        {user && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              {user.name}
            </span>
            <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--color-on-surface-variant)' }}>
              {user.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
