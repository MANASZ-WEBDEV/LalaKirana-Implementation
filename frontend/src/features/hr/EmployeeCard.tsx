import { Link } from 'react-router-dom';
import type { Employee } from '@/types/hr.types';
import { useOutstandingAdvances } from './hr.queries';
import styles from './EmployeeCard.module.css';

interface EmployeeCardProps {
  employee: Employee;
  onMarkTodayClick?: (empId: string) => void;
}

export default function EmployeeCard({ employee, onMarkTodayClick }: EmployeeCardProps) {
  const { data: advanceData } = useOutstandingAdvances(employee.id);
  const outstanding = advanceData?.outstanding || 0;

  // Get initials for avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

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

  return (
    <div className={styles.card}>
      <span className={`${styles.statusBadge} ${employee.is_active ? styles.active : styles.inactive}`}>
        {employee.is_active ? 'Active' : 'Inactive'}
      </span>

      <div className={styles.header}>
        <div className={styles.avatar}>{getInitials(employee.name)}</div>
        <div className={styles.info}>
          <h3 className={styles.name}>{employee.name}</h3>
          <p className={styles.designation}>{employee.designation || 'Staff Member'}</p>
        </div>
      </div>

      <div className={styles.detailsGrid}>
        <div>
          <p className={styles.detailLabel}>Joined Date</p>
          <p className={styles.detailValue}>{formatDate(employee.date_of_joining)}</p>
        </div>
        <div>
          <p className={styles.detailLabel}>Salary Config</p>
          <p className={styles.detailValue}>
            {formatCurrency(employee.salary_amount)}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-outline)' }}>
              /{employee.salary_type === 'monthly' ? 'mo' : 'day'}
            </span>
          </p>
        </div>
        <div>
          <p className={styles.detailLabel}>Employment</p>
          <p className={styles.detailValue} style={{ textTransform: 'capitalize' }}>
            {employee.employment_type.replace('_', ' ')}
          </p>
        </div>
        <div>
          <p className={styles.detailLabel}>Advances</p>
          <p className={`${styles.detailValue} ${outstanding > 0 ? styles.outstandingAdvance : ''}`}>
            {outstanding > 0 ? formatCurrency(outstanding) : 'Nil'}
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <Link to={`/hr/employee/${employee.id}`} className={`${styles.btn} styles.btnSecondary ${styles.btnSecondary}`}>
          View Profile
        </Link>
        {employee.is_active && onMarkTodayClick && (
          <button
            onClick={() => onMarkTodayClick(employee.id)}
            className={`${styles.btn} ${styles.btnPrimary}`}
          >
            Mark Today
          </button>
        )}
      </div>
    </div>
  );
}
