import { useState } from 'react';
import type { AttendanceStatus } from '@/types/hr.types';
import { useAttendanceHistory } from './hr.queries';
import styles from './AttendanceCalendar.module.css';

interface AttendanceCalendarProps {
  employeeId: string;
}

export default function AttendanceCalendar({ employeeId }: AttendanceCalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Format month label
  const monthLabel = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Get start and end date strings for current month view
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const formatDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const startDateStr = formatDateString(firstDayOfMonth);
  const endDateStr = formatDateString(lastDayOfMonth);

  // Fetch attendance history for the month
  const { data: history, isLoading } = useAttendanceHistory(employeeId, startDateStr, endDateStr);

  // Map history records by date string for O(1) lookup
  const historyMap = new Map(history?.map((r) => [r.date, r]) || []);

  // Handle month steps
  const stepMonth = (step: number) => {
    setViewDate(new Date(year, month + step, 1));
  };

  // Build grid calendar cells
  const buildGridCells = () => {
    const cells: React.ReactNode[] = [];
    const totalDays = lastDayOfMonth.getDate();

    // Day of week index for first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    let startDayOfWeek = firstDayOfMonth.getDay();
    // Convert to Monday start week: 0 = Mon, 1 = Tue, ..., 6 = Sun
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    // Add empty padding cells for the start of the week
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(<div key={`empty-${i}`} className={styles.cellEmpty} />);
    }

    const todayDateStr = formatDateString(new Date());

    // Add day cells
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      const dateStr = formatDateString(currentDate);
      const isSunday = currentDate.getDay() === 0;

      // Determine cell status
      let cellStatus: AttendanceStatus = 'present'; // Default
      let cellNote: string | null = null;
      let hasRecord = false;

      if (historyMap.has(dateStr)) {
        const record = historyMap.get(dateStr)!;
        cellStatus = record.status;
        cellNote = record.note;
        hasRecord = true;
      }

      // Check if it's a future date
      const isFuture = dateStr > todayDateStr;

      // Apply cell styling classes
      let cellClass = styles.cellNeutral;
      if (!isFuture) {
        if (cellStatus === 'present' && !isSunday) {
          cellClass = styles.cellPresent;
        } else if (cellStatus === 'half_day') {
          cellClass = styles.cellHalfDay;
        } else if (cellStatus === 'absent') {
          cellClass = styles.cellAbsent;
        } else if (cellStatus === 'holiday') {
          cellClass = styles.cellHoliday;
        }
      }

      const isCurrentDay = dateStr === todayDateStr;

      cells.push(
        <div
          key={day}
          className={`${styles.cell} ${cellClass} ${isSunday && !hasRecord && !isFuture ? styles.sunday : ''}`}
          style={isCurrentDay ? { border: '2px solid var(--color-primary-container)' } : {}}
          title={cellNote || undefined}
        >
          <span>{day}</span>
        </div>
      );
    }

    return cells;
  };

  const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <div className={styles.navGroup}>
          <button className={styles.navBtn} onClick={() => stepMonth(-1)}>
            ‹
          </button>
          <button className={styles.navBtn} onClick={() => stepMonth(1)}>
            ›
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ height: '240px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
      ) : (
        <>
          <div className={styles.grid}>
            {weekdays.map((day, idx) => (
              <div key={idx} className={styles.weekday}>
                {day}
              </div>
            ))}
            {buildGridCells()}
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: 'var(--color-primary)' }} />
              <span>Present</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#F59E0B' }} />
              <span>Half Day</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: 'var(--color-error)' }} />
              <span>Absent</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: '#6366F1' }} />
              <span>Holiday</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)' }} />
              <span>Unmarked / Future</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
