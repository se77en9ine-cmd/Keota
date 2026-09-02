import { create } from 'zustand';
import { api } from '../api/client';

export interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  isDefault: boolean;
  totalZones?: number;
  totalStockQty?: number;
  createdAt?: string;
}

interface WarehouseStore {
  warehouses: WarehouseItem[];
  loading: boolean;
  error: string | null;
  fetchWarehouses: () => Promise<void>;
  createWarehouse: (data: Partial<WarehouseItem>) => Promise<WarehouseItem>;
  updateWarehouse: (id: string, data: Partial<WarehouseItem>) => Promise<WarehouseItem>;
  deleteWarehouse: (id: string) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  warehouses: [],
  loading: false,
  error: null,

  fetchWarehouses: async () => {
    try {
      set({ loading: true, error: null });
      const res = await api.get('/locations/warehouses');
      set({ warehouses: res.data.warehouses || [], loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createWarehouse: async (data) => {
    const res = await api.post('/locations/warehouses', data);
    await get().fetchWarehouses();
    return res.data.warehouse;
  },

  updateWarehouse: async (id, data) => {
    const res = await api.put(`/locations/warehouses/${id}`, data);
    await get().fetchWarehouses();
    return res.data.warehouse;
  },

  deleteWarehouse: async (id) => {
    await api.delete(`/locations/warehouses/${id}`);
    await get().fetchWarehouses();
  },
}));
