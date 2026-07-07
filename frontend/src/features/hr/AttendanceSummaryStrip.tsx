import { useState } from 'react';
import { useAttendanceSummary } from './hr.queries';
import styles from './AttendanceSummaryStrip.module.css';

interface AttendanceSummaryProps {
  employeeId: string;
}

type PeriodTab = '7d' | '30d' | 'month' | 'last_month';

export default function AttendanceSummaryStrip({ employeeId }: AttendanceSummaryProps) {
  const [activeTab, setActiveTab] = useState<PeriodTab>('month');

  // Helper: Format date as YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Calculate dates based on active tab
  const getDates = (tab: PeriodTab) => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    if (tab === '7d') {
      start = new Date();
      start.setDate(today.getDate() - 6);
    } else if (tab === '30d') {
      start = new Date();
      start.setDate(today.getDate() - 29);
    } else if (tab === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
      // Last month
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of last month
    }

    return {
      startDate: formatDate(start),
      endDate: formatDate(end),
      totalDays: Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    };
  };

  const { startDate, endDate, totalDays } = getDates(activeTab);
  const { data: summary, isLoading } = useAttendanceSummary(employeeId, startDate, endDate);

  const absent = summary?.absent || 0;
  const halfDay = summary?.half_day || 0;
  const holiday = summary?.holiday || 0;
  const present = Math.max(0, totalDays - absent - halfDay - holiday);

  // Compute attendance rate: holidays do not count in denominator
  const denominator = totalDays - holiday;
  const attendanceRate = denominator > 0 
    ? Math.round(((present + halfDay * 0.5) / denominator) * 100) 
    : 100;

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <h3 className={styles.title}>Attendance Summary</h3>
        <div className={styles.selector}>
          {(
            [
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              className={`${styles.selectBtn} ${activeTab === tab.id ? styles.selectBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: '80px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statVal} style={{ color: 'var(--color-primary)' }}>{present}</div>
              <div className={styles.statLbl}>Present</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statVal} style={{ color: '#F59E0B' }}>{halfDay}</div>
              <div className={styles.statLbl}>Half Day</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statVal} style={{ color: 'var(--color-error)' }}>{absent}</div>
              <div className={styles.statLbl}>Absent</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statVal} style={{ color: '#6366F1' }}>{holiday}</div>
              <div className={styles.statLbl}>Holiday</div>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressLabelRow}>
              <span>Attendance Rate</span>
              <span>{attendanceRate}%</span>
            </div>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${attendanceRate}%`, backgroundColor: attendanceRate > 85 ? 'var(--color-primary)' : attendanceRate > 70 ? '#F59E0B' : 'var(--color-error)' }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
