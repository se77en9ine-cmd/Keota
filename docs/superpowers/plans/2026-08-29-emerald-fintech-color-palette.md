# Emerald Fintech Pro UI Color Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the strategic Emerald Fintech Pro color system across Light and Dark themes in the POS application, establishing clear visual hierarchy, WCAG AAA readability, and standardized status colors.

**Architecture:** Define core CSS tokens in `index.css` for both `:root` (light) and `.dark`, map them into Tailwind utility classes in `tailwind.config.js`, and update critical UI surfaces (Header, POS register checkout, Table maps, Online order badges, and accounting cards).

**Tech Stack:** TailwindCSS, Vanilla CSS Custom Properties, React 18, TypeScript, Vite.

## Global Constraints
- Light canvas: `#edf2f7`, Card surface: `#ffffff`, Text: `#0f172a`.
- Dark canvas: `#0b0f19`, Card surface: `#121826`, Text: `#f8fafc`.
- Primary Brand / Action: Deep Emerald (`#059669` light / `#10b981` dark) with soft glow.
- Zero breaking changes to existing layout components or data models.
- All styles must be fully theme-aware and responsive.

---

### Task 1: Core Semantic CSS Tokens Setup in `index.css`

**Files:**
- Modify: `d:/Google\Antigravity\POS\Online\client\src\index.css:1-60`

**Interfaces:**
- Produces: CSS variables for `--canvas-bg`, `--surface-card`, `--surface-card-hover`, `--surface-card-active`, `--surface-sunken`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-subtle`, `--brand-primary`, `--status-success-*`, `--status-info-*`, `--status-warning-*`, `--status-danger-*`, `--status-purple-*`.

- [ ] **Step 1: Update `:root` and `.dark` CSS tokens in `client/src/index.css`**
Add the Emerald Fintech Pro token variables into `:root` and `.dark` definitions in `client/src/index.css`.

- [ ] **Step 2: Verify CSS builds without errors**
Run: `npm --prefix client run build` or inspect stylesheet syntax.

---

### Task 2: Extend Tailwind Configuration with Semantic Tokens

**Files:**
- Modify: `d:/Google\Antigravity\POS\Online\client\tailwind.config.js:1-55`

**Interfaces:**
- Consumes: CSS variables declared in `index.css`
- Produces: Tailwind helper utilities (`bg-canvas`, `bg-surface`, `bg-surface-hover`, `text-theme-primary`, `text-theme-muted`, `border-theme-subtle`, `shadow-neu-glow-emerald`).

- [ ] **Step 1: Update `client/tailwind.config.js` with semantic theme extensions**
Add `canvas`, `surface`, `theme-primary`, `theme-muted`, and emerald brand definitions.

- [ ] **Step 2: Verify Tailwind config syntax**
Run: `npm --prefix client run build`

---

### Task 3: Apply Theme Upgrades to App Shell, POS Register & Order Cards

**Files:**
- Modify: `d:/Google\Antigravity\POS\Online\client\src\App.tsx`
- Modify: `d:/Google\Antigravity\POS\Online\client\src\pages\OnlineOrdersPage.tsx`
- Modify: `d:/Google\Antigravity\POS\Online\client\src\pages\TablesPage.tsx`

**Interfaces:**
- Consumes: Tailwind semantic tokens and custom CSS variables

- [ ] **Step 1: Align global App background and container shells**
Ensure main app shell uses `bg-[var(--canvas-bg)] text-[var(--text-primary)]`.

- [ ] **Step 2: Harmonize POS & Online Order badges with semantic status colors**
Verify Grab (Emerald), Foodpanda (Rose), Shopee (Amber), Web/TikTok (Cyan), and stage status indicators.

- [ ] **Step 3: Harmonize Table Management floor colors**
Verify Available (Emerald), Occupied (Sky), Bill Printed (Amber), Reserved (Purple), and Cleaning (Rose).

---

### Task 4: Visual & Contrast Verification

**Files:**
- Test: Manual browser check in both Light and Dark modes.

- [ ] **Step 1: Test theme toggle between Light and Dark modes**
Verify no flicker, instant contrast adjustment, and persistent theme state in `localStorage`.

- [ ] **Step 2: Build verification**
Run: `npm --prefix client run build` to ensure production compilation passes cleanly.
