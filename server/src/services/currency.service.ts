import { eq } from 'drizzle-orm';
import { db, sqlite } from '../database/connection';
import { currencies, exchangeRates } from '../database/schema';
import { CurrencyEngine, CurrencyConfig } from '39pos-shared';
import { AppError } from '../middlewares/errorHandler';

export class CurrencyService {
  private static engine: CurrencyEngine = new CurrencyEngine();

  public static async getCurrencies(includeAll: boolean = false): Promise<CurrencyConfig[]> {
    const query = includeAll
      ? db.select().from(currencies)
      : db.select().from(currencies).where(eq(currencies.isActive, true));

    const records = await query;
    const configs: CurrencyConfig[] = records.map((r) => ({
      code: r.code,
      name: r.name,
      symbol: r.symbol,
      isBase: Boolean(r.isBase),
      exchangeRate: r.exchangeRate,
      decimalPlaces: r.decimalPlaces,
      symbolPosition: (r.symbolPosition as 'before' | 'after') || 'before',
      isActive: Boolean(r.isActive),
    }));

    if (!includeAll) {
      this.engine.setCurrencies(configs);
    }
    return configs;
  }

  public static async setBaseCurrency(newBaseCode: string) {
    const code = newBaseCode.toUpperCase().trim();
    const all = await db.select().from(currencies);
    const target = all.find((c) => c.code === code);
    if (!target) throw new AppError(`Currency "${code}" not found`, 404);

    if (target.isBase) {
      return { success: true, message: `${code} is already the base currency`, baseCurrency: code };
    }

    const currentBase = all.find((c) => c.isBase) || all[0];
    const targetRate = target.exchangeRate || 1;

    // Transaction to re-peg all currencies against the new base
    const setBaseTx = sqlite.transaction(() => {
      for (const c of all) {
        if (c.code === code) {
          sqlite.prepare(`
            UPDATE currencies 
            SET is_base = 1, exchange_rate = 1.0, is_active = 1, updated_at = ? 
            WHERE code = ?
          `).run(new Date().toISOString(), code);
        } else {
          // New rate = oldRate / targetRate
          const newRate = Number((c.exchangeRate / targetRate).toFixed(8));
          sqlite.prepare(`
            UPDATE currencies 
            SET is_base = 0, exchange_rate = ?, updated_at = ? 
            WHERE code = ?
          `).run(newRate, new Date().toISOString(), c.code);
        }
      }

      // Record exchange rate history
      sqlite.prepare(`
        INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `rate-base-change-${Date.now()}`,
        currentBase?.code || 'USD',
        code,
        1.0,
        new Date().toISOString(),
        'BASE_CURRENCY_SWITCH'
      );
    });

    setBaseTx();
    await this.getCurrencies();
    return { success: true, message: `Successfully switched Base Currency to ${code}`, baseCurrency: code };
  }

  public static async createCurrency(data: {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    decimalPlaces?: number;
    symbolPosition?: 'before' | 'after';
    isActive?: boolean;
  }) {
    const code = data.code.toUpperCase().trim();
    if (!code || code.length < 2 || code.length > 5) {
      throw new AppError('Currency code must be 2-5 uppercase letters', 400);
    }

    const existing = (await db.select().from(currencies).where(eq(currencies.code, code)).limit(1))[0];
    if (existing) {
      throw new AppError(`Currency code ${code} already exists`, 409);
    }

    const newCur = {
      code,
      name: data.name.trim(),
      symbol: data.symbol.trim(),
      isBase: false,
      exchangeRate: Number(data.exchangeRate) || 1.0,
      decimalPlaces: data.decimalPlaces !== undefined ? Number(data.decimalPlaces) : 2,
      symbolPosition: data.symbolPosition || 'before',
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      updatedAt: new Date().toISOString(),
    };

    await db.insert(currencies).values(newCur);

    // Record rate history
    await db.insert(exchangeRates).values({
      id: `rate-${Date.now()}-${code}`,
      fromCurrency: 'USD',
      toCurrency: code,
      rate: newCur.exchangeRate,
      effectiveDate: new Date().toISOString(),
      source: 'INITIAL_CREATE',
    });

    await this.getCurrencies();
    return newCur;
  }

  public static async updateCurrency(
    code: string,
    data: Partial<{
      name: string;
      symbol: string;
      exchangeRate: number;
      decimalPlaces: number;
      symbolPosition: 'before' | 'after';
      isActive: boolean;
    }>
  ) {
    const cur = (await db.select().from(currencies).where(eq(currencies.code, code)).limit(1))[0];
    if (!cur) throw new AppError(`Currency ${code} not found`, 404);

    const updatePayload: any = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.symbol !== undefined) updatePayload.symbol = data.symbol.trim();
    if (data.decimalPlaces !== undefined) updatePayload.decimalPlaces = Number(data.decimalPlaces);
    if (data.symbolPosition !== undefined) updatePayload.symbolPosition = data.symbolPosition;
    if (data.isActive !== undefined) {
      if (cur.isBase && !data.isActive) {
        throw new AppError('Base currency cannot be deactivated or hidden', 400);
      }
      updatePayload.isActive = Boolean(data.isActive);
    }

    if (data.exchangeRate !== undefined) {
      const newRate = Number(data.exchangeRate);
      if (cur.isBase && newRate !== 1) {
        throw new AppError('Base currency exchange rate must remain 1.0', 400);
      }
      updatePayload.exchangeRate = newRate;

      // Record rate history
      await db.insert(exchangeRates).values({
        id: `rate-${Date.now()}-${code}`,
        fromCurrency: 'USD',
        toCurrency: code,
        rate: newRate,
        effectiveDate: new Date().toISOString(),
        source: 'MANUAL_UPDATE',
      });
    }

    await db.update(currencies).set(updatePayload).where(eq(currencies.code, code));
    await this.getCurrencies();
    return { code, ...updatePayload };
  }

  public static async updateRate(code: string, newRate: number, source: string = 'MANUAL') {
    return this.updateCurrency(code, { exchangeRate: newRate });
  }

  public static async deleteCurrency(code: string) {
    const cur = (await db.select().from(currencies).where(eq(currencies.code, code)).limit(1))[0];
    if (!cur) throw new AppError(`Currency ${code} not found`, 404);
    if (cur.isBase) throw new AppError('Cannot delete system base currency', 400);

    await db.delete(currencies).where(eq(currencies.code, code));
    await this.getCurrencies();
    return { code, deleted: true };
  }

  public static async getEngine(): Promise<CurrencyEngine> {
    await this.getCurrencies();
    return this.engine;
  }
}
export default CurrencyService;
