import Decimal from 'decimal.js';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  exchangeRate: number; // relative to base currency (e.g. 1 USD = 22,000 LAK, 1 USD = 36 THB)
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
  isActive: boolean;
}

export interface SplitTenderItem {
  currencyCode: string;
  amount: number;
  exchangeRate: number;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', isBase: true, exchangeRate: 1, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', isBase: false, exchangeRate: 22000, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', isBase: false, exchangeRate: 36, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', isBase: false, exchangeRate: 0.92, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', isBase: false, exchangeRate: 7.25, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', isBase: false, exchangeRate: 155, decimalPlaces: 0, symbolPosition: 'before', isActive: true },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', isBase: false, exchangeRate: 1380, decimalPlaces: 0, symbolPosition: 'before', isActive: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', isBase: false, exchangeRate: 1.35, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', isBase: false, exchangeRate: 4.7, decimalPlaces: 2, symbolPosition: 'before', isActive: true },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', isBase: false, exchangeRate: 25400, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', isBase: false, exchangeRate: 4100, decimalPlaces: 0, symbolPosition: 'after', isActive: true },
];

export class CurrencyEngine {
  private currencies: Map<string, CurrencyConfig> = new Map();
  private baseCurrencyCode: string = 'USD';

  constructor(currencies: CurrencyConfig[] = DEFAULT_CURRENCIES) {
    const list = currencies && currencies.length > 0 ? currencies : DEFAULT_CURRENCIES;
    list.forEach(c => {
      this.currencies.set(c.code, c);
      if (c.isBase) {
        this.baseCurrencyCode = c.code;
      }
    });
  }

  public setCurrencies(currencies: CurrencyConfig[]): void {
    if (!currencies || currencies.length === 0) return;
    this.currencies.clear();
    currencies.forEach(c => {
      this.currencies.set(c.code, c);
      if (c.isBase) {
        this.baseCurrencyCode = c.code;
      }
    });
  }

  public getBaseCurrencyCode(): string {
    return this.baseCurrencyCode;
  }

  public getBaseCurrency(): CurrencyConfig {
    return this.currencies.get(this.baseCurrencyCode) || {
      code: this.baseCurrencyCode,
      name: this.baseCurrencyCode,
      symbol: this.baseCurrencyCode,
      isBase: true,
      exchangeRate: 1,
      decimalPlaces: 2,
      symbolPosition: 'before',
      isActive: true,
    };
  }

  public convertFromBase(amount: number | string, toCurrency: string): number {
    return this.convert(amount, this.baseCurrencyCode, toCurrency);
  }

  public convertToBase(amount: number | string, fromCurrency: string): number {
    return this.convert(amount, fromCurrency, this.baseCurrencyCode);
  }

  public convert(amount: number | string, fromCurrency?: string, toCurrency?: string): number {
    const fromCode = fromCurrency || this.baseCurrencyCode;
    const toCode = toCurrency || this.baseCurrencyCode;
    const amtVal = Number(amount) || 0;
    if (fromCode === toCode) return amtVal;

    const from = this.currencies.get(fromCode) || {
      exchangeRate: 1,
      decimalPlaces: 2,
    };
    const to = this.currencies.get(toCode) || {
      exchangeRate: 1,
      decimalPlaces: 2,
    };

    const amt = new Decimal(amtVal);
    const fromRate = new Decimal(from.exchangeRate || 1);
    const toRate = new Decimal(to.exchangeRate || 1);

    // Base amount = amount / from.exchangeRate
    const amountInBase = amt.dividedBy(fromRate);
    // Target amount = amountInBase * to.exchangeRate
    const result = amountInBase.times(toRate);

    // Maintain sufficient precision (at least 6 decimals) for calculations/storage, so small unit costs in high-exchange currencies don't truncate to 0
    const targetDecimals = Math.max(to.decimalPlaces ?? 2, 6);
    return result.toDecimalPlaces(targetDecimals, Decimal.ROUND_HALF_UP).toNumber();
  }

  public format(amount: number | string, currencyCode: string): string {
    const config = this.currencies.get(currencyCode) || {
      code: currencyCode,
      name: currencyCode,
      symbol: currencyCode,
      isBase: false,
      exchangeRate: 1,
      decimalPlaces: 2,
      symbolPosition: 'before' as const,
      isActive: true
    };

    const dec = new Decimal(amount).toDecimalPlaces(config.decimalPlaces, Decimal.ROUND_HALF_UP);
    const formattedNum = dec.toNumber().toLocaleString(undefined, {
      minimumFractionDigits: config.decimalPlaces,
      maximumFractionDigits: config.decimalPlaces
    });

    return config.symbolPosition === 'before'
      ? `${config.symbol} ${formattedNum}`
      : `${formattedNum} ${config.symbol}`;
  }

  public calculateSplitChange(
    totalDueInBase: number,
    tenders: SplitTenderItem[],
    changeCurrencyCode: string
  ): {
    totalTenderedInBase: number;
    changeInBase: number;
    changeInTargetCurrency: number;
    isFullyPaid: boolean;
    remainingDueInBase: number;
  } {
    let totalTenderedInBase = new Decimal(0);

    for (const tender of tenders) {
      const cur = this.currencies.get(tender.currencyCode);
      const rate = tender.exchangeRate || cur?.exchangeRate || 1;
      const tenderInBase = new Decimal(tender.amount).dividedBy(rate);
      totalTenderedInBase = totalTenderedInBase.plus(tenderInBase);
    }

    const totalDue = new Decimal(totalDueInBase);
    const diff = totalTenderedInBase.minus(totalDue);
    const isFullyPaid = diff.greaterThanOrEqualTo(-0.0001);

    const changeInBase = diff.greaterThan(0) ? diff.toNumber() : 0;
    const remainingDueInBase = diff.isNegative() ? diff.abs().toNumber() : 0;

    let changeInTargetCurrency = 0;
    if (changeInBase > 0) {
      changeInTargetCurrency = this.convert(changeInBase, this.baseCurrencyCode, changeCurrencyCode);
    }

    return {
      totalTenderedInBase: totalTenderedInBase.toNumber(),
      changeInBase,
      changeInTargetCurrency,
      isFullyPaid,
      remainingDueInBase
    };
  }
}
