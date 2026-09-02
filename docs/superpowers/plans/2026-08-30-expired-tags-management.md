# Expired & Expiry Tags Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an intuitive yet ultra-premium management and styling customizer for batch/product expiration tags (custom colors, opacity, sizes, thresholds, animations) with multi-language relative countdowns (EN, LA, TH, ZH, JP) and real-time application across Inventory and POS.

**Architecture:** A centralized `expiryTagConfig` state in `useSettingsStore` persisted to the backend `app_settings` / `localStorage`, rendered through a pure memoized `<ExpiryBadge />` component utilizing CSS variables for frictionless styling and zero re-render overhead. A rich live-simulator settings tab (`ExpiryTagsTab.tsx`) with preset themes, steppers, and color swatches.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Zustand, i18next.

## Global Constraints
- Support all 5 system languages: English (`en`), Lao (`la`), Thai (`th`), Chinese (`zh`), Japanese (`jp`).
- Follow Emerald Fintech UI standards (dark/light theme compatibility, smooth glassmorphism, responsive typography, font tokens).
- Maintain 60fps rendering in large inventory tables via memoization and pure CSS styling.

---

### Task 1: Type Definitions, Default Configs & Pure Date Calculations
**Files:**
- Create: `client/src/utils/expiryTagUtils.ts`

**Interfaces:**
- Produces: `ExpiryTagSystemConfig`, `ExpiryTierConfig`, `DEFAULT_EXPIRY_TAG_CONFIG`, `EXPIRY_TAG_PRESETS`, `getExpiryTierInfo`, `formatExpiryTagText`.

- [x] **Step 1: Create `client/src/utils/expiryTagUtils.ts` with types, presets, and calculation logic**
- [x] **Step 2: Verify calculations for past, today, critical, warning, and fresh dates**

---

### Task 2: i18n Localization for All 5 Languages
**Files:**
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/la.json`
- Modify: `client/src/i18n/locales/th.json`
- Modify: `client/src/i18n/locales/zh.json`
- Modify: `client/src/i18n/locales/jp.json`

**Interfaces:**
- Produces: `expiryTags.*` translation keys for countdowns, UI labels, tooltips, presets, and style names.

- [x] **Step 1: Add `expiryTags` namespace to `en.json`**
- [x] **Step 2: Add `expiryTags` translations to `la.json` (Lao)**
- [x] **Step 3: Add `expiryTags` translations to `th.json` (Thai)**
- [x] **Step 4: Add `expiryTags` translations to `zh.json` (Chinese)**
- [x] **Step 5: Add `expiryTags` translations to `jp.json` (Japanese)**

---

### Task 3: Zustand Store Integration in `useSettingsStore`
**Files:**
- Modify: `client/src/store/useSettingsStore.ts`

**Interfaces:**
- Consumes: `ExpiryTagSystemConfig`, `DEFAULT_EXPIRY_TAG_CONFIG` from `client/src/utils/expiryTagUtils.ts`
- Produces: `expiryTagConfig` state property and `updateExpiryTagConfig(config: Partial<ExpiryTagSystemConfig>)` action.

- [x] **Step 1: Add `expiryTagConfig` to `SettingsState` interface**
- [x] **Step 2: Implement state initialization from `localStorage` / backend settings**
- [x] **Step 3: Implement `updateExpiryTagConfig` action persisting to backend API**

---

### Task 4: Reusable `<ExpiryBadge />` Micro-Component
**Files:**
- Create: `client/src/components/common/ExpiryBadge.tsx`

**Interfaces:**
- Consumes: `expiryTagConfig` from `useSettingsStore`, `getExpiryTierInfo` from `expiryTagUtils.ts`, `t` from `react-i18next`.
- Produces: `<ExpiryBadge expiryDate={string} customConfig?: ExpiryTagSystemConfig className?: string />`.

- [x] **Step 1: Implement `ExpiryBadge.tsx` with dynamic CSS styling, size variations, icons, and pulse animations**
- [x] **Step 2: Verify rendering in dark and light modes with custom opacity and colors**

---

### Task 5: Interactive Customizer Tab (`ExpiryTagsTab.tsx`)
**Files:**
- Create: `client/src/components/settings/ExpiryTagsTab.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `ExpiryBadge`, `EXPIRY_TAG_PRESETS`.
- Produces: Dedicated Settings tab with live mock cards, interactive opacity sliders, color palette swatches, size controls, and reset buttons.

- [x] **Step 1: Create `ExpiryTagsTab.tsx` with simulator cards and controls**
- [x] **Step 2: Register `'EXPIRY_TAGS'` tab in `SettingsPage.tsx` with navigation icon and title**
- [x] **Step 3: Test preset selection, slider drags, and reset to defaults**

---

### Task 6: Inventory Page Integration & Dynamic Threshold Filtering
**Files:**
- Modify: `client/src/pages/InventoryPage.tsx`

**Interfaces:**
- Consumes: `ExpiryBadge`, `useSettingsStore`.
- Produces: Replaced hardcoded tags in Inventory Table and Mobile Cards with dynamic `<ExpiryBadge />`, connected KPI cards to user-configured critical/warning thresholds, and added "Tag Styles" quick-launcher button.

- [x] **Step 1: Replace hardcoded expiry date badges with `<ExpiryBadge expiryDate={item.expiryDate} />` in `InventoryPage.tsx`**
- [x] **Step 2: Update KPI cards (Expiring Batches) to use `critical.daysThreshold` and `warning.daysThreshold` dynamically**
- [x] **Step 3: Add "⚙️ Tag Styles" launcher button in the Inventory toolbar linking to Settings tab**

---

### Task 7: Verification & Visual Polish
**Files:**
- Test across all 5 languages (EN, LA, TH, ZH, JP)
- Verify mobile responsiveness and dark/light mode aesthetics

- [x] **Step 1: Test switching languages and verify all countdown strings update correctly**
- [x] **Step 2: Test modifying colors and opacity in Settings and confirm instant reflection in Inventory Page**
- [x] **Step 3: Run build verification (`npm run build` or Vite build check)**
