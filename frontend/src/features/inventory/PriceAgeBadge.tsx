import { Badge } from '@/shared/ui/Badge';
import styles from './PriceAgeBadge.module.css';

interface PriceAgeBadgeProps {
  priceUpdatedAt: string;
}

export function PriceAgeBadge({ priceUpdatedAt }: PriceAgeBadgeProps) {
  const updatedAt = new Date(priceUpdatedAt);
  const diffMs = Date.now() - updatedAt.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 12) {
    return null;
  }

  if (diffHours < 24) {
    return (
      <Badge variant="warning" className={styles.badge}>
        ⏱ {diffHours}h ago
      </Badge>
    );
  }

  return (
    <Badge variant="error" className={`${styles.badge} ${styles.pulsing}`}>
      ⚠️ Price outdated
    </Badge>
  );
}
