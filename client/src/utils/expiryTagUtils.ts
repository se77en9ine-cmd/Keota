export type TagSizeVariant = 'xs' | 'sm' | 'md';
export type TagStyleVariant = 'FROSTED_GLASS' | 'SOLID_BADGE' | 'NEU_SUNKEN' | 'MINIMAL_DOT';
export type TagDisplayFormat = 'RELATIVE_DAYS' | 'EXACT_DATE' | 'BOTH';

export interface ExpiryTierConfig {
  daysThreshold: number; // e.g. 0 for Expired, 7 for Critical, 30 for Warning
  color: string;         // Hex code e.g. '#f43f5e' (Rose), '#f97316' (Orange), '#eab308' (Amber)
  bgOpacity: number;     // 0.05 to 1.0 (e.g. 0.15 for frosted glass, 0.95 for solid)
  textColor?: string;    // Custom text color or auto-computed
  showIcon: boolean;     // Show clock / alert / check icon
  pulseAnimation: boolean; // Breathing glow animation on urgent/expired items
  showBadge: boolean;    // Toggle visibility for this tier
}

export interface ExpiryTagSystemConfig {
  enabled: boolean;
  sizeVariant: TagSizeVariant;
  styleVariant: TagStyleVariant;
  displayFormat: TagDisplayFormat;
  tiers: {
    expired: ExpiryTierConfig;   // Days <= 0
    critical: ExpiryTierConfig;  // Days <= critical.daysThreshold (default: 7)
    warning: ExpiryTierConfig;   // Days <= warning.daysThreshold (default: 30)
    fresh: ExpiryTierConfig;     // Days > warning.daysThreshold
  };
}

export const DEFAULT_EXPIRY_TAG_CONFIG: ExpiryTagSystemConfig = {
  enabled: true,
  sizeVariant: 'sm',
  styleVariant: 'FROSTED_GLASS',
  displayFormat: 'RELATIVE_DAYS',
  tiers: {
    expired: {
      daysThreshold: 0,
      color: '#f43f5e', // Rose 500
      bgOpacity: 0.18,
      showIcon: true,
      pulseAnimation: true,
      showBadge: true,
    },
    critical: {
      daysThreshold: 7,
      color: '#f97316', // Orange 500
      bgOpacity: 0.16,
      showIcon: true,
      pulseAnimation: false,
      showBadge: true,
    },
    warning: {
      daysThreshold: 30,
      color: '#eab308', // Amber 500
      bgOpacity: 0.14,
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
      showBadge: false,
    },
  },
};

export interface ExpiryTagPreset {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  config: Partial<ExpiryTagSystemConfig>;
}

