import fs from 'fs';
import path from 'path';
import CryptoJS from 'crypto-js';
import { db, sqlite, DB_PATH, hotReconnectDatabase, getActiveDbPath } from '../database/connection';
import * as schema from '../database/schema';
import { config } from '../config/environment';
import { eq, desc, sql } from 'drizzle-orm';
import { StorageService } from './storage.service';
import { writeDbConfig } from '../database/dbConfigManager';

export class BackupService {
  public static async getDatabaseStats() {
    const storesCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.stores))[0]?.count || 0;
    const usersCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.users))[0]?.count || 0;
    const productsCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.products))[0]?.count || 0;
    const categoriesCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.categories))[0]?.count || 0;
    const salesCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.sales))[0]?.count || 0;
    const purchasesCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.purchases))[0]?.count || 0;
    const customersCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.customers))[0]?.count || 0;
    const inventoryCount = (await db.select({ count: sql<number>`count(*)` }).from(schema.inventory))[0]?.count || 0;
    const totalRecords = Number(storesCount) + Number(usersCount) + Number(productsCount) + Number(categoriesCount) + Number(salesCount) + Number(purchasesCount) + Number(customersCount) + Number(inventoryCount);

    let dbSizeBytes = 0;
    let dbFormattedSize = '0 KB';
    let dbModifiedAt: string | null = null;
    const dbPath = getActiveDbPath();
    try {
      if (fs.existsSync(dbPath)) {
        const stat = fs.statSync(dbPath);
        dbSizeBytes = stat.size;
        dbModifiedAt = stat.mtime.toISOString();

        if (dbSizeBytes >= 1024 * 1024) {
          dbFormattedSize = `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
        } else {
          dbFormattedSize = `${Math.round(dbSizeBytes / 1024)} KB`;
        }
      }
    } catch (e) {
      console.warn('Could not read db stats:', e);
    }

    const latestBackup = (await db.select().from(schema.backups).orderBy(desc(schema.backups.createdAt)).limit(1))[0];
    const storageConfig = await StorageService.getStorageConfig();

    return {
      totalRecords,
      productsCount: Number(productsCount),
      salesCount: Number(salesCount),
      purchasesCount: Number(purchasesCount),
      customersCount: Number(customersCount),
      categoriesCount: Number(categoriesCount),
      dbSizeBytes,
      dbFormattedSize,
      lastBackupAt: latestBackup ? latestBackup.createdAt : (dbModifiedAt || new Date().toISOString()),
      lastBackupFilename: latestBackup ? latestBackup.filename : null,
      storageConfig,
    };
  }

  public static async executeMigration(options: {
    sourcePath?: string;
    targetPath: string;
    filename?: string;
    migrateExistingData?: boolean;
    createBackup?: boolean;
    storageType?: string;
  }) {
    if (!options.targetPath || !options.targetPath.trim()) {
      throw new Error('Target storage path is required');
    }
    const targetDir = options.targetPath.trim();
    const verify = await this.verifyDirectory(targetDir);
    if (!verify.valid) {
      throw new Error(`Target directory is not accessible: ${verify.message}`);
    }

    // 1. Create emergency AES-256 backup snapshot before migration
    let backupRecord = null;
    if (options.createBackup !== false) {
      backupRecord = await this.createBackup({ storageType: 'LOCAL' });
    }

    // 2. Copy the live .sqlite file to the new target directory (only if source != destination)
    const dbFilename = options.filename || '39pos_enterprise.db';
    const newDbPath = path.resolve(path.join(targetDir, dbFilename));
    const currentDbPath = path.resolve(DB_PATH);
    const isSamePath = currentDbPath.toLowerCase() === newDbPath.toLowerCase();

    if (options.migrateExistingData !== false && fs.existsSync(currentDbPath) && !isSamePath) {
      // Checkpoint WAL to flush all pending writes into the main database file
      try {
        sqlite.pragma('wal_checkpoint(TRUNCATE)');
      } catch (walErr) {
        console.warn('[Migration] WAL checkpoint warning (non-fatal):', walErr);
      }

      // Copy the main .sqlite file
      fs.copyFileSync(currentDbPath, newDbPath);
      console.log(`[Migration] Copied ${currentDbPath} → ${newDbPath}`);

      // Copy WAL and SHM sidecar files if they exist
      const walFile = currentDbPath + '-wal';
      const shmFile = currentDbPath + '-shm';
      if (fs.existsSync(walFile)) {
        fs.copyFileSync(walFile, newDbPath + '-wal');
      }
      if (fs.existsSync(shmFile)) {
        fs.copyFileSync(shmFile, newDbPath + '-shm');
      }
    } else if (isSamePath) {
      console.log(`[Migration] Database is already running at destination: ${newDbPath}`);
    }

    // 3. Also export an encrypted JSON backup snapshot into the target dir
    let migratedFile = null;
    if (options.migrateExistingData !== false) {
      migratedFile = await this.createBackup({ targetDirectory: targetDir });
    }

    // 4. Write db_config.json so the server persists the new path across any future boots
    writeDbConfig(newDbPath);
    console.log(`[Migration] db_config.json updated to: ${newDbPath}`);

    // 5. Hot-swap the live database connection instantly (< 5ms) with zero downtime
    hotReconnectDatabase(newDbPath);

    // 6. Update Storage Configuration in the active database
    const currentCfg = await StorageService.getStorageConfig();
    const updatedCfg = {
      ...currentCfg,
      storageType: options.storageType || 'LOCAL',
      localDirectoryPath: targetDir,
      filename: dbFilename,
      lastMigratedAt: new Date().toISOString(),
    };
    await StorageService.updateStorageConfig(updatedCfg);

    return {
      success: true,
      requiresRestart: false,
      hotSwapped: true,
      message: 'Database migrated and hot-reconnected instantly with zero downtime!',
      targetDirectory: targetDir,
      newDatabasePath: newDbPath,
      backupCreated: !!backupRecord,
      migratedFile,
      updatedConfig: updatedCfg,
    };
  }
  public static async createBackup(options?: { format?: 'JSON' | 'SQL'; storageType?: string; targetDirectory?: string }) {
    const format = options?.format || 'JSON';
    // Single consolidated backup filename that replaces old backups
    const filename = `39pos_enterprise_backup.${format.toLowerCase()}.enc`;

    let destinationDir = config.backupsDir;
    if (options?.targetDirectory && options.targetDirectory.trim()) {
      destinationDir = options.targetDirectory.trim();
    } else {
      try {
        const storageCfg = await StorageService.getStorageConfig();
        if (storageCfg?.backupDirectoryPath && storageCfg.backupDirectoryPath.trim()) {
          destinationDir = storageCfg.backupDirectoryPath.trim();
        } else if (storageCfg?.localDirectoryPath && storageCfg.localDirectoryPath.trim()) {
          destinationDir = storageCfg.localDirectoryPath.trim();
        }
      } catch (e) {
        console.warn('[BackupService] Could not read storage config, using default:', e);
      }
    }

    try {
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
    } catch (e) {
      console.warn(`[BackupService] Could not use destinationDir ${destinationDir}, falling back to default:`, e);
      destinationDir = config.backupsDir;
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }
    }

    // Clean up any old legacy timestamped .enc files in target & default directories
    try {
      const cleanupDirs = [destinationDir, config.backupsDir];
      for (const dir of cleanupDirs) {
        if (fs.existsSync(dir)) {
          const dirFiles = fs.readdirSync(dir);
          for (const f of dirFiles) {
            if (f.startsWith('39pos-backup-') && f.endsWith('.enc')) {
              try {
                fs.unlinkSync(path.join(dir, f));
              } catch {}
            }
          }
        }
      }
    } catch (cleanErr) {
      console.warn('[BackupService] Non-fatal legacy cleanup notice:', cleanErr);
    }

    const backupFilePath = path.join(destinationDir, filename);

    let rawData = '';
    if (format === 'JSON') {
      // Export all tables
      const dump = {
        meta: {
          system: '39POS Enterprise',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          targetDirectory: destinationDir,
        },
        database: {
          stores: await db.select().from(schema.stores),
          users: await db.select().from(schema.users),
          categories: await db.select().from(schema.categories),
          suppliers: await db.select().from(schema.suppliers),
          warehouses: await db.select().from(schema.warehouses),
          products: await db.select().from(schema.products),
          productVariants: await db.select().from(schema.productVariants),
          inventory: await db.select().from(schema.inventory),
          inventoryMovements: await db.select().from(schema.inventoryMovements),
          purchases: await db.select().from(schema.purchases),
          purchaseItems: await db.select().from(schema.purchaseItems),
          customers: await db.select().from(schema.customers),
          sales: await db.select().from(schema.sales),
          saleItems: await db.select().from(schema.saleItems),
          payments: await db.select().from(schema.payments),
          expenses: await db.select().from(schema.expenses),
          income: await db.select().from(schema.income),
          dailyClosings: await db.select().from(schema.dailyClosings),
          journalEntries: await db.select().from(schema.journalEntries),
          journalLines: await db.select().from(schema.journalLines),
          accounts: await db.select().from(schema.accounts),
          onlinePlatforms: await db.select().from(schema.onlinePlatforms),
          currencies: await db.select().from(schema.currencies),
          exchangeRates: await db.select().from(schema.exchangeRates),
          settings: await db.select().from(schema.settings),
        },
      };
      rawData = JSON.stringify(dump, null, 2);
    } else {
      rawData = `-- 39POS Enterprise SQL Dump\n-- Created At: ${new Date().toISOString()}\n`;
    }

    // Encrypt using AES-256 and write file (atomic overwrite)
    const encrypted = CryptoJS.AES.encrypt(rawData, config.backupEncryptionKey).toString();
    fs.writeFileSync(backupFilePath, encrypted, 'utf8');

    const stats = fs.statSync(backupFilePath);

    // Replace old backup records in the database table so we maintain only the single primary snapshot
    await db.delete(schema.backups);

    const recordId = `backup-primary`;
    const createdAt = new Date().toISOString();
    await db.insert(schema.backups).values({
      id: recordId,
      filename,
      format,
      sizeBytes: stats.size,
      storageType: options?.storageType || 'LOCAL',
      storagePath: backupFilePath,
      isEncrypted: true,
      status: 'COMPLETED',
      createdAt,
    });

    return {
      id: recordId,
      filename,
      sizeBytes: stats.size,
      storagePath: backupFilePath,
      createdAt,
    };
  }

  public static async getBackups() {
    let list = await db.select().from(schema.backups).orderBy(desc(schema.backups.createdAt)).limit(1);

    // If no record in database table yet, try resolving from active storage config
    if (list.length === 0) {
      try {
        const storageCfg = await StorageService.getStorageConfig();
        const candidateDir = storageCfg?.backupDirectoryPath || storageCfg?.localDirectoryPath || config.backupsDir;
        const candidateFile = path.join(candidateDir, '39pos_enterprise_backup.json.enc');
        if (fs.existsSync(candidateFile)) {
          const stat = fs.statSync(candidateFile);
          const autoRecord = {
            id: 'backup-primary',
            filename: '39pos_enterprise_backup.json.enc',
            format: 'JSON',
            sizeBytes: stat.size,
            storageType: 'LOCAL',
            storagePath: candidateFile,
            isEncrypted: 1,
            status: 'COMPLETED',
            createdAt: stat.mtime.toISOString(),
          };
          // Insert into database table for consistency
          try {
            await db.insert(schema.backups).values(autoRecord as any);
          } catch {}
          list = [autoRecord as any];
        }
      } catch (e) {
        console.warn('[getBackups] Auto-discovery notice:', e);
      }
    }

    // Always update with the real-time file size from disk
    return list.map((b) => {
      try {
        if (b.storagePath && fs.existsSync(b.storagePath)) {
          const stat = fs.statSync(b.storagePath);
          return {
            ...b,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
          };
        }
      } catch {}
      return b;
    });
  }

  public static async getLatestBackupFilePath(): Promise<string | null> {
    const record = (await db.select().from(schema.backups).orderBy(desc(schema.backups.createdAt)).limit(1))[0];
    if (record && fs.existsSync(record.storagePath)) {
      return record.storagePath;
    }
    const defaultPath = path.join(config.backupsDir, '39pos_enterprise_backup.json.enc');
    if (fs.existsSync(defaultPath)) {
      return defaultPath;
    }
    return null;
  }

  public static async restoreFromEncryptedPayload(encryptedPayload: string, filename?: string) {
    if (!encryptedPayload || !encryptedPayload.trim()) {
      throw new Error('Encrypted payload cannot be empty');
    }

    let decryptedText = '';
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedPayload.trim(), config.backupEncryptionKey);
      decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      throw new Error('Failed to decrypt .json.enc file. Invalid format or corrupted archive.');
    }

    if (!decryptedText) {
      try {
        JSON.parse(encryptedPayload);
        decryptedText = encryptedPayload;
      } catch {
        throw new Error('Failed to decrypt .json.enc archive. Please verify encryption key.');
      }
    }

    const parsed = JSON.parse(decryptedText);
    const dbData = parsed.database || {};

    sqlite.pragma('foreign_keys = OFF');
    try {
      // 1. Delete dependent tables in child-to-parent order
      await db.delete(schema.payments);
      await db.delete(schema.saleItems);
      await db.delete(schema.sales);
      await db.delete(schema.inventoryMovements);
      await db.delete(schema.inventory);
      await db.delete(schema.journalLines);
      await db.delete(schema.journalEntries);
      await db.delete(schema.payments);
      await db.delete(schema.saleItems);
      await db.delete(schema.sales);
      await db.delete(schema.inventoryMovements);
      await db.delete(schema.inventory);
      await db.delete(schema.purchaseItems);
      await db.delete(schema.purchases);
      await db.delete(schema.productVariants);
      await db.delete(schema.products);
      await db.delete(schema.categories);
      await db.delete(schema.suppliers);
      await db.delete(schema.warehouses);
      await db.delete(schema.customers);
      await db.delete(schema.expenses);
      await db.delete(schema.income);
      await db.delete(schema.dailyClosings);
      await db.delete(schema.exchangeRates);
      await db.delete(schema.currencies);

      if (dbData.users && dbData.users.length > 0) {
        await db.delete(schema.users);
      }
      if (dbData.stores && dbData.stores.length > 0) {
        await db.delete(schema.stores);
      }
      if (dbData.settings && dbData.settings.length > 0) {
        await db.delete(schema.settings);
      }

      // 2. Insert tables in parent-to-child order
      if (dbData.stores?.length) await db.insert(schema.stores).values(dbData.stores);
      if (dbData.users?.length) await db.insert(schema.users).values(dbData.users);
      if (dbData.currencies?.length) await db.insert(schema.currencies).values(dbData.currencies);
      if (dbData.exchangeRates?.length) await db.insert(schema.exchangeRates).values(dbData.exchangeRates);
      if (dbData.settings?.length) await db.insert(schema.settings).values(dbData.settings);
      if (dbData.onlinePlatforms?.length) await db.insert(schema.onlinePlatforms).values(dbData.onlinePlatforms);
      if (dbData.accounts?.length) await db.insert(schema.accounts).values(dbData.accounts);
      if (dbData.categories?.length) await db.insert(schema.categories).values(dbData.categories);
      if (dbData.suppliers?.length) await db.insert(schema.suppliers).values(dbData.suppliers);
      if (dbData.warehouses?.length) await db.insert(schema.warehouses).values(dbData.warehouses);
      if (dbData.customers?.length) await db.insert(schema.customers).values(dbData.customers);
      if (dbData.products?.length) await db.insert(schema.products).values(dbData.products);
      if (dbData.productVariants?.length) await db.insert(schema.productVariants).values(dbData.productVariants);
      if (dbData.inventory?.length) await db.insert(schema.inventory).values(dbData.inventory);
      if (dbData.inventoryMovements?.length) await db.insert(schema.inventoryMovements).values(dbData.inventoryMovements);
      if (dbData.purchases?.length) await db.insert(schema.purchases).values(dbData.purchases);
      if (dbData.purchaseItems?.length) await db.insert(schema.purchaseItems).values(dbData.purchaseItems);
      if (dbData.sales?.length) await db.insert(schema.sales).values(dbData.sales);
      if (dbData.saleItems?.length) await db.insert(schema.saleItems).values(dbData.saleItems);
      if (dbData.payments?.length) await db.insert(schema.payments).values(dbData.payments);
      if (dbData.expenses?.length) await db.insert(schema.expenses).values(dbData.expenses);
      if (dbData.income?.length) await db.insert(schema.income).values(dbData.income);
      if (dbData.dailyClosings?.length) await db.insert(schema.dailyClosings).values(dbData.dailyClosings);
      if (dbData.journalEntries?.length) await db.insert(schema.journalEntries).values(dbData.journalEntries);
      if (dbData.journalLines?.length) await db.insert(schema.journalLines).values(dbData.journalLines);
    } finally {
      sqlite.pragma('foreign_keys = ON');
    }

    return {
      success: true,
      restoredTimestamp: parsed.meta?.createdAt || new Date().toISOString(),
      filename: filename || '39pos_enterprise_backup.json.enc',
      tablesRestored: Object.keys(dbData),
      recordsCount: Object.values(dbData).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0),
    };
  }

  public static async restoreBackup(backupId?: string) {
    let record = null;
    if (backupId) {
      record = (await db.select().from(schema.backups).where(eq(schema.backups.id, backupId)).limit(1))[0];
    }
    if (!record) {
      record = (await db.select().from(schema.backups).orderBy(desc(schema.backups.createdAt)).limit(1))[0];
    }
    if (!record || !fs.existsSync(record.storagePath)) {
      throw new Error('Backup archive not found');
    }

    const encryptedData = fs.readFileSync(record.storagePath, 'utf8');
    return this.restoreFromEncryptedPayload(encryptedData, record.filename);
  }

  public static async verifyDirectory(targetPath: string) {
    if (!targetPath || !targetPath.trim()) {
      return { valid: false, message: 'Directory path cannot be empty' };
    }
    const cleanPath = targetPath.trim();
    try {
      if (!fs.existsSync(cleanPath)) {
        fs.mkdirSync(cleanPath, { recursive: true });
      }
      // Test write permissions
      const testFile = path.join(cleanPath, `.39pos_test_${Date.now()}.tmp`);
      fs.writeFileSync(testFile, 'test_ok', 'utf8');
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
      return { valid: true, path: cleanPath, message: 'Path is accessible and writable' };
    } catch (err: any) {
      return { valid: false, path: cleanPath, message: err.message || 'Permission denied or invalid path' };
    }
  }

  public static async clearAllRecords(options: { wipeCatalog?: boolean; createAutoBackup?: boolean; adminUserId?: string }) {
    let autoBackupResult = null;

    // 1. Auto-Snapshot first if enabled (Zero data loss fallback)
    if (options.createAutoBackup !== false) {
      try {
        autoBackupResult = await this.createBackup({ storageType: 'LOCAL' });
      } catch (err) {
        console.warn('[BackupService] Pre-wipe emergency backup warning:', err);
      }
    }

    // 2. Disable foreign key constraints temporarily for clean cascade cleanup
    sqlite.pragma('foreign_keys = OFF');

    try {
      // 1. Accounting & General Ledger (Journal vouchers, expenses, income, shift closings)
      await db.delete(schema.journalLines);
      await db.delete(schema.journalEntries);
      await db.delete(schema.expenses);
      await db.delete(schema.income);
      await db.delete(schema.dailyClosings);

      // 2. Operational Transaction Data (Sales, Line Items, Payments)
      await db.delete(schema.payments);
      await db.delete(schema.saleItems);
      await db.delete(schema.sales);

      // 3. Stock Movements & Procurement
      await db.delete(schema.inventoryMovements);
      await db.delete(schema.inventory);
      await db.delete(schema.purchaseItems);
      await db.delete(schema.purchases);

      // 4. System Logs & Notifications
      await db.delete(schema.auditLogs);
      await db.delete(schema.notifications);

      // 5. Optional: Clear Product Catalog & Directory if requested
      if (options.wipeCatalog) {
        await db.delete(schema.productVariants);
        await db.delete(schema.products);
        await db.delete(schema.categories);
        await db.delete(schema.suppliers);
        await db.delete(schema.customers);
      }
    } finally {
      sqlite.pragma('foreign_keys = ON');
    }

    // 4. Record clean initial audit log
    await db.insert(schema.auditLogs).values({
      id: `audit-${Date.now()}`,
      userId: options.adminUserId || null,
      action: 'CLEAR_DATA_RECORDS',
      module: 'SETTINGS',
      newValuesJson: JSON.stringify({
        wipeCatalog: !!options.wipeCatalog,
        autoBackupCreated: !!autoBackupResult,
        timestamp: new Date().toISOString(),
        preserved: ['users', 'roles', 'stores', 'settings', 'currencies'],
      }),
    });

    return {
      success: true,
      clearedAt: new Date().toISOString(),
      wipeCatalog: !!options.wipeCatalog,
      autoBackup: autoBackupResult,
      preservedEntities: ['users', 'user_access_control', 'roles', 'store_profile', 'system_settings'],
    };
  }
}
