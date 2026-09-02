import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './middlewares/errorHandler';
import { config } from './config/environment';

// Route imports
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import posRoutes from './routes/pos.routes';
import inventoryRoutes from './routes/inventory.routes';
import purchaseRoutes from './routes/purchase.routes';
import accountingRoutes from './routes/accounting.routes';
import dashboardRoutes from './routes/dashboard.routes';
import currencyRoutes from './routes/currency.routes';
import exportRoutes from './routes/export.routes';
import backupRoutes from './routes/backup.routes';
import storageRoutes from './routes/storage.routes';
import syncRoutes from './routes/sync.routes';
import userRoutes from './routes/user.routes';
import customerRoutes from './routes/customer.routes';
import supplierRoutes from './routes/supplier.routes';
import settingsRoutes from './routes/settings.routes';
import categoryRoutes from './routes/category.routes';
import tableRoutes from './routes/table.routes';
import onlineOrdersRoutes from './routes/onlineOrders.routes';
import platformRoutes from './routes/platforms.routes';
import serverRoutes from './routes/server.routes';
import { locationRouter } from './routes/location.routes';

export const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // For local Vite and dynamic fonts
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
app.use('/uploads', express.static(config.uploadsDir));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    system: '39POS Enterprise Point of Sale',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/online-orders', onlineOrdersRoutes);
app.use('/api/online-platforms', platformRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/locations', locationRouter);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/server', serverRoutes);

// ─── Resolve Static Client Directory ───
function findClientDistPath(): string | null {
  const candidates = [
    process.env.CLIENT_DIST_PATH,
    process.env.ELECTRON_APP_PATH ? path.join(process.env.ELECTRON_APP_PATH, 'client-dist') : null,
    process.env.ELECTRON_APP_PATH ? path.join(process.env.ELECTRON_APP_PATH, 'client', 'dist') : null,
    path.resolve(__dirname, '../client-dist'),
    path.resolve(__dirname, '../../client-dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../client/dist'),
    path.join(process.cwd(), 'resources', 'client-dist'),
    path.join(process.cwd(), 'client-dist'),
    path.join(process.cwd(), 'client', 'dist'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const indexPath = path.join(candidate, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`[Static Server] Found client dist at: ${candidate}`);
      return candidate;
    }
  }

  console.warn('[Static Server] Could not locate index.html in candidates:', candidates);
  return null;
}

const clientDistPath = findClientDistPath();

if (clientDistPath) {
  // Serve static files with proper MIME handling
  app.use(express.static(clientDistPath));

  // SPA fallback for React Router navigation
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('39POS Client index.html not found.');
    }
  });
  console.log(`[Static Server] Configured SPA fallback to: ${clientDistPath}`);
} else {
  // Helpful developer placeholder when running server standalone in dev
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>39POS Enterprise Backend</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h1 style="color: #6366f1;">39POS Enterprise API Server</h1>
            <p>Status: <span style="color: #10b981; font-weight: bold;">ONLINE</span></p>
            <p>Client Dev Server: <a href="http://localhost:3000" style="color: #38bdf8;">http://localhost:3000</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

// Error Handling Middleware (Always at the end)
app.use(errorHandler);
