import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../database/connection';
import { settings } from '../database/schema';
import { eq } from 'drizzle-orm';
import { config } from '../config/environment';

export class StorageService {
  public static async getStorageConfig() {
    const record = (await db.select().from(settings).where(eq(settings.key, 'storage_config')).limit(1))[0];
    if (record) {
      return JSON.parse(record.valueJson);
    }
    return {
      storageType: 'LOCAL',
      localDirectoryPath: 'D:\\39POS\\Data',
      backupDirectoryPath: 'D:\\39POS\\Backups',
      filename: '39pos_enterprise.db',
      backupFilename: '39pos_enterprise_backup.json.enc',
      nasSharePath: '\\\\192.168.1.100\\39pos-backup',
      s3Bucket: '39pos-cloud-enterprise-backups',
      encryptionEnabled: true,
      autoBackupEnabled: true,
      autoBackupIntervalHours: 1,
      accessMode: 'read-write',
    };
  }

  public static async updateStorageConfig(data: any) {
    const existing = (await db.select().from(settings).where(eq(settings.key, 'storage_config')).limit(1))[0];
    if (existing) {
      await db
        .update(settings)
        .set({ valueJson: JSON.stringify(data), updatedAt: new Date().toISOString() })
        .where(eq(settings.key, 'storage_config'));
    } else {
      await db.insert(settings).values({
        id: `set-storage-${Date.now()}`,
        key: 'storage_config',
        category: 'STORAGE',
        valueJson: JSON.stringify(data),
      });
    }

    return { message: 'Storage configuration updated' };
  }

  public static validatePath(targetPath: string) {
    try {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      return { valid: true, path: targetPath, exists: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  public static async getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const addresses: { interface: string; ip: string }[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({ interface: name, ip: net.address });
        }
      }
    }

    const storageCfg = await this.getStorageConfig();
    const customIp = storageCfg?.customIp;
    const customPort = storageCfg?.customWebPort || 3000;

    const primaryIp = customIp && customIp.trim() ? customIp.trim() : addresses[0]?.ip || '127.0.0.1';
    const webPort = customPort || 3000;

    return {
      hostname: os.hostname(),
      primaryIp,
      customIp: customIp || '',
      customPort: webPort,
      addresses,
      webPort,
      apiPort: config.port,
      terminalUrl: `http://${primaryIp}:${webPort}`,
      apiHealthUrl: `http://${primaryIp}:${config.port}/api/health`,
    };
  }
}
