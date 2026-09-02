import { create } from 'zustand';
import { api } from '../api/client';

export interface OnlinePlatformItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: string;
  commissionRate: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface PlatformState {
  platforms: OnlinePlatformItem[];
  isLoading: boolean;
  fetchPlatforms: () => Promise<void>;
  createPlatform: (data: {
    name: string;
    code: string;
    icon?: string;
    color?: string;
    commissionRate?: number;
  }) => Promise<void>;
  updatePlatform: (id: string, data: Partial<OnlinePlatformItem>) => Promise<void>;
  deletePlatform: (id: string) => Promise<void>;
}

export const usePlatformStore = create<PlatformState>((set, get) => ({
  platforms: [
    { id: 'grab-food', name: 'GrabFood', code: 'GF', icon: '🟢', color: 'emerald', commissionRate: 25, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 'foodpanda', name: 'Foodpanda', code: 'FP', icon: '🩷', color: 'pink', commissionRate: 25, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: 'shopee', name: 'Shopee', code: 'SP', icon: '🟠', color: 'orange', commissionRate: 5, isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: 'tiktok-shop', name: 'TikTok Shop', code: 'TT', icon: '🎵', color: 'purple', commissionRate: 8, isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: 'web-store', name: 'Official Web Store', code: 'WEB', icon: '🌐', color: 'cyan', commissionRate: 0, isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
    { id: 'whatsapp', name: 'WhatsApp Order', code: 'WA', icon: '💬', color: 'teal', commissionRate: 0, isActive: true, sortOrder: 6, createdAt: '', updatedAt: '' },
    { id: 'lineman', name: 'Lineman', code: 'LM', icon: '🛵', color: 'emerald', commissionRate: 20, isActive: true, sortOrder: 7, createdAt: '', updatedAt: '' },
    { id: 'phone', name: 'Phone Order', code: 'PH', icon: '📞', color: 'indigo', commissionRate: 0, isActive: true, sortOrder: 8, createdAt: '', updatedAt: '' },
  ],
  isLoading: false,

  fetchPlatforms: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/online-platforms');
      if (res.data.success && res.data.platforms) {
        set({ platforms: res.data.platforms, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createPlatform: async (data) => {
    await api.post('/online-platforms', data);
    await get().fetchPlatforms();
  },

  updatePlatform: async (id, data) => {
    await api.put(`/online-platforms/${id}`, data);
    await get().fetchPlatforms();
  },

  deletePlatform: async (id) => {
    await api.delete(`/online-platforms/${id}`);
    await get().fetchPlatforms();
  },
}));
