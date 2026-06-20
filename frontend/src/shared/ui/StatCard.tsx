import React from 'react';
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
}

export function StatCard({
  label,
  value,
  delta,
  className = '',
}: StatCardProps) {
  const getDeltaClass = () => {
    if (!delta) return '';
    if (delta.isPositive) return styles.up;
    if (delta.isNegative) return styles.down;
    return styles.neutral;
  };

  return (
    <div className={`${styles.card} ${className}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {delta && (
        <div className={`${styles.delta} ${getDeltaClass()}`}>
          <span>
            {delta.isPositive ? '↑' : delta.isNegative ? '↓' : ''} {delta.value}
          </span>
          {delta.label && <span style={{ color: 'var(--color-on-surface-variant)' }}>{delta.label}</span>}
        </div>
      )}
    </div>
  );
}
