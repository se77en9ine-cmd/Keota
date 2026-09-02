import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Clock, AlertTriangle, Sparkles, Flame } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  ExpiryTagSystemConfig,
  getExpiryTierInfo,
  hexToRgba,
  DEFAULT_EXPIRY_TAG_CONFIG,
} from '../../utils/expiryTagUtils';

export interface ExpiryBadgeProps {
  expiryDate?: string | null;
  customConfig?: ExpiryTagSystemConfig;
  className?: string;
  forceShow?: boolean;
  batchQuantity?: number;
  totalQuantity?: number;
  batchCount?: number;
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = React.memo(
  ({
    expiryDate,
    customConfig,
    className = '',
    forceShow = false,
    batchQuantity,
    totalQuantity,
    batchCount,
  }) => {
    const { t } = useTranslation();
    const storeConfig = useSettingsStore((s) => s.expiryTagConfig);
    const config = customConfig || storeConfig || DEFAULT_EXPIRY_TAG_CONFIG;

    const tierInfo = useMemo(() => {
      return getExpiryTierInfo(expiryDate, config);
    }, [expiryDate, config]);

    if (!forceShow && (!tierInfo.shouldRender || !expiryDate)) {
      return null;
    }

    const { tier, daysDiff, tierConfig } = tierInfo;
    const { color, bgOpacity, showIcon, pulseAnimation } = tierConfig;
    const sizeVariant = config.sizeVariant || 'sm';
    const styleVariant = config.styleVariant || 'FROSTED_GLASS';
    const displayFormat = config.displayFormat || 'RELATIVE_DAYS';

    // Localized Text Generation
    let relativeText = '';
    if (daysDiff < 0) {
      relativeText = t('expiryTags.expiredAgo', 'Expired ({{days}}d ago)', { days: Math.abs(daysDiff) });
    } else if (daysDiff === 0) {
      relativeText = t('expiryTags.expiresToday', 'Expires Today');
    } else if (tier === 'CRITICAL') {
      relativeText = t('expiryTags.expiresInDays', 'Expires in {{days}}d', { days: daysDiff });
    } else if (tier === 'WARNING') {
      relativeText = t('expiryTags.daysLeft', '{{days}} days left', { days: daysDiff });
    } else {
      relativeText = t('expiryTags.fresh', 'Fresh');
    }

    let label = relativeText;
    if (batchQuantity !== undefined && batchQuantity > 0 && totalQuantity !== undefined && totalQuantity > batchQuantity) {
      label = `${batchQuantity}x ${relativeText}`;
    } else if (displayFormat === 'EXACT_DATE') {
      label = expiryDate || relativeText;
    } else if (displayFormat === 'BOTH' && expiryDate) {
      label = `${relativeText} (${expiryDate})`;
    }

    // Size Classes (Inherits --app-font / Noto Sans Lao for proper script shaping with regular style)
    const sizeClasses = {
      xs: 'text-[9.5px] px-1.5 py-0.5 rounded-md font-normal tracking-normal gap-1',
      sm: 'text-[11px] px-2.5 py-0.5 rounded-full font-normal tracking-normal gap-1.5',
      md: 'text-xs px-3 py-1 rounded-xl font-normal tracking-normal gap-2',
    }[sizeVariant];

    // Icon Size
    const iconSize = {
      xs: 'w-2.5 h-2.5',
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
    }[sizeVariant];

    // Icon Selection
    const renderIcon = () => {
      if (!showIcon && styleVariant !== 'MINIMAL_DOT') return null;
      if (tier === 'EXPIRED') return <AlertCircle className={`${iconSize} flex-shrink-0`} />;
      if (tier === 'CRITICAL') return <Flame className={`${iconSize} flex-shrink-0`} />;
      if (tier === 'WARNING') return <Clock className={`${iconSize} flex-shrink-0`} />;
      return <Sparkles className={`${iconSize} flex-shrink-0`} />;
    };

    // Style Variant Construction (Clean Regular Typography)
    let inlineStyle: React.CSSProperties = {
      fontStyle: 'normal',
      fontWeight: 400,
    };
    let variantClass = '';

    if (styleVariant === 'FROSTED_GLASS') {
      inlineStyle = {
        ...inlineStyle,
        backgroundColor: hexToRgba(color, bgOpacity),
        borderColor: hexToRgba(color, Math.min(1, bgOpacity * 2.5 + 0.15)),
        color: color,
      };
      variantClass = 'border backdrop-blur-sm shadow-sm font-normal';
    } else if (styleVariant === 'SOLID_BADGE') {
      inlineStyle = {
        ...inlineStyle,
        backgroundColor: hexToRgba(color, bgOpacity),
        color: '#ffffff',
      };
      variantClass = 'shadow font-normal';
    } else if (styleVariant === 'NEU_SUNKEN') {
      inlineStyle = {
        ...inlineStyle,
        backgroundColor: hexToRgba(color, bgOpacity),
        color: color,
      };
      variantClass = 'neu-sunken-sm shadow-inner font-normal';
    } else if (styleVariant === 'MINIMAL_DOT') {
      inlineStyle = {
        ...inlineStyle,
        color: color,
      };
      variantClass = 'bg-transparent font-normal';
    }

    return (
      <span
        style={inlineStyle}
        title={`${relativeText} • ${expiryDate}`}
        className={`inline-flex items-center select-none whitespace-nowrap transition-all duration-200 ${sizeClasses} ${variantClass} ${
          pulseAnimation ? 'animate-pulse ring-2 ring-rose-500/20' : ''
        } ${className}`}
      >
        {styleVariant === 'MINIMAL_DOT' ? (
          <span
            className={`rounded-full flex-shrink-0 ${
              sizeVariant === 'xs' ? 'w-1.5 h-1.5' : sizeVariant === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
            } ${pulseAnimation ? 'animate-ping' : ''}`}
            style={{ backgroundColor: color }}
          />
        ) : (
          renderIcon()
        )}
        <span className="truncate">{label}</span>
      </span>
    );
  }
);

ExpiryBadge.displayName = 'ExpiryBadge';
