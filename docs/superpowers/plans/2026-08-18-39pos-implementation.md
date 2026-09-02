# 39POS Enterprise System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, production-ready enterprise Point of Sale (POS) and business management system named **39POS** with React 18 + TypeScript + Tailwind CSS + Material UI, Node.js / Express REST API, Drizzle ORM dual-dialect database (local SQLite + cloud PostgreSQL sync), multi-language dynamic fonts, multi-currency engine, ESC/POS thermal printing, and configurable encrypted backup storage.

**Architecture:** Monorepo with `/client` (Vite + React + Zustand + TanStack Query), `/server` (Express REST API + Drizzle ORM + services), `/electron` (desktop wrapper), and `/shared` (types & schemas). Features dual-auth (JWT + PIN), offline-first sync queue, ESC/POS hardware peripheral drivers, and document generation (ExcelJS/PDF/Word).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Material UI, Vite, Zustand, TanStack Query, i18next, Decimal.js, Node.js, Express.js, Drizzle ORM, better-sqlite3 / pg, ExcelJS, PDFKit, docx-templates, Archiver, CryptoJS, Electron.

## Global Constraints
- React 18 + Vite frontend with Tailwind CSS and Material UI components.
- Node.js + Express backend with REST API architecture and Drizzle ORM.
- Multi-Language font rendering dynamically mapping to Noto Sans Lao, Noto Sans Thai, Noto Serif JP, Noto Serif SC, and Inter/Arial Narrow.
- Multi-Currency precise calculations using Decimal.js across 11 currencies (LAK, THB, USD, EUR, CNY, JPY, KRW, SGD, MYR, VND, KHR).
- Configurable backup and data storage paths (Local, NAS, S3/Cloud) with AES-256 encryption.
- Offline-first SQLite local store with bi-directional sync queue.

---

### Task 1: Monorepo Setup & Workspace Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `server/package.json`
- Create: `server/tsconfig.json`

**Interfaces:**
- Produces: Root workspace script commands (`npm run dev`, `npm run build`, `npm run test`, `npm run seed`)

- [ ] **Step 1: Create root package.json and tsconfig.base.json**
- [ ] **Step 2: Scaffold client and server workspace directories with respective configs**
- [ ] **Step 3: Install all core dependencies across client and server with `--no-audit --no-fund --legacy-peer-deps`**
- [ ] **Step 4: Verify workspace build and typecheck configurations**
- [ ] **Step 5: Commit workspace foundation**

---

### Task 2: Drizzle Database Schema (27 Tables) & Migrations

**Files:**
- Create: `server/src/database/schema/index.ts`
- Create: `server/src/database/schema/users.ts`
- Create: `server/src/database/schema/products.ts`
- Create: `server/src/database/schema/sales.ts`
- Create: `server/src/database/schema/inventory.ts`
- Create: `server/src/database/schema/accounting.ts`
- Create: `server/src/database/schema/system.ts`
- Create: `server/src/database/connection.ts`
- Test: `server/src/__tests__/schema.test.ts`

**Interfaces:**
- Produces: `db` connection instance, Drizzle schemas for SQLite and PostgreSQL, table types and relations

- [ ] **Step 1: Write test for schema definitions and table connections**
- [ ] **Step 2: Run test to verify failure before implementation**
- [ ] **Step 3: Implement 27 table schemas with relations and types**
- [ ] **Step 4: Run test to verify SQLite database file initialization and schema tables**
- [ ] **Step 5: Commit database schema layer**

---

### Task 3: Comprehensive Multi-Industry Demo Seed Data Engine

**Files:**
- Create: `server/src/database/seed/seedData.ts`
- Create: `server/src/database/seed/index.ts`
- Test: `server/src/__tests__/seed.test.ts`

**Interfaces:**
- Produces: `seedDatabase()` function populating Retail, F&B/Restaurant, Supermarket, and Pharmacy demo products, customers, suppliers, inventory batches, and transactions.

- [ ] **Step 1: Write test checking seeded records count (categories, products, currencies, users, roles)**
- [ ] **Step 2: Implement seed script with realistic items, barcodes, prices, exchange rates, and cashier PINs**
- [ ] **Step 3: Run seed runner and verify database records**
- [ ] **Step 4: Commit seed data engine**

---

### Task 4: Express REST API Server & Middleware Architecture

