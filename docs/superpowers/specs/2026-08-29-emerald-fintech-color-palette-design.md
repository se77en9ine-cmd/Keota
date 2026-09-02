# Emerald Fintech Pro: Strategic Color Palette & Theme Architecture Spec

## 1. Overview & Goals
The **Emerald Fintech Pro** design system standardizes application-wide color tokens across Light and Dark themes for the entire POS and Retail Management ecosystem.

### Primary Objectives
- **High-Trust Visual Hierarchy**: Establish deep emerald (`#059669` / `#10b981`) as the primary brand and transactional CTA color.
- **Superior Contrast & Readability**: Guarantee WCAG AAA legibility for multi-currency values, product codes, cashier receipts, and accounting ledgers across all devices.
- **Refined Light & Dark Themes**:
  - **Light Theme**: Crisp, clean canvas (`#edf2f7`) paired with pristine white elevated surfaces (`#ffffff`), dark slate ink typography (`#0f172a`), and subtle neumorphic depth.
  - **Dark Theme**: Deep obsidian blue-navy canvas (`#0b0f19`) paired with elevated dark navy cards (`#121826`), luminous emerald accents, and clear silver-slate muted text (`#94a3b8`).
- **Standardized Semantic State System**: Uniform color definitions across all pages for Success (Paid), Info (Online/Delivery), Warning (Pending/Tabs), Danger (Void/Refund), and Neutral states.

---

## 2. Global Color Token Matrix

### 2.1 CSS Variables (`:root` & `.dark` in `index.css`)

```css
:root {
  /* ══ LIGHT THEME PALETTE ══ */
  --canvas-bg: #edf2f7;
  --surface-card: #ffffff;
  --surface-card-hover: #f8fafc;
  --surface-card-active: #f1f5f9;
  --surface-sunken: #e2e8f0;

  --border-subtle: rgba(203, 213, 225, 0.6);
  --border-medium: rgba(148, 163, 184, 0.4);
  --border-focus: rgba(16, 185, 129, 0.45);

  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #64748b;
  --text-inverse: #ffffff;

  /* Brand / Action Primary */
  --brand-primary: #059669;
  --brand-primary-hover: #047857;
  --brand-primary-active: #065f46;
  --brand-primary-glow: 0 4px 14px rgba(5, 150, 105, 0.25);

  /* Semantic Status Tokens (Backgrounds & Foregrounds) */
  --status-success-bg: #ecfdf5;
  --status-success-text: #047857;
  --status-success-border: #a7f3d0;

  --status-info-bg: #f0f9ff;
  --status-info-text: #0369a1;
  --status-info-border: #bae6fd;

  --status-warning-bg: #fffbeb;
  --status-warning-text: #b45309;
  --status-warning-border: #fde68a;

  --status-danger-bg: #fff1f2;
  --status-danger-text: #be123c;
  --status-danger-border: #fecdd3;

  --status-purple-bg: #f5f3ff;
  --status-purple-text: #6d28d9;
  --status-purple-border: #ddd6fe;
}

.dark {
  /* ══ DARK THEME PALETTE (Obsidian Pro) ══ */
  --canvas-bg: #0b0f19;
  --surface-card: #121826;
  --surface-card-hover: #1a2234;
  --surface-card-active: #222d42;
  --surface-sunken: #080c14;

  --border-subtle: rgba(255, 255, 255, 0.07);
  --border-medium: rgba(255, 255, 255, 0.12);
  --border-focus: rgba(16, 185, 129, 0.55);

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-inverse: #0f172a;

  /* Brand / Action Primary */
  --brand-primary: #10b981;
  --brand-primary-hover: #34d399;
  --brand-primary-active: #059669;
  --brand-primary-glow: 0 4px 18px rgba(16, 185, 129, 0.35);

  /* Semantic Status Tokens (Backgrounds & Foregrounds) */
  --status-success-bg: rgba(16, 185, 129, 0.12);
  --status-success-text: #34d399;
  --status-success-border: rgba(16, 185, 129, 0.25);

  --status-info-bg: rgba(56, 189, 248, 0.12);
  --status-info-text: #38bdf8;
  --status-info-border: rgba(56, 189, 248, 0.25);

  --status-warning-bg: rgba(251, 191, 36, 0.12);
  --status-warning-text: #fbbf24;
  --status-warning-border: rgba(251, 191, 36, 0.25);

  --status-danger-bg: rgba(251, 113, 133, 0.12);
  --status-danger-text: #fb7185;
  --status-danger-border: rgba(251, 113, 133, 0.25);

  --status-purple-bg: rgba(168, 85, 247, 0.12);
  --status-purple-text: #c084fc;
  --status-purple-border: rgba(168, 85, 247, 0.25);
}
```

---

## 3. Tailwind Configuration Integration (`tailwind.config.js`)
Extend Tailwind theme colors to leverage semantic variables:
- `bg-canvas`: `var(--canvas-bg)`
- `bg-surface`: `var(--surface-card)`
- `bg-surface-hover`: `var(--surface-card-hover)`
- `text-theme-primary`: `var(--text-primary)`
- `text-theme-muted`: `var(--text-muted)`
- `border-theme-subtle`: `var(--border-subtle)`
- `border-theme-medium`: `var(--border-medium)`
- `brand-emerald`: Emerald scale `50-950`
- `brand-glow`: `var(--brand-primary-glow)`

---

## 4. UI Domain Applications

### 4.1 POS Register & Cart Summary
- **Checkout Action Bar**: Prominent gradient from Emerald-600 to Emerald-500 with crisp white typography and soft green glow.
- **Cart Line Items**: Clear alternation with subtle hover state; strike-through discounts highlighted in amber/rose.
- **Tender & Payment Buttons**: Cash (Emerald), QR Code / OnePay (Cyan), Card / Transfer (Indigo), Unpaid / Tab (Amber).

### 4.2 Omnichannel & Kitchen Order Cards
- **GrabFood**: Signature brand emerald green badge.
- **Foodpanda**: Crisp rose pink badge.
- **Shopee**: Vibrant warm amber badge.
- **TikTok Shop / Web Store**: Cyan / Sky badge.
- **Order Stages**: New (Cyan Pulse) → Preparing (Amber) → Ready (Emerald Glow) → Completed (Muted Slate).

### 4.3 Table Management & Floor Plan
- **Available**: Emerald soft outline & icon (`#10b981`).
- **Occupied / Dining**: Sky Blue / Indigo (`#0284c7` / `#6366f1`).
- **Bill Printed / Pending Payment**: Warm Amber (`#f59e0b`).
- **Cleaning Needed / Blocked**: Rose / Crimson (`#e11d48`).
- **Reserved**: Amethyst Violet (`#8b5cf6`).

### 4.4 Accounting Ledgers & Inventory
- **Inflow / Revenue / Debit**: Crisp Emerald (`#059669` / `#10b981`).
- **Outflow / Expenses / Credit**: Rose Crimson (`#e11d48` / `#fb7185`).
- **Stock Levels**: In Stock (Emerald), Low Stock (Amber Alert), Out of Stock (Rose Badge).

---

## 5. Verification & Quality Plan
1. **Visual Consistency Check**: Run client application and verify all major screens (POS, Online Orders, Products, Accounting, Tables, Settings) in both Light and Dark modes.
2. **Contrast Ratio Auditing**: Verify WCAG AA/AAA compliance across all numbers, currency badges, and table headers.
3. **Seamless Theme Switching**: Verify zero-flicker toggle between light and dark modes with persistent local storage retention.
