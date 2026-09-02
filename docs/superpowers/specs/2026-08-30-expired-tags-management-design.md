# Expired & Expiry Tags Management System Design

## 1. Overview
The **Expired & Expiry Tags Management System** allows store operators to configure how expiration dates and batch freshness are visualized and prioritized across the entire POS and Inventory platform. 

Operators can customize threshold days, color palettes, opacity/translucency levels, size variants, style archetypes (frosted glass, solid, neumorphic, minimal dot), and countdown display formats with full multi-language support (EN, LA, TH, ZH, JP).

---

## 2. Architecture & Data Model

### 2.1 Configuration Schema (`useSettingsStore`)
The configuration is saved in the store under `expiryTagConfig` (and persisted to backend `app_settings` key `expiry_tag_config`):

```typescript
export type TagSizeVariant = 'xs' | 'sm' | 'md';
export type TagStyleVariant = 'FROSTED_GLASS' | 'SOLID_BADGE' | 'NEU_SUNKEN' | 'MINIMAL_DOT';
export type TagDisplayFormat = 'RELATIVE_DAYS' | 'EXACT_DATE' | 'BOTH';

export interface ExpiryTierConfig {
  daysThreshold: number; // e.g. 0 for Expired, 7 for Critical, 30 for Warning
  color: string;         // Hex code e.g. '#ef4444' (Rose), '#f59e0b' (Amber), '#10b981' (Emerald)
  bgOpacity: number;     // 0.05 to 1.0 (e.g. 0.15 for frosted glass, 0.95 for solid)
  textColor?: string;    // Auto-computed contrast or custom hex
  showIcon: boolean;     // Show clock / alert / check icon
  pulseAnimation: boolean; // Gentle breathing glow on urgent items
  showBadge: boolean;    // Toggle visibility for this tier
}

export interface ExpiryTagSystemConfig {
  enabled: boolean;
  sizeVariant: TagSizeVariant;
  styleVariant: TagStyleVariant;
  displayFormat: TagDisplayFormat;
  tiers: {
    expired: ExpiryTierConfig;   // Days <= 0
    critical: ExpiryTierConfig;  // Days <= criticalDays (default: 7)
    warning: ExpiryTierConfig;   // Days <= warningDays (default: 30)
    fresh: ExpiryTierConfig;     // Days > warningDays
  };
}
```

### 2.2 Default Luxury Fintech Preset
```typescript
export const DEFAULT_EXPIRY_TAG_CONFIG: ExpiryTagSystemConfig = {
  enabled: true,
  sizeVariant: 'sm',
  styleVariant: 'FROSTED_GLASS',
  displayFormat: 'RELATIVE_DAYS',
  tiers: {
    expired: {
      daysThreshold: 0,
      color: '#f43f5e', // Rose 500
      bgOpacity: 0.15,
      showIcon: true,
      pulseAnimation: true,
      showBadge: true,
    },
    critical: {
      daysThreshold: 7,
      color: '#f97316', // Orange 500
      bgOpacity: 0.15,
      showIcon: true,
      pulseAnimation: false,
      showBadge: true,
    },
    warning: {
      daysThreshold: 30,
      color: '#eab308', // Amber 500
      bgOpacity: 0.15,
      showIcon: true,
      pulseAnimation: false,
      showBadge: true,
    },
    fresh: {
      daysThreshold: 9999,
      color: '#10b981', // Emerald 500
      bgOpacity: 0.12,
      showIcon: false,
      pulseAnimation: false,
      showBadge: false, // subtle by default
    },
  },
};
```

---

## 3. UI/UX Customizer & Settings Experience

### 3.1 Dedicated Settings Tab (`ExpiryTagsTab.tsx`)
1. **Interactive Live Simulator**:
   - Preview cards reflecting 4 sample products (Expired Milk, Urgent Cheese, Warning Cereal, Fresh Juice) in real-time as settings are tweaked.
2. **One-Click Presets**:
   - *Emerald Fintech*: Subtle frosted glass with jewel tones.
   - *Vibrant Neon*: Higher contrast and saturated glows.
   - *Minimal Monochrome*: Clean slate and subtle accents.
   - *Sunken Neumorphic*: Tactile 39POS native sunken style.
3. **Threshold Steppers & Sliders**:
   - Slider / numeric input for Critical threshold ($1-30$ days) and Warning threshold ($7-90$ days).
   - Color picker with 8 curated luxury palette swatches + raw HEX input.
   - Opacity slider ($10\% - 100\%$) with live transparency preview.
   - Size picker (`xs` compact, `sm` standard, `md` prominent).
   - Style variant picker (`Frosted Glass`, `Solid Badge`, `Neumorphic Sunken`, `Minimal Dot`).

### 3.2 Inventory Quick Launcher
- Button on the `InventoryPage.tsx` toolbar linking directly to tag customization or opening quick adjustment presets.
- Dynamic filtering on Inventory KPI cards matching user-configured `critical` and `warning` day thresholds instead of hardcoded numbers.

---

## 4. Multi-Language & Formatting Engine

### 4.1 Relative Time Formatter (`formatExpiryTag`)
Computes difference in calendar days between `today` and `expiryDate`:
- If $\text{days} < 0$: Expired $N$ days ago.
- If $\text{days} = 0$: Expires Today.
- If $\text{days} > 0$: Expires in $N$ days.

### 4.2 i18n Locales (EN, LA, TH, ZH, JP)
- **EN**:
  - `expiredAgo`: "Expired {{days}}d ago"
  - `expiresToday`: "Expires Today"
  - `expiresInDays`: "Expires in {{days}}d"
  - `daysLeft`: "{{days}} days left"
  - `fresh`: "Fresh"
- **LA (Lao)**:
  - `expiredAgo`: "ໝົດອາຍຸແລ້ວ ({{days}} ວັນກ່ອນ)"
  - `expiresToday`: "ໝົດອາຍຸມື້ນີ້"
  - `expiresInDays`: "ໝົດອາຍຸໃນ {{days}} ວັນ"
  - `daysLeft`: "ເຫຼືອ {{days}} ວັນ"
  - `fresh`: "ສິນຄ້າໃໝ່"
- **TH (Thai)**:
  - `expiredAgo`: "หมดอายุแล้ว ({{days}} วันก่อน)"
  - `expiresToday`: "หมดอายุวันนี้"
  - `expiresInDays`: "หมดอายุใน {{days}} วัน"
  - `daysLeft`: "เหลือ {{days}} วัน"
  - `fresh`: "สดใหม่"
- **ZH (Chinese)**:
  - `expiredAgo`: "已过期 ({{days}}天前)"
  - `expiresToday`: "今天到期"
  - `expiresInDays`: "{{days}}天内过期"
  - `daysLeft`: "剩余{{days}}天"
  - `fresh`: "保质期良好"
- **JP (Japanese)**:
  - `expiredAgo`: "期限切れ ({{days}}日前)"
  - `expiresToday`: "本日賞味期限"
  - `expiresInDays`: "あと{{days}}日で期限切"
  - `daysLeft`: "残り{{days}}日"
  - `fresh`: "良好"

---

## 5. Performance & Rendering Optimization
- Pure memoized component `<ExpiryBadge />` to prevent re-renders in large inventory tables.
- Pure CSS variables for color and opacity calculations (`rgba(...)` or CSS `color-mix`).
- Zero layout thrashing: predetermined badge dimensions.
