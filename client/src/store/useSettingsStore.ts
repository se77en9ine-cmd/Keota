import { create } from 'zustand';
import { api } from '../api/client';
import { StoreDTO } from '39pos-shared';
import { useCartStore } from './useCartStore';
import { ReceiptConfig, DEFAULT_RECEIPT_CONFIG } from '../utils/printEngine';
import { ExpiryTagSystemConfig, DEFAULT_EXPIRY_TAG_CONFIG } from '../utils/expiryTagUtils';

export type BusinessMode = 'RETAIL_MINIMART' | 'RESTAURANT_CAFE' | 'ONLINE_HUB' | 'HYBRID';

export interface TaxConfig {
  enableTax: boolean;
  taxName: string;
  taxRate: number;
  calculationMode: 'EXCLUSIVE' | 'INCLUSIVE';
  showTaxOnReceipt: boolean;
}

export const ALL_CHANNELS = [
  { id: 'POS', label: 'In-Store POS', icon: '🏪' },
  { id: 'GRAB_FOOD', label: 'GrabFood', icon: '🟢' },
  { id: 'FOODPANDA', label: 'Foodpanda', icon: '🩷' },
  { id: 'SHOPEE', label: 'Shopee', icon: '🟠' },
  { id: 'TIKTOK_SHOP', label: 'TikTok Shop', icon: '🎵' },
  { id: 'WEB_STORE', label: 'Web Store', icon: '🌐' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: '💬' },
  { id: 'PHONE', label: 'Phone Order', icon: '📞' },
];

const DEFAULT_ENABLED_CHANNELS = [
  'POS',
  'GRAB_FOOD',
  'FOODPANDA',
  'SHOPEE',
  'TIKTOK_SHOP',
  'WEB_STORE',
  'WHATSAPP',
  'PHONE',
];

