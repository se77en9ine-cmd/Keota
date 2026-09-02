import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DisplayAdItem {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  durationSeconds: number;
  videoLoopCount?: number; // How many times this video repeats before advancing (1, 2, 3, or -1 for infinite)
  isOfflineFile?: boolean;
  offlineFileId?: string;
  fileName?: string;
  fileSizeMB?: number;
  thumbnailUrl?: string; // Persistent Base64 poster snapshot for instant rendering upon page refresh
  isActive: boolean;
  order: number;
  callToAction?: string;
  priceTag?: string;
}

export interface CustomerDisplayConfig {
  enableAds: boolean;
  loopMode: 'CONTINUOUS_PLAYLIST' | 'REPEAT_CURRENT';
  standbyMode: 'FULL_PROMOTION' | 'STORE_LOGO' | 'SPLIT_PREVIEW';
  activeCartMode: 'SPLIT_SIDEBAR' | 'MINI_CAROUSEL' | 'CART_ONLY';
  autoPlayVideo: boolean;
  muteVideo: boolean;
  slideInterval: number;
  welcomeHeading: string;
  welcomeSubheading: string;
  thankYouMessage: string;
  showQrCode: boolean;
  qrPayTitle: string;
  qrPaySubtitle: string;
  qrImageUrl?: string;
  announcementTicker?: string;
}

export interface QrModalState {
  isOpen: boolean;
  amount: number;
  currency: string;
  qrImageUrl?: string;
  bankName?: string;
  accountNo?: string;
  accountName?: string;
  invoiceNo?: string;
  isPaid?: boolean;
}

interface CustomerDisplayState {
  config: CustomerDisplayConfig;
  ads: DisplayAdItem[];
  currentAdIndex: number;
  qrModal: QrModalState;
  updateConfig: (patch: Partial<CustomerDisplayConfig>) => void;
  addAd: (ad: Omit<DisplayAdItem, 'id' | 'order'>) => void;
  updateAd: (id: string, patch: Partial<DisplayAdItem>) => void;
  deleteAd: (id: string) => void;
  batchDelete: (ids: string[]) => void;
  batchToggleActive: (ids: string[], active: boolean) => void;
  reorderAds: (fromIndex: number, toIndex: number) => void;
  toggleAdActive: (id: string) => void;
  setCurrentAdIndex: (index: number) => void;
  nextAd: () => void;
  showQrModal: (payload?: Partial<QrModalState>) => void;
  hideQrModal: () => void;
  setPaymentSuccess: (invoiceNo?: string) => void;
  resetToDefaults: () => void;
}

// ═══════════════════════════════════════════════════════════════
// BroadcastChannel for Real-Time Dual-Screen Cross-Window Sync
// ═══════════════════════════════════════════════════════════════
const DISPLAY_CHANNEL_NAME = '39pos-display-sync';
let displayChannel: BroadcastChannel | null = null;

try {
  displayChannel = new BroadcastChannel(DISPLAY_CHANNEL_NAME);
} catch {
  console.warn('[39POS] BroadcastChannel not available in this environment');
}

