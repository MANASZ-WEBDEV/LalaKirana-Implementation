import { useState, useEffect } from 'react';
import { useEmployee, useOutstandingAdvances, useAttendanceSummary, useCreateSalary } from './hr.queries';
import styles from './GenerateSalaryModal.module.css';

interface GenerateSalaryModalProps {
  employeeId: string;
  onClose: () => void;
}

export default function GenerateSalaryModal({ employeeId, onClose }: GenerateSalaryModalProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12

  // Inputs
  const [grossInput, setGrossInput] = useState('');
  const [deductions, setDeductions] = useState('0');
  const [advancesDeducted, setAdvancesDeducted] = useState('0');
  const [note, setNote] = useState('');

  // Queries & Mutations
  const { data: employee } = useEmployee(employeeId);
  const { data: outstandingData } = useOutstandingAdvances(employeeId);
  const createSalaryMutation = useCreateSalary();

  // Calculate first and last day of month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDaysInMonth = lastDay.getDate();

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const startDateStr = formatDate(firstDay);
  const endDateStr = formatDate(lastDay);

  const { data: summary, isLoading: isSummaryLoading } = useAttendanceSummary(employeeId, startDateStr, endDateStr);

  const outstanding = outstandingData?.outstanding || 0;

  // Initialize gross input when employee settings are loaded
  useEffect(() => {
    if (employee) {
      setGrossInput(employee.salary_amount.toString());
    }
  }, [employee]);

  // Calculate working days & attendance details
  // Filter out Sundays if employee doesn't work Sundays
  const getWorkingDays = () => {
    let count = 0;
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const current = new Date(year, month - 1, day);
      const isSunday = current.getDay() === 0;
      if (!isSunday || (employee?.works_sunday)) {
        count++;
      }
    }
    return count;
  };

  const workingDays = getWorkingDays();
  const absentDays = summary?.absent || 0;
  const halfDays = summary?.half_day || 0;
  // Present = working days - absent - half day (as a unit day)
  const presentDays = Math.max(0, workingDays - absentDays - halfDays);

  // Financial calculations
  const gross = parseFloat(grossInput) || 0;
  const deductVal = parseFloat(deductions) || 0;
  const advVal = parseFloat(advancesDeducted) || 0;
  const netPayable = Math.max(0, gross - deductVal - advVal);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (advVal > outstanding) {
      alert(`Cannot deduct more than the outstanding advance balance of ${formatCurrency(outstanding)}`);
      return;
    }

    createSalaryMutation.mutate(
      {
        employee_id: employeeId,
        period_month: month,
        period_year: year,
        working_days: workingDays,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        gross_salary: gross,
        deductions: deductVal,
        advances_deducted: advVal,
        net_salary: netPayable,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3 className={styles.title}>Generate Salary Record</h3>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Select Month</label>
            <select
              className={styles.input}
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Select Year</label>
            <select
              className={styles.input}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
            >
              {[year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.summaryBox}>
            {isSummaryLoading ? (
              <span>Loading attendance...</span>
            ) : (
              <>
                <div className={styles.summaryCol}>
                  <div className={styles.label}>Working</div>
                  <div className={styles.summaryVal}>{workingDays}d</div>
                </div>
                <div className={styles.summaryCol}>
                  <div className={styles.label}>Present</div>
                  <div className={styles.summaryVal} style={{ color: 'var(--color-primary)' }}>{presentDays}d</div>
                </div>
                <div className={styles.summaryCol}>
                  <div className={styles.label}>Half Days</div>
                  <div className={styles.summaryVal} style={{ color: '#F59E0B' }}>{halfDays}d</div>
                </div>
                <div className={styles.summaryCol}>
                  <div className={styles.label}>Absent</div>
                  <div className={styles.summaryVal} style={{ color: 'var(--color-error)' }}>{absentDays}d</div>
                </div>
              </>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Gross Salary (₹)</label>
            <input
              type="number"
              className={styles.input}
              value={grossInput}
              onChange={(e) => setGrossInput(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Manual Deductions (₹)</label>
            <input
              type="number"
              className={styles.input}
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Advances to Deduct (₹)</label>
            <input
              type="number"
              className={styles.input}
              value={advancesDeducted}
              onChange={(e) => setAdvancesDeducted(e.target.value)}
              min="0"
              max={outstanding}
              required
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-outline)', fontWeight: 600 }}>
              Max: {formatCurrency(outstanding)}
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Note / Description</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Deductions for damage"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className={styles.calculationBox}>
            <div className={styles.calcRow}>
              <span>Gross Salary Amount</span>
              <span>{formatCurrency(gross)}</span>
            </div>
            <div className={styles.calcRow}>
              <span>Deductions</span>
              <span style={{ color: deductVal > 0 ? 'var(--color-error)' : 'inherit' }}>
                {deductVal > 0 ? `-${formatCurrency(deductVal)}` : 'Nil'}
              </span>
            </div>
            <div className={styles.calcRow}>
              <span>Advances Recovered</span>
              <span style={{ color: advVal > 0 ? 'var(--color-error)' : 'inherit' }}>
                {advVal > 0 ? `-${formatCurrency(advVal)}` : 'Nil'}
              </span>
            </div>
            <div className={`${styles.calcRow} ${styles.calcResult}`}>
              <span>Net Payable Salary</span>
              <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(netPayable)}</span>
            </div>
          </div>
        </div>

        <div className={styles.btnRow}>
          <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnSubmit}`}
            disabled={createSalaryMutation.isPending || isSummaryLoading}
          >
            {createSalaryMutation.isPending ? 'Generating...' : 'Generate Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
