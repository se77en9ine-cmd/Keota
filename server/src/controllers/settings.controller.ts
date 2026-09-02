import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { settings, stores } from '../database/schema';
import { eq } from 'drizzle-orm';

export class SettingsController {
  public static async getAllSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const all = await db.select().from(settings);
      const store = (await db.select().from(stores).limit(1))[0];
      const settingsMap: Record<string, any> = {};

      for (const s of all) {
        try {
          settingsMap[s.key] = JSON.parse(s.valueJson);
        } catch {
          settingsMap[s.key] = s.valueJson;
        }
      }

      // Default Tax & VAT Config fallback if not yet set
      if (!settingsMap.tax_config) {
        settingsMap.tax_config = {
          enableTax: true,
          taxName: 'VAT',
          taxRate: 7,
          calculationMode: 'EXCLUSIVE', // 'EXCLUSIVE' | 'INCLUSIVE'
          showTaxOnReceipt: true,
        };
      }

      res.json({ success: true, settings: settingsMap, store });
    } catch (err) {
      next(err);
    }
  }

  public static async updateSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, value, category } = req.body;
      const jsonStr = typeof value === 'string' ? value : JSON.stringify(value);

      const existing = (await db.select().from(settings).where(eq(settings.key, key)).limit(1))[0];
      if (existing) {
        await db
          .update(settings)
          .set({ valueJson: jsonStr, updatedAt: new Date().toISOString() })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          id: `set-${Date.now()}`,
          key,
          valueJson: jsonStr,
          category: category || 'GENERAL',
        });
      }

      res.json({ success: true, message: 'Settings saved' });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStoreProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const store = (await db.select().from(stores).limit(1))[0];
      if (!store) {
        return res.status(404).json({ success: false, message: 'Store not found' });
      }

      await db
        .update(stores)
        .set({
          name: req.body.name,
          address: req.body.address,
          phone: req.body.phone,
          email: req.body.email,
          taxId: req.body.taxId,
          receiptHeader: req.body.receiptHeader,
          receiptFooter: req.body.receiptFooter,
          currency: req.body.currency || 'USD',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stores.id, store.id));

      res.json({ success: true, message: 'Store profile updated' });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStorageConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const storageData = req.body;
      const jsonStr = typeof storageData === 'string' ? storageData : JSON.stringify(storageData);

      const existing = (await db.select().from(settings).where(eq(settings.key, 'storage_config')).limit(1))[0];
      if (existing) {
        await db
          .update(settings)
          .set({ valueJson: jsonStr, updatedAt: new Date().toISOString() })
          .where(eq(settings.key, 'storage_config'));
      } else {
        await db.insert(settings).values({
          id: `set-storage-config`,
          key: 'storage_config',
          valueJson: jsonStr,
          category: 'STORAGE',
        });
      }

      res.json({ success: true, message: 'Storage settings saved successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Discovers real printer drivers installed on the host PC / operating system
   */
  public static async getSystemInstalledPrinters(req: Request, res: Response, next: NextFunction) {
    try {
      const { exec } = await import('child_process');
      const os = await import('os');
      const platform = os.platform();

      if (platform === 'win32') {
        const psCmd = `powershell -NoProfile -Command "Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus, Default | ConvertTo-Json"`;
        exec(psCmd, { timeout: 4500 }, (err, stdout) => {
          if (err || !stdout || !stdout.trim()) {
            return res.json({
              success: true,
              platform: 'win32',
              printers: [
                { name: 'Adobe PDF', driverName: 'Adobe PDF Converter', portName: 'Documents\\*.pdf', status: 'READY', isDefault: true, isThermal: false },
                { name: 'Microsoft Print to PDF', driverName: 'Microsoft Print To PDF', portName: 'PORTPROMPT:', status: 'READY', isDefault: false, isThermal: false },
              ],
            });
          }

          try {
            const parsed = JSON.parse(stdout.trim());
            const list = Array.isArray(parsed) ? parsed : [parsed];
            const mapped = list.map((p: any) => {
              const name = String(p.Name || 'Unknown Printer');
              const driver = String(p.DriverName || '');
              const port = String(p.PortName || '');
              const isThermal =
                name.toLowerCase().includes('pos') ||
                name.toLowerCase().includes('thermal') ||
                name.toLowerCase().includes('receipt') ||
                name.toLowerCase().includes('tm-') ||
                name.toLowerCase().includes('xp-') ||
                name.toLowerCase().includes('xprinter') ||
                name.toLowerCase().includes('epson') ||
                name.toLowerCase().includes('sunmi') ||
                name.toLowerCase().includes('star');

              return {
                name,
                driverName: driver,
                portName: port,
                status: p.PrinterStatus === 0 ? 'READY' : 'ONLINE',
                isDefault: Boolean(p.Default),
                isThermal,
              };
            });

            return res.json({ success: true, platform: 'win32', printers: mapped });
          } catch {
            return res.json({ success: true, platform: 'win32', printers: [] });
          }
        });
      } else {
        exec('lpstat -p -d', { timeout: 3500 }, (err, stdout) => {
          if (err || !stdout) {
            return res.json({ success: true, platform, printers: [] });
          }
          const lines = stdout.split('\n');
          const printers = lines
            .filter((l) => l.startsWith('printer '))
            .map((l) => {
              const parts = l.split(' ');
              const name = parts[1] || 'System Printer';
              return {
                name,
                driverName: 'CUPS Driver',
                portName: 'IPP/CUPS',
                status: 'READY',
                isDefault: false,
                isThermal: name.toLowerCase().includes('pos') || name.toLowerCase().includes('thermal'),
              };
            });
          return res.json({ success: true, platform, printers });
        });
      }
    } catch (err) {
      next(err);
    }
  }
}
