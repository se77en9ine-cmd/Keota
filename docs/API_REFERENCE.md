# 39POS Enterprise REST API Reference

All endpoints return JSON responses in the format:
```json
{
  "success": true,
  "data": { ... }
}
```

## Authentication & Sessions
- `POST /api/auth/login` — Authenticate via username/email and password, or cashier PIN.
- `POST /api/auth/pin-switch` — Fast cashier handover switch without password re-entry.
- `POST /api/auth/refresh` — Refresh access token via HttpOnly refresh token.
- `POST /api/auth/google` — Google OAuth credential token login.
- `GET /api/auth/me` — Retrieve active user session profile & permissions.

## POS Terminal Operations
- `POST /api/pos/checkout` — Execute sale, reserve/deduct stock, apply taxes & discounts, process multi-tender split payments.
- `GET /api/pos/holds` — Retrieve held ticket queues.
- `GET /api/pos/holds/:id/resume` — Load held order back into register.
- `DELETE /api/pos/holds/:id` — Void and cancel held ticket.
- `GET /api/pos/recent` — Fetch recent completed invoices.

## Product Master & Catalog
- `GET /api/products` — List catalog with SKU, variant, category, and real-time stock balances.
- `GET /api/products/meta` — Get category tree, brand list, units, warehouses, and suppliers.
- `GET /api/products/barcode/:barcode` — Fast scanner lookup for 1D/2D barcodes.
- `POST /api/products` — Create new SKU item.
- `PUT /api/products/:id` — Update SKU pricing, tax, or attributes.
- `DELETE /api/products/:id` — Delete or deactivate product.

## Inventory & Warehousing
- `GET /api/inventory` — Stock valuation table across warehouses.
- `GET /api/inventory/low-stock` — Items below minimum threshold.
- `GET /api/inventory/expiring` — Batches approaching expiration.
- `POST /api/inventory/transfer` — Transfer stock between warehouses.

## Purchases & Procurements
- `GET /api/purchases` — Purchase orders list.
- `POST /api/purchases` — Create and receive purchase order with automatic inventory and movement log creation.

## Multi-Currency Engine
- `GET /api/currencies` — List all 11 supported currencies and active exchange rates.
- `POST /api/currencies/convert` — Perform precision Decimal.js currency conversion.
- `PUT /api/currencies/:code/rate` — Update exchange rate.

## Financial Accounting & Daily Closing
- `GET /api/accounting/expenses` — Expense transaction history.
- `POST /api/accounting/expenses` — Record store operational expense.
- `GET /api/accounting/income` — Other income streams.
- `POST /api/accounting/daily-closing` — Perform cash drawer count reconciliation.

## Document Export Engine
- `GET /api/export/products/excel` — Download styled Excel catalog (.xlsx).
- `GET /api/export/sales/excel` — Download styled sales transactions (.xlsx).
- `GET /api/export/inventory/excel` — Download inventory valuation (.xlsx).

## Backup & Storage
- `POST /api/backups/create` — Generate AES-256 encrypted archive.
- `GET /api/backups` — List historical backup files.
- `POST /api/backups/:id/restore` — Decrypt and restore backup database.
- `GET /api/storage/config` — Get storage destination paths (Local/NAS/S3).
- `PUT /api/storage/config` — Update storage destination paths.
