import { Badge } from '@/shared/ui/Badge';
import styles from './PriceAgeBadge.module.css';

interface PriceAgeBadgeProps {
  priceUpdatedAt: string;
  categoryName?: string | null;
}

// Volatile commodity categories that require price monitoring
const shouldTrackCategory = (catName?: string | null) => {
  if (!catName) return false;
  const name = catName.toLowerCase();
  
  const commodityKeywords = [
    'oil',
    'ghee',
    'grain',
    'flour',
    'atta',
    'vegetable',
    'pulse',
    'dal',
    'rice',
    'spice',
    'masala'
  ];
  
  return commodityKeywords.some(keyword => name.includes(keyword));
};

export function PriceAgeBadge({ priceUpdatedAt, categoryName }: PriceAgeBadgeProps) {
  // If this item is not in a volatile commodity category, do not show warning badges
  if (!shouldTrackCategory(categoryName)) {
    return null;
  }

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
