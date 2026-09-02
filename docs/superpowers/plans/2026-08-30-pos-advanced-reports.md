# 39POS Advanced Reports Suite Implementation Plan

> **For agentic workers:** Track tasks using checkbox (`- [ ]`) syntax.

**Goal:** Expand 39POS Reporting Hub with 3 enterprise-grade analytics modules:
1. Hourly Sales Velocity & Heatmap (`HourlyHeatmapReport.tsx`)
2. Stockout Risk & Automated Reorder Forecast (`ReorderForecastReport.tsx`)
3. Multi-Currency Realized FX Gain/Loss (`FxAnalyticsReport.tsx`)

---

### Task 1: i18n Localization for All 5 Languages
**Files:**
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/la.json`
- Modify: `client/src/i18n/locales/th.json`
- Modify: `client/src/i18n/locales/zh.json`
- Modify: `client/src/i18n/locales/jp.json`

- [x] **Step 1: Add translation keys for new reports in all 5 languages**

---

### Task 2: Hourly Sales Velocity & Heatmap Analytics
**Files:**
- Create: `client/src/components/reports/HourlyHeatmapReport.tsx`

- [x] **Step 1: Implement 7x24 Day/Hour matrix, rush hour detection, and dual-axis chart**
- [x] **Step 2: Connect date range and channel filters**

---

### Task 3: Stockout Risk & Automated Reorder Forecast
**Files:**
- Create: `client/src/components/reports/ReorderForecastReport.tsx`

- [x] **Step 1: Implement daily velocity run-rate calculations and runway risk tiers**
- [x] **Step 2: Implement suggested reorder quantity table with Excel/CSV export**

---

### Task 4: Multi-Currency Realized FX Analytics
**Files:**
- Create: `client/src/components/reports/FxAnalyticsReport.tsx`

- [x] **Step 1: Implement multi-currency tender distribution and FX spread calculation**
- [x] **Step 2: Render currency exposure charts and realized gain/loss ledger**

---

### Task 5: Main Reports Page Integration
**Files:**
- Modify: `client/src/pages/ReportsPage.tsx`

- [x] **Step 1: Register new tabs in `ReportsPage.tsx`**
- [x] **Step 2: Connect stock fetching and shared filter states**

---

### Task 6: Build Verification
- [x] **Step 1: Run `npm run build` and verify 0 TypeScript/Vite errors**
