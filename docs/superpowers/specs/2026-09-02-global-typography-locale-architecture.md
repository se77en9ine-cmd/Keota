# Global Multi-Locale Typography & System-Wide Localization Specification

## 1. Executive Summary & Goals
This specification establishes the definitive typography engine, global font enforcement rules, and multi-locale translation architecture across 39POS for all 5 enterprise languages.

### Language & Font Standard:
| Locale Code | Language | Font Name | Font Style / Weight | Fallback Chain |
| :--- | :--- | :--- | :--- | :--- |
| **LA** | Lao (ລາວ) | **Noto Sans Lao** | Regular (400) | `'Noto Sans Lao', 'Saysettha OT', sans-serif` |
| **TH** | Thai (ไทย) | **Noto Sans Thai Light** | Regular / Light (300–400) | `'Noto Sans Thai Light', 'Noto Sans Thai', sans-serif` |
| **JP** | Japanese (日本語) | **Noto Serif Japanese** | Regular (400) | `'Noto Serif Japanese', 'Noto Serif JP', serif` |
| **ZH** | Chinese (简体中文) | **Noto Serif Simplified Chinese** | Regular (400) | `'Noto Serif Simplified Chinese', 'Noto Serif SC', serif` |
| **EN** | English (US) | **Arial Narrow** | Regular (400) | `'Arial Narrow', 'Roboto Condensed', 'Nimbus Sans Narrow', sans-serif` |

---

## 2. Global Scope & Exclusion Architecture

### 2.1 Applied Surfaces (100% Comprehensive Coverage)
The active language typography applies systematically to:
- **Menu Bars & Header Bars**: Primary top navigation, header actions, breadcrumbs.
- **Sub-Menus & Sub-Header Bars**: Secondary tabs, filter ribbons, view segmented controls.
- **Navigation & Sub-Navigation Menus**: Left sidebar navigation links, flyout sub-menus, drawer navigation.
- **Titles & Text Bodies**: `h1`–`h6`, card titles, section subtitles, descriptions, paragraphs, badges, pills.
- **Action Buttons & Exports**: Buttons, modals, batch dock actions, floating action buttons, Excel/PDF export triggers.
- **Column Names & Tables**: Table headers (`th`), table body cells (`td`), footer summaries.
- **Field Forms & Droplists**: Form labels, field headers, helper texts, field option labels, custom select droplists, dropdown menus.

### 2.2 Strict Input Data Exclusion Rule (Crucial)
To preserve barcode scanning speed, numeric currency precision, and raw data fidelity:
- `input`, `textarea`, `select`, `.input-data`, `.raw-input`, `.font-mono`, `[contenteditable="true"]`, and monetary numerical amounts remain strictly bound to `--input-font` (`'JetBrains Mono', 'Fira Code', monospace` or system monospace).
- `input::placeholder` and `textarea::placeholder` follow the active locale font.

---

## 3. Tone Mark & Vertical Clipping Protection
- For `[lang="la"]` and `[lang="th"]`, enforce `line-height: 1.6 !important;` globally.
- Table headers and cells enforce generous vertical padding (`padding-top: 0.75rem !important; padding-bottom: 0.75rem !important;`).
- Eliminates clipping on Lao upper vowels (ິ, ີ, ຶ, ື, ັ, ົ), lower vowels (ຸ, ູ, ຼ), and tone marks (່, ້, ໊, ໋).

---

## 4. Translation Integrity & Bug Fixes
- **Heatmap Raw Variable Bug Fix**: In `HourlyHeatmapReport.tsx:390`, pass `{ count: matrixData.totalFilteredCount }` to `t('reports.totalSettledReceipts', ...)` to eliminate raw `({{count}} ໃບ)` text.
- Clean separation of keys across all 5 locale JSON files: `en.json`, `th.json`, `la.json`, `zh.json`, `jp.json`.
- Zero build errors (`tsc --noEmit` and `npm run build`).
