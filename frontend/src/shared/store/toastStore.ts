import { create } from 'zustand';

export interface ToastItem {
  id: string;
  type: 'success' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (type: ToastItem['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();
    const newToast: ToastItem = { id, type, message, timestamp };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    // Auto-dismiss toast after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
