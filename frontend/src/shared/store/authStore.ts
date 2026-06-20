import { create } from 'zustand';
import { User } from '@/types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const getInitialUser = (): User | null => {
  const userStr = localStorage.getItem('lk_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

const getInitialToken = (): string | null => {
  return localStorage.getItem('lk_token');
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!localStorage.getItem('lk_token'),
  login: (user, token) => {
    localStorage.setItem('lk_user', JSON.stringify(user));
    localStorage.setItem('lk_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('lk_user');
    localStorage.removeItem('lk_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
