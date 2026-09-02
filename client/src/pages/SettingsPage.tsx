import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useSettingsStore, TaxConfig, BusinessMode } from '../store/useSettingsStore';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { soundFX } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { useSearchParams } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Store,
  Printer,
  HardDrive,
  ShieldAlert,
  Coins,
  Save,
  CheckCircle2,
  Lock,
  RefreshCw,
  FolderOpen,
  Cloud,
  BadgePercent,
  Calculator,
  Percent,
  Check,
  Sparkles,
  Globe,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Clock,
  Copy,
  Download,
  AlertCircle,
  Database,
  ShieldCheck,
  CheckCircle,
  ArrowUpRight,
  RotateCcw,
  Pencil,
  X,
  Loader2,
  AlertTriangle,
  Search,
  Wifi,
  Crown,
  Tv,
  UtensilsCrossed,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { usePlatformStore } from '../store/usePlatformStore';
import { PlatformManagerModal } from '../components/platforms/PlatformManagerModal';
import { CurrencyModal } from '../components/currencies/CurrencyModal';
import { ClearDataModal } from '../components/settings/ClearDataModal';
import { RestoreSnapshotModal } from '../components/settings/RestoreSnapshotModal';
import { NetworkTerminalsTab } from '../components/settings/NetworkTerminalsTab';
import { StorageBackupTab } from '../components/settings/StorageBackupTab';
import { BillCustomizerTab } from '../components/settings/BillCustomizerTab';
import { CustomerDisplayManagerTab } from '../components/settings/CustomerDisplayManagerTab';
import { ExpiryTagsTab } from '../components/settings/ExpiryTagsTab';
import { CurrencyItem } from '../store/useCurrencyStore';
import { getLaoFontStyle, setLaoFontStyle, LaoFontStyle } from '../i18n';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [laoFontStyle, setLocalLaoFontStyle] = useState<LaoFontStyle>(getLaoFontStyle());

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.style) setLocalLaoFontStyle(e.detail.style);
    };
    window.addEventListener('39pos-lao-font-changed', handler);
    return () => window.removeEventListener('39pos-lao-font-changed', handler);
  }, []);

  const handleLaoFontChange = (style: LaoFontStyle) => {
    setLaoFontStyle(style);
    setLocalLaoFontStyle(style);
    soundFX.playBeep();
  };

  const { store, settings, taxConfig, businessMode, setBusinessMode, updateStoreProfile, saveSetting, updateTaxConfig, fetchSettings } =
    useSettingsStore();
  const {
    currencies,
    currentCurrency,
    setCurrentCurrency,
    fetchCurrencies,
    updateRate,
    toggleCurrencyActive,
    deleteCurrency,
    setBaseCurrency,
  } = useCurrencyStore();
  const { platforms, fetchPlatforms, deletePlatform } = usePlatformStore();

  const tabParam = searchParams.get('tab')?.toUpperCase();
  const initialTab =
    tabParam === 'EXPIRY_TAGS' || tabParam === 'EXPIRY'
      ? 'EXPIRY_TAGS'
      : tabParam === 'CUSTOMER_DISPLAY'
      ? 'CUSTOMER_DISPLAY'
      : tabParam === 'STORAGE'
      ? 'STORAGE'
      : tabParam === 'CURRENCY'
      ? 'CURRENCY'
      : tabParam === 'PLATFORMS'
      ? 'PLATFORMS'
      : 'STORE';

  const [activeTab, setActiveTab] = useState<'STORE' | 'PLATFORMS' | 'TAX' | 'PRINTER' | 'STORAGE' | 'CURRENCY' | 'NETWORK' | 'CUSTOMER_DISPLAY' | 'EXPIRY_TAGS' | 'AUDIT'>(initialTab);

  useEffect(() => {
    if (tabParam === 'EXPIRY_TAGS' || tabParam === 'EXPIRY') {
      setActiveTab('EXPIRY_TAGS');
    } else if (tabParam === 'CUSTOMER_DISPLAY') {
      setActiveTab('CUSTOMER_DISPLAY');
    } else if (tabParam === 'STORAGE') {
      setActiveTab('STORAGE');
    } else if (tabParam === 'CURRENCY') {
      setActiveTab('CURRENCY');
    } else if (tabParam === 'PLATFORMS') {
      setActiveTab('PLATFORMS');
    }
  }, [tabParam]);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any | null>(null);

  // Currency Exchange Rate Inline Edit States
  const [editingCurrencyCode, setEditingCurrencyCode] = useState<string | null>(null);
  const [rateInput, setRateInput] = useState<string>('');
  const [savingCurrencyCode, setSavingCurrencyCode] = useState<string | null>(null);
  const [savedSuccessCode, setSavedSuccessCode] = useState<string | null>(null);

  // Currency CRUD Modal & Filter States
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [selectedCurrencyForEdit, setSelectedCurrencyForEdit] = useState<CurrencyItem | null>(null);
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const [deletingCurrencyCode, setDeletingCurrencyCode] = useState<string | null>(null);
  const [baseSwitchConfirm, setBaseSwitchConfirm] = useState<any | null>(null);
  const [isSwitchingBase, setIsSwitchingBase] = useState(false);

  const [storeForm, setStoreForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    taxId: '',
    receiptHeader: '',
    receiptFooter: '',
  });

  const [taxForm, setTaxForm] = useState<TaxConfig>({
    enableTax: true,
    taxName: 'VAT',
    taxRate: 7,
    calculationMode: 'EXCLUSIVE',
    showTaxOnReceipt: true,
  });

  const [storageForm, setStorageForm] = useState({
    storageType: 'LOCAL',
    localDirectoryPath: 'D:\\39POS\\Data',
    nasSharePath: '\\\\192.168.1.100\\39pos-backup',
    s3Bucket: '39pos-cloud-enterprise-backups',
    autoBackupEnabled: true,
    autoBackupIntervalHours: 1,
    retentionCount: 30,
    lastSavedTimestamp: '',
  });

  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [snapshotFilter, setSnapshotFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  const [snapshotLimit, setSnapshotLimit] = useState(6);

  const [printerForm, setPrinterForm] = useState({
    receiptPrinterType: 'NETWORK_TCP',
    receiptPrinterIp: '192.168.1.200',
    receiptPrinterPort: 9100,
    autoCutReceipt: true,
    openCashDrawerOnCash: true,
  });

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (store) {
      setStoreForm({
        name: store.name || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        taxId: store.taxId || '',
        receiptHeader: store.receiptHeader || '',
        receiptFooter: store.receiptFooter || '',
      });
    }
    if (taxConfig) {
      setTaxForm(taxConfig);
    }
    if (settings.storage_config) {
      setStorageForm((prev) => ({ ...prev, ...settings.storage_config }));
    }
    if (settings.printer_config) {
      setPrinterForm(settings.printer_config);
    }
  }, [store, taxConfig, settings]);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStoreProfile(storeForm);
    soundFX.playCashSuccess();
    setStatusMsg('Store profile saved successfully');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTaxConfig(taxForm);
    soundFX.playCashSuccess();
    setStatusMsg(`Tax configuration updated (${taxForm.enableTax ? `${taxForm.taxName} ${taxForm.taxRate}%` : 'Tax Disabled'})`);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSetting('storage_config', storageForm, 'STORAGE');
    soundFX.playCashSuccess();
    setStatusMsg('Storage configuration updated');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSetting('printer_config', printerForm, 'PRINTER');
    soundFX.playCashSuccess();
    setStatusMsg('Printer hardware configuration updated');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleBrowseDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          const custom = `D:\\39POS\\${dirHandle.name}`;
          setStorageForm((prev) => ({ ...prev, localDirectoryPath: custom }));
          handleTestVerifyPath(custom);
        }
      } else {
        const custom = prompt('Enter or paste local storage directory path:', storageForm.localDirectoryPath);
        if (custom && custom.trim()) {
          setStorageForm((prev) => ({ ...prev, localDirectoryPath: custom.trim() }));
          handleTestVerifyPath(custom.trim());
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };

  const handleTestVerifyPath = async (pathToTest?: string) => {
    const target = pathToTest || storageForm.localDirectoryPath;
    setVerifyLoading(true);
    try {
      const res = await api.post('/backups/verify-directory', { path: target });
      setVerifyResult({ valid: res.data.valid, message: res.data.message });
      if (res.data.valid) {
        soundFX.playCashSuccess();
      } else {
        soundFX.playError();
      }
    } catch (err: any) {
      setVerifyResult({ valid: false, message: err.message || 'Verification failed' });
      soundFX.playError();
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.post('/backups/create', {
        format: 'JSON',
        storageType: storageForm.storageType || 'LOCAL',
        targetDirectory: storageForm.localDirectoryPath,
      });
      soundFX.playCashSuccess();
      const nowIso = new Date().toISOString();
      const updatedStorage = { ...storageForm, lastSavedTimestamp: nowIso };
      setStorageForm(updatedStorage);
      await saveSetting('storage_config', updatedStorage, 'STORAGE');
      setStatusMsg(`Encrypted snapshot saved to ${storageForm.localDirectoryPath}`);
      fetchBackups();
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err: any) {
      soundFX.playError();
      setStatusMsg(`Backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!window.confirm('Restore database from this snapshot? All current data will be synchronized.')) return;
    setRestoringId(backupId);
    try {
      await api.post(`/backups/${backupId}/restore`);
      soundFX.playCashSuccess();
      setStatusMsg('Database restored successfully from snapshot');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err: any) {
      soundFX.playError();
      alert(`Restore failed: ${err.message}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopyFeedback(pathText);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const fetchBackups = async () => {
    try {
      const res = await api.get('/backups');
      setBackups(res.data.backups || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/audit-logs');
      setAuditLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'STORAGE') fetchBackups();
    if (activeTab === 'AUDIT') fetchAuditLogs();
  }, [activeTab]);

  const sampleSubtotal = 100.0;
  const sampleTax = !taxForm.enableTax || taxForm.taxRate <= 0
    ? 0
    : taxForm.calculationMode === 'INCLUSIVE'
    ? (sampleSubtotal * taxForm.taxRate) / (100 + taxForm.taxRate)
    : (sampleSubtotal * taxForm.taxRate) / 100;

  const sampleGrandTotal = !taxForm.enableTax || taxForm.taxRate <= 0 || taxForm.calculationMode === 'INCLUSIVE'
    ? sampleSubtotal
    : sampleSubtotal + sampleTax;

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Top Header (Fixed) */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-500" />
            <span>{t('settings.enterpriseConfig', 'Enterprise System Configuration')}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {t('settings.enterpriseSubtitle', 'Store profile, Tax/VAT rules, hardware peripherals, storage paths, encryption & audit logs')}
          </p>
        </div>

        {statusMsg && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs (Fixed) */}
      <div className="flex-shrink-0 p-1 neu-tab-container flex gap-1 overflow-x-auto scrollbar-none">
        {[
          { id: 'STORE', labelKey: 'settings.tabs.store', fallback: 'Store Profile', icon: Store },
          { id: 'PLATFORMS', labelKey: 'settings.tabs.platforms', fallback: 'Online Platforms', icon: Globe },
          { id: 'TAX', labelKey: 'settings.tabs.tax', fallback: 'Tax & VAT Settings', icon: BadgePercent },
          { id: 'PRINTER', labelKey: 'settings.tabs.printer', fallback: 'Printers & ESC/POS', icon: Printer },
          { id: 'CUSTOMER_DISPLAY', labelKey: 'settings.tabs.customerDisplay', fallback: 'Customer Display & Ads', icon: Tv },
          { id: 'STORAGE', labelKey: 'settings.tabs.storage', fallback: 'Storage & Backup', icon: HardDrive },
          { id: 'NETWORK', labelKey: 'settings.tabs.network', fallback: 'LAN Network & Terminals', icon: Wifi },
          { id: 'CURRENCY', labelKey: 'settings.tabs.currencies', fallback: 'Currencies & Rates', icon: Coins },
          { id: 'EXPIRY_TAGS', labelKey: 'settings.tabs.expiryTags', fallback: 'Expiry & Batch Tags', icon: Tag },
          { id: 'AUDIT', labelKey: 'settings.tabs.security', fallback: 'Security & Audit Logs', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'neu-tab-active shadow-neu-raised-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(tab.labelKey, tab.fallback)}</span>
            </button>
          );
        })}
      </div>

      {/* Main Settings Content Area (Smooth Scrollable Body) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">
        {/* Tab 1: Store Profile & Business Mode */}
        {activeTab === 'STORE' && (
        <div className="space-y-6">
          {/* Dedicated Online Platform Hub Operating Mode */}
          <div className="p-6 neu-card-lg space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center text-pink-500 flex-shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
                      Online Platform Hub
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-emerald-600 dark:text-emerald-400 uppercase">
                      Dedicated Mode
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 max-w-2xl">
                    Omnichannel delivery pipeline, multi-platform order dispatching (GrabFood, Foodpanda, Shopee, TikTok Shop, WhatsApp), and Cash-on-Delivery (COD) reconciliation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <span className="px-3 py-1.5 rounded-2xl text-xs font-black neu-pill text-pink-600 dark:text-pink-400 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  <span>Online Delivery Engine Active</span>
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveStore} className="p-6 neu-card-lg space-y-4 text-xs">
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
              {t('settings.businessInfo', 'Business & Receipt Information')}
            </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.storeName', 'Company / Store Name')}
              </label>
              <input
                type="text"
                required
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                className="w-full h-10 px-3 neu-input font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.taxIdReg', 'Tax ID / Registration')}
              </label>
              <input
                type="text"
                value={storeForm.taxId}
                onChange={(e) => setStoreForm({ ...storeForm, taxId: e.target.value })}
                className="w-full h-10 px-3 neu-input font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.storeAddress', 'Store Address')}
              </label>
              <input
                type="text"
                value={storeForm.address}
                onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                className="w-full h-10 px-3 neu-input text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.phone', 'Phone Number')}
              </label>
              <input
                type="text"
                value={storeForm.phone}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                className="w-full h-10 px-3 neu-input text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.receiptHeaderMsg', 'Receipt Custom Header Message')}
              </label>
              <textarea
                value={storeForm.receiptHeader}
                onChange={(e) => setStoreForm({ ...storeForm, receiptHeader: e.target.value })}
                className="w-full h-20 p-3 neu-input font-mono text-[11px] outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t('settings.receiptFooterMsg', 'Receipt Custom Footer Message')}
              </label>
              <textarea
                value={storeForm.receiptFooter}
                onChange={(e) => setStoreForm({ ...storeForm, receiptFooter: e.target.value })}
                className="w-full h-20 p-3 neu-input font-mono text-[11px] outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{t('settings.saveStoreProfile', 'Save Store Profile')}</span>
            </button>
          </div>
        </form>

        {/* ─── Language & Regional Typography Preferences ─── */}
        <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <span>{t('settings.languageAndTypography', 'Language & Regional Typography (ພາສາ ແລະ ຮູບແບບຕົວໜັງສື)')}</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {t('settings.languageAndTypographyDesc', 'Select default interface language and configure Lao typography rendering with tone-mark protection.')}
              </p>
            </div>
          </div>

          {/* Language Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { code: 'la', label: 'ລາວ (Lao)', flag: '🇱🇦' },
              { code: 'th', label: 'ไทย (Thai)', flag: '🇹🇭' },
              { code: 'en', label: 'English (US)', flag: '🇺🇸' },
              { code: 'zh', label: '中文 (Chinese)', flag: '🇨🇳' },
              { code: 'jp', label: '日本語 (Japanese)', flag: '🇯🇵' },
            ].map((item) => {
              const isSelected = (i18n.language || 'en').toLowerCase().startsWith(item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => i18n.changeLanguage(item.code)}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'neu-sunken text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/40 font-black'
                      : 'neu-btn text-slate-700 dark:text-slate-300 font-bold hover:scale-[1.02]'
                  }`}
                >
                  <span className="text-2xl">{item.flag}</span>
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Lao Typography Style Choice (shown when Lao is selected) */}
          {(i18n.language || 'en').toLowerCase().startsWith('la') && (
            <div className="p-4 rounded-2xl neu-sunken-sm bg-black/5 dark:bg-white/5 space-y-3 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🖋️</span>
                  <span>ຮູບແບບຕົວໜັງສືພາສາລາວ (Lao Font Style)</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {laoFontStyle === 'regular' ? 'Noto Sans Lao (ແນະນຳ)' : 'Noto Sans Lao Looped (ຫົວມົນ)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => handleLaoFontChange('regular')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    laoFontStyle === 'regular'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🔤 Noto Sans Lao (Regular)</span>
                    </strong>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500 text-white font-bold">ແນະນຳ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    ຕົວໜັງສືມາດຕະຖານຕາມລະບົບ, ຮູບແບບ Regular, ສະແດງຜົນຊັດເຈນທົ່ວທຸກເມນູ, ຕາຕະລາງ ແລະ ຟອມຕ່າງໆ.
                  </p>
                </div>

                <div
                  onClick={() => handleLaoFontChange('looped')}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    laoFontStyle === 'looped'
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>🖋️ Noto Sans Lao Looped (ຫົວມົນ)</span>
                    </strong>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">ຄລາສສິກ</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    ຕົວໜັງສືແບບຫົວມົນດັ້ງເດີມ, ເໝາະສຳລັບຜູ້ທີ່ມັກຮູບແບບຕົວອັກສອນມີຫົວ.
                  </p>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-white space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ຕົວຢ່າງການສະແດງຜົນ (Live Preview with Zero-Clipping Protection):
                </div>
                <div className="text-sm font-semibold leading-relaxed">
                  ລະບົບຄິດເງິນ 39POS: ຍອດຂາຍສິນຄ້າປະຈຳວັນ, ລາຍຮັບຂາຍ POS, ລາຍຈ່າຍຮ້ານ (OPEX), ສັ່ງຊື້ສະຕັອກສິນຄ້າ (PO) ແລະ ກະແສເງິນສົດສຸດທິ.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Tab: Online Platforms Manager */}
      {activeTab === 'PLATFORMS' && (
        <div className="p-6 neu-card-lg space-y-6 text-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/40 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-500" />
                <span>{t('settings.onlinePlatformsTitle', 'Online Platforms & Delivery Hub Channels')}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {t('settings.onlinePlatformsSubtitle', 'Manage all integrated delivery services (GrabFood, Foodpanda, Shopee, TikTok Shop, WhatsApp, custom apps)')}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPlatformModalOpen(true)}
              className="px-4 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('settings.addManagePlatforms', 'Add / Manage Platforms')}</span>
            </button>
          </div>

          {/* Platforms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {platforms.map((plt) => {
              const isImage = Boolean(
                plt.icon &&
                (plt.icon.startsWith('/uploads/') ||
                  plt.icon.startsWith('http') ||
                  plt.icon.startsWith('data:'))
              );

              return (
                <div
                  key={plt.id}
                  onClick={() => setPlatformModalOpen(true)}
                  className="p-4 neu-card-interactive flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform p-1">
                      {isImage ? (
                        <img
                          src={plt.icon}
                          alt={plt.name}
                          className="w-full h-full object-contain rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">{plt.icon || '🛵'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{plt.name}</span>
                        <span className="px-1.5 py-0.5 rounded neu-pill font-mono text-[10px] font-bold flex-shrink-0">
                          {plt.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('platforms.commissionRate', 'Commission Rate')}:{' '}
                        <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                          {plt.commissionRate}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {plt.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold neu-pill text-emerald-600 dark:text-emerald-400">
                        {t('platforms.active', 'Active')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-slate-400">
                        {t('platforms.hidden', 'Hidden')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Online Platforms CRUD Modal */}
      <PlatformManagerModal
        isOpen={platformModalOpen}
        onClose={() => setPlatformModalOpen(false)}
      />

      {/* Tab 2: TAX & VAT Configuration */}
      {activeTab === 'TAX' && (
        <form onSubmit={handleSaveTax} className="space-y-6 animate-in fade-in duration-200">
          <div className="p-6 neu-card-lg space-y-6 text-xs">
            {/* Header with Master Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/40 dark:border-slate-800">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <BadgePercent className="w-5 h-5 text-emerald-500" />
                  <span>{t('settings.vatTitle', 'Value Added Tax (VAT) & Sales Tax Engine')}</span>
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {t('settings.vatSubtitle', 'Control tax collection status, dynamic rate percentages, and calculation modes')}
                </p>
              </div>

              {/* Master Switch */}
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    taxForm.enableTax
                      ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                      : 'neu-pill text-slate-500'
                  }`}
                >
                  {taxForm.enableTax ? t('settings.taxEnabled', 'Tax Enabled') : t('settings.taxDisabled', 'Tax Disabled (0%)')}
                </span>

                <button
                  type="button"
                  onClick={() => setTaxForm({ ...taxForm, enableTax: !taxForm.enableTax })}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    taxForm.enableTax ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                      taxForm.enableTax ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tax Settings Inputs */}
            <div className={`space-y-6 transition-opacity ${taxForm.enableTax ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tax Label / Name */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('settings.taxLabel', 'Tax Label / Name')}
                  </label>
                  <input
                    type="text"
                    required
                    value={taxForm.taxName}
                    onChange={(e) => setTaxForm({ ...taxForm, taxName: e.target.value })}
                    placeholder="e.g. VAT, GST, Sales Tax"
                    className="w-full h-10 px-3 neu-input font-bold text-slate-900 dark:text-white outline-none"
                  />
                  <div className="text-[10px] text-slate-400 mt-1">
                    Displayed on the POS cart and customer receipts (e.g. "VAT 7%", "GST 10%")
                  </div>
                </div>

                {/* Tax Rate Percentage */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('settings.taxRatePercent', 'Default Tax Rate Percentage (%)')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={taxForm.taxRate}
                      onChange={(e) => setTaxForm({ ...taxForm, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 pr-8 neu-input font-bold font-mono text-slate-900 dark:text-white outline-none"
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                    {[0, 5, 7, 8, 10, 12, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTaxForm({ ...taxForm, taxRate: preset })}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          taxForm.taxRate === preset
                            ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                            : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculation Mode: Exclusive vs Inclusive */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  {t('settings.taxCalcMode', 'Tax Calculation Mode')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Exclusive Card */}
                  <div
                    onClick={() => setTaxForm({ ...taxForm, calculationMode: 'EXCLUSIVE' })}
                    className={`p-4 neu-card-interactive cursor-pointer transition-all ${
                      taxForm.calculationMode === 'EXCLUSIVE'
                        ? 'ring-2 ring-emerald-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {t('settings.taxExclusive', 'Tax Exclusive (Add on Top)')}
                      </span>
                      {taxForm.calculationMode === 'EXCLUSIVE' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Product selling prices do not include tax. Tax is calculated and <strong>added on top</strong> of the subtotal at checkout.
                    </p>
                    <div className="mt-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      Formula: Total = Subtotal + (Subtotal × {taxForm.taxRate}%)
                    </div>
                  </div>

                  {/* Inclusive Card */}
                  <div
                    onClick={() => setTaxForm({ ...taxForm, calculationMode: 'INCLUSIVE' })}
                    className={`p-4 neu-card-interactive cursor-pointer transition-all ${
                      taxForm.calculationMode === 'INCLUSIVE'
                        ? 'ring-2 ring-emerald-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {t('settings.taxInclusive', 'Tax Inclusive (Included in Price)')}
                      </span>
                      {taxForm.calculationMode === 'INCLUSIVE' && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Product prices already include tax. The grand total equals subtotal, with the tax portion extracted and shown on receipt.
                    </p>
                    <div className="mt-2 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      Formula: Tax = Total × ({taxForm.taxRate} / {100 + taxForm.taxRate})
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Toggle */}
              <div
                onClick={() => setTaxForm({ ...taxForm, showTaxOnReceipt: !taxForm.showTaxOnReceipt })}
                className="flex items-center justify-between p-4 neu-card-sm cursor-pointer"
              >
                <div>
                  <div className="font-bold text-slate-800 dark:text-white text-xs">
                    {t('settings.showTaxReceipt', 'Show Tax Breakdown on Printed Receipts')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Include itemized {taxForm.taxName} amount and rate on paper and digital receipts
                  </div>
                </div>
                <CustomCheckbox
                  checked={taxForm.showTaxOnReceipt}
                  onChange={(checked) => setTaxForm({ ...taxForm, showTaxOnReceipt: checked })}
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-4 neu-sunken space-y-2 rounded-2xl">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <Calculator className="w-4 h-4" />
                  <span>Live Calculation Preview ($100.00 Sample Bill)</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-200/40 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">${sampleSubtotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      {taxForm.enableTax ? `${taxForm.taxName} (${taxForm.taxRate}%)` : 'Tax (Disabled)'}
                    </span>
                    <span className="font-mono font-bold text-amber-500">
                      {taxForm.enableTax ? `$${sampleTax.toFixed(2)}` : '$0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Payable</span>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">${sampleGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{t('settings.saveTaxConfig', 'Save Tax & VAT Configuration')}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Printer & Bill Page Setup Customizer */}
      {activeTab === 'PRINTER' && (
        <BillCustomizerTab />
      )}

      {/* Tab 4: Storage & Automated Backup Engine */}
      {activeTab === 'STORAGE' && (
        <StorageBackupTab />
      )}

      {/* Tab: LAN Multi-Terminal & Wireless QR Pairing */}
      {activeTab === 'NETWORK' && (
        <NetworkTerminalsTab />
      )}

      {/* Tab 5: Currency */}
      {activeTab === 'CURRENCY' && (
        <div className="p-6 neu-card-lg space-y-5 text-xs animate-in fade-in duration-200">
          {/* Header & Main Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/40 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" />
                <span>{t('settings.currenciesTitle', 'Supported Currencies & Live Exchange Rates')}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Configure live conversion rates against <span className="font-bold text-emerald-600 dark:text-emerald-400">{currencies.find((c) => c.isBase)?.code || 'LAK'}</span> base currency. Changes sync instantly across POS and Customer Display.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  fetchCurrencies(true);
                  soundFX.playBeep();
                }}
                className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('settings.refreshRates', 'Refresh')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedCurrencyForEdit(null);
                  setCurrencyModalOpen(true);
                  soundFX.playBeep();
                }}
                className="px-4 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{t('settings.addCurrency', 'Add Currency')}</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 pb-1 p-1 neu-tab-container self-start w-fit">
            <button
              type="button"
              onClick={() => setCurrencyFilter('ALL')}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition-all ${
                currencyFilter === 'ALL'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('settings.allCurrencies', 'All Currencies')} ({currencies.length})
            </button>

            <button
              type="button"
              onClick={() => setCurrencyFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all ${
                currencyFilter === 'ACTIVE'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{t('settings.activeOnPos', 'Active on POS')} ({currencies.filter((c) => c.isActive !== false).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrencyFilter('HIDDEN')}
              className={`px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all ${
                currencyFilter === 'HIDDEN'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>{t('settings.hiddenCurrencies', 'Hidden')} ({currencies.filter((c) => c.isActive === false).length})</span>
            </button>
          </div>

          {/* Currencies Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {currencies
              .filter((c) => {
                if (currencyFilter === 'ACTIVE') return c.isActive !== false;
                if (currencyFilter === 'HIDDEN') return c.isActive === false;
                return true;
              })
              .map((c) => {
                const isBase = Boolean(c.isBase);
                const isEditing = editingCurrencyCode === c.code;
                const isSaving = savingCurrencyCode === c.code;
                const isSaved = savedSuccessCode === c.code;
                const isActive = c.isActive !== false;
                const baseCur = currencies.find((cur) => cur.isBase) || currencies[0] || { code: 'LAK', symbol: '₭' };

                // Smart rate formatting and quotation
                const getRateDisplay = () => {
                  if (isBase || c.code === baseCur.code) {
                    return {
                      label: `1 ${c.code} =`,
                      value: '1.00',
                      unit: c.code,
                      subnote: 'System Base Master Unit (1.0)',
                      directPrice: 1,
                    };
                  }
                  if (c.exchangeRate < 1) {
                    const directPrice = 1 / c.exchangeRate;
                    const formattedPrice = directPrice >= 100
                      ? directPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : directPrice.toLocaleString(undefined, { maximumFractionDigits: 4 });
                    const formattedRaw = c.exchangeRate < 0.0001
                      ? c.exchangeRate.toFixed(8).replace(/\.?0+$/, '')
                      : c.exchangeRate.toFixed(6).replace(/\.?0+$/, '');
                    return {
                      label: `1 ${c.code} =`,
                      value: formattedPrice,
                      unit: baseCur.code,
                      subnote: `1 ${baseCur.code} = ${formattedRaw} ${c.code}`,
                      directPrice: Number(directPrice.toFixed(4)),
                    };
                  }
                  const formattedRate = c.exchangeRate >= 100
                    ? c.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : c.exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 4 });
                  const inversePrice = 1 / c.exchangeRate;
                  const formattedInverse = inversePrice >= 100
                    ? inversePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : inversePrice.toLocaleString(undefined, { maximumFractionDigits: 4 });
                  return {
                    label: `1 ${baseCur.code} =`,
                    value: formattedRate,
                    unit: c.code,
                    subnote: `1 ${c.code} = ${formattedInverse} ${baseCur.code}`,
                    directPrice: c.exchangeRate,
                  };
                };

                const rateInfo = getRateDisplay();

                const isSelected = currentCurrency === c.code;

                return (
                  <div
                    key={c.code}
                    className={`p-4 neu-card-interactive transition-all duration-200 relative group flex flex-col justify-between rounded-3xl ${
                      isEditing
                        ? 'ring-2 ring-emerald-500 scale-[1.02] shadow-lg'
                        : isSaved
                        ? 'ring-2 ring-emerald-500'
                        : isSelected
                        ? 'ring-2 ring-emerald-500/70 shadow-neu-glow-emerald'
                        : isBase
                        ? 'border border-amber-500/25 dark:border-amber-400/25'
                        : !isActive
                        ? 'opacity-60'
                        : ''
                    }`}
                  >
                    {/* Top Bar: Code, Symbol / Base Tag, and Actions */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white font-mono tracking-wide">
                          {c.code}
                        </span>

                        {isBase ? (
                          <span className="neu-pill !py-0.5 !px-2.5 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] uppercase tracking-wider border border-amber-500/30 dark:border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                            <Crown className="w-3 h-3 text-amber-500 fill-amber-500/30 flex-shrink-0" />
                            <span>{t('settings.baseCurrency', 'Base Currency')}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded neu-pill font-mono text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {c.symbol}
                          </span>
                        )}
                      </div>

                      {/* Top Action Controls */}
                      <div className="flex items-center gap-1.5">
                        {/* Active POS Badge */}
                        {isSelected && (
                          <span className="neu-pill !py-0.5 !px-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Active POS</span>
                          </span>
                        )}

                        {/* Quick Switch to this Currency on POS button */}
                        {!isSelected && isActive && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentCurrency(c.code);
                              soundFX.playCashSuccess();
                              haptics.medium();
                            }}
                            className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 neu-btn transition-all duration-150 cursor-pointer flex items-center gap-1"
                            title={`Select ${c.code} as active POS currency`}
                          >
                            <Coins className="w-3 h-3 text-emerald-500" />
                            <span>Use</span>
                          </button>
                        )}

                        {isSaved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold neu-pill text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-bounce">
                            <Sparkles className="w-3 h-3" />
                            <span>{t('settings.saved', 'Saved!')}</span>
                          </span>
                        )}

                        {/* Show / Hide Switch Toggle */}
                        {!isBase && (
                          <button
                            type="button"
                            onClick={async () => {
                              soundFX.playBeep();
                              await toggleCurrencyActive(c.code, !isActive);
                            }}
                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 flex-shrink-0 ${
                              isActive ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                            title={isActive ? 'Active on POS (Click to hide)' : 'Hidden (Click to activate)'}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                                isActive ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        )}

                        {/* Set as Base Currency Button */}
                        {!isBase && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setBaseSwitchConfirm(c);
                              soundFX.playBeep();
                            }}
                            className="neu-circle-btn w-7 h-7 text-amber-500 hover:text-amber-600 transition-all cursor-pointer"
                            title={`Set ${c.code} (${c.name}) as System Base Currency`}
                          >
                            <Crown className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Inline Edit Quick Rate */}
                        {!isBase && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCurrencyCode(c.code);
                              setRateInput(String(rateInfo.directPrice));
                              soundFX.playBeep();
                            }}
                            className="neu-circle-btn w-7 h-7 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                            title={`Edit ${c.code} rate`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Full Edit Modal */}
                        {!isBase && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCurrencyForEdit(c as any);
                              setCurrencyModalOpen(true);
                              soundFX.playBeep();
                            }}
                            className="neu-circle-btn w-7 h-7 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                            title={`Configure ${c.code} details`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Custom Currency */}
                        {!isBase && !isEditing && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Are you sure you want to delete ${c.code} (${c.name})?`)) {
                                soundFX.playBeep();
                                await deleteCurrency(c.code);
                              }
                            }}
                            className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                            title={`Delete ${c.code}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Inline Save/Cancel Controls */}
                        {isEditing && (
                          <div className="flex items-center gap-1.5 animate-in zoom-in-90 duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCurrencyCode(null);
                                setRateInput('');
                              }}
                              className="neu-circle-btn w-7 h-7 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={async () => {
                                const num = parseFloat(rateInput);
                                if (isNaN(num) || num <= 0) {
                                  soundFX.playError();
                                  return;
                                }
                                setSavingCurrencyCode(c.code);
                                let finalRate = num;
                                if (c.exchangeRate < 1 && num > 1) {
                                  finalRate = Number((1 / num).toFixed(8));
                                }
                                const ok = await updateRate(c.code, finalRate);
                                setSavingCurrencyCode(null);
                                if (ok) {
                                  soundFX.playCashSuccess();
                                  setSavedSuccessCode(c.code);
                                  setEditingCurrencyCode(null);
                                  setTimeout(() => setSavedSuccessCode(null), 2500);
                                } else {
                                  soundFX.playError();
                                }
                              }}
                              className="px-3 py-1 rounded-xl neu-btn-primary text-white font-extrabold text-[11px] flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title="Save rate"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Currency Full Name */}
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium mt-1">
                      {c.name}
                    </div>

                    {/* Bottom: Rate display / Input editor */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-200/40 dark:border-slate-800 flex flex-col gap-1 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-semibold">{rateInfo.label}</span>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-[170px] ml-2 animate-in fade-in duration-150">
                            <input
                              autoFocus
                              type="number"
                              step="any"
                              min="0.00000001"
                              value={rateInput}
                              onChange={(e) => setRateInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const num = parseFloat(rateInput);
                                  if (isNaN(num) || num <= 0) {
                                    soundFX.playError();
                                    return;
                                  }
                                  setSavingCurrencyCode(c.code);
                                  let finalRate = num;
                                  if (c.exchangeRate < 1 && num > 1) {
                                    finalRate = Number((1 / num).toFixed(8));
                                  }
                                  const ok = await updateRate(c.code, finalRate);
                                  setSavingCurrencyCode(null);
                                  if (ok) {
                                    soundFX.playCashSuccess();
                                    setSavedSuccessCode(c.code);
                                    setEditingCurrencyCode(null);
                                    setTimeout(() => setSavedSuccessCode(null), 2500);
                                  } else {
                                    soundFX.playError();
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingCurrencyCode(null);
                                  setRateInput('');
                                }
                              }}
                              className="w-full h-8 px-2.5 neu-input font-mono font-black text-xs text-slate-900 dark:text-white outline-none text-right"
                              placeholder="e.g. 22000"
                            />
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-300 font-mono">
                              {rateInfo.unit}
                            </span>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              if (!isBase) {
                                setEditingCurrencyCode(c.code);
                                setRateInput(String(rateInfo.directPrice));
                                soundFX.playBeep();
                              }
                            }}
                            className={`text-right font-black text-sm flex items-center gap-1 ${
                              isBase
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-900 dark:text-white cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors'
                            }`}
                          >
                            <span>{rateInfo.value}</span>
                            <span className="text-xs text-slate-400 font-mono font-bold">{rateInfo.unit}</span>
                          </div>
                        )}
                      </div>

                      {/* Micro subnote */}
                      {!isEditing && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right truncate">
                          {rateInfo.subnote}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Currency Management Modal */}
      <CurrencyModal
        isOpen={currencyModalOpen}
        onClose={() => {
          setCurrencyModalOpen(false);
          setSelectedCurrencyForEdit(null);
        }}
        currencyToEdit={selectedCurrencyForEdit}
      />

      {/* Clear All Operational Data Modal */}
      <ClearDataModal
        isOpen={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onSuccess={() => {
          setClearDataModalOpen(false);
          fetchBackups();
          setStatusMsg(t('settings.dataPurgeSuccess', 'Database records cleared successfully!'));
          setTimeout(() => setStatusMsg(''), 5000);
        }}
      />

      {/* Restore Database Snapshot Modal */}
      <RestoreSnapshotModal
        isOpen={restoreModalOpen}
        backupItem={selectedBackupForRestore}
        onClose={() => {
          setRestoreModalOpen(false);
          setSelectedBackupForRestore(null);
        }}
        onSuccess={() => {
          setRestoreModalOpen(false);
          setSelectedBackupForRestore(null);
          setStatusMsg(t('settings.restoreSuccessHeading', 'Database restored successfully!'));
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }}
      />

      {/* Switch Base Currency Confirmation Modal */}
      {baseSwitchConfirm && (
        <div
          onClick={() => !isSwitchingBase && setBaseSwitchConfirm(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md neu-card-lg p-6 space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                  Switch Base Currency to {baseSwitchConfirm.code}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {baseSwitchConfirm.name} ({baseSwitchConfirm.symbol}) will become the 1.0 Master Accounting Unit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isSwitchingBase && setBaseSwitchConfirm(null)}
                className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 neu-card-sm space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="font-medium">Current Base:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currencies.find((c) => c.isBase)?.code || 'USD'} (1.0)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span className="font-medium">New Base Currency:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {baseSwitchConfirm.code} (1.0)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                ✨ All other exchange rates will automatically be re-pegged against 1.0 {baseSwitchConfirm.code} and synced across POS, Customer Display, and Analytics.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSwitchingBase}
                onClick={() => setBaseSwitchConfirm(null)}
                className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSwitchingBase}
                onClick={async () => {
                  try {
                    setIsSwitchingBase(true);
                    const res = await setBaseCurrency(baseSwitchConfirm.code);
                    if (res.success) {
                      soundFX.playCashSuccess();
                      setStatusMsg(`Base Currency successfully switched to ${baseSwitchConfirm.code}!`);
                      setTimeout(() => setStatusMsg(''), 4000);
                    } else {
                      soundFX.playError();
                      alert(res.message || 'Failed to switch base currency');
                    }
                  } finally {
                    setIsSwitchingBase(false);
                    setBaseSwitchConfirm(null);
                  }
                }}
                className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSwitchingBase ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>Confirm & Set Base</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Customer Display & Promotional Ads */}
      {activeTab === 'CUSTOMER_DISPLAY' && <CustomerDisplayManagerTab />}

      {/* Tab: Expiry & Batch Tags */}
      {activeTab === 'EXPIRY_TAGS' && <ExpiryTagsTab />}

      {/* Tab: Audit Logs */}
      {activeTab === 'AUDIT' && (
        <div className="p-6 neu-card-lg space-y-3 text-xs">
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">
            {t('settings.auditTitle', 'Security & Regulatory Audit Trail')}
          </h3>
          <div className="divide-y divide-slate-200/40 dark:divide-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">[{log.action}]</span> {log.module}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    By: {log.username || 'System'} • IP: {log.ipAddress || '127.0.0.1'}
                  </div>
                </div>
                <div className="font-mono text-slate-400 text-[11px]">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
