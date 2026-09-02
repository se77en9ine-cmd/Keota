# Global Multi-Locale Typography & System-Wide Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce exact global fonts for all 5 enterprise languages (LA: Noto Sans Lao, TH: Noto Sans Thai Light, JP: Noto Serif Japanese, ZH: Noto Serif Simplified Chinese, EN: Arial Narrow) in Regular style across all navigation, menus, titles, text, tables, columns, droplists, and forms (excluding raw input data), cleanly separate all translations into respective locale files, fix the heatmap translation variable bug, and verify 0 errors.

**Architecture:** Centralized typography mapping in `client/src/i18n/index.ts` with comprehensive CSS selector enforcement and strict input data exclusion rules, updated font name labels across Navbar and Settings, and interpolation fixes in `HourlyHeatmapReport.tsx`.

**Tech Stack:** React, TypeScript, i18next, TailwindCSS, Vite.

## Global Constraints
- **LA**: `Noto Sans Lao` (regular weight 400).
- **TH**: `Noto Sans Thai Light` (weight 300/400).
- **JP**: `Noto Serif Japanese` (weight 400 regular).
- **ZH**: `Noto Serif Simplified Chinese` (weight 400 regular).
- **EN**: `Arial Narrow` (weight 400 regular).
- **Strict exclusion**: `input, textarea, select, .input-data, .raw-input, .font-mono, [contenteditable="true"]` must use `--input-font`.
- All translations cleanly separated into `en.json`, `th.json`, `la.json`, `zh.json`, `jp.json`.
- 0 TypeScript compiler errors and 0 Vite build errors.

---

### Task 1: Core Typography Engine Configuration & Global Selector Enforcement
**Files:**
- Modify: `client/src/i18n/index.ts`

- [ ] **Step 1: Set exact font families and regular weights in `fontMap`**
  ```ts
  export const fontMap: Record<string, { family: () => string; name: string; weight: string }> = {
    la: {
      family: () => getLaoFontFamily(), // Defaults to 'Noto Sans Lao'
      name: 'Noto Sans Lao',
      weight: '400',
    },
    th: {
      family: () => "'Noto Sans Thai Light', 'Noto Sans Thai', sans-serif",
      name: 'Noto Sans Thai Light',
      weight: '300',
    },
    jp: {
      family: () => "'Noto Serif Japanese', 'Noto Serif JP', serif",
      name: 'Noto Serif Japanese',
      weight: '400',
    },
    zh: {
      family: () => "'Noto Serif Simplified Chinese', 'Noto Serif SC', serif",
      name: 'Noto Serif Simplified Chinese',
      weight: '400',
    },
    en: {
      family: () => "'Arial Narrow', 'Roboto Condensed', 'Nimbus Sans Narrow', sans-serif",
      name: 'Arial Narrow',
      weight: '400',
    },
  };
  ```

- [ ] **Step 2: Update default Lao font resolver to default to `Noto Sans Lao`**
  ```ts
  export function getLaoFontFamily(style?: LaoFontStyle): string {
    const current = style || getLaoFontStyle();
    if (current === 'looped') {
      return "'Noto Sans Lao Looped', 'Noto Sans Lao', 'Phetsarath OT', sans-serif";
    }
    return "'Noto Sans Lao', 'Saysettha OT', sans-serif";
  }
  ```

- [ ] **Step 3: Enforce comprehensive selector list for menus, titles, buttons, headers, columns, droplists, and forms**
  Ensure all UI elements use the active locale font, while `input, textarea, select, .input-data, .raw-input, .font-mono, [contenteditable="true"]` strictly retain `var(--input-font) !important;`.

- [ ] **Step 4: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 2: Fix Interpolation Bug in Heatmap Report
**Files:**
- Modify: `client/src/components/reports/HourlyHeatmapReport.tsx:390`

- [ ] **Step 1: Pass count interpolation variable to `t('reports.totalSettledReceipts')`**
  Change line 390 from:
  ```tsx
  {matrixData.totalFilteredCount} {t('reports.totalSettledReceipts', 'Total settled receipts')}
  ```
  to:
  ```tsx
  {t('reports.totalSettledReceipts', 'Total settled customer receipts ({{count}} orders)', { count: matrixData.totalFilteredCount })}
  ```

- [ ] **Step 2: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 3: Navbar & Settings Font Name Display Alignment
**Files:**
- Modify: `client/src/components/layout/Navbar.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: Update font labels in `Navbar.tsx`**
  Ensure `getLanguagesList` displays:
  - `LA`: `Noto Sans Lao` (or `Noto Sans Lao Looped` if switched)
  - `TH`: `Noto Sans Thai Light`
  - `JP`: `Noto Serif Japanese`
  - `ZH`: `Noto Serif Simplified Chinese`
  - `EN`: `Arial Narrow`

- [ ] **Step 2: Update Settings typography cards in `SettingsPage.tsx`**
  Confirm options reflect `Noto Sans Lao` as primary and display all 5 enterprise font names.

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 4: Verification & Live Visual Inspection
- [ ] **Step 1: Run TypeScript verification (`npx tsc --noEmit`)**
- [ ] **Step 2: Run Vite production build (`npm run build`)**
- [ ] **Step 3: Live inspect `http://localhost:3000/reports` Heatmap tab in browser to verify that `({{count}} ໃບ)` raw variable is gone and `Noto Sans Lao` regular is cleanly rendered.**
