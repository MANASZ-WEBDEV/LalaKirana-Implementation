import React from 'react';
import { Button } from './Button';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  subtext: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  heading,
  subtext,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className={styles.container}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h4 className={styles.heading}>{heading}</h4>
      <p className={styles.subtext}>{subtext}</p>
      {actionText && onAction && (
        <Button onClick={onAction}>{actionText}</Button>
      )}
    </div>
  );
}
