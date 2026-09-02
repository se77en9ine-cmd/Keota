# App Languages & Lao Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide end-to-end multi-language localization and typography overhaul with dual Lao font support (Looped vs Loopless), eliminate tone mark/vowel clipping, and translate 100% of financial ledger and chart strings into Lao.

**Architecture:** A centralized font management engine in `client/src/i18n/index.ts` with dynamic CSS injection, quick font style switcher in `Navbar.tsx` and `SettingsPage.tsx`, enhanced Chart.js canvas fonts and tooltips in `CashFlowReport.tsx`, complete translation keys in `la.json` (and `en`, `th`, `zh`, `jp`), and a localized date helper.

**Tech Stack:** React, TypeScript, i18next, TailwindCSS, Chart.js, Vite.

## Global Constraints
- Noto Sans Lao Looped and Noto Sans Lao must both be supported without external CDN network latency (pre-connected via Google Fonts in index.html).
- Tone marks and upper/lower vowels must never clip: `line-height: 1.6 !important;` and proper table padding when `lang="la"`.
- All monetary formatting must continue to use `formatMoney(...)` respecting active currency (`LAK ₭`, `USD`, etc.).
- No raw user inputs or barcode fields should have decorative font overrides (`input, textarea, .font-mono` remain with `--input-font`).

---

### Task 1: Core Typography Engine & CSS Injection
**Files:**
- Modify: `client/src/i18n/index.ts`
- Modify: `client/index.html`

- [ ] **Step 1: Update font definitions and Lao style resolver in `client/src/i18n/index.ts`**
  - Add `getLaoFontStyle(): 'looped' | 'modern'` and `setLaoFontStyle(style: 'looped' | 'modern')`.
  - Set `la` font family in `fontMap` to default to `'Noto Sans Lao Looped', 'Noto Sans Lao', 'Phetsarath OT', 'Saysettha OT', sans-serif` for `looped` and `'Noto Sans Lao', sans-serif` for `modern`.
  - Add dynamic global CSS rules for `html[lang="la"]` and `html[lang="th"]` ensuring `line-height: 1.6 !important;` and table cell vertical breathing room (`padding-top: 0.85rem !important; padding-bottom: 0.85rem !important;`).

- [ ] **Step 2: Verify `client/index.html` Google Fonts link**
  - Confirm `Noto+Sans+Lao:wght@100..900` and `Noto+Sans+Lao+Looped:wght@100..900` are loaded.

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 2: Topbar Navbar & Settings Font Switcher
**Files:**
- Modify: `client/src/components/layout/Navbar.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add Lao Font Style Pill Switcher in `Navbar.tsx`**
  - When `i18n.language === 'la'`, render a compact segmented control inside the language dropdown:
    `[ 🖋️ ແບບຫົວມົນ ]` ⟷ `[ 🔤 ແບບໂມເດີນ ]`.
  - Clicking calls `setLaoFontStyle(...)` and updates font immediately.

- [ ] **Step 2: Add Typography Preferences to `SettingsPage.tsx`**
  - Expose default language selection and font style preferences under a clean card.

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 3: Chart.js Global Typography & Tooltip Upgrade
**Files:**
- Modify: `client/src/components/reports/CashFlowReport.tsx`
- Modify: `client/src/components/reports/ReportsChartSection.tsx`

- [ ] **Step 1: Update `chartFontFamily`**
  - Prepend `'Noto Sans Lao Looped', 'Noto Sans Lao'` to `chartFontFamily`.
  - Increase Chart.js tooltip padding (`padding: 12`), `titleSpacing: 6`, `bodySpacing: 6`, and line heights.

- [ ] **Step 2: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 4: Financial Ledger & Cash Flow 100% Translation
**Files:**
- Modify: `client/src/i18n/locales/la.json`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/th.json`
- Modify: `client/src/i18n/locales/zh.json`
- Modify: `client/src/i18n/locales/jp.json`
- Modify: `client/src/components/reports/CashFlowReport.tsx`

- [ ] **Step 1: Add new translation keys under `cashFlow`**
  - `posSalesInflow`: "ລາຍຮັບຂາຍ POS" / "POS Sales Inflow"
  - `otherIncomes`: "ລາຍຮັບອື່ນໆ" / "Other Incomes"
  - `stockPO`: "ສັ່ງຊື້ສະຕັອກ (PO)" / "Stock PO"
  - `committed`: "ຜູກພັນໄວ້" / "Committed"
  - `paid`: "ຈ່າຍແລ້ວ" / "Paid"
  - `storeOpex`: "ລາຍຈ່າຍຮ້ານ (OPEX)" / "Store OPEX"
  - `burnMultiplier`: "ອັດຕາການເຜົາຜານ:" / "Burn Multiplier:"
  - `inflowOutflowRatio`: "x ເງິນເຂົ້າ/ເງິນອອກ" / "x Inflow/Outflow"
  - `chartSubtitle`: "ການປຽບທຽບກະແສເງິນສົດເຂົ້າ vs ອອກ ແລະ ເງິນສົດສຸດທິ" / "Inflows vs Outflows and Net Liquid Trajectory"
  - `totalRecords`: "ລວມທັງໝົດ ({{count}} ລາຍການ)" / "TOTAL ({{count}} Records)"
  - `noRecords`: "ບໍ່ພົບຂໍ້ມູນກະແສເງິນສົດໃນຮອບເວລານີ້" / "No cash flow records found for this period."
  - `paidPrefix`: "ຈ່າຍແລ້ວ:" / "Paid:"

- [ ] **Step 2: Replace hardcoded strings in `CashFlowReport.tsx` with `t(...)` calls**
  - Table headers lines 803, 804, 822, 824, 828, footer line 899, empty state line 865, and subtitles lines 674, 676, 691.

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 5: Localized Financial Date Utility
**Files:**
- Create: `client/src/utils/dateLocale.ts`
- Modify: `client/src/components/reports/CashFlowReport.tsx`

- [ ] **Step 1: Implement `formatLocalizedDate`**
  - Provide Lao month abbreviations (`ກ.ຍ.`, `ຕ.ລ.`, etc.) and format `2026-09-01` to `1 ກ.ຍ. 2026`.

- [ ] **Step 2: Integrate into `CashFlowReport.tsx`**
  - Display localized date in the period column with native tooltip showing original ISO date.

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 6: Build Verification & End-to-End Visual Audit
- [ ] **Step 1: Run TypeScript verification**
  Run: `npx tsc --noEmit` in `client`.
- [ ] **Step 2: Run production build**
  Run: `npm run build` in `client`.
- [ ] **Step 3: Visual inspection via Chrome DevTools MCP**
  Take screenshots of `http://localhost:3000/reports` in Lao mode (`LA`) and verify:
  - Table headers are in Lao.
  - Tone marks and vowels are cleanly rendered without clipping.
  - Topbar font switcher toggles Looped and Loopless fonts smoothly.
