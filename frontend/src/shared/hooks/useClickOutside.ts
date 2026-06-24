import { useEffect, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current) return;
      const target = event.target as Node | null;
      if (!target) return;

      // Check if target is a descendant of the ref element
      if (ref.current.contains(target)) {
        return;
      }

      // If the target is inside a dialog/modal/drawer overlay, check if it belongs to a different dialog
      // than the one the referenced element belongs to.
      const targetElement = target instanceof Element ? target : target.parentElement;
      if (targetElement && targetElement.closest) {
        const targetDialog = targetElement.closest('[role="dialog"], [aria-modal="true"]');
        if (targetDialog) {
          const refDialog = ref.current.closest('[role="dialog"], [aria-modal="true"]');
          if (refDialog !== targetDialog) {
            // Clicked inside a different dialog/modal overlay, so ignore click-outside callbacks
            return;
          }
        }
      }

      callback();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, callback]);
}
