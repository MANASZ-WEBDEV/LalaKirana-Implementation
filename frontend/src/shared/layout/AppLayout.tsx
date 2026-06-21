import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className={styles.mainContainer}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className={styles.content}>
          <div key={location.pathname} className={styles.pageTransition}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

