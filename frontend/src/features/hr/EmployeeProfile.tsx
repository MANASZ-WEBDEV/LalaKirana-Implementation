import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEmployee, useOutstandingAdvances, useAdvances, useDeactivateEmployee } from './hr.queries';
import AttendanceSummaryStrip from './AttendanceSummaryStrip';
import AttendanceCalendar from './AttendanceCalendar';
import SalaryRecordList from './SalaryRecord';
import GiveAdvanceModal from './GiveAdvanceModal';
import GenerateSalaryModal from './GenerateSalaryModal';

// AddEmployeeForm will double as our Edit form in Feature 7
import AddEmployeeForm from './AddEmployeeForm';

import styles from './EmployeeProfile.module.css';

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const employeeId = id as string;

  // Queries
  const { data: employee, isLoading, error } = useEmployee(employeeId);
  const { data: advanceData } = useOutstandingAdvances(employeeId);
  const { data: advances } = useAdvances(employeeId);

  // Mutations
  const deactivateMutation = useDeactivateEmployee();

  const outstanding = advanceData?.outstanding || 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Handle deactivation
  const handleDeactivate = () => {
    if (
      window.confirm(
        `Are you sure you want to deactivate ${employee?.name}? This will mark their date of leaving as today and block system access.`
      )
    ) {
      deactivateMutation.mutate(employeeId, {
        onSuccess: () => {
          navigate('/hr');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ height: '100px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ height: '400px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite', marginTop: '2rem' }} />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className={styles.container}>
        <div className={styles.backRow}>
          <button className={styles.backBtn} onClick={() => navigate('/hr')}>
            ← Back to Directory
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-outline)' }}>
          <h3>Employee Not Found</h3>
          <p>The employee profile you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backRow}>
        <button className={styles.backBtn} onClick={() => navigate('/hr')}>
          ← Back to Directory
        </button>
      </div>

      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.headerInfo}>
          <div className={styles.avatar}>{getInitials(employee.name)}</div>
          <div className={styles.nameSection}>
            <h1 className={styles.name}>
              {employee.name}
              <span className={`${styles.statusBadge} ${employee.is_active ? styles.active : styles.inactive}`}>
                {employee.is_active ? 'Active' : 'Inactive'}
              </span>
            </h1>
            <p className={styles.designation}>{employee.designation || 'Staff Member'}</p>
          </div>
        </div>

        <div className={styles.actionGroup}>
          {employee.is_active && (
            <>
              <button className={`${styles.actionBtn} ${styles.btnSecondary}`} onClick={() => setShowEditModal(true)}>
                Edit Profile
              </button>
              <button className={`${styles.actionBtn} ${styles.btnPrimary}`} onClick={() => setShowSalaryModal(true)}>
                Generate Salary
              </button>
              <button
                className={`${styles.actionBtn} ${styles.btnDanger}`}
                onClick={handleDeactivate}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.layoutGrid}>
        {/* Left Column: Personal and Advances Detail */}
        <div className={styles.sidebarCard}>
          <div>
            <h3 className={styles.cardTitle}>Contact Details</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phone Number</span>
                <span className={styles.infoValue}>{employee.phone || 'Not Configured'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>{employee.address || 'Not Configured'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Joined Store</span>
                <span className={styles.infoValue}>{formatDate(employee.date_of_joining)}</span>
              </div>
              {employee.date_of_leaving && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Left Store</span>
                  <span className={styles.infoValue}>{formatDate(employee.date_of_leaving)}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className={styles.cardTitle}>Emergency Contact</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Contact Name</span>
                <span className={styles.infoValue}>{employee.emergency_contact_name || 'Not Configured'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Contact Phone</span>
                <span className={styles.infoValue}>{employee.emergency_contact_phone || 'Not Configured'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className={styles.cardTitle}>Salary Parameters</h3>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Gross Wage</span>
                <span className={styles.infoValue}>
                  {formatCurrency(employee.salary_amount)}
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 400 }}>
                    /{employee.salary_type === 'monthly' ? 'month' : 'day'}
                  </span>
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Employment Basis</span>
                <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                  {employee.employment_type.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Salary Advances</h3>
              {employee.is_active && (
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  + Add Advance
                </button>
              )}
            </div>

            <div className={styles.advanceSummarySection}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Outstanding Balance</span>
              <span className={`${styles.advanceSummaryValue} ${outstanding > 0 ? styles.advanceSummaryValueActive : ''}`}>
                {formatCurrency(outstanding)}
              </span>
            </div>

            <div className={styles.advanceList} style={{ marginTop: '1rem' }}>
              {advances && advances.length > 0 ? (
                advances.map((adv) => (
                  <div key={adv.id} className={styles.advanceItem}>
                    <div className={styles.advanceInfo}>
                      <span className={styles.advanceDate}>{formatDate(adv.given_on)}</span>
                      <span className={styles.advanceNote}>{adv.note || 'Advance payment'}</span>
                    </div>
                    <span className={`${styles.advanceAmount} ${adv.recovered ? styles.advanceRecovered : styles.advanceOutstanding}`}>
                      {formatCurrency(adv.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-outline)', padding: '1rem' }}>
                  No advance payments recorded.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Calendar, Summary, and Salary History */}
        <div className={styles.mainColumn}>
          <AttendanceSummaryStrip employeeId={employeeId} />

          <AttendanceCalendar employeeId={employeeId} />

          <SalaryRecordList employeeId={employeeId} />
        </div>
      </div>

      {/* Modals & Overlays */}
      {showAdvanceModal && (
        <GiveAdvanceModal employeeId={employeeId} onClose={() => setShowAdvanceModal(false)} />
      )}

      {showSalaryModal && (
        <GenerateSalaryModal employeeId={employeeId} onClose={() => setShowSalaryModal(false)} />
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '100%', overflowY: 'auto', maxHeight: '90vh' }}>
            <AddEmployeeForm employee={employee} onCancel={() => setShowEditModal(false)} onSuccess={() => setShowEditModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
