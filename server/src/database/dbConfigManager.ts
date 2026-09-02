import fs from 'fs';
import path from 'path';

// In Electron production mode, use userData as the base for database config
const electronUserData = process.env.ELECTRON_USER_DATA;

const CONFIG_DIR = electronUserData
  ? path.join(electronUserData, 'database')
  : path.resolve(__dirname, '../../../database');

const CONFIG_FILE = path.join(CONFIG_DIR, 'db_config.json');

const DEFAULT_DB_PATH = electronUserData
  ? path.join(electronUserData, 'database', '39pos.sqlite')
  : path.join(CONFIG_DIR, '39pos.sqlite');

export interface DbConfig {
  databasePath: string;
  updatedAt: string;
}

/**
 * Reads the persisted database configuration from db_config.json.
 * This file lives OUTSIDE the SQLite database so it can be read
 * BEFORE the database connection is established.
 */
export function readDbConfig(): DbConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DbConfig;
      if (parsed.databasePath && parsed.databasePath.trim()) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[dbConfigManager] Could not read db_config.json, using default path:', err);
  }
  return null;
}

/**
 * Writes the database path configuration to db_config.json.
 * Called after a successful migration so the next server startup
 * connects to the new location.
 */
export function writeDbConfig(databasePath: string): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  const config: DbConfig = {
    databasePath: databasePath.trim(),
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  console.log(`[dbConfigManager] Database path updated to: ${config.databasePath}`);
}

/**
 * Resolves the database path to use for this server session.
 * Priority: db_config.json > DATABASE_PATH env var > default
 */
export function resolveDbPath(): string {
  // 1. Check db_config.json (user-configured via Storage & Backup UI)
  const savedConfig = readDbConfig();
  if (savedConfig) {
    const cfgPath = savedConfig.databasePath;
    // Verify the configured path's directory exists
    const dir = path.dirname(cfgPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      console.log(`[dbConfigManager] Using configured database path: ${cfgPath}`);
      return cfgPath;
    } catch (err) {
      console.warn(`[dbConfigManager] Configured path directory not accessible (${dir}), falling back to default:`, err);
    }
  }

  // 2. Check environment variable
  if (process.env.DATABASE_PATH) {
    console.log(`[dbConfigManager] Using DATABASE_PATH env var: ${process.env.DATABASE_PATH}`);
    return process.env.DATABASE_PATH;
  }

  // 3. Default — ensure directory exists
  const dbDir = path.dirname(DEFAULT_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log(`[dbConfigManager] Using default database path: ${DEFAULT_DB_PATH}`);
  return DEFAULT_DB_PATH;
}

/**
 * Returns the current active database path (for API exposure).
 */
export function getCurrentDbPath(): string {
  return resolveDbPath();
}

export const DB_CONFIG_FILE_PATH = CONFIG_FILE;
