import { create } from 'zustand';
import { api } from '../api/client';

export type DeliveryFeePayer = 'CUSTOMER_PAYS' | 'SELLER_PAYS';

export interface CourierItem {
  id: string;
  name: string;
  code: string;
  icon: string;
  color: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'teal' | 'orange' | 'slate';
  phone?: string;
  trackingUrlTemplate?: string;
  defaultFee: number;
  defaultFeePayer: DeliveryFeePayer;
  isActive: boolean;
  notes?: string;
}

const DEFAULT_COURIERS: CourierItem[] = [
  {
    id: 'courier-anousith',
    name: 'Anousith Express (Laos)',
    code: 'ANOUSITH',
    icon: '🚚',
    color: 'emerald',
    phone: '+856 21 888888',
    trackingUrlTemplate: 'https://track.anousith.com?code={TRACKING_NO}',
    defaultFee: 20000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Nationwide coverage across all provinces in Laos',
  },
  {
    id: 'courier-flash',
    name: 'Flash Express',
    code: 'FLASH',
    icon: '⚡',
    color: 'amber',
    phone: '1436',
    trackingUrlTemplate: 'https://www.flashexpress.com/tracking/?se={TRACKING_NO}',
    defaultFee: 25000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Same-day pickup and doorstep delivery',
  },
  {
    id: 'courier-hal',
    name: 'HAL Logistics (Laos)',
    code: 'HAL',
    icon: '📦',
    color: 'blue',
    phone: '+856 21 777777',
    trackingUrlTemplate: 'https://track.hal-logistics.la?no={TRACKING_NO}',
    defaultFee: 25000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Reliable freight and cold chain logistics',
  },
  {
    id: 'courier-mixay',
    name: 'Mixay Express (Laos)',
    code: 'MIXAY',
    icon: '🚛',
    color: 'purple',
    phone: '+856 20 55555555',
    trackingUrlTemplate: '',
    defaultFee: 20000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Express parcel service across major cities',
  },
  {
    id: 'courier-jt',
    name: 'J&T Express',
    code: 'JT',
    icon: '🔴',
    color: 'rose',
    phone: '02-009-5678',
    trackingUrlTemplate: 'https://www.jtexpress.co.th/tracking?bills={TRACKING_NO}',
    defaultFee: 25000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: '365 days non-stop express delivery',
  },
  {
    id: 'courier-grab',
    name: 'GrabExpress',
    code: 'GRAB',
    icon: '🛵',
    color: 'teal',
    phone: '+856 21 333333',
    trackingUrlTemplate: '',
    defaultFee: 30000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Instant motorcycle courier within city limits',
  },
  {
    id: 'courier-inhouse',
    name: 'In-House Store Rider',
    code: 'INHOUSE',
    icon: '🏍️',
    color: 'orange',
    phone: '+856 20 99999999',
    trackingUrlTemplate: '',
    defaultFee: 15000,
    defaultFeePayer: 'SELLER_PAYS',
    isActive: true,
    notes: 'Store own delivery staff (Free delivery / Store-subsidized)',
  },
  {
    id: 'courier-selfpickup',
    name: 'Customer Self-Pickup',
    code: 'SELFPICKUP',
    icon: '🏃',
    color: 'slate',
    phone: '',
    trackingUrlTemplate: '',
    defaultFee: 0,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: 'Customer picks up parcel in-store at branch counter',
  },
];

interface CourierState {
  couriers: CourierItem[];
  isLoading: boolean;
  fetchCouriers: () => Promise<void>;
  createCourier: (data: Omit<CourierItem, 'id'>) => Promise<void>;
  updateCourier: (id: string, data: Partial<CourierItem>) => Promise<void>;
  deleteCourier: (id: string) => Promise<void>;
  toggleCourierStatus: (id: string) => Promise<void>;
}

export const useCourierStore = create<CourierState>((set, get) => ({
  couriers: DEFAULT_COURIERS,
  isLoading: false,

  fetchCouriers: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/settings');
      const storeSettings = res.data.settings || {};
      const saved = storeSettings.courier_config;

      if (Array.isArray(saved) && saved.length > 0) {
        set({ couriers: saved, isLoading: false });
      } else {
        set({ couriers: DEFAULT_COURIERS, isLoading: false });
      }
    } catch {
      set({ couriers: DEFAULT_COURIERS, isLoading: false });
    }
  },

  createCourier: async (data) => {
    const newCourier: CourierItem = {
      ...data,
      id: `courier-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    const nextCouriers = [newCourier, ...get().couriers];
    set({ couriers: nextCouriers });

    try {
      await api.post('/settings/save', {
        key: 'courier_config',
        value: nextCouriers,
        category: 'DELIVERY',
      });
    } catch (err: any) {
      console.error('Failed to persist courier creation:', err);
    }
  },

  updateCourier: async (id, data) => {
    const nextCouriers = get().couriers.map((c) => (c.id === id ? { ...c, ...data } : c));
    set({ couriers: nextCouriers });

    try {
      await api.post('/settings/save', {
        key: 'courier_config',
        value: nextCouriers,
        category: 'DELIVERY',
      });
    } catch (err: any) {
      console.error('Failed to persist courier update:', err);
    }
  },

  deleteCourier: async (id) => {
    const nextCouriers = get().couriers.filter((c) => c.id !== id);
    set({ couriers: nextCouriers });

    try {
      await api.post('/settings/save', {
        key: 'courier_config',
        value: nextCouriers,
        category: 'DELIVERY',
      });
    } catch (err: any) {
      console.error('Failed to persist courier deletion:', err);
    }
  },

  toggleCourierStatus: async (id) => {
    const target = get().couriers.find((c) => c.id === id);
    if (!target) return;
    await get().updateCourier(id, { isActive: !target.isActive });
  },
}));