interface SettingsState {
  store: StoreDTO | null;
  settings: Record<string, any>;
  taxConfig: TaxConfig;
  receiptConfig: ReceiptConfig;
  expiryTagConfig: ExpiryTagSystemConfig;
  businessMode: BusinessMode;
  enabledChannels: string[];
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  isLoading: boolean;
  fetchSettings: () => Promise<void>;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBusinessMode: (mode: BusinessMode) => Promise<void>;
  setEnabledChannels: (channels: string[]) => Promise<void>;
  toggleChannel: (channelId: string) => Promise<void>;
  updateStoreProfile: (data: Partial<StoreDTO>) => Promise<void>;
  saveSetting: (key: string, value: any, category?: string) => Promise<void>;
  updateTaxConfig: (config: Partial<TaxConfig>) => Promise<void>;
  updateReceiptConfig: (config: Partial<ReceiptConfig>) => Promise<void>;
  updateExpiryTagConfig: (config: Partial<ExpiryTagSystemConfig>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  store: null,
  settings: {},
  sidebarCollapsed: localStorage.getItem('39pos_sidebar_collapsed') === 'true',
  businessMode: (localStorage.getItem('39pos_business_mode') as BusinessMode) || 'ONLINE_HUB',
  enabledChannels: (() => {
    try {
      const stored = localStorage.getItem('39pos_enabled_channels');
      return stored ? JSON.parse(stored) : DEFAULT_ENABLED_CHANNELS;
    } catch {
      return DEFAULT_ENABLED_CHANNELS;
    }
  })(),
  taxConfig: {
    enableTax: true,
    taxName: 'VAT',
    taxRate: 7,
    calculationMode: 'EXCLUSIVE',
    showTaxOnReceipt: true,
  },
  receiptConfig: (() => {
    try {
      const local = localStorage.getItem('39pos_receipt_config');
      const parsed = local ? JSON.parse(local) : {};
      // If placeholder or empty, use authentic default
      if (!parsed.paymentQrAccountNo || parsed.paymentQrAccountNo === '030120000172042001') {
        parsed.paymentQrAccountNo = '00020101021115312031041800520446CH5F30D5486E68138590016A00526628466257701082771041802030020316mch5f30d5486e6815204546253034185802LA59052 M D6002SV62150211020585211156304C756';
        parsed.paymentQrAccountName = '2 M D';
        parsed.paymentQrBankName = 'BCEL OnePay (LAPNet / Lao QR)';
      }
      return { ...DEFAULT_RECEIPT_CONFIG, ...parsed };
    } catch {
      return DEFAULT_RECEIPT_CONFIG;
    }
  })(),
  expiryTagConfig: (() => {
    try {
      const local = localStorage.getItem('39pos_expiry_tag_config');
      return local ? { ...DEFAULT_EXPIRY_TAG_CONFIG, ...JSON.parse(local) } : DEFAULT_EXPIRY_TAG_CONFIG;
    } catch {
      return DEFAULT_EXPIRY_TAG_CONFIG;
    }
  })(),
  theme: (localStorage.getItem('39pos_theme') as 'dark' | 'light') || 'dark',
  isLoading: true,

  fetchSettings: async () => {
    try {
      const res = await api.get('/settings');
      const storeSettings = res.data.settings || {};
      const tax = storeSettings.tax_config || {
        enableTax: true,
        taxName: 'VAT',
        taxRate: 7,
        calculationMode: 'EXCLUSIVE',
        showTaxOnReceipt: true,
      };

      const serverReceipt = storeSettings.receipt_config || null;
      const mergedReceipt = serverReceipt
        ? { ...DEFAULT_RECEIPT_CONFIG, ...serverReceipt }
        : get().receiptConfig;

      const serverExpiryTag = storeSettings.expiry_tag_config || null;
      const mergedExpiryTag = serverExpiryTag
        ? { ...DEFAULT_EXPIRY_TAG_CONFIG, ...serverExpiryTag }
        : get().expiryTagConfig;

      const serverMode = storeSettings.business_mode as BusinessMode;
      const serverChannels = storeSettings.enabled_channels as string[];

      const activeMode = serverMode || get().businessMode || 'HYBRID';
      const activeChannels = serverChannels && Array.isArray(serverChannels) && serverChannels.length > 0
        ? serverChannels
        : get().enabledChannels;

      set({
        store: res.data.store || null,
        settings: storeSettings,
        taxConfig: tax,
        receiptConfig: mergedReceipt,
        expiryTagConfig: mergedExpiryTag,
        businessMode: activeMode,
        enabledChannels: activeChannels,
        isLoading: false,
      });

      // Synchronize active tax config directly into cart engine
      try {
        useCartStore.getState().setTaxConfig({
          enableTax: tax.enableTax,
          taxName: tax.taxName,
          taxRate: tax.taxRate,
          calculationMode: tax.calculationMode,
        });
      } catch {}
    } catch {
      set({ isLoading: false });
    }
  },

  setBusinessMode: async (mode: BusinessMode) => {
    localStorage.setItem('39pos_business_mode', mode);
    set({ businessMode: mode });
    try {
      await api.post('/settings/save', {
        key: 'business_mode',
        value: mode,
        category: 'STORE',
      });
    } catch {}
  },

  setEnabledChannels: async (channels: string[]) => {
    localStorage.setItem('39pos_enabled_channels', JSON.stringify(channels));
    set({ enabledChannels: channels });
    try {
      await api.post('/settings/save', {
        key: 'enabled_channels',
        value: channels,
        category: 'OMNICHANNEL',
      });
    } catch {}
  },

  toggleChannel: async (channelId: string) => {
    const current = get().enabledChannels;
    let next: string[];
    if (current.includes(channelId)) {
      if (current.length === 1) return; // Prevent disabling all channels
      next = current.filter((c) => c !== channelId);
    } else {
      next = [...current, channelId];
    }
    await get().setEnabledChannels(next);
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('39pos_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem('39pos_sidebar_collapsed', String(next));
    } catch {}
    set({ sidebarCollapsed: next });
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    try {
      localStorage.setItem('39pos_sidebar_collapsed', String(collapsed));
    } catch {}
    set({ sidebarCollapsed: collapsed });
  },

  updateStoreProfile: async (data) => {
    await api.put('/settings/store', data);
    set((state) => ({
      store: state.store ? { ...state.store, ...data } : (data as StoreDTO),
    }));
  },

  saveSetting: async (key, value, category) => {
    await api.post('/settings/save', { key, value, category });
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }));
  },

  updateTaxConfig: async (config) => {
    const nextTax = { ...get().taxConfig, ...config };
    await api.post('/settings/save', {
      key: 'tax_config',
      value: nextTax,
      category: 'TAX',
    });
    set((state) => ({
      taxConfig: nextTax,
      settings: { ...state.settings, tax_config: nextTax },
    }));
    try {
      useCartStore.getState().setTaxConfig({
        enableTax: nextTax.enableTax,
        taxName: nextTax.taxName,
        taxRate: nextTax.taxRate,
        calculationMode: nextTax.calculationMode,
      });
    } catch {}
  },

  updateReceiptConfig: async (config) => {
    const nextReceipt = { ...get().receiptConfig, ...config };
    try {
      localStorage.setItem('39pos_receipt_config', JSON.stringify(nextReceipt));
    } catch {}
    set((state) => ({
      receiptConfig: nextReceipt,
      settings: { ...state.settings, receipt_config: nextReceipt },
    }));
    try {
      await api.post('/settings/save', {
        key: 'receipt_config',
        value: nextReceipt,
        category: 'PRINTER',
      });
    } catch {}
  },

  updateExpiryTagConfig: async (config) => {
    const current = get().expiryTagConfig || DEFAULT_EXPIRY_TAG_CONFIG;
    const nextConfig: ExpiryTagSystemConfig = {
      ...current,
      ...config,
      tiers: {
        ...current.tiers,
        ...(config.tiers || {}),
      },
    };

    try {
      localStorage.setItem('39pos_expiry_tag_config', JSON.stringify(nextConfig));
    } catch {}

    set((state) => ({
      expiryTagConfig: nextConfig,
      settings: { ...state.settings, expiry_tag_config: nextConfig },
    }));

    try {
      await api.post('/settings/save', {
        key: 'expiry_tag_config',
        value: nextConfig,
        category: 'STORE',
      });
    } catch (err) {
      console.warn('Failed to persist expiry_tag_config to backend:', err);
    }
  },
}));

