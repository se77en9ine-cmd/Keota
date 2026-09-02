import { db } from '../database/connection';
import {
  warehouseZones,
  warehouseRacks,
  warehouseShelves,
  stockLocationAssignments,
  warehouses,
  products,
  inventory,
  inventoryMovements,
} from '../database/schema';
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export class LocationService {
  /**
   * Get full hierarchical location tree for a warehouse:
   * Warehouse -> Zones (Production & Retail) -> Racks -> Shelves + Assigned stock count
   */
  async getLocationTree(warehouseId?: string) {
    // 1. Get all warehouses or specific warehouse
    const whList = warehouseId
      ? await db.select().from(warehouses).where(eq(warehouses.id, warehouseId))
      : await db.select().from(warehouses);

    // 2. Get all zones
    const zones = await db
      .select()
      .from(warehouseZones)
      .where(warehouseId ? eq(warehouseZones.warehouseId, warehouseId) : undefined)
      .orderBy(asc(warehouseZones.name));

    // Ensure every zone has at least one default rack (Self-healing check)
    for (const z of zones) {
      const zRacks = await db
        .select()
        .from(warehouseRacks)
        .where(eq(warehouseRacks.zoneId, z.id))
        .limit(1);

      if (zRacks.length === 0) {
        const defaultRackId = `rack-${nanoid(8)}`;
        await db.insert(warehouseRacks).values({
          id: defaultRackId,
          zoneId: z.id,
          code: 'R1',
          name: `${z.name} - Gondola 1`,
          barcode: `LOC-RK-${nanoid(6).toUpperCase()}`,
          maxWeightCapacityKg: 500,
          sortOrder: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Get all racks
    const racks = await db
      .select()
      .from(warehouseRacks)
      .orderBy(asc(warehouseRacks.sortOrder), asc(warehouseRacks.code));

    // 4. Get all shelves with assignment aggregates
    const shelves = await db
      .select()
      .from(warehouseShelves)
      .orderBy(asc(warehouseShelves.level), asc(warehouseShelves.code));

    // 5. Get all stock assignments with product details
    const assignments = await db
      .select({
        id: stockLocationAssignments.id,
        shelfId: stockLocationAssignments.shelfId,
        productId: stockLocationAssignments.productId,
        variantId: stockLocationAssignments.variantId,
        batchNumber: stockLocationAssignments.batchNumber,
        quantity: stockLocationAssignments.quantity,
        minRestockThreshold: stockLocationAssignments.minRestockThreshold,
        maxFacingCapacity: stockLocationAssignments.maxFacingCapacity,
        isPrimaryPicking: stockLocationAssignments.isPrimaryPickingLocation,
        productName: products.name,
        sku: products.sku,
        barcode: products.barcode,
        sellingPrice: products.sellingPrice,
        costPrice: products.purchasePrice,
      })
      .from(stockLocationAssignments)
      .leftJoin(products, eq(stockLocationAssignments.productId, products.id));

    // Build hierarchical tree
    const shelfMap = new Map<string, any>();
    shelves.forEach((s) => {
      const shelfAssignments = assignments.filter((a) => a.shelfId === s.id);
      const totalQty = shelfAssignments.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
      shelfMap.set(s.id, {
        ...s,
        totalQuantity: totalQty,
        itemCount: shelfAssignments.length,
        occupancyRate: s.maxItemCapacity ? Math.min(100, Math.round((totalQty / s.maxItemCapacity) * 100)) : 0,
        assignments: shelfAssignments,
      });
    });

    const rackMap = new Map<string, any>();
    racks.forEach((r) => {
      const rackShelves = shelves.filter((s) => s.rackId === r.id).map((s) => shelfMap.get(s.id));
      rackMap.set(r.id, {
        ...r,
        shelves: rackShelves,
        totalShelves: rackShelves.length,
        totalItems: rackShelves.reduce((sum, sh) => sum + (sh?.totalQuantity || 0), 0),
      });
    });

    const tree = whList.map((wh) => {
      const whZones = zones
        .filter((z) => z.warehouseId === wh.id)
        .map((z) => {
          const zoneRacks = racks.filter((r) => r.zoneId === z.id).map((r) => rackMap.get(r.id));
          return {
            ...z,
            racks: zoneRacks,
            totalRacks: zoneRacks.length,
            totalShelves: zoneRacks.reduce((sum, rk) => sum + (rk?.totalShelves || 0), 0),
            totalItems: zoneRacks.reduce((sum, rk) => sum + (rk?.totalItems || 0), 0),
          };
        });

      return {
        ...wh,
        zones: whZones,
      };
    });

    return tree;
  }

  // ─── ZONE / PRODUCTION PLACE CRUD ───

  async createZone(data: {
    warehouseId: string;
    code: string;
    name: string;
    type?: string;
    temperatureZone?: string;
    isProductionPlace?: boolean;
    description?: string;
  }) {
    const id = `zone-${nanoid(8)}`;
    await db.insert(warehouseZones).values({
      id,
      warehouseId: data.warehouseId,
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      type: data.type || (data.isProductionPlace ? 'PRODUCTION' : 'STORAGE'),
      temperatureZone: data.temperatureZone || 'AMBIENT',
      isProductionPlace: data.isProductionPlace ?? false,
      description: data.description?.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    // Auto-create default primary rack for this zone so shelves can always be mounted immediately
    const defaultRackId = `rack-${nanoid(8)}`;
    await db.insert(warehouseRacks).values({
      id: defaultRackId,
      zoneId: id,
      code: 'R1',
      name: `${data.name.trim()} - Gondola 1`,
      barcode: `LOC-RK-${nanoid(6).toUpperCase()}`,
      maxWeightCapacityKg: 500,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return (await db.select().from(warehouseZones).where(eq(warehouseZones.id, id)))[0];
  }

  async updateZone(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      type: string;
      temperatureZone: string;
      isProductionPlace: boolean;
      description: string;
      isActive: boolean;
    }>
  ) {
    await db
      .update(warehouseZones)
      .set({
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.type && { type: data.type }),
        ...(data.temperatureZone && { temperatureZone: data.temperatureZone }),
        ...(data.isProductionPlace !== undefined && { isProductionPlace: data.isProductionPlace }),
        ...(data.description !== undefined && { description: data.description?.trim() }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      })
      .where(eq(warehouseZones.id, id));

    return (await db.select().from(warehouseZones).where(eq(warehouseZones.id, id)))[0];
  }

  async deleteZone(id: string) {
    // Delete associated racks and shelves safely if empty
    const racks = await db.select().from(warehouseRacks).where(eq(warehouseRacks.zoneId, id));
    for (const r of racks) {
      const shelvesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(warehouseShelves)
        .where(eq(warehouseShelves.rackId, r.id));
      if (shelvesCount[0]?.count > 0) {
        throw new Error('Cannot delete Aisle with active shelves. Please remove shelves first.');
      }
      await db.delete(warehouseRacks).where(eq(warehouseRacks.id, r.id));
    }

    await db.delete(warehouseZones).where(eq(warehouseZones.id, id));
    return { success: true };
  }

  // ─── RACK / AISLE CRUD ───

  async createRack(data: {
    zoneId: string;
    code: string;
    name: string;
    barcode?: string;
    maxWeightCapacityKg?: number;
    sortOrder?: number;
  }) {
    const id = `rack-${nanoid(8)}`;
    const barcode = data.barcode?.trim() || `LOC-RK-${nanoid(6).toUpperCase()}`;

    await db.insert(warehouseRacks).values({
      id,
      zoneId: data.zoneId,
      code: data.code.toUpperCase().trim(),
      name: data.name.trim(),
      barcode,
      maxWeightCapacityKg: data.maxWeightCapacityKg ?? 500,
      sortOrder: data.sortOrder ?? 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    return (await db.select().from(warehouseRacks).where(eq(warehouseRacks.id, id)))[0];
  }

  async updateRack(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      barcode: string;
      maxWeightCapacityKg: number;
      sortOrder: number;
      isActive: boolean;
    }>
  ) {
    await db
      .update(warehouseRacks)
      .set({
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.name && { name: data.name.trim() }),
        ...(data.barcode && { barcode: data.barcode.trim() }),
        ...(data.maxWeightCapacityKg !== undefined && { maxWeightCapacityKg: data.maxWeightCapacityKg }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      })
      .where(eq(warehouseRacks.id, id));

    return (await db.select().from(warehouseRacks).where(eq(warehouseRacks.id, id)))[0];
  }

  async deleteRack(id: string) {
    const shelvesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouseShelves)
      .where(eq(warehouseShelves.rackId, id));

    if (shelvesCount[0]?.count > 0) {
      throw new Error('Cannot delete Rack containing Shelves. Please remove or move shelves first.');
    }

    await db.delete(warehouseRacks).where(eq(warehouseRacks.id, id));
    return { success: true };
  }

  // ─── SHELF / BIN CRUD ───

  async createShelf(data: {
    rackId?: string;
    zoneId?: string;
    code: string;
    name: string;
    level?: number;
    barcode?: string;
    maxItemCapacity?: number;
    notes?: string;
  }) {
    let resolvedRackId = data.rackId?.trim();

    // If rackId is missing or empty, resolve from zoneId
    if (!resolvedRackId && data.zoneId) {
      const existing = await db
        .select()
        .from(warehouseRacks)
        .where(eq(warehouseRacks.zoneId, data.zoneId))
        .limit(1);

      if (existing.length > 0) {
        resolvedRackId = existing[0].id;
      } else {
        const newRack = await this.createRack({
          zoneId: data.zoneId,
          code: 'R1',
          name: 'Main Gondola 1',
          maxWeightCapacityKg: 500,
        });
        resolvedRackId = newRack.id;
      }
    }

    if (!resolvedRackId) {
      const anyRack = await db.select().from(warehouseRacks).limit(1);
      if (anyRack.length > 0) {
        resolvedRackId = anyRack[0].id;
      } else {
        const anyZone = await db.select().from(warehouseZones).limit(1);
        if (anyZone.length > 0) {
          const newRack = await this.createRack({
            zoneId: anyZone[0].id,
            code: 'R1',
            name: `${anyZone[0].name} - Rack 1`,
          });
          resolvedRackId = newRack.id;
        } else {
          throw new Error('Please create a Zone/Aisle before creating shelves.');
        }
      }
    }

    const id = `shelf-${nanoid(8)}`;

    // Resolve full hierarchical code: WH-ZN-RACK-SHELF
    const rackInfo = (
      await db
        .select({
          rackCode: warehouseRacks.code,
          zoneCode: warehouseZones.code,
          whCode: warehouses.code,
        })
        .from(warehouseRacks)
        .leftJoin(warehouseZones, eq(warehouseRacks.zoneId, warehouseZones.id))
        .leftJoin(warehouses, eq(warehouseZones.warehouseId, warehouses.id))
        .where(eq(warehouseRacks.id, resolvedRackId))
    )[0];

    const cleanCode = data.code.toUpperCase().trim();
    let fullLocationCode = `${rackInfo?.whCode || 'WH'}-${rackInfo?.zoneCode || 'ZN'}-${rackInfo?.rackCode || 'RK'}-${cleanCode}`;

    // Ensure fullLocationCode is globally unique
    const existingFullCode = await db
      .select({ id: warehouseShelves.id })
      .from(warehouseShelves)
      .where(eq(warehouseShelves.fullLocationCode, fullLocationCode));

    if (existingFullCode.length > 0) {
      fullLocationCode = `${fullLocationCode}-${nanoid(4).toUpperCase()}`;
    }

    let barcode = data.barcode?.trim() || `LOC-${fullLocationCode}`;
    const existingBarcode = await db
      .select({ id: warehouseShelves.id })
      .from(warehouseShelves)
      .where(eq(warehouseShelves.barcode, barcode));

    if (existingBarcode.length > 0) {
      barcode = `LOC-${fullLocationCode}-${nanoid(4).toUpperCase()}`;
    }

    await db.insert(warehouseShelves).values({
      id,
      rackId: resolvedRackId,
      code: cleanCode,
      name: data.name.trim(),
      level: data.level ?? 1,
      fullLocationCode,
      barcode,
      maxItemCapacity: data.maxItemCapacity ?? 50,
      notes: data.notes?.trim(),
      createdAt: new Date().toISOString(),
    });

    return (await db.select().from(warehouseShelves).where(eq(warehouseShelves.id, id)))[0];
  }

  async updateShelf(
    id: string,
    data: Partial<{
      code: string;
      name: string;
      level: number;
      barcode: string;
      maxItemCapacity: number;
      notes: string;
    }>
  ) {
    let finalBarcode = data.barcode?.trim();
    if (finalBarcode) {
      const existing = await db
        .select({ id: warehouseShelves.id })
        .from(warehouseShelves)
        .where(and(eq(warehouseShelves.barcode, finalBarcode), sql`${warehouseShelves.id} != ${id}`));
      if (existing.length > 0) {
        finalBarcode = `${finalBarcode}-${nanoid(4).toUpperCase()}`;
      }
    }

    await db
      .update(warehouseShelves)
      .set({
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.name && { name: data.name.trim() }),
        ...(data.level !== undefined && { level: data.level }),
        ...(finalBarcode && { barcode: finalBarcode }),
        ...(data.maxItemCapacity !== undefined && { maxItemCapacity: data.maxItemCapacity }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() }),
      })
      .where(eq(warehouseShelves.id, id));

    return (await db.select().from(warehouseShelves).where(eq(warehouseShelves.id, id)))[0];
  }

  async deleteShelf(id: string) {
    // Check if stock assignments exist
    const stockCount = await db
      .select({ totalQty: sql<number>`sum(quantity)` })
      .from(stockLocationAssignments)
      .where(eq(stockLocationAssignments.shelfId, id));

    if ((stockCount[0]?.totalQty || 0) > 0) {
      throw new Error(`Cannot delete shelf with on-hand items (${stockCount[0].totalQty} pcs). Please transfer stock first.`);
    }

    await db.delete(warehouseShelves).where(eq(warehouseShelves.id, id));
    return { success: true };
  }

  // ─── STOCK-TO-LOCATION ASSIGNMENT & TRANSFER ───

  async assignStockToShelf(data: {
    shelfId: string;
    productId: string;
    variantId?: string;
    batchNumber?: string;
    quantity: number;
    minRestockThreshold?: number;
    maxFacingCapacity?: number;
  }) {
    const existing = (
      await db
        .select()
        .from(stockLocationAssignments)
        .where(
          and(
            eq(stockLocationAssignments.shelfId, data.shelfId),
            eq(stockLocationAssignments.productId, data.productId),
            data.batchNumber ? eq(stockLocationAssignments.batchNumber, data.batchNumber) : undefined
          )
        )
    )[0];

    if (existing) {
      await db
        .update(stockLocationAssignments)
        .set({
          quantity: existing.quantity + Number(data.quantity),
          ...(data.minRestockThreshold !== undefined && { minRestockThreshold: data.minRestockThreshold }),
          ...(data.maxFacingCapacity !== undefined && { maxFacingCapacity: data.maxFacingCapacity }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stockLocationAssignments.id, existing.id));
    } else {
      await db.insert(stockLocationAssignments).values({
        id: `assign-${nanoid(8)}`,
        shelfId: data.shelfId,
        productId: data.productId,
        variantId: data.variantId,
        batchNumber: data.batchNumber,
        quantity: Number(data.quantity),
        minRestockThreshold: data.minRestockThreshold ?? 5,
        maxFacingCapacity: data.maxFacingCapacity ?? 20,
        isPrimaryPickingLocation: true,
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  async transferStockBetweenShelves(data: {
    fromShelfId: string;
    toShelfId: string;
    productId: string;
    batchNumber?: string;
    quantity: number;
    notes?: string;
  }) {
    if (data.quantity <= 0) throw new Error('Quantity must be greater than 0');
    if (data.fromShelfId === data.toShelfId) throw new Error('Source and destination shelves must be different');

    // 1. Find source stock
    const source = (
      await db
        .select()
        .from(stockLocationAssignments)
        .where(
          and(
            eq(stockLocationAssignments.shelfId, data.fromShelfId),
            eq(stockLocationAssignments.productId, data.productId),
            data.batchNumber ? eq(stockLocationAssignments.batchNumber, data.batchNumber) : undefined
          )
        )
    )[0];

    if (!source || source.quantity < data.quantity) {
      throw new Error(`Insufficient stock on source shelf. Available: ${source?.quantity || 0} pcs`);
    }

    // 2. Subtract from source
    const remainingQty = source.quantity - Number(data.quantity);
    if (remainingQty === 0) {
      await db.delete(stockLocationAssignments).where(eq(stockLocationAssignments.id, source.id));
    } else {
      await db
        .update(stockLocationAssignments)
        .set({
          quantity: remainingQty,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(stockLocationAssignments.id, source.id));
    }

    // 3. Add to destination
    await this.assignStockToShelf({
      shelfId: data.toShelfId,
      productId: data.productId,
      variantId: source.variantId || undefined,
      batchNumber: data.batchNumber,
      quantity: data.quantity,
    });

    return { success: true, message: `Transferred ${data.quantity} pcs successfully` };
  }

  async getLowShelfAlerts() {
    return await db
      .select({
        assignmentId: stockLocationAssignments.id,
        shelfId: stockLocationAssignments.shelfId,
        productId: stockLocationAssignments.productId,
        quantity: stockLocationAssignments.quantity,
        minRestockThreshold: stockLocationAssignments.minRestockThreshold,
        productName: products.name,
        sku: products.sku,
        shelfCode: warehouseShelves.fullLocationCode,
        rackName: warehouseRacks.name,
        zoneName: warehouseZones.name,
      })
      .from(stockLocationAssignments)
      .innerJoin(warehouseShelves, eq(stockLocationAssignments.shelfId, warehouseShelves.id))
      .innerJoin(warehouseRacks, eq(warehouseShelves.rackId, warehouseRacks.id))
      .innerJoin(warehouseZones, eq(warehouseRacks.zoneId, warehouseZones.id))
      .innerJoin(products, eq(stockLocationAssignments.productId, products.id))
      .where(sql`${stockLocationAssignments.quantity} <= ${stockLocationAssignments.minRestockThreshold}`)
      .orderBy(asc(stockLocationAssignments.quantity));
  }

  // ─── WAREHOUSE / BRANCH CRUD ───

  async getWarehouses() {
    const list = await db.select().from(warehouses).orderBy(desc(warehouses.isDefault), asc(warehouses.name));

    const enriched = await Promise.all(
      list.map(async (w) => {
        const zoneCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(warehouseZones)
          .where(eq(warehouseZones.warehouseId, w.id));

        const stockSum = await db
          .select({ totalQty: sql<number>`coalesce(sum(quantity), 0)` })
          .from(inventory)
          .where(eq(inventory.warehouseId, w.id));

        return {
          ...w,
          totalZones: zoneCount[0]?.count || 0,
          totalStockQty: stockSum[0]?.totalQty || 0,
        };
      })
    );
    return enriched;
  }

  async createWarehouse(data: {
    name: string;
    code: string;
    location?: string;
    isDefault?: boolean;
    storeId?: string;
  }) {
    const id = `wh-${nanoid(8)}`;
    const cleanCode = data.code.toUpperCase().trim();

    if (data.isDefault) {
      await db.update(warehouses).set({ isDefault: false });
    }

    await db.insert(warehouses).values({
      id,
      storeId: data.storeId || 'store-flagship',
      name: data.name.trim(),
      code: cleanCode,
      location: data.location?.trim() || null,
      isDefault: data.isDefault ?? false,
      createdAt: new Date().toISOString(),
    });

    return (await db.select().from(warehouses).where(eq(warehouses.id, id)))[0];
  }

  async updateWarehouse(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      location: string;
      isDefault: boolean;
    }>
  ) {
    if (data.isDefault) {
      await db.update(warehouses).set({ isDefault: false });
    }

    await db
      .update(warehouses)
      .set({
        ...(data.name && { name: data.name.trim() }),
        ...(data.code && { code: data.code.toUpperCase().trim() }),
        ...(data.location !== undefined && { location: data.location?.trim() }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      })
      .where(eq(warehouses.id, id));

    return (await db.select().from(warehouses).where(eq(warehouses.id, id)))[0];
  }

  async deleteWarehouse(id: string) {
    const stockCount = await db
      .select({ totalQty: sql<number>`coalesce(sum(quantity), 0)` })
      .from(inventory)
      .where(eq(inventory.warehouseId, id));

    if ((stockCount[0]?.totalQty || 0) > 0) {
      throw new Error(`Cannot delete warehouse with on-hand stock (${stockCount[0].totalQty} pcs). Please transfer stock first.`);
    }

    const zoneCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(warehouseZones)
      .where(eq(warehouseZones.warehouseId, id));

    if ((zoneCount[0]?.count || 0) > 0) {
      throw new Error('Cannot delete warehouse with configured Zones. Please remove zones first.');
    }

    await db.delete(warehouses).where(eq(warehouses.id, id));
    return { success: true };
  }
}

export const locationService = new LocationService();
