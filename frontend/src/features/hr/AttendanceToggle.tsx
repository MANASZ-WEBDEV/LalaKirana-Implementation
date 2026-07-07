import type { AttendanceStatus } from '@/types/hr.types';
import styles from './AttendanceToggle.module.css';

interface AttendanceToggleProps {
  status: AttendanceStatus;
  onStatusChange: (status: AttendanceStatus) => void;
  note: string | null;
  onNoteChange: (note: string) => void;
}

export default function AttendanceToggle({
  status,
  onStatusChange,
  note,
  onNoteChange,
}: AttendanceToggleProps) {
  // Config for the segments
  const segments: { value: AttendanceStatus; label: string; icon: string; activeClass: string }[] = [
    { value: 'present', label: 'Present', icon: '✅', activeClass: styles.activePresent },
    { value: 'half_day', label: 'Half Day', icon: '🌗', activeClass: styles.activeHalfDay },
    { value: 'absent', label: 'Absent', icon: '❌', activeClass: styles.activeAbsent },
    { value: 'holiday', label: 'Holiday', icon: '🏖️', activeClass: styles.activeHoliday },
  ];

  const showNote = status === 'absent' || status === 'half_day';

  return (
    <div className={styles.toggleWrapper}>
      <div className={styles.segmented}>
        {segments.map((seg) => {
          const isActive = status === seg.value;
          return (
            <button
              key={seg.value}
              type="button"
              className={`${styles.segment} ${isActive ? seg.activeClass : ''}`}
              onClick={() => onStatusChange(seg.value)}
            >
              <span className={styles.icon}>{seg.icon}</span>
              <span className={styles.label}>{seg.label}</span>
            </button>
          );
        })}
      </div>

      {showNote && (
        <input
          type="text"
          className={styles.noteInput}
          placeholder={status === 'half_day' ? 'Reason for half day...' : 'Reason for absence...'}
          value={note || ''}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      )}
    </div>
  );
}
