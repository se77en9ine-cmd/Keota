# Accounting Module Multi-Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Accounting module (`/accounting`) with full localization for all 18 Chart of Accounts, account types, debit/credit badges, headers, droplists, and voucher forms across all 5 languages (LA, TH, EN, ZH, JP), enforcing Noto Sans Lao Regular and zero tone clipping.

**Architecture:** Structured `accounting` translation dictionary in all 5 locale files, dynamic translation helpers in `GeneralLedgerTab.tsx` and `ChartOfAccountsTab.tsx`, and verified clean compilation across client and server.

**Tech Stack:** React, TypeScript, i18next, TailwindCSS, Vite.

## Global Constraints
- **LA**: `Noto Sans Lao` (regular weight 400).
- Strict separation of all translation keys in `en.json`, `th.json`, `la.json`, `zh.json`, `jp.json`.
- 0 TypeScript compiler errors and 0 Vite build errors.

---

### Task 1: Add Structured `accounting` Translations to All 5 Locale Files
**Files:**
- Modify: `client/src/i18n/locales/la.json`
- Modify: `client/src/i18n/locales/th.json`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/zh.json`
- Modify: `client/src/i18n/locales/jp.json`

- [ ] **Step 1: Add complete `accounting` dictionary to `la.json`**
  Includes all 18 account names (`1010` to `6090`), account types (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`), normal balance (`DEBIT`, `CREDIT`), column headers, metrics, filter labels, and voucher modal fields.

- [ ] **Step 2: Add mirror keys to `th.json`, `en.json`, `zh.json`, `jp.json`**

- [ ] **Step 3: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 2: Integrate Account Translations in `GeneralLedgerTab.tsx`
**Files:**
- Modify: `client/src/components/accounting/GeneralLedgerTab.tsx`

- [ ] **Step 1: Translate account names, account types, and normal balance in ledger cards**
  ```tsx
  {t(`accounting.accounts.${accItem.account.code}.name`, accItem.account.name)}
  {t(`accounting.accountTypes.${accItem.account.type}`, accItem.account.type)}
  {t(`accounting.normalBalance.${accItem.account.normalBalance}`, accItem.account.normalBalance)}
  ```

- [ ] **Step 2: Translate `accountOptions` in Account Select droplist**
  Display localized account name and localized account type in the dropdown.

- [ ] **Step 3: Translate summary balance titles and table columns**
  Verify `Total Debit`, `Total Credit`, `Net Ending Balance`, `Date`, `Voucher #`, `Reference / Memo`, `Debit (DR)`, `Credit (CR)`, `Running Balance`.

- [ ] **Step 4: Translate Manual Journal Voucher modal**

- [ ] **Step 5: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 3: Integrate Translations in `ChartOfAccountsTab.tsx`
**Files:**
- Modify: `client/src/components/accounting/ChartOfAccountsTab.tsx`

- [ ] **Step 1: Localize table headers, account name fallbacks, and types in Chart of Accounts table**

- [ ] **Step 2: Test compilation**
  Run: `npx tsc --noEmit` in `client`.

---

### Task 4: Verification & Live Visual Inspection
- [ ] **Step 1: Run TypeScript compiler check on client and server**
- [ ] **Step 2: Run production build (`npm run build`) on client**
- [ ] **Step 3: Live inspect `http://localhost:3000/accounting` in Chrome DevTools MCP and capture screenshot**
