import { Router, Request, Response } from 'express';
import { locationService } from '../services/location.service';

const router = Router();

// GET full hierarchical location tree
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;
    const tree = await locationService.getLocationTree(warehouseId);
    res.json({ success: true, tree });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── WAREHOUSE MASTER CRUD ───
router.get('/warehouses', async (_req: Request, res: Response) => {
  try {
    const warehouses = await locationService.getWarehouses();
    res.json({ success: true, warehouses });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/warehouses', async (req: Request, res: Response) => {
  try {
    const warehouse = await locationService.createWarehouse(req.body);
    res.status(201).json({ success: true, warehouse });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/warehouses/:id', async (req: Request, res: Response) => {
  try {
    const warehouse = await locationService.updateWarehouse(req.params.id, req.body);
    res.json({ success: true, warehouse });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/warehouses/:id', async (req: Request, res: Response) => {
  try {
    await locationService.deleteWarehouse(req.params.id);
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET low shelf stock alerts
router.get('/low-shelf-alerts', async (_req: Request, res: Response) => {
  try {
    const alerts = await locationService.getLowShelfAlerts();
    res.json({ success: true, alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ZONE / PRODUCTION PLACE ROUTES ───
router.post('/zones', async (req: Request, res: Response) => {
  try {
    const zone = await locationService.createZone(req.body);
    res.status(201).json({ success: true, zone });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/zones/:id', async (req: Request, res: Response) => {
  try {
    const zone = await locationService.updateZone(req.params.id, req.body);
    res.json({ success: true, zone });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/zones/:id', async (req: Request, res: Response) => {
  try {
    await locationService.deleteZone(req.params.id);
    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── RACK / AISLE ROUTES ───
router.post('/racks', async (req: Request, res: Response) => {
  try {
    const rack = await locationService.createRack(req.body);
    res.status(201).json({ success: true, rack });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/racks/:id', async (req: Request, res: Response) => {
  try {
    const rack = await locationService.updateRack(req.params.id, req.body);
    res.json({ success: true, rack });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/racks/:id', async (req: Request, res: Response) => {
  try {
    await locationService.deleteRack(req.params.id);
    res.json({ success: true, message: 'Rack deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── SHELF / BIN ROUTES ───
router.post('/shelves', async (req: Request, res: Response) => {
  try {
    const shelf = await locationService.createShelf(req.body);
    res.status(201).json({ success: true, shelf });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/shelves/:id', async (req: Request, res: Response) => {
  try {
    const shelf = await locationService.updateShelf(req.params.id, req.body);
    res.json({ success: true, shelf });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/shelves/:id', async (req: Request, res: Response) => {
  try {
    await locationService.deleteShelf(req.params.id);
    res.json({ success: true, message: 'Shelf deleted successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ─── STOCK ASSIGNMENT & BIN TRANSFERS ───
router.post('/assign-stock', async (req: Request, res: Response) => {
  try {
    const result = await locationService.assignStockToShelf(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/transfer-stock', async (req: Request, res: Response) => {
  try {
    const result = await locationService.transferStockBetweenShelves(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export const locationRouter = router;