**Files:**
- Create: `server/src/config/environment.ts`
- Create: `server/src/middlewares/errorHandler.ts`
- Create: `server/src/middlewares/requestLogger.ts`
- Create: `server/src/middlewares/auth.ts`
- Create: `server/src/middlewares/rbac.ts`
- Create: `server/src/middlewares/auditLogger.ts`
- Create: `server/src/server.ts`
- Create: `server/src/app.ts`
- Test: `server/src/__tests__/server.test.ts`

**Interfaces:**
- Produces: Express API server with CORS, Helmet, JSON parsing, error boundary, and audit logger

- [ ] **Step 1: Write server health check and security headers test**
- [ ] **Step 2: Implement Express server and middlewares**
- [ ] **Step 3: Run server tests to verify 200 OK health endpoint**
- [ ] **Step 4: Commit server core**

---

### Task 5: Authentication, Google OAuth & Dual-Auth PIN Engine

**Files:**
- Create: `server/src/services/auth.service.ts`
- Create: `server/src/controllers/auth.controller.ts`
- Create: `server/src/routes/auth.routes.ts`
- Test: `server/src/__tests__/auth.test.ts`

**Interfaces:**
- Produces: `/api/auth/login`, `/api/auth/google`, `/api/auth/pin-switch`, `/api/auth/refresh`, `/api/auth/me`

- [ ] **Step 1: Write unit and integration tests for password login, PIN quick-switch, and JWT refresh**
- [ ] **Step 2: Implement AuthService with bcrypt, JWT token generation, and Cashier PIN verification**
- [ ] **Step 3: Run auth tests to verify token issuance and role permission enforcement**
- [ ] **Step 4: Commit authentication module**

---

### Task 6: Multi-Currency & Multi-Language Core Calculation Engine

**Files:**
- Create: `server/src/services/currency.service.ts`
- Create: `server/src/controllers/currency.controller.ts`
- Create: `server/src/routes/currency.routes.ts`
- Create: `shared/src/currencyEngine.ts`
- Test: `server/src/__tests__/currency.test.ts`

**Interfaces:**
- Produces: Decimal.js accurate conversions across 11 currencies, split-tender change calculator, rate updates

- [ ] **Step 1: Write unit tests for multi-currency conversions and cash rounding (e.g. LAK, THB, USD)**
- [ ] **Step 2: Implement CurrencyService with live exchange rate management and split payment calculation**
- [ ] **Step 3: Run currency calculation tests**
- [ ] **Step 4: Commit currency engine**

---

### Task 7: POS Sales, Cart Calculation & Payment Transaction API

**Files:**
- Create: `server/src/services/pos.service.ts`
- Create: `server/src/controllers/pos.controller.ts`
- Create: `server/src/routes/pos.routes.ts`
- Test: `server/src/__tests__/pos.test.ts`

**Interfaces:**
- Produces: `/api/pos/checkout`, `/api/pos/hold`, `/api/pos/resume`, `/api/pos/refund`, `/api/pos/active-holds`

- [ ] **Step 1: Write tests for checkout with multi-payment tenders, discounts, taxes, and inventory deduction**
- [ ] **Step 2: Implement PosService with atomic transaction execution and stock reservation**
- [ ] **Step 3: Run POS transaction tests to verify invoice generation and stock balances**
- [ ] **Step 4: Commit POS sales module**

---

### Task 8: Products, Categories, Brands & Warehouse Management API

**Files:**
- Create: `server/src/services/product.service.ts`
- Create: `server/src/controllers/product.controller.ts`
- Create: `server/src/routes/product.routes.ts`
- Test: `server/src/__tests__/product.test.ts`

**Interfaces:**
- Produces: `/api/products`, `/api/categories`, `/api/brands`, `/api/units`, `/api/warehouses` CRUD & barcode lookups

- [ ] **Step 1: Write tests for product creation, SKU/barcode lookup, and variant relations**
- [ ] **Step 2: Implement ProductService with pagination, multi-search, and category filters**
- [ ] **Step 3: Run product tests to verify CRUD and variant filtering**
- [ ] **Step 4: Commit product module**

---

### Task 9: Inventory, Purchasing, Batch & Expiry Tracking API

**Files:**
- Create: `server/src/services/inventory.service.ts`
- Create: `server/src/services/purchase.service.ts`
- Create: `server/src/controllers/inventory.controller.ts`
- Create: `server/src/controllers/purchase.controller.ts`
- Create: `server/src/routes/inventory.routes.ts`
- Create: `server/src/routes/purchase.routes.ts`
- Test: `server/src/__tests__/inventory.test.ts`

