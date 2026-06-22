import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { StaffTab } from './StaffTab';
import { SessionsTab } from './SessionsTab';
import { CategoriesTab } from './CategoriesTab';
import { AccountTab } from './AccountTab';
import { ReceiptTab } from './ReceiptTab';
import styles from './SettingsPage.module.css';

type TabId = 'staff' | 'sessions' | 'categories' | 'account' | 'receipt';

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
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  const visibleTabs = tabs.filter((t) => !t.ownerOnly || isOwner);
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0]?.id || 'account');

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
