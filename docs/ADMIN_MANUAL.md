# 39POS Enterprise Administrator & Security Manual

## 1. Role-Based Access Control (RBAC)
The system enforces strict permission boundaries across 7 roles:
- **SUPER_ADMIN:** Full control over system configurations, backups, security audits, and store settings.
- **OWNER:** Full access to multi-store reports, financial P&L statements, and employee payroll.
- **MANAGER:** Authority to approve custom discounts, void orders, and transfer stock between warehouses.
- **ACCOUNTANT:** Access to expenses, income, daily shift closings, and Excel/PDF accounting exports.
- **WAREHOUSE:** Access to stock receiving, purchase order creation, batch tracking, and expiry dates.
- **CASHIER:** Front-desk POS register access, fast PIN lock/unlock.
- **STAFF:** Catalog search and floor ordering.

## 2. Storage & Backup Configuration
1. Navigate to **System Settings** -> **Storage & Backup**.
2. **Local / USB Storage:** Set local mount path (e.g. `D:\39POS\Data` or `E:\Business\39POS`).
3. **NAS Shared Network Storage:** Set UNC share (e.g. `\\192.168.1.100\39pos-backup`).
4. **Cloud Storage:** S3 / Cloudflare R2 / Google Cloud bucket destination.
5. **AES-256 Encryption:** All automated and manual backups (`.enc` files) are encrypted using AES-256-GCM.

## 3. Hardware Peripheral Setup
- **Thermal Receipt Printers:** Set TCP IP (port 9100) for Ethernet/WiFi ESC/POS printers, or WebUSB / WebSerial for direct connection.
- **Cash Drawer RJ11:** Connect drawer RJ11 cable to thermal printer; drawer kicks automatically upon cash sale completion.
- **Customer Facing Display:** Launch `http://localhost:3000/display` on a secondary monitor for real-time cart mirroring and QR code payment displays.

## 4. Multi-Currency Rate Configuration
- Navigate to **System Settings** -> **Currencies & Rates**.
- Adjust exchange rates against the base USD currency for LAK, THB, CNY, JPY, EUR, SGD, MYR, VND, KHR.
- System automatically preserves historical rate snapshots in the `exchange_rates` table.