**Interfaces:**
- Produces: Stock valuation (FIFO/Avg), stock transfers, purchase orders, goods receipt, expiry alerts

- [ ] **Step 1: Write tests for purchase order receiving, stock movement logging, and expiring batch detection**
- [ ] **Step 2: Implement InventoryService and PurchaseService**
- [ ] **Step 3: Run inventory tests**
- [ ] **Step 4: Commit inventory and purchasing module**

---

### Task 10: Accounting, Daily Closing & Financial Analytics API

**Files:**
- Create: `server/src/services/accounting.service.ts`
- Create: `server/src/services/dashboard.service.ts`
- Create: `server/src/controllers/accounting.controller.ts`
- Create: `server/src/controllers/dashboard.controller.ts`
- Create: `server/src/routes/accounting.routes.ts`
- Create: `server/src/routes/dashboard.routes.ts`
- Test: `server/src/__tests__/accounting.test.ts`

**Interfaces:**
- Produces: Daily cash closing, P&L, Balance Sheet, Dashboard KPI metrics, Sales heatmap and category breakdown

- [ ] **Step 1: Write tests for daily closing reconciliation and profit/loss calculation**
- [ ] **Step 2: Implement AccountingService and DashboardAnalyticsService**
- [ ] **Step 3: Run accounting tests**
- [ ] **Step 4: Commit accounting and analytics module**

---

### Task 11: Document Generation (Excel, PDF, Word) & Backup/Storage Manager

**Files:**
- Create: `server/src/services/export.service.ts`
- Create: `server/src/services/backup.service.ts`
- Create: `server/src/services/storage.service.ts`
- Create: `server/src/controllers/export.controller.ts`
- Create: `server/src/controllers/backup.controller.ts`
- Create: `server/src/controllers/storage.controller.ts`
- Create: `server/src/routes/export.routes.ts`
- Create: `server/src/routes/backup.routes.ts`
- Create: `server/src/routes/storage.routes.ts`
- Test: `server/src/__tests__/backup.test.ts`

**Interfaces:**
- Produces: Styled Excel reports (.xlsx), PDF invoices (.pdf), AES-256 encrypted backups (.zip/.sql/.json), configurable storage paths (Local/NAS/S3)

- [ ] **Step 1: Write tests for Excel generation, backup creation, encryption, and restore validation**
- [ ] **Step 2: Implement ExportService, BackupService, and StorageService**
- [ ] **Step 3: Run backup and export tests**
- [ ] **Step 4: Commit document and backup engine**

---

### Task 12: Offline Sync Engine & Conflict Resolver

**Files:**
- Create: `server/src/services/sync.service.ts`
- Create: `server/src/controllers/sync.controller.ts`
- Create: `server/src/routes/sync.routes.ts`
- Test: `server/src/__tests__/sync.test.ts`

**Interfaces:**
- Produces: `/api/sync/pull`, `/api/sync/push`, `/api/sync/status` with timestamp-based conflict resolution

- [ ] **Step 1: Write tests for batch mutation sync and conflict resolution**
- [ ] **Step 2: Implement SyncService**
- [ ] **Step 3: Run sync engine tests**
- [ ] **Step 4: Commit offline sync engine**

---

### Task 13: React 18 + Vite Frontend Foundation, Theme & Dynamic Fonts

