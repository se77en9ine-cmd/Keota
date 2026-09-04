import { create } from 'zustand';
import { api } from '../api/client';
import { CurrencyConfig, CurrencyEngine, DEFAULT_CURRENCIES } from '39pos-shared';

const CURRENCY_STORAGE_KEY = '39pos_current_currency';
const CURRENCIES_CACHE_KEY = '39pos_currencies_cache';
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

// Initial cached currencies or default
function getInitialCurrencies(): CurrencyConfig[] {
  if (typeof window === 'undefined') return DEFAULT_CURRENCIES;
  try {
    const cached = localStorage.getItem(CURRENCIES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_CURRENCIES;
}

const initialCurrencies = getInitialCurrencies();
const initialBaseCurrency = initialCurrencies.find((c) => c.isBase) || initialCurrencies[0];

const initialCurrency =
  typeof window !== 'undefined'
    ? localStorage.getItem(CURRENCY_STORAGE_KEY) || initialBaseCurrency.code || 'USD'
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
      } else if (e.key === CURRENCIES_CACHE_KEY && e.newValue) {
        try {
          const list = JSON.parse(e.newValue);
          const baseCurrency = list.find((c: CurrencyConfig) => c.isBase) || list[0];
          const engine = new CurrencyEngine(list.filter((c: CurrencyConfig) => c.isActive !== false));
          set({ currencies: list, baseCurrency, engine });
        } catch {}
      }
    });
  }

  return {
    currencies: initialCurrencies,
    currentCurrency: initialCurrency,
    baseCurrency: initialBaseCurrency,
    engine: new CurrencyEngine(initialCurrencies.filter((c) => c.isActive !== false)),
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
          if (typeof window !== 'undefined') {
            localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(list));
          }
        } else {
          set({ isLoading: false });
        }
      } catch {
        // Fallback to cached local storage
        const cached = getInitialCurrencies();
        const baseCurrency = cached.find((c) => c.isBase) || cached[0];
        const engine = new CurrencyEngine(cached.filter((c) => c.isActive !== false));
        set({ currencies: cached, baseCurrency, engine, isLoading: false });
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
      const code = data.code.toUpperCase().trim();
      try {
        const res = await api.post('/currencies', data);
        if (res.data?.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
      } catch {}

      // Resilient local fallback for offline/static demo
      const { currencies } = get();
      const newCur: CurrencyConfig = {
        code,
        name: data.name.trim(),
        symbol: data.symbol.trim(),
        isBase: false,
        exchangeRate: Number(data.exchangeRate) || 1.0,
        decimalPlaces: data.decimalPlaces !== undefined ? Number(data.decimalPlaces) : 2,
        symbolPosition: data.symbolPosition || 'before',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      };
      const updated = [...currencies.filter((c) => c.code !== code), newCur];
      const engine = new CurrencyEngine(updated.filter((c) => c.isActive !== false));
      set({ currencies: updated, engine });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(updated));
      }
      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
        } catch {}
      }
      return { success: true };
    },

    updateCurrency: async (code, data) => {
      try {
        const res = await api.put(`/currencies/${code}`, data);
        if (res.data?.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
      } catch {}

      // Local fallback
      const { currencies } = get();
      const updated = currencies.map((c) => (c.code === code ? { ...c, ...data } : c));
      const engine = new CurrencyEngine(updated.filter((c) => c.isActive !== false));
      set({ currencies: updated, engine });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(updated));
      }
      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
        } catch {}
      }
      return { success: true };
    },

    updateRate: async (code: string, rate: number) => {
      try {
        const res = await api.put(`/currencies/${code}/rate`, { rate });
        if (res.data?.success) {
          const currencies = get().currencies.map((c) =>
            c.code === code ? { ...c, exchangeRate: rate } : c
          );
          const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
          set({ currencies, engine });
          if (typeof window !== 'undefined') {
            localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(currencies));
          }
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'RATES_UPDATED', code, rate });
            } catch {}
          }
          return true;
        }
      } catch {}

      // Local fallback
      const currencies = get().currencies.map((c) =>
        c.code === code ? { ...c, exchangeRate: rate } : c
      );
      const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
      set({ currencies, engine });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(currencies));
      }
      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'RATES_UPDATED', code, rate });
        } catch {}
      }
      return true;
    },

    setBaseCurrency: async (code: string) => {
      const targetCode = code.toUpperCase().trim();
      try {
        const res = await api.post('/currencies/set-base', { code: targetCode });
        if (res.data?.success) {
          await get().fetchCurrencies(true);
          get().setCurrentCurrency(targetCode);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
              currencyChannel.postMessage({ type: 'CURRENCY_CHANGE', currency: targetCode });
            } catch {}
          }
          return { success: true, message: res.data.message };
        }
      } catch (err: any) {
        // Backend not reachable or static demo environment (Netlify 404): perform client-side re-peg seamlessly
      }

      // Re-peg all exchange rates around the new base currency
      const { currencies } = get();
      const target = currencies.find((c) => c.code === targetCode);
      if (!target) {
        return { success: false, message: `Currency ${targetCode} not found` };
      }

      const targetRate = target.exchangeRate || 1;
      const updatedCurrencies: CurrencyConfig[] = currencies.map((c) => {
        if (c.code === targetCode) {
          return { ...c, isBase: true, exchangeRate: 1.0, isActive: true };
        }
        // New rate = oldRate / targetRate
        const newRate = Number((c.exchangeRate / targetRate).toFixed(8));
        return { ...c, isBase: false, exchangeRate: newRate };
      });

      const baseCurrency = updatedCurrencies.find((c) => c.code === targetCode)!;
      const engine = new CurrencyEngine(updatedCurrencies.filter((c) => c.isActive !== false));

      set({ currencies: updatedCurrencies, baseCurrency, engine });
      get().setCurrentCurrency(targetCode);

      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(updatedCurrencies));
        localStorage.setItem(CURRENCY_STORAGE_KEY, targetCode);
      }

      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
          currencyChannel.postMessage({ type: 'CURRENCY_CHANGE', currency: targetCode });
        } catch {}
      }

      return {
        success: true,
        message: `Successfully switched Base Currency to ${targetCode}`,
      };
    },

    toggleCurrencyActive: async (code: string, isActive: boolean) => {
      try {
        const res = await api.put(`/currencies/${code}`, { isActive });
        if (res.data?.success) {
          const currencies = get().currencies.map((c) =>
            c.code === code ? { ...c, isActive } : c
          );
          const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
          set({ currencies, engine });
          if (typeof window !== 'undefined') {
            localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(currencies));
          }
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return true;
        }
      } catch {}

      // Local fallback
      const currencies = get().currencies.map((c) =>
        c.code === code ? { ...c, isActive } : c
      );
      const engine = new CurrencyEngine(currencies.filter((c) => c.isActive !== false));
      set({ currencies, engine });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(currencies));
      }
      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
        } catch {}
      }
      return true;
    },

    deleteCurrency: async (code: string) => {
      try {
        const res = await api.delete(`/currencies/${code}`);
        if (res.data?.success) {
          await get().fetchCurrencies(true);
          if (currencyChannel) {
            try {
              currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
            } catch {}
          }
          return { success: true };
        }
      } catch {}

      // Local fallback
      const { currencies } = get();
      const updated = currencies.filter((c) => c.code !== code);
      const engine = new CurrencyEngine(updated.filter((c) => c.isActive !== false));
      set({ currencies: updated, engine });
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENCIES_CACHE_KEY, JSON.stringify(updated));
      }
      if (currencyChannel) {
        try {
          currencyChannel.postMessage({ type: 'CURRENCIES_MUTATED' });
        } catch {}
      }
      return { success: true };
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