export const EXPIRY_TAG_PRESETS: ExpiryTagPreset[] = [
  {
    id: 'EMERALD_FINTECH',
    nameKey: 'expiryTags.presetEmeraldFintech',
    descKey: 'expiryTags.presetEmeraldFintechDesc',
    icon: '💎',
    config: {
      styleVariant: 'FROSTED_GLASS',
      sizeVariant: 'sm',
      tiers: {
        expired: { daysThreshold: 0, color: '#f43f5e', bgOpacity: 0.18, showIcon: true, pulseAnimation: true, showBadge: true },
        critical: { daysThreshold: 7, color: '#f97316', bgOpacity: 0.16, showIcon: true, pulseAnimation: false, showBadge: true },
        warning: { daysThreshold: 30, color: '#eab308', bgOpacity: 0.14, showIcon: true, pulseAnimation: false, showBadge: true },
        fresh: { daysThreshold: 9999, color: '#10b981', bgOpacity: 0.12, showIcon: false, pulseAnimation: false, showBadge: false },
      },
    },
  },
  {
    id: 'VIBRANT_NEON',
    nameKey: 'expiryTags.presetVibrantNeon',
    descKey: 'expiryTags.presetVibrantNeonDesc',
    icon: '⚡',
    config: {
      styleVariant: 'SOLID_BADGE',
      sizeVariant: 'sm',
      tiers: {
        expired: { daysThreshold: 0, color: '#ff0055', bgOpacity: 0.95, showIcon: true, pulseAnimation: true, showBadge: true },
        critical: { daysThreshold: 7, color: '#ff6600', bgOpacity: 0.95, showIcon: true, pulseAnimation: false, showBadge: true },
        warning: { daysThreshold: 30, color: '#ffbb00', bgOpacity: 0.95, showIcon: true, pulseAnimation: false, showBadge: true },
        fresh: { daysThreshold: 9999, color: '#00cc88', bgOpacity: 0.95, showIcon: true, pulseAnimation: false, showBadge: true },
      },
    },
  },
  {
    id: 'SUBTLE_GLASS',
    nameKey: 'expiryTags.presetSubtleGlass',
    descKey: 'expiryTags.presetSubtleGlassDesc',
    icon: '🫧',
    config: {
      styleVariant: 'FROSTED_GLASS',
      sizeVariant: 'xs',
      tiers: {
        expired: { daysThreshold: 0, color: '#fb7185', bgOpacity: 0.12, showIcon: true, pulseAnimation: false, showBadge: true },
        critical: { daysThreshold: 7, color: '#fb923c', bgOpacity: 0.10, showIcon: true, pulseAnimation: false, showBadge: true },
        warning: { daysThreshold: 30, color: '#facc15', bgOpacity: 0.10, showIcon: false, pulseAnimation: false, showBadge: true },
        fresh: { daysThreshold: 9999, color: '#34d399', bgOpacity: 0.08, showIcon: false, pulseAnimation: false, showBadge: false },
      },
    },
  },
  {
    id: 'NEU_TACTILE',
    nameKey: 'expiryTags.presetNeuTactile',
    descKey: 'expiryTags.presetNeuTactileDesc',
    icon: '🔘',
    config: {
      styleVariant: 'NEU_SUNKEN',
      sizeVariant: 'sm',
      tiers: {
        expired: { daysThreshold: 0, color: '#e11d48', bgOpacity: 0.25, showIcon: true, pulseAnimation: true, showBadge: true },
        critical: { daysThreshold: 7, color: '#ea580c', bgOpacity: 0.22, showIcon: true, pulseAnimation: false, showBadge: true },
        warning: { daysThreshold: 30, color: '#ca8a04', bgOpacity: 0.20, showIcon: true, pulseAnimation: false, showBadge: true },
        fresh: { daysThreshold: 9999, color: '#059669', bgOpacity: 0.18, showIcon: false, pulseAnimation: false, showBadge: false },
      },
    },
  },
];

export type ExpiryTierType = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'FRESH';

export interface ExpiryTierResult {
  tier: ExpiryTierType;
  daysDiff: number; // positive = days until expiry, 0 = today, negative = days past
  tierConfig: ExpiryTierConfig;
  shouldRender: boolean;
}

/**
 * Calculates days remaining from today until expiryDate.
 * Expects date string in 'YYYY-MM-DD' format.
 */
export function calculateDaysDiff(expiryDateStr?: string | null, referenceDate: Date = new Date()): number {
  if (!expiryDateStr) return 999999;
  
  // Normalize both dates to midnight UTC/Local to avoid timezone offset skew
  const [y, m, d] = expiryDateStr.split('-').map(Number);
  if (!y || !m || !d) return 999999;
  
  const target = new Date(y, m - 1, d, 0, 0, 0, 0);
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
  
  const diffMs = target.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates an expiry date against system tier thresholds.
 */
export function getExpiryTierInfo(
  expiryDateStr?: string | null,
  config: ExpiryTagSystemConfig = DEFAULT_EXPIRY_TAG_CONFIG
): ExpiryTierResult {
  if (!expiryDateStr) {
    return {
      tier: 'FRESH',
      daysDiff: 999999,
      tierConfig: config.tiers.fresh,
      shouldRender: false,
    };
  }

  const daysDiff = calculateDaysDiff(expiryDateStr);
  const { expired, critical, warning, fresh } = config.tiers;

  if (daysDiff <= 0) {
    return {
      tier: 'EXPIRED',
      daysDiff,
      tierConfig: expired,
      shouldRender: config.enabled && expired.showBadge,
    };
  }

  if (daysDiff <= (critical.daysThreshold || 7)) {
    return {
      tier: 'CRITICAL',
      daysDiff,
      tierConfig: critical,
      shouldRender: config.enabled && critical.showBadge,
    };
  }

  if (daysDiff <= (warning.daysThreshold || 30)) {
    return {
      tier: 'WARNING',
      daysDiff,
      tierConfig: warning,
      shouldRender: config.enabled && warning.showBadge,
    };
  }

  return {
    tier: 'FRESH',
    daysDiff,
    tierConfig: fresh,
    shouldRender: config.enabled && fresh.showBadge,
  };
}

/**
 * Helper to convert hex color + opacity to rgba string
 */
export function hexToRgba(hex: string, opacity: number = 1): string {
  const cleanHex = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}
