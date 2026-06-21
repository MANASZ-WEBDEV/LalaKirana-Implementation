import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOnlineStatus } from './useOnlineStatus';
import { useToastStore } from '../store/toastStore';
import { api } from '../api/axios';

/**
 * usePriceSync — detects product price changes when coming back online.
 * Also flushes any pending write operations from the offline queue.
 *
 * On reconnect:
 * 1. Flushes `lk_offline_queue` sequentially.
 * 2. React Query auto-refetches stale queries (refetchOnReconnect: true).
 * 3. Compares the previous products cache with the new data.
 * 4. Shows a toast notification if any prices changed while offline.
 */
export function usePriceSync() {
  const isOnline = useOnlineStatus();
  const wasOffline = useRef(false);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    // We just came back online
    if (wasOffline.current) {
      wasOffline.current = false;

      const handleReconnectSync = async () => {
        // 1. Flush offline queue if present
        try {
          const queue = JSON.parse(localStorage.getItem('lk_offline_queue') || '[]');
          if (queue.length > 0) {
            addToast('info', `Syncing ${queue.length} offline change(s)...`);
            
            let successCount = 0;
            const remainingQueue = [...queue];

            while (remainingQueue.length > 0) {
              const item = remainingQueue[0];
              try {
                await api({
                  url: item.url,
                  method: item.method,
                  data: item.data,
                });
                remainingQueue.shift();
                localStorage.setItem('lk_offline_queue', JSON.stringify(remainingQueue));
                successCount++;
              } catch (err: any) {
                console.error('Failed to sync offline mutation:', item, err);
                addToast('error', `Failed to sync offline change for ${item.url}`);
                // Discard to avoid infinite loop block
                remainingQueue.shift();
                localStorage.setItem('lk_offline_queue', JSON.stringify(remainingQueue));
              }
            }

            if (successCount > 0) {
              addToast('success', `Synced ${successCount} offline change(s) successfully!`);
            }
          }
        } catch (e) {
          console.error('Error handling offline queue sync:', e);
        }

        // 2. Snapshot current products cache before refetch
        const cachedProducts: any[] | undefined = queryClient.getQueryData(['inventory', 'products', {}]);

        if (!cachedProducts || cachedProducts.length === 0) {
          queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
          return;
        }

        // Build a price map from the cached data
        const priceMap = new Map<string, { name: string; price: number }>();
        cachedProducts.forEach((p: any) => {
          priceMap.set(p.id, { name: p.name, price: Number(p.price) });
        });

        // Invalidate products to force refetch
        queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }).then(() => {
          // After invalidation settles, compare
          setTimeout(() => {
            const freshProducts: any[] | undefined = queryClient.getQueryData(['inventory', 'products', {}]);

            if (!freshProducts) return;

            const changedProducts: string[] = [];

            freshProducts.forEach((p: any) => {
              const cached = priceMap.get(p.id);
              if (cached && Number(p.price) !== cached.price) {
                changedProducts.push(
                  `${p.name}: ₹${cached.price} → ₹${Number(p.price)}`
                );
              }
            });

            if (changedProducts.length > 0) {
              addToast(
                'info',
                `${changedProducts.length} price${changedProducts.length > 1 ? 's' : ''} changed while offline: ${changedProducts.slice(0, 3).join(', ')}${changedProducts.length > 3 ? ` +${changedProducts.length - 3} more` : ''}`
              );
            }
          }, 2000); // Give React Query time to settle the refetch
        });
      };

      handleReconnectSync();
    }
  }, [isOnline, queryClient, addToast]);
}