**Files:**
- Create: `client/src/index.css`
- Create: `client/src/i18n/index.ts`
- Create: `client/src/i18n/locales/en.json`
- Create: `client/src/i18n/locales/la.json`
- Create: `client/src/i18n/locales/th.json`
- Create: `client/src/i18n/locales/jp.json`
- Create: `client/src/i18n/locales/zh.json`
- Create: `client/src/theme/themeProvider.tsx`
- Create: `client/src/components/layout/AppLayout.tsx`
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/Navbar.tsx`

**Interfaces:**
- Produces: Responsive modern UI shell with Light/Dark mode, dynamic font loading (`--app-font`), and i18n locale switching

- [ ] **Step 1: Create global CSS with Google Font imports and dynamic CSS variables**
- [ ] **Step 2: Implement i18n translation dictionaries for all 5 languages**
- [ ] **Step 3: Build AppLayout, Sidebar, Navbar, and Quick PIN Lock Overlay**
- [ ] **Step 4: Verify theme and font switching in browser layout**
- [ ] **Step 5: Commit frontend layout and i18n foundation**

---

### Task 14: Frontend Zustand Stores, Hardware Drivers & API Client

**Files:**
- Create: `client/src/api/client.ts`
- Create: `client/src/store/useAuthStore.ts`
- Create: `client/src/store/useCartStore.ts`
- Create: `client/src/store/useCurrencyStore.ts`
- Create: `client/src/store/useSettingsStore.ts`
- Create: `client/src/store/useHardwareStore.ts`
- Create: `client/src/utils/escpos.ts`
- Create: `client/src/utils/audio.ts`

**Interfaces:**
- Produces: Zustand stores, Axios API interceptors with automatic JWT refresh, ESC/POS thermal command builder, and scanner audio feedback

- [ ] **Step 1: Implement API client with auth token headers and offline fallback**
- [ ] **Step 2: Build Zustand state stores (auth, cart, currency, settings, hardware)**
- [ ] **Step 3: Implement ESC/POS raw command buffer generator and WebSerial/TCP driver**
- [ ] **Step 4: Commit frontend state and hardware driver utilities**

---

### Task 15: Touch-Friendly POS Sales Terminal & Receipt Suite

**Files:**
- Create: `client/src/pages/PosPage.tsx`
- Create: `client/src/components/pos/ProductCatalog.tsx`
- Create: `client/src/components/pos/CartPanel.tsx`
- Create: `client/src/components/pos/PaymentModal.tsx`
- Create: `client/src/components/pos/ReceiptModal.tsx`
- Create: `client/src/components/pos/HoldOrdersModal.tsx`
- Create: `client/src/components/pos/CustomerSelectModal.tsx`
- Create: `client/src/components/pos/PinSwitchModal.tsx`

**Interfaces:**
- Produces: Complete POS screen with fast barcode scanner hook, category tabs, cart modifiers, split payments, multi-currency change, hold/resume, and thermal print preview.

- [ ] **Step 1: Build ProductCatalog with instant search, category pills, and favorites**
- [ ] **Step 2: Build CartPanel with quantity adjustments, discounts, and tax calculation**
- [ ] **Step 3: Build PaymentModal supporting multi-tender, split currency, QR codes, and cash calculation**
- [ ] **Step 4: Build ReceiptModal with thermal print and PDF download**
- [ ] **Step 5: Verify POS checkout workflow end-to-end**
- [ ] **Step 6: Commit POS sales module**

---

### Task 16: Executive Dashboard & Real-Time Analytics UI

**Files:**
- Create: `client/src/pages/DashboardPage.tsx`
- Create: `client/src/components/dashboard/KpiCards.tsx`
- Create: `client/src/components/dashboard/SalesChart.tsx`
- Create: `client/src/components/dashboard/CategoryPieChart.tsx`
- Create: `client/src/components/dashboard/SalesHeatmap.tsx`
- Create: `client/src/components/dashboard/RecentTransactionsTable.tsx`
- Create: `client/src/components/dashboard/StockAlertsWidget.tsx`

**Interfaces:**
- Produces: Modern executive analytics dashboard with live KPI counters, revenue charts, sales heatmaps, and stock expiration warnings.

- [ ] **Step 1: Build KpiCards with sales, profit, expenses, and inventory values**
- [ ] **Step 2: Build SalesChart, CategoryPieChart, and SalesHeatmap**
- [ ] **Step 3: Build StockAlertsWidget and RecentTransactionsTable**
- [ ] **Step 4: Verify dashboard responsive layout and live chart rendering**
- [ ] **Step 5: Commit dashboard analytics UI**

---

### Task 17: Product, Inventory & Warehouse Management UI

**Files:**
- Create: `client/src/pages/ProductsPage.tsx`
- Create: `client/src/pages/InventoryPage.tsx`
- Create: `client/src/pages/PurchasesPage.tsx`
- Create: `client/src/components/products/ProductFormModal.tsx`
- Create: `client/src/components/products/BarcodeGeneratorModal.tsx`
- Create: `client/src/components/inventory/StockTransferModal.tsx`
- Create: `client/src/components/inventory/BatchExpiryModal.tsx`
- Create: `client/src/components/purchases/PurchaseOrderModal.tsx`

**Interfaces:**
- Produces: Complete inventory & product management interfaces with barcode generation, batch tracking, stock transfer, and PO receiving.

- [ ] **Step 1: Build ProductsPage with data table, search, filters, and product modal**
- [ ] **Step 2: Build InventoryPage with stock valuation, movement logs, and transfer wizard**
- [ ] **Step 3: Build PurchasesPage with purchase order workflow and goods receipt**
- [ ] **Step 4: Verify product and inventory workflows**
- [ ] **Step 5: Commit product and inventory UI**

---

### Task 18: Customer, Supplier, Employee & User Management UI

**Files:**
- Create: `client/src/pages/CustomersPage.tsx`
- Create: `client/src/pages/SuppliersPage.tsx`
- Create: `client/src/pages/EmployeesPage.tsx`
- Create: `client/src/pages/UsersPage.tsx`
- Create: `client/src/components/users/UserFormModal.tsx`
- Create: `client/src/components/customers/CustomerHistoryModal.tsx`

**Interfaces:**
- Produces: CRM, Supplier directory, Employee shifts/attendance, and RBAC user permissions management.

- [ ] **Step 1: Build CustomersPage with loyalty points, tier badges, and credit limit tracking**
- [ ] **Step 2: Build SuppliersPage with purchase balance and transaction history**
- [ ] **Step 3: Build EmployeesPage & UsersPage with role assignments and PIN configuration**
- [ ] **Step 4: Commit user, customer, supplier, and employee management UI**

---

### Task 19: Accounting, Financial Reports & Document Exporter UI

**Files:**
- Create: `client/src/pages/AccountingPage.tsx`
- Create: `client/src/pages/ReportsPage.tsx`
- Create: `client/src/components/accounting/DailyClosingModal.tsx`
- Create: `client/src/components/accounting/ExpenseIncomeModal.tsx`
- Create: `client/src/components/reports/ReportFilterBar.tsx`
- Create: `client/src/components/reports/ExportButtons.tsx`

**Interfaces:**
- Produces: Daily register closing wizard, cash reconciliation, P&L statements, and one-click Excel/PDF/Word/CSV reports.

- [ ] **Step 1: Build AccountingPage with income/expense logs and shift cash drawer balance reconciliation**
- [ ] **Step 2: Build ReportsPage with date filters, category breakdowns, and export action buttons**
- [ ] **Step 3: Verify report generation and file download triggers**
- [ ] **Step 4: Commit accounting and reporting UI**

---

### Task 20: System Settings, Storage Path Manager & Encrypted Backup UI

**Files:**
- Create: `client/src/pages/SettingsPage.tsx`
- Create: `client/src/components/settings/StoreProfileSettings.tsx`
- Create: `client/src/components/settings/CurrencySettings.tsx`
- Create: `client/src/components/settings/PrinterSettings.tsx`
- Create: `client/src/components/settings/StorageBackupSettings.tsx`
- Create: `client/src/components/settings/AuditLogsViewer.tsx`

**Interfaces:**
- Produces: Storage path configurator (Local, NAS, USB, Cloud), automated backup schedule runner, printer peripheral tester, and security audit log table.

- [ ] **Step 1: Build StoreProfileSettings, CurrencySettings, and PrinterSettings**
- [ ] **Step 2: Build StorageBackupSettings with storage path selector and backup/restore wizard**
- [ ] **Step 3: Build AuditLogsViewer with user action filtering**
- [ ] **Step 4: Commit settings and backup UI**

---

### Task 21: Customer-Facing Display & Electron Desktop Wrapper

**Files:**
- Create: `client/src/pages/CustomerDisplayPage.tsx`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/package.json`

