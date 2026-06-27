import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    isNegative?: boolean;
    label?: string;
  };
  className?: string;
  onClick?: () => void;
  locked?: boolean;
}

export function StatCard({
  label,
  value,
  delta,
  className = '',
  onClick,
  locked = false,
}: StatCardProps) {
  const getDeltaClass = () => {
    if (!delta) return '';
    if (delta.isPositive) return styles.up;
    if (delta.isNegative) return styles.down;
    return styles.neutral;
  };

  const cardClasses = `${styles.card} ${onClick && !locked ? styles.cardClickable : ''} ${className} ${locked ? styles.lockedCard : ''}`;

  return (
    <div
      className={cardClasses}
      onClick={locked ? undefined : onClick}
      role={onClick && !locked ? 'button' : undefined}
      tabIndex={onClick && !locked ? 0 : undefined}
      onKeyDown={onClick && !locked ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span className={styles.label}>{label}</span>
      {locked ? (
        <div className={styles.lockedContainer}>
          <span className={styles.lockIcon}>🔒</span>
          <span className={styles.lockedText}>Owner only</span>
        </div>
      ) : (
        <>
          <span className={styles.value}>{value}</span>
          {delta && (
            <div className={`${styles.delta} ${getDeltaClass()}`}>
              <span>
                {delta.isPositive ? '↑' : delta.isNegative ? '↓' : ''} {delta.value}
              </span>
              {delta.label && <span style={{ color: 'var(--color-on-surface-variant)' }}>{delta.label}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
