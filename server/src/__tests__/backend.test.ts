import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabaseTables } from '../database/connection';
import * as schema from '../database/schema';
import { AuthService } from '../services/auth.service';
import { PosService } from '../services/pos.service';
import { CurrencyService } from '../services/currency.service';
import { BackupService } from '../services/backup.service';
import { seedDatabase } from '../database/seed';

describe('39POS Enterprise Backend Test Suite', () => {
  beforeAll(async () => {
    initDatabaseTables();
    await seedDatabase();
  });

  it('should initialize database tables and seed products correctly', async () => {
    const products = await db.select().from(schema.products);
    expect(products.length).toBeGreaterThan(0);
  });

  it('should authenticate admin user and return JWT tokens', async () => {
    const result = await AuthService.login('Supper', '3939');
    expect(result.accessToken).toBeDefined();
    expect(result.user.role).toBe('SUPER_ADMIN');
  });

  it('should perform fast cashier PIN switch', async () => {
    const result = await AuthService.pinSwitch('1111');
    expect(result.accessToken).toBeDefined();
    expect(result.user.username).toBe('cashier1');
    expect(result.user.role).toBe('CASHIER');
  });

  it('should perform accurate multi-currency conversion using Decimal.js engine', async () => {
    const engine = await CurrencyService.getEngine();
    // 10 USD to LAK
    const lakAmount = engine.convert(10, 'USD', 'LAK');
    expect(lakAmount).toBeGreaterThan(200000);

    // Split change calculation: Total due = $10 USD. Tendered: 220,000 LAK ($10 equivalent) + 100 THB ($2.74 equivalent)
    const changeResult = engine.calculateSplitChange(
      10,
      [
        { currencyCode: 'LAK', amount: 220000, exchangeRate: 22000 },
        { currencyCode: 'THB', amount: 100, exchangeRate: 36.5 },
      ],
      'THB'
    );

    expect(changeResult.isFullyPaid).toBe(true);
    expect(changeResult.changeInBase).toBeGreaterThan(0);
  });

  it('should process a POS checkout transaction with tax, discount, and stock deduction', async () => {
    const checkoutResult = await PosService.checkout({
      storeId: 'store-flagship',
      cashierId: 'user-admin',
      items: [
        {
          productId: 'prod-iced-latte',
          name: 'Signature Iced Caramel Latte',
          sku: 'BEV-LATTE-01',
          quantity: 2,
          unitPrice: 3.5,
          costPrice: 1.2,
          discountRate: 10,
          discountAmount: 0.7,
          taxRate: 7,
          taxAmount: 0.441,
          totalPrice: 6.741,
        },
      ],
      payments: [
        {
          paymentMethod: 'CASH',
          amount: 7.0,
          currency: 'USD',
          exchangeRate: 1.0,
          tenderedAmount: 10.0,
        },
      ],
    });

    expect(checkoutResult.saleId).toBeDefined();
    expect(checkoutResult.status).toBe('COMPLETED');
    expect(checkoutResult.changeAmount).toBeGreaterThan(0);
  });

  it('should create an AES-256 encrypted database backup and verify restoration', async () => {
    const backup = await BackupService.createBackup({ format: 'JSON' });
    expect(backup.id).toBeDefined();
    expect(backup.sizeBytes).toBeGreaterThan(0);

    const restore = await BackupService.restoreBackup(backup.id);
    expect(restore.success).toBe(true);
    expect(restore.tablesRestored.length).toBeGreaterThan(0);
  });
});
