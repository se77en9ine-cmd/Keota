# App Languages & Lao Typography Overhaul Design Spec

## 1. Overview & Goals
The 39POS platform requires an end-to-end multi-language localization and typography overhaul, with particular focus on the Lao (`la`) locale as demonstrated in the Executive Reports, Cash Flow, and Analytics sections.

### Key Goals:
1. **Dual Lao Typography Engine**:
   - Introduce seamless toggling between **Classical Looped Lao** (`Noto Sans Lao Looped`) and **Modern Loopless Lao** (`Noto Sans Lao`).
   - Default to `Noto Sans Lao Looped` for enhanced readability, traditional elegance, and clear letter distinction (e.g. ມ, ນ, ລ, ຣ, ວ).
   - Expose a 1-click font style switcher inside the top navigation bar language dropdown and in System Settings.
2. **Lao & Thai Tone Mark / Vowel Clipping Prevention**:
   - Tone marks (່ ້ ໊ ໋) and upper vowels (ິ ີ ຶ ື ັ ົ) and lower vowels (ຸ ູ ຼ) must have sufficient vertical line-height (`line-height: 1.6`) and table cell padding to prevent clipping across all table headers, rows, badges, and tooltips.
3. **100% Elimination of Hardcoded English**:
   - Translate all remaining hardcoded English strings in `CashFlowReport.tsx`, `ReportsPage.tsx`, `DashboardPage.tsx`, etc. into natural Lao business terms in `la.json` (with mirror keys in `en.json`, `th.json`, `zh.json`, `jp.json`).
4. **Data Visualization & Chart.js Typography**:
   - Update Chart.js global font family to prioritize `Noto Sans Lao Looped` and expand tooltip padding and line spacing.
5. **Lao Date Formatting**:
   - Implement localized date presentation (`1 ກ.ຍ. 2026` / `1 ກັນຍາ 2026`) with ISO hover tooltips for audit precision.

---

## 2. Architecture & Components

### 2.1 Font Management & CSS Injection (`client/src/i18n/index.ts`)
- Store user's preferred Lao font style in `localStorage.getItem('39pos_lao_font_style')` (`'looped'` | `'modern'`).
- Update `fontMap`:
  ```ts
  export const fontMap: Record<string, { family: string; name: string; weight: string }> = {
    la: {
      family: getLaoFontFamily(), // resolves to 'Noto Sans Lao Looped' or 'Noto Sans Lao'
      name: 'Noto Sans Lao',
      weight: '400',
    },
    th: { family: "'Noto Sans Thai', sans-serif", name: 'Noto Sans Thai', weight: '400' },
    jp: { family: "'Noto Serif JP', 'Noto Serif Japanese', serif", name: 'Noto Serif Japanese', weight: '400' },
    zh: { family: "'Noto Serif SC', 'Noto Serif Simplified Chinese', serif", name: 'Noto Serif Simplified Chinese', weight: '400' },
    en: { family: "'Roboto Condensed', 'Inter', sans-serif", name: 'Roboto Condensed', weight: '400' },
  };
  ```
- Enhance global CSS injection with:
  ```css
  html[lang="la"], [data-app-font*="Lao"] {
    line-height: 1.6 !important;
  }
  html[lang="la"] table th, html[lang="la"] table td {
    padding-top: 0.85rem !important;
    padding-bottom: 0.85rem !important;
  }
  ```

### 2.2 Topbar Quick Font Switcher (`client/src/components/layout/Navbar.tsx`)
- When `i18n.language === 'la'`, render a compact segmented toggle inside the language menu:
  - `[ 🖋️ ແບບຫົວມົນ (Looped) ]` ⟷ `[ 🔤 ແບບໂມເດີນ (Loopless) ]`
  - Instantly triggers `updateAppFont('la')` without requiring a page reload.

### 2.3 System Settings Typography Section (`client/src/pages/SettingsPage.tsx`)
- Add a "Localization & Typography" card allowing the user to select default application language and Lao font style with live preview.

### 2.4 Translation Keys (`client/src/i18n/locales/*.json`)
- Add structured keys under `cashFlow`:
  - `posSalesInflow`: "ລາຍຮັບຂາຍ POS" / "POS Sales Inflow" / "ยอดขายหน้าร้าน POS"
  - `otherIncomes`: "ລາຍຮັບອື່ນໆ" / "Other Incomes" / "รายรับอื่นๆ"
  - `stockPO`: "ສັ່ງຊື້ສະຕັອກ (PO)" / "Stock PO" / "จัดซื้อสต็อก (PO)"
  - `committed`: "ຜູກພັນໄວ້" / "Committed" / "ผูกพันไว้"
  - `paid`: "ຈ່າຍແລ້ວ" / "Paid" / "ชำระแล้ว"
  - `storeOpex`: "ລາຍຈ່າຍຮ້ານ (OPEX)" / "Store OPEX" / "ค่าใช้จ่ายร้าน (OPEX)"
  - `netCashFlow`: "ກະແສເງິນສົດສຸດທິ" / "Net Cash Flow" / "กระแสเงินสดสุทธิ"
  - `burnMultiplier`: "ອັດຕາການເຜົາຜານ (Inflow/Outflow)" / "Burn Multiplier"
  - `chartSubtitle`: "ການປຽບທຽບກະແສເງິນສົດເຂົ້າ vs ອອກ ແລະ ເງິນສົດສຸດທິ"
  - `totalRecords`: "ລວມທັງໝົດ ({{count}} ລາຍການ)"
  - `noRecords`: "ບໍ່ພົບຂໍ້ມູນກະແສເງິນສົດໃນຮອບເວລານີ້"

### 2.5 Date Formatting Utility (`client/src/utils/dateLocale.ts`)
- Provide `formatLocalizedDate(dateString, language, formatVariant)`:
  - Lao month abbreviations: ມ.ກ., ກ.ພ., ມີ.ນາ, ເມ.ສາ, ພ.ພ., ມິ.ຖ., ກ.ລ., ສ.ຫ., ກ.ຍ., ຕ.ລ., ພ.ຈ., ທ.ວ.
  - Returns formatted string with full date in tooltip.

---

## 3. Verification Plan
1. **TypeScript Build**: `npx tsc --noEmit` on client.
2. **Vite Bundle**: `npm run build` on client.
3. **Browser Testing & Visual Inspection**:
   - Inspect `http://localhost:3000/reports` in Lao mode.
   - Verify all table headers (`POS Sales Inflow`, `Other Incomes`, `Stock PO`, `Store OPEX`) are rendered in Lao.
   - Verify chart tooltips are readable with `Noto Sans Lao Looped` font and no clipped tone marks.
   - Test font style switcher in Navbar and verify instantaneous visual update.
