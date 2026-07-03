import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { StaffTab } from './StaffTab';
import { SessionsTab } from './SessionsTab';
import { CategoriesTab } from './CategoriesTab';
import { AccountTab } from './AccountTab';
import { ReceiptTab } from './ReceiptTab';
import { StaffSummaryTable } from '../activity/StaffSummaryTable';
import { ActivityFeed } from '../activity/ActivityFeed';
import { StaffProfile } from '../activity/StaffProfile';
import styles from './SettingsPage.module.css';

type TabId = 'staff' | 'sessions' | 'categories' | 'account' | 'receipt' | 'activity';

interface TabDef {
  id: TabId;
  label: string;
  ownerOnly: boolean;
}

const tabs: TabDef[] = [
  { id: 'staff', label: 'Staff & Users', ownerOnly: true },
  { id: 'sessions', label: 'Sessions', ownerOnly: false },
  { id: 'categories', label: 'Categories', ownerOnly: true },
  { id: 'account', label: 'Account', ownerOnly: false },
  { id: 'receipt', label: 'Receipt Settings', ownerOnly: true },
  { id: 'activity', label: 'Staff Activity', ownerOnly: true },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner' || user?.role === 'master';

  const visibleTabs = tabs.filter((t) => !t.ownerOnly || isOwner);
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0]?.id || 'account');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const renderTab = () => {
    switch (activeTab) {
      case 'staff':
        return <StaffTab />;
      case 'sessions':
        return <SessionsTab />;
      case 'categories':
        return <CategoriesTab />;
      case 'account':
        return <AccountTab />;
      case 'receipt':
        return <ReceiptTab />;
      case 'activity':
        if (selectedStaffId) {
          return <StaffProfile userId={selectedStaffId} onBack={() => setSelectedStaffId(null)} />;
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <StaffSummaryTable onSelectUser={(id) => setSelectedStaffId(id)} />
            <div style={{ borderTop: '1px solid var(--color-outline-variant)', paddingTop: '2rem' }}>
              <h3 style={{ marginBottom: '1.25rem', fontSize: '15px', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Activity Log</h3>
              <ActivityFeed />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage staff, sessions, categories, and your account.
        </p>
      </header>

      <nav className={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.tabContent}>
        {renderTab()}
      </div>
    </div>
  );
}
