import { create } from 'zustand';
import { api } from '../api/client';
import { UserDTO } from '39pos-shared';

interface AuthState {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isPinLocked: boolean;
  isLoading: boolean;
  login: (identifier: string, password?: string, pin?: string) => Promise<void>;
  pinSwitch: (pin: string) => Promise<void>;
  lockPin: () => void;
  unlockPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isPinLocked: false,
  isLoading: true,

  login: async (identifier, password, pin) => {
    const res = await api.post('/auth/login', { identifier, password, pin });
    localStorage.setItem('39pos_access_token', res.data.accessToken);
    localStorage.setItem('39pos_refresh_token', res.data.refreshToken);
    set({ user: res.data.user, isAuthenticated: true, isPinLocked: false });
  },

  pinSwitch: async (pin) => {
    const res = await api.post('/auth/pin-switch', { pin });
    localStorage.setItem('39pos_access_token', res.data.accessToken);
    localStorage.setItem('39pos_refresh_token', res.data.refreshToken);
    set({ user: res.data.user, isAuthenticated: true, isPinLocked: false });
  },

  lockPin: () => {
    set({ isPinLocked: true });
  },

  unlockPin: async (pin) => {
    try {
      const res = await api.post('/auth/pin-switch', { pin });
      localStorage.setItem('39pos_access_token', res.data.accessToken);
      localStorage.setItem('39pos_refresh_token', res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true, isPinLocked: false });
      return true;
    } catch {
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('39pos_access_token');
    localStorage.removeItem('39pos_refresh_token');
    set({ user: null, isAuthenticated: false, isPinLocked: false });
  },

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('39pos_access_token');
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
