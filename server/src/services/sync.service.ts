import { db } from '../database/connection';
import * as schema from '../database/schema';
import { eq } from 'drizzle-orm';

export interface SyncPayload {
  clientTimestamp: string;
  sales: any[];
}

export class SyncService {
  public static async pushSync(payload: SyncPayload) {
    let syncedCount = 0;

    for (const s of payload.sales || []) {
      const existing = (await db.select().from(schema.sales).where(eq(schema.sales.id, s.id)).limit(1))[0];
      if (!existing) {
        await db.insert(schema.sales).values({
          ...s,
          syncStatus: 'SYNCED',
        });
        syncedCount++;
      }
    }

    return {
      success: true,
      syncedCount,
      serverTime: new Date().toISOString(),
    };
  }

  public static async pullSync(lastSyncedAt?: string) {
    const allSales = await db.select().from(schema.sales);
    const allProducts = await db.select().from(schema.products);
    const allCustomers = await db.select().from(schema.customers);

    return {
      serverTime: new Date().toISOString(),
      sales: allSales,
      products: allProducts,
      customers: allCustomers,
    };
  }
}
