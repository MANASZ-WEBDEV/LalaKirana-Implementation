import { useState, useEffect } from 'react';
import type { AttendanceStatus, MarkAttendanceInput } from '@/types/hr.types';
import { useTodayAttendance, useMarkAttendance } from './hr.queries';
import AttendanceToggle from './AttendanceToggle';
import styles from './AttendanceToday.module.css';

export default function AttendanceToday() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [localRecords, setLocalRecords] = useState<
    Record<string, { status: AttendanceStatus; note: string | null }>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  const { data: attendanceData, isLoading, error } = useTodayAttendance(selectedDate);
  const markAttendanceMutation = useMarkAttendance();

  // Populate local records state when attendance data fetches or date changes
  useEffect(() => {
    if (attendanceData) {
      const records: Record<string, { status: AttendanceStatus; note: string | null }> = {};
      attendanceData.forEach((item) => {
        records[item.employee_id] = {
          status: item.status,
          note: item.note,
        };
      });
      setLocalRecords(records);
      setIsDirty(false);
    }
  }, [attendanceData, selectedDate]);

  // Adjust date step
  const handleDateChange = (days: number) => {
    if (isDirty && !window.confirm('You have unsaved attendance changes. Discard them?')) {
      return;
    }
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Update status for a specific employee row
  const handleStatusChange = (empId: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => {
      const updated = {
        ...prev,
        [empId]: {
          ...prev[empId],
          status,
          // Reset note if status reverts to present or holiday (no reason needed)
          note: status === 'present' || status === 'holiday' ? null : prev[empId]?.note || '',
        },
      };
      setIsDirty(true);
      return updated;
    });
  };

  // Update note for a specific employee row
  const handleNoteChange = (empId: string, note: string) => {
    setLocalRecords((prev) => {
      const updated = {
        ...prev,
        [empId]: {
          ...prev[empId],
          note,
        },
      };
      setIsDirty(true);
      return updated;
    });
  };

  // Count summaries
  const getSummaryCounts = () => {
    const counts = { present: 0, half_day: 0, absent: 0, holiday: 0 };
    Object.values(localRecords).forEach((rec) => {
      counts[rec.status] = (counts[rec.status] || 0) + 1;
    });
    return counts;
  };

  const counts = getSummaryCounts();

  // Save changes
  const handleSave = () => {
    const recordsPayload = Object.entries(localRecords).map(([empId, rec]) => ({
      employee_id: empId,
      status: rec.status,
      note: rec.note,
    }));

    const payload: MarkAttendanceInput = {
      date: selectedDate,
      records: recordsPayload,
    };

    markAttendanceMutation.mutate(payload, {
      onSuccess: () => {
        setIsDirty(false);
      },
    });
  };

  // Format header date display
  const formatHeaderDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.dateRow}>
        <div className={styles.datePickerWrapper}>
          <button className={styles.navBtn} onClick={() => handleDateChange(-1)}>
            ← Yesterday
          </button>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={(e) => {
              if (isDirty && !window.confirm('You have unsaved changes. Discard them?')) {
                return;
              }
              setSelectedDate(e.target.value);
            }}
          />
          <button
            className={styles.navBtn}
            onClick={() => handleDateChange(1)}
            disabled={selectedDate === new Date().toISOString().split('T')[0]}
          >
            Tomorrow →
          </button>
        </div>

        {!isLoading && !error && (
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <span className={`${styles.countBadge} ${styles.badgePresent}`}>{counts.present}</span>
              <span>Present</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={`${styles.countBadge} ${styles.badgeHalfDay}`}>{counts.half_day}</span>
              <span>Half Day</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={`${styles.countBadge} ${styles.badgeAbsent}`}>{counts.absent}</span>
              <span>Absent</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={`${styles.countBadge} ${styles.badgeHoliday}`}>{counts.holiday}</span>
              <span>Holiday</span>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem 0' }}>
          <div style={{ height: '60px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: '60px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
        </div>
      ) : error ? (
        <div className={styles.emptyState}>Failed to load attendance list. Check backend API logs.</div>
      ) : attendanceData && attendanceData.length > 0 ? (
        <div className={styles.employeeList}>
          {attendanceData.map((emp) => {
            const localRec = localRecords[emp.employee_id] || { status: 'present', note: null };
            return (
              <div key={emp.employee_id} className={styles.employeeRow}>
                <div className={styles.employeeInfo}>
                  <h4 className={styles.name}>{emp.employee_name}</h4>
                  <p className={styles.designation}>{emp.designation || 'Staff Member'}</p>
                </div>
                <div className={styles.toggleContainer}>
                  <AttendanceToggle
                    status={localRec.status}
                    onStatusChange={(status) => handleStatusChange(emp.employee_id, status)}
                    note={localRec.note}
                    onNoteChange={(note) => handleNoteChange(emp.employee_id, note)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.emptyState}>No active employees found to mark attendance.</div>
      )}

      {!isLoading && !error && attendanceData && attendanceData.length > 0 && (
        <div className={styles.footerRow}>
          {isDirty && <span className={styles.statusText}>⚠️ Unsaved changes for {formatHeaderDate(selectedDate)}</span>}
          <button
            onClick={handleSave}
            disabled={!isDirty || markAttendanceMutation.isPending}
            className={styles.saveBtn}
          >
            {markAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}
