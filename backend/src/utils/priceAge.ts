export function getPriceStatus(priceUpdatedAt: string | Date): 'fresh' | 'warn' | 'stale' {
  const updatedDate = new Date(priceUpdatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updatedDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 12) {
    return 'fresh';
  } else if (diffHours < 24) {
    return 'warn';
  } else {
    return 'stale';
  }
}