**Interfaces:**
- Produces: Dual-screen customer display webview with live cart synchronization and Electron desktop application setup.

- [ ] **Step 1: Build CustomerDisplayPage with dynamic cart mirroring and QR code payment panel**
- [ ] **Step 2: Implement Electron main and preload scripts with serial/USB printer native hooks**
- [ ] **Step 3: Commit customer display and Electron desktop layer**

---

### Task 22: Full System Integration, Verification & Documentation

**Files:**
- Create: `docs/API_REFERENCE.md`
- Create: `docs/USER_MANUAL.md`
- Create: `docs/ADMIN_MANUAL.md`
- Create: `docs/DEPLOYMENT_GUIDE.md`
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `server/src/__tests__/integration.test.ts`

**Interfaces:**
- Produces: End-to-end integration test suite, Docker container setup, and complete enterprise documentation suite.

- [ ] **Step 1: Write end-to-end integration tests verifying login -> POS checkout -> stock deduction -> accounting log -> report export**
- [ ] **Step 2: Run all backend and integration tests to ensure 100% pass rate**
- [ ] **Step 3: Generate Dockerfile, docker-compose.yml, and enterprise user/admin manuals**
- [ ] **Step 4: Create final walkthrough verification artifact**
- [ ] **Step 5: Commit complete project deliverables**
