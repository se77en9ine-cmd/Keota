import { create } from 'zustand';
import { api } from '../api/client';
import { CurrencyConfig, CurrencyEngine, DEFAULT_CURRENCIES } from '39pos-shared';

const CURRENCY_STORAGE_KEY = '39pos_current_currency';
const CURRENCY_CHANNEL_NAME = '39pos-currency-sync';
let currencyChannel: BroadcastChannel | null = null;

try {
  currencyChannel = new BroadcastChannel(CURRENCY_CHANNEL_NAME);
} catch {
  // BroadcastChannel unavailable
}

export type CurrencyItem = CurrencyConfig;

interface CurrencyState {
  currencies: CurrencyConfig[];
  currentCurrency: string;
  baseCurrency: CurrencyConfig;
  engine: CurrencyEngine;
  isLoading: boolean;
  fetchCurrencies: (includeAll?: boolean) => Promise<void>;
  setCurrentCurrency: (code: string, broadcast?: boolean) => void;
  getBaseCurrency: () => CurrencyConfig;
  convertFromBase: (amount: number | string, toCurrency?: string) => number;
  convertToBase: (amount: number | string, fromCurrency?: string) => number;
  createCurrency: (data: {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    decimalPlaces?: number;
    symbolPosition?: 'before' | 'after';
    isActive?: boolean;
  }) => Promise<{ success: boolean; message?: string }>;
  updateCurrency: (
    code: string,
    data: Partial<{
      name: string;
      symbol: string;
      exchangeRate: number;
      decimalPlaces: number;
      symbolPosition: 'before' | 'after';
      isActive: boolean;
    }>
  ) => Promise<{ success: boolean; message?: string }>;
  updateRate: (code: string, rate: number) => Promise<boolean>;
  setBaseCurrency: (code: string) => Promise<{ success: boolean; message?: string }>;
  deleteCurrency: (code: string) => Promise<{ success: boolean; message?: string }>;
  toggleCurrencyActive: (code: string, isActive: boolean) => Promise<boolean>;
  format: (amount: number | string, currencyCode?: string) => string;
  convert: (amount: number | string, from?: string, to?: string) => number;
}

const initialCurrency =
  typeof window !== 'undefined'
    ? localStorage.getItem(CURRENCY_STORAGE_KEY) || 'USD'
    : 'USD';

export const useCurrencyStore = create<CurrencyState>((set, get) => {
  // Listen for currency updates from other tabs
  if (currencyChannel) {
    currencyChannel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'CURRENCY_CHANGE' && event.data.currency) {
        set({ currentCurrency: event.data.currency });
        if (typeof window !== 'undefined') {
          localStorage.setItem(CURRENCY_STORAGE_KEY, event.data.currency);
        }
      } else if (event.data?.type === 'RATES_UPDATED' || event.data?.type === 'CURRENCIES_MUTATED') {
        get().fetchCurrencies(true);
      }
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === CURRENCY_STORAGE_KEY && e.newValue) {
        set({ currentCurrency: e.newValue });
      }
    });
  }

  return {
    currencies: DEFAULT_CURRENCIES,
    currentCurrency: initialCurrency,
    baseCurrency: DEFAULT_CURRENCIES.find((c) => c.isBase) || DEFAULT_CURRENCIES[0],
    engine: new CurrencyEngine(DEFAULT_CURRENCIES),
    isLoading: false,

    getBaseCurrency: () => {
      const { currencies } = get();
      return currencies.find((c) => c.isBase) || currencies[0] || DEFAULT_CURRENCIES[0];
    },

    convertFromBase: (amount, toCurrency) => {
      const { engine, currentCurrency, getBaseCurrency } = get();
      const base = getBaseCurrency();
      const target = toCurrency || currentCurrency;
      return engine.convert(amount, base.code, target);
    },

    convertToBase: (amount, fromCurrency) => {
      const { engine, currentCurrency, getBaseCurrency } = get();
      const base = getBaseCurrency();
      const source = fromCurrency || currentCurrency;
      return engine.convert(amount, source, base.code);
    },

    fetchCurrencies: async (includeAll = true) => {
      try {
        set({ isLoading: true });
        const res = await api.get(`/currencies?includeAll=${includeAll}`);
        const list: CurrencyConfig[] = res.data.currencies || [];
        if (list.length > 0) {
          const engine = new CurrencyEngine(list.filter((c) => c.isActive !== false));
          const baseCurrency = list.find((c) => c.isBase) || list[0];
          set({ currencies: list, baseCurrency, engine, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch {
        set({ isLoading: false });
      }
    },

    setCurrentCurrency: (code: string, broadcast = true) => {
      set({ currentCurrency: code });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      }
      if (broadcast && currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCY_CHANGE', currency: code });
        } catch {}
      }
    },

    createCurrency: async (data) => {
      try {
        const res = await api.post('/currencies', data);
        if (res.data.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
        return { success: false, message: res.data.message || 'Failed to create currency' };
      } catch (err: any) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },

    updateCurrency: async (code, data) => {
      try {
        const res = await api.put(`/currencies/${code}`, data);
        if (res.data.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
        return { success: false, message: res.data.message || 'Failed to update currency' };
      } catch (err: any) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },

    updateRate: async (code: string, rate: number) => {
      try {
        const res = await api.put(`/currencies/${code}/rate`, { rate });
        if (res.data.success) {
          const currencies = get().currencies.map((c) =>
            c.code === code ? { ...c, exchangeRate: rate } : c
          );
          const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
          set({ currencies, engine });
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'RATES_UPDATED', code, rate });
            } catch {}
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to update currency rate', err);
        return false;
      }
    },

    setBaseCurrency: async (code: string) => {
      try {
        const res = await api.post('/currencies/set-base', { code });
        if (res.data.success) {
          await get().fetchCurrencies(true);
          get().setCurrentCurrency(code);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
              currencyChannel.postMessage({ type: 'CURRENCY_CHANGE', currency: code });
            } catch {}
          }
          return { success: true, message: res.data.message };
        }
        return { success: false, message: res.data.message || 'Failed to switch base currency' };
      } catch (err: any) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },

    toggleCurrencyActive: async (code: string, isActive: boolean) => {
      try {
        const res = await api.put(`/currencies/${code}`, { isActive });
        if (res.data.success) {
          const currencies = get().currencies.map((c) =>
            c.code === code ? { ...c, isActive } : c
          );
          const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
          set({ currencies, engine });
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to toggle currency status', err);
        return false;
      }
    },

    deleteCurrency: async (code: string) => {
      try {
        const res = await api.delete(`/currencies/${code}`);
        if (res.data.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
        return { success: false, message: res.data.message || 'Failed to delete currency' };
      } catch (err: any) {
        return { success: false, message: err.response?.data?.message || err.message };
      }
    },

    format: (amount, currencyCode) => {
      const { engine, currentCurrency } = get();
      const code = currencyCode || currentCurrency;
      return engine.format(amount, code);
    },

    convert: (amount, from, to) => {
      const { engine } = get();
      return engine.convert(amount, from, to);
    },
  };
});
export default useCurrencyStore;
