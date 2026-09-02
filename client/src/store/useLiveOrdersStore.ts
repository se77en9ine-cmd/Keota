import { create } from 'zustand';
import { api } from '../api/client';
import { soundFX } from '../utils/audio';

interface DispatchedOrderPayload {
  invoiceNo: string;
  totalAmount: number;
  customer?: string;
  channel?: string;
}

interface LiveOrdersStoreState {
  activeCodCount: number;
  newOrdersBadge: number;
  isFlying: boolean;
  flyingOrder: DispatchedOrderPayload | null;
  sidebarRipple: boolean;
  fetchLiveCounts: () => Promise<void>;
  setActiveCodCount: (count: number) => void;
  triggerCodDispatch: (order: DispatchedOrderPayload) => void;
  resetNewBadge: () => void;
}

export const useLiveOrdersStore = create<LiveOrdersStoreState>((set, get) => ({
  activeCodCount: 0,
  newOrdersBadge: 0,
  isFlying: false,
  flyingOrder: null,
  sidebarRipple: false,

  fetchLiveCounts: async () => {
    try {
      const res = await api.get('/pos/live-orders');
      const orders = res.data.orders || [];
      // Count specifically Step 1 COD New orders
      const step1CodNewOrders = orders.filter((o: any) => (o.pipelineStage || 'NEW') === 'NEW');
      set({ activeCodCount: step1CodNewOrders.length });
    } catch {
      // Silent catch fallback
    }
  },

  setActiveCodCount: (count: number) => set({ activeCodCount: count }),

  triggerCodDispatch: (order: DispatchedOrderPayload) => {
    // 1. Play launch audio whoosh
    soundFX.playCashSuccess();

    // 2. Start flying animation & increment Step 1 COD count
    set((state) => ({
      isFlying: true,
      flyingOrder: order,
      newOrdersBadge: state.newOrdersBadge + 1,
      activeCodCount: state.activeCodCount + 1,
    }));

    // 3. Trigger sidebar impact pulse right when particle lands
    setTimeout(() => {
      set({ sidebarRipple: true });
      soundFX.playBeep();
    }, 600);

    // 4. End flight particle
    setTimeout(() => {
      set({ isFlying: false, flyingOrder: null });
    }, 850);

    // 5. Reset sidebar ripple glow
    setTimeout(() => {
      set({ sidebarRipple: false });
    }, 1600);
  },

  resetNewBadge: () => set({ newOrdersBadge: 0 }),
}));
