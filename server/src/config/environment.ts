import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { resolveDbPath } from '../database/dbConfigManager';

dotenv.config();

// In Electron production mode, use userData as the base for all data directories
const electronUserData = process.env.ELECTRON_USER_DATA;
const electronAppPath = process.env.ELECTRON_APP_PATH;

function resolveDataDir(envKey: string, defaultRelative: string, folderName: string): string {
  // 1. Explicit env var
  if (process.env[envKey]) return process.env[envKey]!;

  // 2. Electron production — store in userData (e.g. %APPDATA%/39POS-Enterprise/)
  if (electronUserData) {
    const dir = path.join(electronUserData, folderName);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  // 3. Development fallback — relative to source tree
  return path.resolve(__dirname, defaultRelative);
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || '39pos-enterprise-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '39pos-enterprise-refresh-secret-2026',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  backupEncryptionKey: process.env.BACKUP_KEY || '39pos-aes-256-backup-encryption-key-passphrase',
  databasePath: resolveDbPath(),
  storageDir: resolveDataDir('STORAGE_DIR', '../../../storage', 'storage'),
  backupsDir: resolveDataDir('BACKUPS_DIR', '../../../backups', 'backups'),
  uploadsDir: resolveDataDir('UPLOADS_DIR', '../../../uploads', 'uploads'),
};
