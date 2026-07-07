import { useState } from 'react';
import { useEmployees } from './hr.queries';
import EmployeeCard from './EmployeeCard';
import styles from './HRPage.module.css';

// Imports for sub-components (stubs built to prevent build compilation errors)
import AttendanceToday from './AttendanceToday';
import AddEmployeeForm from './AddEmployeeForm';

type HRTab = 'list' | 'attendance' | 'add';

export default function HRPage() {
  const [activeTab, setActiveTab] = useState<HRTab>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const { data: employees, isLoading, error } = useEmployees();

  // Handle Mark Today callback from card - switches to attendance tab
  const handleMarkToday = () => {
    setActiveTab('attendance');
  };

  // Filter employees based on search and status select
  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
      (emp.designation && emp.designation.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && emp.is_active) ||
      (statusFilter === 'inactive' && !emp.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Staff & HR</h1>
          <p className={styles.subtitle}>Manage store employees, track daily attendance, advances, and salaries.</p>
        </div>
        {activeTab === 'list' && (
          <button className={styles.addBtn} onClick={() => setActiveTab('add')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Employee
          </button>
        )}
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'list' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Employee Directory
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          Daily Attendance
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'add' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('add')}
        >
          Add Employee
        </button>
      </div>

      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={styles.controlsRow}>
            <div className={styles.searchFilterGroup}>
              <input
                type="text"
                placeholder="Search by name or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className={styles.selectInput}
              >
                <option value="active">Active Staff</option>
                <option value="inactive">Inactive / Past Staff</option>
                <option value="all">All Employees</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              <div style={{ height: '200px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '200px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
            </div>
          ) : error ? (
            <div className={styles.emptyState}>Failed to load employees. Please check database permissions.</div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className={styles.cardGrid}>
              {filteredEmployees.map((emp) => (
                <EmployeeCard key={emp.id} employee={emp} onMarkTodayClick={handleMarkToday} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No employees found matching the filters.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <AttendanceToday />
      )}

      {activeTab === 'add' && (
        <AddEmployeeForm onCancel={() => setActiveTab('list')} onSuccess={() => setActiveTab('list')} />
      )}
    </div>
  );
}
