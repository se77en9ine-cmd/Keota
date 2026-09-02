import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tag,
  Sparkles,
  RotateCcw,
  Save,
  CheckCircle2,
  Sliders,
  Eye,
  Clock,
  Flame,
  AlertCircle,
  AlertTriangle,
  Layers,
  Palette,
  Percent,
  Calendar,
  Check,
  LayoutGrid,
  CreditCard,
  Table as TableIcon,
  ShoppingBag,
  Building2,
  Barcode,
  Package,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  ExpiryTagSystemConfig,
  DEFAULT_EXPIRY_TAG_CONFIG,
  EXPIRY_TAG_PRESETS,
  TagSizeVariant,
  TagStyleVariant,
  TagDisplayFormat,
} from '../../utils/expiryTagUtils';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { CustomCheckbox } from '../common/CustomCheckbox';
import { soundFX } from '../../utils/audio';
import { haptics } from '../../utils/haptics';

const LUXURY_PALETTE = [
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const ExpiryTagsTab: React.FC = () => {
  const { t } = useTranslation();
  const { expiryTagConfig, updateExpiryTagConfig } = useSettingsStore();

  const [form, setForm] = useState<ExpiryTagSystemConfig>(() => {
    return expiryTagConfig ? JSON.parse(JSON.stringify(expiryTagConfig)) : DEFAULT_EXPIRY_TAG_CONFIG;
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTierTab, setActiveTierTab] = useState<'expired' | 'critical' | 'warning' | 'fresh'>('critical');
  const [previewSurface, setPreviewSurface] = useState<'SHELF' | 'POS' | 'TABLE'>('SHELF');

  // Realistic Sample Dates for Live Simulator
  const today = new Date();
  const expiredDateStr = new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0];
  const criticalDateStr = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
  const warningDateStr = new Date(today.getTime() + 18 * 86400000).toISOString().split('T')[0];
  const freshDateStr = new Date(today.getTime() + 180 * 86400000).toISOString().split('T')[0];

  const sampleProducts = [
    {
      id: 'p1',
      name: t('expiryTags.sampleExpiredProduct', 'Organic Whole Milk 1L'),
      category: 'Dairy & Fresh',
      sku: 'SKU-MILK-01',
      barcode: '8850123456789',
      batch: 'LOT-9021',
      price: '$3.50',
      expiryDate: expiredDateStr,
      avatarIcon: '🥛',
      accent: 'rose',
    },
    {
      id: 'p2',
      name: t('expiryTags.sampleCriticalProduct', 'Fresh Mozzarella Cheese'),
      category: 'Gourmet Cold',
      sku: 'SKU-CHEESE-08',
      barcode: '8850987654321',
      batch: 'LOT-8432',
      price: '$5.80',
      expiryDate: criticalDateStr,
      avatarIcon: '🧀',
      accent: 'orange',
    },
    {
      id: 'p3',
      name: t('expiryTags.sampleWarningProduct', 'Oat Granola Cereal 500g'),
      category: 'Breakfast Dry',
      sku: 'SKU-OAT-99',
      barcode: '8850333222111',
      batch: 'LOT-7120',
      price: '$4.20',
      expiryDate: warningDateStr,
      avatarIcon: '🥣',
      accent: 'amber',
    },
    {
      id: 'p4',
      name: t('expiryTags.sampleFreshProduct', 'Natural Sparkling Water'),
      category: 'Beverages',
      sku: 'SKU-WATER-04',
      barcode: '8850444555666',
      batch: 'LOT-6500',
      price: '$1.50',
      expiryDate: freshDateStr,
      avatarIcon: '💧',
      accent: 'emerald',
    },
  ];

  const handleApplyPreset = (presetConfig: Partial<ExpiryTagSystemConfig>) => {
    soundFX.playBeep();
    haptics.light();
    setForm((prev) => ({
      ...prev,
      ...presetConfig,
      tiers: {
        ...prev.tiers,
        ...(presetConfig.tiers || {}),
      },
    }));
  };

  const handleResetDefaults = () => {
    soundFX.playBeep();
    haptics.medium();
    setForm(JSON.parse(JSON.stringify(DEFAULT_EXPIRY_TAG_CONFIG)));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      soundFX.playCashSuccess();
      haptics.success();
      await updateExpiryTagConfig(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save expiry tag config:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (tierKey: 'expired' | 'critical' | 'warning' | 'fresh', partial: any) => {
    setForm((prev) => ({
      ...prev,
      tiers: {
        ...prev.tiers,
        [tierKey]: {
          ...prev.tiers[tierKey],
          ...partial,
        },
      },
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 🌟 Top Header Subtitle & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl neu-card-lg bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neu-sunken flex items-center justify-center text-rose-500 flex-shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{t('expiryTags.title', 'Expiry & Batch Tags')}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black neu-pill text-emerald-500">
                STUDIO PRO
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('expiryTags.subtitle', 'Customize batch expiration color alerts, translucency, badge styles, threshold days, and relative countdowns')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl neu-btn text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer hover:text-rose-500 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('expiryTags.btnResetDefaults', 'Reset Defaults')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 neu-btn-primary text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>{t('common.saved', 'Saved!')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? t('common.saving', 'Saving...') : t('common.saveChanges', 'Save Changes')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🌟 2-Column Split Studio Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ══════════════════════════════════════════════════════════
            📌 LEFT COLUMN: STICKY LIVE SIMULATOR & SURFACE PREVIEW
            (Pinned on desktop so it never leaves your sight!)
           ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 lg:sticky lg:top-1 space-y-4">
          <div className="p-5 rounded-3xl neu-card-lg border-2 border-emerald-500/25 bg-gradient-to-b from-slate-500/5 to-transparent space-y-4 shadow-xl">
            {/* Live Header & Surface Switcher */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <span>{t('expiryTags.livePreviewTitle', 'Live Interactive Simulator')}</span>
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  REAL-TIME
                </span>
              </div>

              {/* Surface Tabs: Shelf / POS / Table */}
              <div className="p-1 rounded-2xl neu-sunken-sm flex items-center gap-1 text-[11px] font-bold">
                {[
                  { id: 'SHELF', label: t('expiryTags.previewShelf', 'Shelf Cards'), icon: LayoutGrid },
                  { id: 'POS', label: t('expiryTags.previewPos', 'POS Register'), icon: CreditCard },
                  { id: 'TABLE', label: t('expiryTags.previewTable', 'Ledger Table'), icon: TableIcon },
                ].map((s) => {
                  const Icon = s.icon;
                  const active = previewSurface === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPreviewSurface(s.id as any)}
                      className={`flex-1 py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'neu-card text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Surface 1: Shelf Batch Cards */}
            {previewSurface === 'SHELF' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-[480px] overflow-y-auto pr-0.5 scrollbar-thin">
                {sampleProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl neu-sunken-sm bg-white/60 dark:bg-slate-900/60 flex items-center justify-between gap-3 border border-slate-200/50 dark:border-slate-800/50 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl neu-card-sm flex items-center justify-center text-lg flex-shrink-0">
                        {p.avatarIcon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-black text-slate-400">{p.batch}</span>
                          <span className="text-[9px] text-slate-400">• {p.price}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {p.name}
                        </h4>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <ExpiryBadge expiryDate={p.expiryDate} customConfig={form} forceShow />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Surface 2: POS Register Item Rows */}
            {previewSurface === 'POS' && (
              <div className="p-3 rounded-2xl neu-sunken-sm bg-white/60 dark:bg-slate-900/60 divide-y divide-slate-200/50 dark:divide-slate-800/50 text-xs">
                {sampleProducts.map((p, idx) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between gap-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-slate-400 font-mono font-bold text-[10px]">#{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate text-xs flex items-center gap-1.5">
                          <span>{p.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.sku} • {p.price}</div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <ExpiryBadge expiryDate={p.expiryDate} customConfig={form} forceShow />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Surface 3: Inventory Ledger Table */}
            {previewSurface === 'TABLE' && (
              <div className="rounded-2xl neu-sunken-sm bg-white/60 dark:bg-slate-900/60 overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="neu-sunken-sm text-slate-400 font-bold uppercase text-[9px] border-b border-slate-200/50 dark:border-slate-800/50">
                    <tr>
                      <th className="p-2.5">PRODUCT & LOT</th>
                      <th className="p-2.5 text-right">EXPIRY STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40 font-medium">
                    {sampleProducts.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{p.name}</div>
                          <div className="text-[9px] font-mono text-slate-400">{p.batch}</div>
                        </td>
                        <td className="p-2.5 text-right">
                          <ExpiryBadge expiryDate={p.expiryDate} customConfig={form} forceShow />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Active Spec Summary Pills */}
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded-md neu-card-sm text-emerald-500 font-bold">
                Style: {form.styleVariant}
              </span>
              <span className="px-2 py-0.5 rounded-md neu-card-sm text-blue-500 font-bold">
                Size: {form.sizeVariant.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-md neu-card-sm text-amber-500 font-bold">
                Format: {form.displayFormat}
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            🎛️ RIGHT COLUMN: STUDIO CUSTOMIZATION CONTROLS
           ══════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          {/* 🌟 Section 1: One-Click Luxury Presets */}
          <div className="p-5 rounded-3xl neu-card-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {t('expiryTags.presetsTitle', 'One-Click Luxury Presets')}
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Click to instantly apply curated theme</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {EXPIRY_TAG_PRESETS.map((preset) => {
                const isActive = form.styleVariant === preset.config.styleVariant;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.config)}
                    className={`p-3.5 rounded-2xl text-left flex items-start gap-3 cursor-pointer group transition-all ${
                      isActive
                        ? 'neu-sunken border border-emerald-500/40 text-slate-900 dark:text-white'
                        : 'neu-btn text-slate-700 dark:text-slate-300 hover:border-emerald-500/30'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{preset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {t(preset.nameKey, preset.id)}
                        </h4>
                        {isActive && (
                          <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                        {t(preset.descKey, '')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🌟 Section 2: Global Style, Size & Display Format */}
          <div className="p-5 rounded-3xl neu-card-lg space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                {t('expiryTags.globalAppearanceTitle', 'Global Badge Appearance & Sizing')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Style Archetype */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('expiryTags.badgeStyleLabel', 'Badge Style Archetype')}
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'FROSTED_GLASS', label: t('expiryTags.styleFrosted', 'Frosted Glass') },
                    { id: 'SOLID_BADGE', label: t('expiryTags.styleSolid', 'Solid Vivid') },
                    { id: 'NEU_SUNKEN', label: t('expiryTags.styleSunken', 'Neumorphic') },
                    { id: 'MINIMAL_DOT', label: t('expiryTags.styleDot', 'Status Dot') },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, styleVariant: style.id as TagStyleVariant }))}
                      className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                        form.styleVariant === style.id
                          ? 'neu-sunken text-emerald-500 border border-emerald-500/30'
                          : 'neu-btn text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{style.label}</span>
                      {form.styleVariant === style.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Size */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('expiryTags.badgeSizeLabel', 'Tag Size & Density')}
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'xs', label: t('expiryTags.sizeXs', 'XS (Compact)') },
                    { id: 'sm', label: t('expiryTags.sizeSm', 'SM (Standard)') },
                    { id: 'md', label: t('expiryTags.sizeMd', 'MD (Prominent)') },
                  ].map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, sizeVariant: size.id as TagSizeVariant }))}
                      className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                        form.sizeVariant === size.id
                          ? 'neu-sunken text-blue-500 border border-blue-500/30'
                          : 'neu-btn text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{size.label}</span>
                      {form.sizeVariant === size.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Display Format */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {t('expiryTags.displayFormatLabel', 'Date Display Format')}
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'RELATIVE_DAYS', label: t('expiryTags.formatRelative', 'Countdown') },
                    { id: 'EXACT_DATE', label: t('expiryTags.formatExact', 'Date') },
                    { id: 'BOTH', label: t('expiryTags.formatBoth', 'Both') },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, displayFormat: fmt.id as TagDisplayFormat }))}
                      className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left flex items-center justify-between ${
                        form.displayFormat === fmt.id
                          ? 'neu-sunken text-amber-500 border border-amber-500/30'
                          : 'neu-btn text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span>{fmt.label}</span>
                      {form.displayFormat === fmt.id && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 🌟 Section 3: Granular Tier Tuning & Color Palette */}
          <div className="p-5 rounded-3xl neu-card-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/40 dark:border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {t('expiryTags.tierGranularTitle', 'Granular Tier Thresholds & Styling')}
                </h3>
              </div>

              {/* 4-Tier Segmented Switcher */}
              <div className="p-1 rounded-2xl neu-sunken-sm bg-slate-100 dark:bg-slate-900 flex items-center gap-1 flex-wrap">
                {(['expired', 'critical', 'warning', 'fresh'] as const).map((tierKey) => {
                  const active = activeTierTab === tierKey;
                  const tierColor = form.tiers[tierKey].color;
                  return (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => setActiveTierTab(tierKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? 'neu-card text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tierColor }} />
                      <span className="capitalize">{t(`expiryTags.tier${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)}`, tierKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Tier Controls */}
            {(() => {
              const tier = form.tiers[activeTierTab];
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Days Threshold: Slider + Direct Numeric Input + Steppers + Quick Chips */}
                    <div className="p-4 rounded-2xl neu-sunken-sm space-y-3 bg-white/40 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {t('expiryTags.daysThreshold', 'Days Threshold')}
                        </label>

                        {activeTierTab === 'expired' ? (
                          <span className="font-mono text-rose-500 font-black text-xs px-2.5 py-1 rounded-lg neu-card-sm">
                            ≤ 0 Days
                          </span>
                        ) : activeTierTab === 'fresh' ? (
                          <span className="font-mono text-emerald-500 font-black text-xs px-2.5 py-1 rounded-lg neu-card-sm">
                            &gt; {form.tiers.warning.daysThreshold} Days
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {/* Stepper Minus */}
                            <button
                              type="button"
                              onClick={() => {
                                const minVal = activeTierTab === 'critical' ? 1 : form.tiers.critical.daysThreshold + 1;
                                const nextVal = Math.max(minVal, tier.daysThreshold - 1);
                                updateTier(activeTierTab, { daysThreshold: nextVal });
                                haptics.light();
                              }}
                              className="w-6 h-6 rounded-md neu-btn flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                              title="Decrease 1 day"
                            >
                              -
                            </button>

                            {/* Direct Editable Number Input Box */}
                            <div className="relative w-16">
                              <input
                                type="number"
                                min={activeTierTab === 'critical' ? 1 : form.tiers.critical.daysThreshold + 1}
                                max={365}
                                value={tier.daysThreshold}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) {
                                    const minVal = activeTierTab === 'critical' ? 1 : 1;
                                    updateTier(activeTierTab, { daysThreshold: Math.max(minVal, Math.min(365, val)) });
                                  }
                                }}
                                className="w-full text-center py-1 px-1.5 rounded-lg neu-input text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 outline-none"
                              />
                            </div>

                            {/* Stepper Plus */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.min(365, tier.daysThreshold + 1);
                                updateTier(activeTierTab, { daysThreshold: nextVal });
                                haptics.light();
                              }}
                              className="w-6 h-6 rounded-md neu-btn flex items-center justify-center text-xs font-black text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                              title="Increase 1 day"
                            >
                              +
                            </button>

                            <span className="text-[11px] font-bold text-slate-400 ml-0.5">Days</span>
                          </div>
                        )}
                      </div>

                      {activeTierTab === 'expired' ? (
                        <div className="text-[11px] font-mono text-slate-400 pt-1">
                          ≤ 0 days (Fixed rule for past/expired batches)
                        </div>
                      ) : activeTierTab === 'fresh' ? (
                        <div className="text-[11px] font-mono text-slate-400 pt-1">
                          &gt; {form.tiers.warning.daysThreshold} days (Healthy shelf life period)
                        </div>
                      ) : (
                        <>
                          <input
                            type="range"
                            min={activeTierTab === 'critical' ? 1 : 1}
                            max={activeTierTab === 'critical' ? 60 : 180}
                            value={tier.daysThreshold}
                            onChange={(e) => updateTier(activeTierTab, { daysThreshold: Number(e.target.value) })}
                            className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                          />

                          {/* Quick Shortcut Day Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Set:</span>
                            {(activeTierTab === 'critical'
                              ? [1, 3, 5, 7, 10, 14, 21, 30]
                              : [14, 21, 30, 45, 60, 90, 120, 180]
                            ).map((dayOpt) => {
                              const isSelected = tier.daysThreshold === dayOpt;
                              return (
                                <button
                                  key={dayOpt}
                                  type="button"
                                  onClick={() => {
                                    updateTier(activeTierTab, { daysThreshold: dayOpt });
                                    soundFX.playBeep();
                                    haptics.light();
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'neu-sunken text-emerald-500 border border-emerald-500/40 scale-105'
                                      : 'neu-card-sm text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                  }`}
                                >
                                  {dayOpt}d
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Opacity Slider & Direct Percent Input */}
                    <div className="p-4 rounded-2xl neu-sunken-sm space-y-3 bg-white/40 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {t('expiryTags.opacityLabel', 'Background Opacity')}
                        </label>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700"
                            style={{ backgroundColor: tier.color, opacity: tier.bgOpacity }}
                          />
                          <div className="relative w-14">
                            <input
                              type="number"
                              min={5}
                              max={100}
                              step={5}
                              value={Math.round(tier.bgOpacity * 100)}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  updateTier(activeTierTab, { bgOpacity: Math.max(0.05, Math.min(1.0, val / 100)) });
                                }
                              }}
                              className="w-full text-center py-1 px-1 rounded-lg neu-input text-xs font-mono font-black text-blue-600 dark:text-blue-400 outline-none"
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-400">%</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="1.0"
                        step="0.05"
                        value={tier.bgOpacity}
                        onChange={(e) => updateTier(activeTierTab, { bgOpacity: Number(e.target.value) })}
                        className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />

                      {/* Quick Opacity Shortcut Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Opacity:</span>
                        {[
                          { label: 'Glass 10%', val: 0.1 },
                          { label: 'Tint 25%', val: 0.25 },
                          { label: 'Mid 50%', val: 0.5 },
                          { label: 'Heavy 75%', val: 0.75 },
                          { label: 'Solid 100%', val: 1.0 },
                        ].map((op) => {
                          const isSelected = Math.round(tier.bgOpacity * 100) === Math.round(op.val * 100);
                          return (
                            <button
                              key={op.label}
                              type="button"
                              onClick={() => {
                                updateTier(activeTierTab, { bgOpacity: op.val });
                                soundFX.playBeep();
                                haptics.light();
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'neu-sunken text-blue-500 border border-blue-500/40 scale-105'
                                  : 'neu-card-sm text-slate-500 hover:text-slate-800 dark:hover:text-white'
                              }`}
                            >
                              {op.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Curated Color Swatches + Hex */}
                  <div className="p-4 rounded-2xl neu-sunken-sm space-y-2.5 bg-white/40 dark:bg-slate-900/40">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {t('expiryTags.colorLabel', 'Accent Color & Swatches')}
                      </label>
                      <div className="flex items-center gap-1.5 font-mono text-xs font-black">
                        <span className="w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-700" style={{ backgroundColor: tier.color }} />
                        <span>{tier.color.toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {LUXURY_PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updateTier(activeTierTab, { color: c })}
                          className={`w-7 h-7 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                            tier.color.toLowerCase() === c.toLowerCase()
                              ? 'ring-2 ring-emerald-500 scale-110 shadow-md'
                              : 'hover:scale-105 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c }}
                        >
                          {tier.color.toLowerCase() === c.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                          )}
                        </button>
                      ))}

                      {/* Native Custom Color Picker */}
                      <label
                        className="w-7 h-7 rounded-xl neu-btn flex items-center justify-center cursor-pointer overflow-hidden relative"
                        title="Custom Hex Color"
                      >
                        <Palette className="w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="color"
                          value={tier.color}
                          onChange={(e) => updateTier(activeTierTab, { color: e.target.value })}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Feature Checkbox Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-2xl neu-sunken-sm bg-white/40 dark:bg-slate-900/40">
                      <CustomCheckbox
                        checked={tier.showBadge}
                        onChange={(checked) => updateTier(activeTierTab, { showBadge: checked })}
                        label={t('expiryTags.showBadge', 'Show Badge for this Tier')}
                      />
                    </div>

                    <div className="p-3 rounded-2xl neu-sunken-sm bg-white/40 dark:bg-slate-900/40">
                      <CustomCheckbox
                        checked={tier.showIcon}
                        onChange={(checked) => updateTier(activeTierTab, { showIcon: checked })}
                        label={t('expiryTags.showIcon', 'Display Status Icon')}
                      />
                    </div>

                    <div className="p-3 rounded-2xl neu-sunken-sm bg-white/40 dark:bg-slate-900/40">
                      <CustomCheckbox
                        checked={tier.pulseAnimation}
                        onChange={(checked) => updateTier(activeTierTab, { pulseAnimation: checked })}
                        label={t('expiryTags.pulseAnimation', 'Breathing Glow Pulse')}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpiryTagsTab;
