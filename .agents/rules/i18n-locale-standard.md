# Multilingual i18n & Zero-Error Compilation Standard

## 1. Mandatory 5-Locale Clean Separation
Whenever adding or modifying **any UI element** (including features, tabs, buttons, navigation menus, sub-menus, action buttons, header bars, sub-headers, column headers, text bodies, badges, tooltips, and form fields):
- **NEVER hardcode dual-language or parenthetical translations** (e.g. `Damaged (ชำรุด/แตกหัก)` or `Loss & Waste (บันทึกของเสีย)`). English strings must be 100% pure English.
- **ALL 5 locale files MUST be updated in sync**:
  1. `client/src/i18n/locales/en.json` (English)
  2. `client/src/i18n/locales/th.json` (Thai - ภาษาไทย)
  3. `client/src/i18n/locales/la.json` (Lao - ພາສາລາວ)
  4. `client/src/i18n/locales/zh.json` (Chinese - 简体中文)
  5. `client/src/i18n/locales/jp.json` (Japanese - 日本語)
- Use standard `useTranslation` hook syntax: `t('namespace.key', 'Clean English Fallback')`.

## 2. Invariant: Zero-Error Workspace Build Verification
- Before concluding any task, feature implementation, or bugfix, MUST run:
  ```bash
  npm run build
  ```
- Ensure all workspaces (`39pos-client`, `39pos-server`, and `39pos-shared`) compile with **0 TypeScript and Vite bundle errors**.
