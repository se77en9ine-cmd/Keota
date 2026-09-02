# 100vh Viewport-Locked "Docked Single-Screen" Design Specification

## Overview
Transform all 16 pages across the **39POS Enterprise System** into a unified **Docked Single-Screen (100vh) Layout**. 
Eliminates awkward full-page scrolling, content cutoffs, and misplaced submit buttons, ensuring all pages look as polished, unified, and neatly fitted as the Accounting and POS Register pages.

---

## 1. Architectural Layout Pattern

Every page adheres to a standardized 3-zone or 4-zone vertical flex layout:

```
+-------------------------------------------------------------------------+
| Top Global Navbar (56px fixed)                                          |
+-------------------+-----------------------------------------------------+
| Sidebar (Fixed)   | ZONE 1: Page Header & Global Actions (flex-shrink-0)|
|                   +-----------------------------------------------------+
|                   | ZONE 2: Sub-Nav / Tabs / Filters Bar (flex-shrink-0)|
|                   +-----------------------------------------------------+
|                   | ZONE 3: Primary Work Area                           |
|                   | (flex-1 min-h-0 overflow-y-auto scrollbar-thin)     |
|                   | - KPI Metric Cards Grid                             |
|                   | - Data Grids / Ledgers / Form Cards                 |
|                   +-----------------------------------------------------+
|                   | ZONE 4: Docked Footer Action Bar (Optional/Forms)   |
|                   | (flex-shrink-0 sticky bottom-0 bg-backdrop)         |
+-------------------+-----------------------------------------------------+
```

---

## 2. Core Layout Engine Updates

### `AppLayout.tsx`
* Update `<main>` container:
  ```tsx
  <main className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-4 pb-16 lg:pb-3 relative">
    <Outlet />
  </main>
  ```
* Ensures `flex-1 min-h-0` is passed down to all child routes so they occupy exact viewport height without pushing the browser window.

---

## 3. Page-by-Page Layout Refinements

### 1. **Settings Page (`SettingsPage.tsx`)**
* **Issue**: Form cards and "Save Store Profile" / "Save Tax & VAT" buttons overflow the screen and get cut off.
* **Refinement**:
  * Fixed Header + Horizontal Tab Bar at the top (`flex-shrink-0`).
  * Scrollable Settings Body (`flex-1 min-h-0 overflow-y-auto pr-1`).
  * Docked Bottom Action Strip for save buttons with subtle glassmorphic backdrop (`backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-t border-slate-200/60 dark:border-slate-800/60`).

### 2. **Products & Catalog (`ProductsPage.tsx`)**
* **Refinement**:
  * Fixed Search, Category Pill Filters, and "+ Add Product" button at the top.
  * Product grid / table scrolls internally within `flex-1 min-h-0 overflow-y-auto`.
  * Pagination bar locked at the bottom.

### 3. **Reports & Analytics (`ReportsPage.tsx`)**
* **Refinement**:
  * Fixed Report Tab selector & Date Range Picker at top.
  * Charts, KPI comparison grids, and summary tables scroll smoothly in the central viewport pane.

### 4. **Inventory & Stock Management (`InventoryPage.tsx`)**
* **Refinement**:
  * Fixed Top Alert Badges (Low Stock / Out of Stock counts) & Filter Bar.
  * Scrollable inventory table with sticky table header (`thead sticky top-0`).

### 5. **Online Orders & Delivery Kanban (`OnlineOrdersPage.tsx`)**
* **Refinement**:
  * Fixed Platform Status Bar & Stage Filter.
  * 4 Kanban Columns (`New`, `Preparing`, `Ready`, `Delivered`) fit 100% vertically with independent column scrolling.

### 6. **Dining Tables Floor Plan (`TablesPage.tsx`)**
* **Refinement**:
  * Fixed Zone Selector (Indoor, Rooftop, Patio) and Quick Actions.
  * Interactive Table Canvas scales dynamically with `min-h-0 flex-1`.

### 7. **Customers, Suppliers, Employees & Purchases**
* Standardized to: Fixed Header & Search/Filter Bar -> Scrollable Data Ledger -> Fixed Pagination / Total Summary Footer.

---

## 4. Design Aesthetics & Visual Tokens
* **Spacing**: Compact, high-density padding (`p-3 sm:p-4`, `gap-3 sm:gap-4`) preventing vertical blowout.
* **Scrollbars**: Custom ultra-thin emerald scrollbars (`scrollbar-thin scrollbar-thumb-emerald-500/20 hover:scrollbar-thumb-emerald-500/40`).
* **Form Inputs**: Compact 38px/42px input heights with crisp focus rings and inline labels.

---

## 5. Verification Plan
* Validate all routes (`/pos`, `/dashboard`, `/products`, `/categories`, `/inventory`, `/purchases`, `/customers`, `/suppliers`, `/employees`, `/accounting`, `/reports`, `/settings`, `/tables`, `/online-orders`) on standard 1080p, 1440p, and 1366x768 laptop resolutions.
* Verify that zero full-page scrollbars appear on desktop, and all submit buttons remain 100% accessible on screen load.
