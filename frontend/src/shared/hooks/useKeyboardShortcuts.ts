import { useEffect } from 'react';
import { useBillingStore } from '@/features/billing/billingStore';

interface ShortcutActions {
  onConfirm?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({ onConfirm, onEscape }: ShortcutActions = {}) {
  const { slots, activeSlotId, addSlot, setActiveSlotId, switchMode } = useBillingStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check for Slot switches: Ctrl + [1-9, 0]
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key >= '1' && e.key <= '9') {
          e.preventDefault();
          const slotIndex = parseInt(e.key, 10) - 1;
          // Check if slot exists at this index
          if (slotIndex >= 0 && slotIndex < slots.length) {
            setActiveSlotId(slots[slotIndex].id);
          }
        } else if (e.key === '0') {
          e.preventDefault();
          // Digit 0 represents slot 10
          if (slots.length >= 10) {
            setActiveSlotId(slots[9].id);
          }
        }
      }

      // Alt+N: Add new slot (avoiding Ctrl+N browser hijack)
      if (e.altKey && !e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (slots.length < 10) {
          addSlot();
        }
      }

      // 2. F2: Toggle mode (Full <-> Quick) on active slot
      if (e.key === 'F2') {
        e.preventDefault();
        const activeSlot = slots.find((s) => s.id === activeSlotId);
        if (activeSlot) {
          switchMode(activeSlot.mode === 'full' ? 'quick' : 'full');
        }
      }

      // 3. Enter: Open confirm checkout drawer
      // Only trigger if focus is not on an input/textarea (or handle carefully)
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        // Allow Enter if it's on the search or checkout form, but avoid intercepting other inputs
        if (!isInput && onConfirm) {
          e.preventDefault();
          onConfirm();
        }
      }

      // 4. Escape: Close modal/drawer
      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [slots, activeSlotId, addSlot, setActiveSlotId, switchMode, onConfirm, onEscape]);
}