function broadcastDisplayState(payload: {
  currentAdIndex?: number;
  config?: CustomerDisplayConfig;
  ads?: DisplayAdItem[];
  qrModal?: QrModalState;
}) {
  if (displayChannel) {
    try {
      displayChannel.postMessage({
        type: 'SYNC_DISPLAY_STATE',
        ...payload,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to broadcast display state:', e);
    }
  }
}

const DEFAULT_CONFIG: CustomerDisplayConfig = {
  enableAds: true,
  loopMode: 'CONTINUOUS_PLAYLIST',
  standbyMode: 'FULL_PROMOTION',
  activeCartMode: 'SPLIT_SIDEBAR',
  autoPlayVideo: true,
  muteVideo: true,
  slideInterval: 8,
  welcomeHeading: 'Welcome to 39POS Store',
  welcomeSubheading: 'Discover our daily fresh deals, artisanal beverages & member rewards',
  thankYouMessage: 'Thank you for shopping with us! Have a wonderful day.',
  showQrCode: true,
  qrPayTitle: 'FAST MOBILE SCAN & PAY',
  qrPaySubtitle: 'Scan with Mobile Banking (PromptPay / BCEL One / WeChat / Alipay)',
  announcementTicker:
    '🔥 MEMBER SPECIAL: Earn 2X Reward Points on all Fresh Bakery & Specialty Beverages this week! • Ask cashier for membership registration.',
};

const DEFAULT_QR_MODAL: QrModalState = {
  isOpen: false,
  amount: 0,
  currency: 'LAK',
  bankName: 'BCEL One QR Pay',
  accountNo: '030120000172042001',
  accountName: '39POS Flagship Store',
  isPaid: false,
};

const DEFAULT_ADS: DisplayAdItem[] = [
  {
    id: 'ad-1',
    title: 'Artisanal Single-Origin Cold Brew',
    subtitle: 'Steeped for 18 hours using premium organic mountain beans',
    badgeText: '☕ BARISTA SPECIAL',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1200&q=80',
    durationSeconds: 8,
    isActive: true,
    order: 0,
    callToAction: 'Order at Cashier',
    priceTag: '35,000 LAK',
  },
  {
    id: 'ad-2',
    title: 'Matcha Green Tea Fusion & Brioche',
    subtitle: 'Ceremonial grade Uji matcha paired with French salted butter pastry',
    badgeText: '🥐 COMBO DEAL -20%',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=1200&q=80',
    durationSeconds: 8,
    isActive: true,
    order: 1,
    callToAction: 'Ask Barista',
    priceTag: '42,000 LAK',
  },
  {
    id: 'ad-3',
    title: 'Woodfired Sourdough Margherita Pizza',
    subtitle: 'San Marzano tomatoes, fresh buffalo mozzarella, fragrant sweet basil',
    badgeText: '🍕 CHEF SIGNATURE',
    type: 'IMAGE',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    durationSeconds: 8,
    isActive: true,
    order: 2,
    callToAction: 'Limited Daily',
    priceTag: '79,000 LAK',
  },
];

export const useCustomerDisplayStore = create<CustomerDisplayState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      ads: DEFAULT_ADS,
      currentAdIndex: 0,
      qrModal: DEFAULT_QR_MODAL,

      updateConfig: (patch) => {
        set((state) => {
          const nextConfig = { ...state.config, ...patch };
          broadcastDisplayState({ config: nextConfig });
          return { config: nextConfig };
        });
      },

      addAd: (newAdData) => {
        set((state) => {
          const newAd: DisplayAdItem = {
            ...newAdData,
            id: `ad-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            order: state.ads.length,
          };
          const nextAds = [...state.ads, newAd];
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      updateAd: (id, patch) => {
        set((state) => {
          const nextAds = state.ads.map((ad) => (ad.id === id ? { ...ad, ...patch } : ad));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      deleteAd: (id) => {
        set((state) => {
          const nextAds = state.ads.filter((ad) => ad.id !== id).map((item, idx) => ({ ...item, order: idx }));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      batchDelete: (ids) => {
        set((state) => {
          const nextAds = state.ads.filter((ad) => !ids.includes(ad.id)).map((item, idx) => ({ ...item, order: idx }));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      batchToggleActive: (ids, active) => {
        set((state) => {
          const nextAds = state.ads.map((ad) => (ids.includes(ad.id) ? { ...ad, isActive: active } : ad));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      reorderAds: (fromIndex, toIndex) => {
        set((state) => {
          const reordered = [...state.ads];
          const [removed] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, removed);
          const nextAds = reordered.map((item, idx) => ({ ...item, order: idx }));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      toggleAdActive: (id) => {
        set((state) => {
          const nextAds = state.ads.map((ad) => (ad.id === id ? { ...ad, isActive: !ad.isActive } : ad));
          broadcastDisplayState({ ads: nextAds });
          return { ads: nextAds };
        });
      },

      setCurrentAdIndex: (index) => {
        set({ currentAdIndex: index });
        broadcastDisplayState({ currentAdIndex: index });
      },

      nextAd: () => {
        const activeAds = get().ads.filter((a) => a.isActive);
        if (activeAds.length === 0) return;
        const currentIdx = get().currentAdIndex;
        const nextIdx = (currentIdx + 1) % activeAds.length;
        set({ currentAdIndex: nextIdx });
        broadcastDisplayState({ currentAdIndex: nextIdx });
      },

      showQrModal: (payload) => {
        const nextModal: QrModalState = {
          ...get().qrModal,
          ...payload,
          isOpen: true,
          isPaid: false,
        };
        set({ qrModal: nextModal });
        broadcastDisplayState({ qrModal: nextModal });
      },

      hideQrModal: () => {
        const nextModal: QrModalState = {
          ...get().qrModal,
          isOpen: false,
          isPaid: false,
        };
        set({ qrModal: nextModal });
        broadcastDisplayState({ qrModal: nextModal });
      },

      setPaymentSuccess: (invoiceNo) => {
        const nextModal: QrModalState = {
          ...get().qrModal,
          isOpen: true,
          isPaid: true,
          invoiceNo: invoiceNo || get().qrModal.invoiceNo,
        };
        set({ qrModal: nextModal });
        broadcastDisplayState({ qrModal: nextModal });
      },

      resetToDefaults: () => {
        set({
          config: DEFAULT_CONFIG,
          ads: DEFAULT_ADS,
          currentAdIndex: 0,
          qrModal: DEFAULT_QR_MODAL,
        });
        broadcastDisplayState({
          config: DEFAULT_CONFIG,
          ads: DEFAULT_ADS,
          currentAdIndex: 0,
          qrModal: DEFAULT_QR_MODAL,
        });
      },
    }),
    {
      name: '39pos-customer-display-storage',
      partialize: (state) => ({
        config: state.config,
        ads: state.ads,
        currentAdIndex: state.currentAdIndex,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// Listen for cross-tab updates to sync secondary window immediately
// ═══════════════════════════════════════════════════════════════
if (displayChannel) {
  displayChannel.onmessage = (event) => {
    if (event.data?.type === 'SYNC_DISPLAY_STATE') {
      const { currentAdIndex, config, ads, qrModal } = event.data;
      useCustomerDisplayStore.setState((prev) => ({
        currentAdIndex: typeof currentAdIndex === 'number' ? currentAdIndex : prev.currentAdIndex,
        config: config ? { ...prev.config, ...config } : prev.config,
        ads: ads ? ads : prev.ads,
        qrModal: qrModal ? qrModal : prev.qrModal,
      }));
    }
  };
}
