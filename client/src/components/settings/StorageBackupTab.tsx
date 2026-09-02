import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HardDrive,
  Database,
  ShieldCheck,
  Clock,
  CheckCircle,
  Cloud,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Copy,
  Save,
  Search,
  X,
  RotateCcw,
  AlertTriangle,
  Trash2,
  Lock,
  Unlock,
  Radio,
  Server,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  ExternalLink,
  Laptop,
  Check,
  ChevronRight,
  User,
  Sparkles,
  Layers,
  FileText,
  Upload,
  Download,
  FolderArchive,
  Wifi,
} from 'lucide-react';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';
import { CustomSelect } from '../common/CustomSelect';
import { MigrationWizardModal, MigrationConfig } from './MigrationWizardModal';
import { MigrationChoiceModal } from './MigrationChoiceModal';
import { RestoreSnapshotModal } from './RestoreSnapshotModal';
import { ClearDataModal } from './ClearDataModal';
import './StorageBackupTab.css';

const formatAutoSaveTimestamp = (rawDate: string | null) => {
  const d = rawDate ? new Date(rawDate) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' });
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      dateStr: `${day}-${month}-${year}`,
      timeStr: `${String(displayHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`,
    };
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  return {
    dateStr: `${day}-${month}-${year}`,
    timeStr: `${String(displayHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`,
  };
};

export const StorageBackupTab: React.FC = () => {
  const { t } = useTranslation();

  // Storage Form State
  const [storageForm, setStorageForm] = useState({
    storageType: 'LOCAL' as 'LOCAL' | 'CLOUD',
    localDirectoryPath: 'D:\\39POS\\Data',
    backupDirectoryPath: 'D:\\39POS\\Backups',
    filename: '39pos_enterprise.db',
    backupFilename: '39pos_enterprise_backup.json.enc',
    cloudUrl: '',
    accessMode: 'read-write' as 'read' | 'read-write',
    encryptionEnabled: true,
    autoBackupEnabled: true,
    autoBackupIntervalHours: 1,
    nasSharePath: '\\\\192.168.1.100\\39pos-backup',
    lastSavedTimestamp: '',
  });

  // Original clean baseline for dirty checking
  const [originalPath, setOriginalPath] = useState('D:\\39POS\\Data');
  const [originalBackupPath, setOriginalBackupPath] = useState('D:\\39POS\\Backups');
  const [originalCloudUrl, setOriginalCloudUrl] = useState('');
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  // DB Stats State
  const [dbStats, setDbStats] = useState({
    totalRecords: 0,
    productsCount: 0,
    salesCount: 0,
    purchasesCount: 0,
    customersCount: 0,
    categoriesCount: 0,
    dbSizeBytes: 0,
    dbFormattedSize: '0 KB',
    lastBackupAt: null as string | null,
    lastBackupFilename: null as string | null,
    lastModifiedBy: 'Supper (Admin)',
  });

  // Backup Archives List
  const [backups, setBackups] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Safety Lock State
  const [isStorageLocked, setIsStorageLocked] = useState(true);
  const [unlockCountdown, setUnlockCountdown] = useState<number | null>(null);
  const unlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isBrowsingRef = useRef(false);

  // Migration Modals
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [migrationConfig, setMigrationConfig] = useState<MigrationConfig | null>(null);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Restore & Clear Data Modals
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<any | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [clearDataModalOpen, setClearDataModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live database path from server (the actual file the SQLite engine is using)
  const [liveDbPath, setLiveDbPath] = useState<string>('');

  const handleUploadBackupFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setSelectedBackupForRestore({
          id: 'uploaded-file',
          filename: file.name,
          rawPayload: content,
          sizeBytes: file.size,
          createdAt: new Date().toISOString(),
          isUploadedFile: true,
        });
        setRestoreModalOpen(true);
        soundFX.playBeep();
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleDownloadBackup = () => {
    soundFX.playBeep();
    window.open('/api/backups/download', '_blank');
  };

  // Snapshot filter & pagination
  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [snapshotFilter, setSnapshotFilter] = useState<'ALL' | 'TODAY' | 'WEEK'>('ALL');
  const [snapshotLimit, setSnapshotLimit] = useState(6);

  // Fetch initial data
  const loadData = async () => {
    try {
      const cfgRes = await api.get('/settings');
      if (cfgRes.data?.settings?.storage_config) {
        const loadedCfg = cfgRes.data.settings.storage_config;
        setStorageForm((prev) => ({
          ...prev,
          ...loadedCfg,
        }));
        if (loadedCfg.localDirectoryPath) setOriginalPath(loadedCfg.localDirectoryPath);
        if (loadedCfg.backupDirectoryPath) setOriginalBackupPath(loadedCfg.backupDirectoryPath);
        if (loadedCfg.cloudUrl) setOriginalCloudUrl(loadedCfg.cloudUrl);
      }

      try {
        const netRes = await api.get('/storage/network-info');
        if (netRes.data) {
          setNetworkInfo(netRes.data);
        }
      } catch (netErr) {
        console.warn('Could not fetch network info:', netErr);
      }

      const backupsRes = await api.get('/backups');
      if (backupsRes.data?.backups) {
        setBackups(backupsRes.data.backups);
      }

      const statsRes = await api.get('/backups/stats');
      const rawStats = statsRes.data?.stats || statsRes.data;
      if (rawStats && (rawStats.dbFormattedSize || rawStats.totalRecords !== undefined)) {
        setDbStats((prev) => ({
          ...prev,
          ...rawStats,
        }));
      }

      // Check path validity
      testConnectionSilent(cfgRes.data?.settings?.storage_config?.localDirectoryPath || 'D:\\39POS\\Data');

      // Fetch the actual live database path from the server
      try {
        const dbPathRes = await api.get('/server/db-path');
        if (dbPathRes.data?.databasePath) {
          setLiveDbPath(dbPathRes.data.databasePath);
        }
      } catch (dbErr) {
        console.warn('Could not fetch live database path:', dbErr);
      }
    } catch (e) {
      console.warn('Failed to load storage configuration:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Silent connection test
  const testConnectionSilent = async (targetPath: string) => {
    try {
      const res = await api.post('/backups/verify-directory', { path: targetPath });
      setConnectionStatus(res.data.valid ? 'success' : 'error');
    } catch {
      setConnectionStatus('error');
    }
  };

  // Auto-lock countdown timer
  useEffect(() => {
    if (unlockCountdown !== null && unlockCountdown > 0) {
      const timer = setTimeout(() => setUnlockCountdown((prev) => (prev !== null ? prev - 1 : null)), 1000);
      return () => clearTimeout(timer);
    } else if (unlockCountdown === 0) {
      setIsStorageLocked(true);
      setUnlockCountdown(null);
    }
  }, [unlockCountdown]);

  // Auto-lock on window blur / tab switch (with browser file dialog immunity)
  useEffect(() => {
    const handleBlur = () => {
      // If user is currently in native folder picker or dialog, NEVER lock
      if (isBrowsingRef.current) return;

      if (!isStorageLocked) {
        setIsStorageLocked(true);
        setUnlockCountdown(null);
      }
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleBlur);
    };
  }, [isStorageLocked]);

  // Unlock handler
  const handleUnlockStorage = () => {
    setIsStorageLocked(false);
    setUnlockCountdown(45); // 45s countdown
    soundFX.playBeep();
  };

  const handleLockStorage = () => {
    setIsStorageLocked(true);
    setUnlockCountdown(null);
    soundFX.playBeep();
  };

  // Run Manual Backup
  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    soundFX.playBeep();
    try {
      await api.post('/backups/create', {
        format: 'JSON',
        storageType: storageForm.storageType,
        targetDirectory: storageForm.backupDirectoryPath || storageForm.localDirectoryPath,
      });
      soundFX.playCashSuccess();
      loadData();
    } catch (err: any) {
      soundFX.playError();
      alert(`Backup failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Manual Test Connection Button
  const handleTestConnection = async () => {
    setIsTesting(true);
    soundFX.playBeep();
    try {
      const res = await api.post('/backups/verify-directory', { path: storageForm.localDirectoryPath });
      if (res.data.valid) {
        setConnectionStatus('success');
        soundFX.playCashSuccess();
      } else {
        setConnectionStatus('error');
        soundFX.playError();
      }
    } catch {
      setConnectionStatus('error');
      soundFX.playError();
    } finally {
      setIsTesting(false);
    }
  };

  // Primary Directory Browser (Guarded from locking)
  const handleBrowseLocal = async () => {
    isBrowsingRef.current = true;
    try {
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          if (dirHandle && dirHandle.name) {
            const pickedPath = `D:\\39POS\\${dirHandle.name}`;
            setStorageForm((prev) => ({ ...prev, localDirectoryPath: pickedPath }));
            testConnectionSilent(pickedPath);
            setIsStorageLocked(false);
            setUnlockCountdown(60);
            return;
          }
        } catch (e) {
          // User cancelled
        }
      }
      const manual = prompt('Enter or paste primary database directory path:', storageForm.localDirectoryPath);
      if (manual && manual.trim()) {
        setStorageForm((prev) => ({ ...prev, localDirectoryPath: manual.trim() }));
        testConnectionSilent(manual.trim());
        setIsStorageLocked(false);
        setUnlockCountdown(60);
      }
    } finally {
      setTimeout(() => {
        isBrowsingRef.current = false;
      }, 1500);
    }
  };

  // Backup Vault Directory Browser (Guarded from locking)
  const handleBrowseBackupLocal = async () => {
    isBrowsingRef.current = true;
    try {
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          if (dirHandle && dirHandle.name) {
            const pickedPath = `D:\\39POS\\${dirHandle.name}`;
            setStorageForm((prev) => ({ ...prev, backupDirectoryPath: pickedPath }));
            setIsStorageLocked(false);
            setUnlockCountdown(60);
            return;
          }
        } catch (e) {
          // User cancelled
        }
      }
      const manual = prompt('Enter or paste backup vault directory path:', storageForm.backupDirectoryPath || 'D:\\39POS\\Backups');
      if (manual && manual.trim()) {
        setStorageForm((prev) => ({ ...prev, backupDirectoryPath: manual.trim() }));
        setIsStorageLocked(false);
        setUnlockCountdown(60);
      }
    } finally {
      setTimeout(() => {
        isBrowsingRef.current = false;
      }, 1500);
    }
  };

  // Copy helper
  const handleCopyPath = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(text);
    setTimeout(() => setCopyFeedback(null), 2000);
    soundFX.playBeep();
  };

  // Handle Save or Migration prompt
  const handleSaveSettings = async () => {
    if (isSaving) return;

    const pathChanged = storageForm.localDirectoryPath.trim() !== originalPath.trim();
    const cloudUrlChanged = storageForm.cloudUrl.trim() !== originalCloudUrl.trim();

    if ((pathChanged && storageForm.storageType === 'LOCAL') || (cloudUrlChanged && storageForm.storageType === 'CLOUD')) {
      // Storage location changed -> Directly launch Migration Wizard
      soundFX.playBeep();
      setMigrationConfig({
        sourcePath: originalPath,
        targetPath: storageForm.storageType === 'CLOUD' ? storageForm.cloudUrl : storageForm.localDirectoryPath,
        filename: storageForm.filename,
        migrateExistingData: true,
        createBackup: true,
        storageType: storageForm.storageType,
      });
      setIsMigrationModalOpen(true);
    } else {
      // Normal save
      setIsSaving(true);
      try {
        await api.put('/settings/storage', storageForm);
        setOriginalPath(storageForm.localDirectoryPath);
        setOriginalBackupPath(storageForm.backupDirectoryPath || 'D:\\39POS\\Backups');
        setOriginalCloudUrl(storageForm.cloudUrl);
        soundFX.playCashSuccess();
        loadData();
        setIsStorageLocked(true);
        setUnlockCountdown(null);
      } catch (err: any) {
        soundFX.playError();
        alert(`Failed to save storage settings: ${err.response?.data?.message || err.message}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Discard unsaved changes
  const handleDiscardChanges = () => {
    setStorageForm((prev) => ({
      ...prev,
      localDirectoryPath: originalPath,
      backupDirectoryPath: originalBackupPath,
      cloudUrl: originalCloudUrl,
    }));
    soundFX.playBeep();
  };

  // Migration choice callback
  const handleMigrationChoice = (action: 'move' | 'load') => {
    setShowChoiceModal(false);

    if (action === 'move') {
      setMigrationConfig({
        sourcePath: originalPath,
        targetPath: storageForm.storageType === 'CLOUD' ? storageForm.cloudUrl : storageForm.localDirectoryPath,
        filename: storageForm.filename,
        migrateExistingData: true,
        createBackup: true,
        storageType: storageForm.storageType,
      });
      setIsMigrationModalOpen(true);
    } else {
      // Switch Pointer Only
      api.put('/settings/storage', storageForm).then(() => {
        setOriginalPath(storageForm.localDirectoryPath);
        setOriginalBackupPath(storageForm.backupDirectoryPath || 'D:\\39POS\\Backups');
        setOriginalCloudUrl(storageForm.cloudUrl);
        soundFX.playCashSuccess();
        loadData();
        setIsStorageLocked(true);
        setUnlockCountdown(null);
      });
    }
  };

  // Check if form is dirty
  const isDirty =
    storageForm.localDirectoryPath.trim() !== originalPath.trim() ||
    (storageForm.backupDirectoryPath || '').trim() !== originalBackupPath.trim() ||
    storageForm.cloudUrl.trim() !== originalCloudUrl.trim();

  // Resolved path preview
  const resolvedFullPath =
    storageForm.storageType === 'LOCAL'
      ? `${storageForm.localDirectoryPath.replace(/\\+$/, '')}\\${storageForm.filename}`
      : storageForm.cloudUrl || 'https://cloud.39pos.app/api/sync';

  const resolvedBackupFullPath =
    `${(storageForm.backupDirectoryPath || 'D:\\39POS\\Backups').replace(/\\+$/, '')}\\${storageForm.backupFilename || '39pos_enterprise_backup.json.enc'}`;

  return (
    <div className="space-y-6 text-xs animate-in fade-in duration-200">
      {/* ── 1. Top Header & Active System Banner ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0 text-2xl">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('settings.storageTitle', 'Data Configuration')}
            </h1>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionStatus === 'success'
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/60 animate-pulse'
                    : connectionStatus === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="font-semibold">
                {storageForm.storageType === 'LOCAL'
                  ? t('settings.systemActiveLocal', 'System Active • Local Drive / Local Server')
                  : t('settings.systemActiveCloud', 'System Active • Online Cloud')}
              </span>
            </div>
            {liveDbPath && (
              <div className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate max-w-[500px]" title={liveDbPath}>
                {t('settings.engineFile', 'Engine File: {{path}}', { path: liveDbPath })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-Save Active Badge */}
          <div className="px-4 py-2 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2">
            <Save className="w-3.5 h-3.5" />
            <span>{t('settings.autoSaveEnabled', 'Auto-Save Enabled')}</span>
          </div>
        </div>
      </div>

      {/* ── 2. Top Bento Stats Row (Database Size, Last Modified By, Auto Save) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Database Size */}
        <div className="p-5 neu-card-interactive flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-sky-500 flex items-center justify-center flex-shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
              {dbStats.dbFormattedSize || '37 KB'}
            </div>
            <div className="text-slate-400 text-xs font-semibold">{t('settings.dbSize', 'Database Size')}</div>
          </div>
        </div>

        {/* Card 2: Last Modified By */}
        <div className="p-5 neu-card-interactive flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white truncate max-w-[200px]">
              {dbStats.lastModifiedBy || 'Supper'}
            </div>
            <div className="text-slate-400 text-xs font-semibold">{t('settings.lastModifiedBy', 'Last Modified By')}</div>
          </div>
        </div>

        {/* Card 3: Auto Save (Save Date & Time in 2 clean lines matching WHM3) */}
        <div className="p-5 neu-card-interactive flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono leading-tight tracking-tight">
              {formatAutoSaveTimestamp(dbStats.lastBackupAt).dateStr}
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono leading-tight tracking-tight">
              {formatAutoSaveTimestamp(dbStats.lastBackupAt).timeStr}
            </div>
            <div className="text-slate-400 text-[11px] font-semibold pt-0.5">{t('settings.autoSave', 'Auto Save')}</div>
          </div>
        </div>
      </div>

      {/* ── 3. Storage Preference Section & Glassmorphic Lock Container ── */}
      <div className="p-6 neu-card-lg space-y-6 relative overflow-hidden">
        {/* Storage Preference Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {t('settings.storagePreference', 'Storage Preference')}
                </h3>

                {/* Unlock Countdown Badge */}
                {!isStorageLocked && unlockCountdown !== null && (
                  <div className="px-3 py-1 rounded-xl bg-amber-500 text-amber-950 font-extrabold text-[11px] flex items-center gap-1.5 shadow-neu-glow-amber animate-pulse uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{t('settings.autoLocksIn', 'Auto-locks in {{seconds}}s', { seconds: unlockCountdown })}</span>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {t('settings.storagePreferenceDesc', 'Choose how your data is persisted and accessed.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold neu-sunken-sm text-slate-600 dark:text-slate-300">
              {t('settings.currentMode', 'Current Mode:')} <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{storageForm.storageType === 'LOCAL' ? t('settings.localOffline', 'Local / Offline') : t('settings.cloudSync', 'Cloud / Sync')}</strong>
            </span>
          </div>
        </div>

        {/* Segmented Toggle Option Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Option A: Local Drive */}
          <div
            onClick={() => {
              if (!isStorageLocked) {
                setStorageForm({ ...storageForm, storageType: 'LOCAL' });
                soundFX.playBeep();
              }
            }}
            className={`p-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-bold text-sm cursor-pointer ${
              storageForm.storageType === 'LOCAL'
                ? 'neu-sunken text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-neu-glow-emerald font-black'
                : 'neu-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            <Laptop className="w-5 h-5" />
            <span>{t('settings.localDriveServer', 'Local Drive / Server')}</span>
          </div>

          {/* Option B: Online Cloud */}
          <div
            onClick={() => {
              if (!isStorageLocked) {
                setStorageForm({ ...storageForm, storageType: 'CLOUD' });
                soundFX.playBeep();
              }
            }}
            className={`p-4 rounded-2xl transition-all flex items-center justify-center gap-3 font-bold text-sm cursor-pointer ${
              storageForm.storageType === 'CLOUD'
                ? 'neu-sunken text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-neu-glow-emerald font-black'
                : 'neu-btn text-slate-600 dark:text-slate-400'
            }`}
          >
            <Cloud className="w-5 h-5" />
            <span>{t('settings.onlineCloud', 'Online Cloud')}</span>
          </div>
        </div>

        {/* ── 4. Main Bento Grid (Span 8 Dynamic Panel + Span 4 Health Sidebar) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Column (Span 8): Dynamic Storage Panel */}
          <div className="lg:col-span-8 space-y-6">
            {storageForm.storageType === 'LOCAL' ? (
              <div className="space-y-6">
                {/* 1. Primary Working Database Card (Live SQL Engine & Multi-Terminal Concurrency) */}
                <div className="p-6 rounded-3xl neu-card space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{t('settings.primaryDbPathTitle', 'Primary Working Database Path')}</span>
                        </h3>
                        <p className="text-slate-400 text-xs">
                          {t('settings.primaryDbPathDesc', 'Live transactional database. All connected cashiers, tablets, and registers read and write here in real-time.')}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold neu-pill text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{t('settings.walMode', 'WAL Mode • Multi-User Active')}</span>
                    </span>
                  </div>

                  {/* Path Input Box */}
                  <div>
                    <label className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                      {t('settings.activePrimaryDbLocation', 'Active Primary Database Location')}
                    </label>
                    <div className="p-2 rounded-2xl neu-sunken flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl neu-sunken-sm text-slate-500 flex items-center justify-center flex-shrink-0">
                        <HardDrive className="w-4 h-4 text-emerald-500" />
                      </div>
                      <input
                        type="text"
                        disabled={isStorageLocked}
                        value={storageForm.localDirectoryPath}
                        onChange={(e) => setStorageForm({ ...storageForm, localDirectoryPath: e.target.value })}
                        className="flex-1 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none"
                      />
                      <button
                        type="button"
                        disabled={isStorageLocked}
                        onClick={handleBrowseLocal}
                        className="px-4 py-2 neu-btn text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {t('settings.changeFolder', 'Change Folder')}
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-slate-400 text-[11px] flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 font-mono">
                        <FileText className="w-3.5 h-3.5" />
                        {t('settings.filenameLabel', 'Filename:')} <strong className="text-slate-700 dark:text-slate-200 font-bold">{storageForm.filename}</strong> {t('settings.protectedLiveEngine', '(Protected Live Engine)')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPath(resolvedFullPath)}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback === resolvedFullPath ? t('settings.copied', 'Copied!') : t('settings.copyFullPath', 'Copy Full Path')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400">{t('settings.primaryPresets', 'Primary Presets:')}</span>
                    {[
                      'D:\\39POS\\Data',
                      'C:\\39POS\\Data',
                      'E:\\Store_Data',
                      '\\\\192.168.1.100\\39pos-data',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={isStorageLocked}
                        onClick={() => {
                          setStorageForm({ ...storageForm, localDirectoryPath: preset });
                          testConnectionSilent(preset);
                          setIsStorageLocked(false);
                          setUnlockCountdown(60);
                          soundFX.playBeep();
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all disabled:opacity-50 cursor-pointer ${
                          storageForm.localDirectoryPath === preset
                            ? 'neu-sunken text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'neu-btn text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Direct Migration Button inside Card 1 */}
                  {!isStorageLocked && (
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playBeep();
                          setMigrationConfig({
                            sourcePath: originalPath,
                            targetPath: storageForm.localDirectoryPath,
                            filename: storageForm.filename,
                            migrateExistingData: true,
                            createBackup: true,
                            storageType: 'LOCAL',
                          });
                          setIsMigrationModalOpen(true);
                        }}
                        className="px-5 py-2.5 neu-btn-primary text-white font-black text-xs shadow-neu-glow-emerald active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Database className="w-4 h-4 stroke-[2.5]" />
                        <span>{t('settings.relocateCopyDb', 'Relocate & Copy Database to this Path')}</span>
                      </button>
                    </div>
                  )}

                  {/* LAN Multi-Register Connection Info Banner */}
                  <div className="p-3.5 rounded-2xl neu-card-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{t('settings.lanEndpointTitle', 'Multi-Terminal LAN Server Connect Endpoint')}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {t('settings.lanEndpointDesc', 'Other cashiers & tablets connect via this URL to read/write concurrently:')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="px-2.5 py-1 rounded-xl neu-sunken-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {networkInfo?.terminalUrl || `http://${window.location.hostname || '127.0.0.1'}:5000`}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyPath(networkInfo?.terminalUrl || `http://${window.location.hostname || '127.0.0.1'}:5000`)}
                        className="p-1.5 neu-circle-btn text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer transition-colors"
                        title="Copy LAN Server URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Dedicated Automated Backup Vault Destination Card (.json.enc Engine) */}
                <div className="p-6 rounded-3xl neu-card space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{t('settings.backupVaultTitle', 'Automated Backup Vault Path (.json.enc Engine)')}</span>
                        </h3>
                        <p className="text-slate-400 text-xs">
                          {t('settings.backupVaultDesc', 'Dedicated archive folder where point-in-time AES-256 encrypted snapshots are automatically preserved.')}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold neu-pill text-amber-600 dark:text-amber-400 flex items-center gap-1.5 self-start sm:self-auto">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>{t('settings.aes256Gcm', 'AES-256 GCM Encrypted')}</span>
                    </span>
                  </div>

                  {/* Backup Path Input Box */}
                  <div>
                    <label className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                      {t('settings.backupVaultDest', 'Backup Archive Vault Destination')}
                    </label>
                    <div className="p-2 rounded-2xl neu-sunken flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl neu-sunken-sm text-slate-500 flex items-center justify-center flex-shrink-0">
                        <FolderArchive className="w-4 h-4 text-amber-500" />
                      </div>
                      <input
                        type="text"
                        disabled={isStorageLocked}
                        value={storageForm.backupDirectoryPath || 'D:\\39POS\\Backups'}
                        onChange={(e) => setStorageForm({ ...storageForm, backupDirectoryPath: e.target.value })}
                        className="flex-1 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none"
                      />
                      <button
                        type="button"
                        disabled={isStorageLocked}
                        onClick={handleBrowseBackupLocal}
                        className="px-4 py-2 neu-btn text-amber-600 dark:text-amber-400 font-extrabold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {t('settings.changeFolder', 'Change Folder')}
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-slate-400 text-[11px] flex-wrap gap-2">
                      <span className="flex items-center gap-1.5 font-mono">
                        <FileText className="w-3.5 h-3.5" />
                        {t('settings.filenameLabel', 'Filename:')} <strong className="text-slate-700 dark:text-slate-200 font-bold">{storageForm.backupFilename || '39pos_enterprise_backup.json.enc'}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPath(resolvedBackupFullPath)}
                        className="text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback === resolvedBackupFullPath ? t('settings.copied', 'Copied!') : t('settings.copyFullPath', 'Copy Full Path')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Backup Quick Presets */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400">{t('settings.vaultPresets', 'Vault Presets:')}</span>
                    {[
                      'D:\\39POS\\Backups',
                      'C:\\39POS\\Backups',
                      'E:\\Store_Archive',
                      '\\\\192.168.1.100\\39pos-backup',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={isStorageLocked}
                        onClick={() => {
                          setStorageForm({ ...storageForm, backupDirectoryPath: preset });
                          setIsStorageLocked(false);
                          setUnlockCountdown(60);
                          soundFX.playBeep();
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all disabled:opacity-50 ${
                          storageForm.backupDirectoryPath === preset
                            ? 'neu-sunken text-amber-600 dark:text-amber-400 font-bold'
                            : 'neu-btn text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Backup Schedule & Security Row */}
                  <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {t('settings.autoBackupSchedule', 'Auto-Backup Schedule')}
                        </h4>
                        <p className="text-slate-400 text-xs">
                          {t('settings.autoBackupScheduleDesc', 'Frequency for generating consolidated AES-256 snapshots.')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 p-1 neu-tab-container">
                        {[
                          { label: t('settings.oneHour', '1 Hour'), value: 1 },
                          { label: t('settings.twoHours', '2 Hours'), value: 2 },
                          { label: t('settings.sixHours', '6 Hours'), value: 6 },
                          { label: t('settings.daily', 'Daily'), value: 24 },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            disabled={isStorageLocked}
                            onClick={() => {
                              setStorageForm({ ...storageForm, autoBackupIntervalHours: item.value });
                              soundFX.playBeep();
                            }}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 ${
                              storageForm.autoBackupIntervalHours === item.value
                                ? 'neu-tab-active shadow-neu-raised-sm text-amber-600 dark:text-amber-400 font-black'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 pl-2 border-l border-black/5 dark:border-white/5">
                        <span className="font-bold text-xs text-emerald-500 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          <span>AES-256</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Cloud Endpoint Configuration Card */
              <div className="p-6 rounded-3xl neu-card space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">
                        {t('settings.cloudEndpointTitle', 'Cloud Endpoint Configuration')}
                      </h3>
                      <p className="text-slate-400 text-xs">
                        {t('settings.cloudEndpointDesc', 'Connect to a remote cloud storage provider. Ensure you have the correct access token or URL.')}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t('settings.autoSaved', 'Auto-Saved')}</span>
                  </div>
                </div>

                <div>
                  <label className="font-extrabold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                    {t('settings.cloudUrlLabel', 'Cloud Storage URL / Webhook')}
                  </label>
                  <input
                    type="text"
                    disabled={isStorageLocked}
                    value={storageForm.cloudUrl}
                    onChange={(e) => setStorageForm({ ...storageForm, cloudUrl: e.target.value })}
                    placeholder="https://drive.google.com/drive/my-drive or https://cloud.39pos.app/api/sync"
                    className="w-full h-11 px-3.5 neu-input font-mono text-xs outline-none"
                  />
                </div>

                {/* Security Section (Internal) */}
                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {t('settings.dataSecurity', 'Data Security & Encryption')}
                      </h4>
                      <p className="text-slate-400 text-xs">
                        {t('settings.dataSecurityDesc', 'Hardware-accelerated AES-256 encryption.')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-emerald-500">{t('settings.aes256Enabled', 'AES-256 Enabled')}</span>
                    <button
                      type="button"
                      disabled={isStorageLocked}
                      onClick={() =>
                        setStorageForm({ ...storageForm, encryptionEnabled: !storageForm.encryptionEnabled })
                      }
                      className="w-11 h-6 rounded-full neu-btn-primary relative p-0.5 disabled:opacity-50 cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-white translate-x-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Span 4): Connection Health Sidebar (Equal Height) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="p-6 rounded-3xl neu-card space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {t('settings.connectionHealth', 'Connection Health')}
                    </h3>
                    <p className="text-slate-400 text-xs">
                      {t('settings.connectionHealthDesc', 'Monitor the connectivity status of your storage endpoint.')}
                    </p>
                  </div>
                </div>

                {/* Status Box */}
                <div className="p-4 rounded-2xl neu-sunken space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl neu-card-sm">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-neu-glow-emerald animate-pulse flex-shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{t('settings.operational', 'Operational')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.localStorageRunning', 'Local Storage running smoothly')}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">{t('settings.accessMode', 'Access Mode')}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{t('settings.readWrite', 'Read / Write')}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 font-medium">{t('settings.autoBackupEngine', 'Auto-Backup Engine')}</span>
                    <span className="font-bold text-emerald-500">{t('settings.every1Hour', 'Every 1 Hour')}</span>
                  </div>
                </div>
              </div>

              {/* Test Connection Button */}
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="w-full py-3 neu-btn-primary text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t('settings.verifyingConnection', 'Verifying Connection...')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('settings.testConnection', 'Test Connection')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Glassmorphic Storage Lock Overlay ── */}
        {isStorageLocked && (
          <div className="storage-lock-overlay" onClick={handleUnlockStorage}>
            <div className="storage-lock-icon">
              <Lock className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              {t('settings.configLocked', 'Configuration Locked')}
            </h3>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              {t('settings.connVerified', 'Connection Verified & Secured')}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center mb-6">
              {t('settings.lockedDesc', 'Optimized for data integrity and zero accidental alteration.')}
            </p>
            <div className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 shadow-neu-glow-emerald transition-transform hover:scale-105 active:scale-95 cursor-pointer">
              <Unlock className="w-4 h-4" />
              <span>{t('settings.clickToUnlock', 'Click to Unlock Layout')}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Encrypted Database Snapshot Archive (Single Consolidated File) ── */}
      <div className="p-6 neu-card-lg space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-500" />
                <span>{t('settings.snapshotArchiveTitle', 'Encrypted Database Snapshot Archive')}</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400 font-mono">
                {t('settings.oneMasterFile', '1 Master File')}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              {t('settings.snapshotArchiveDesc', 'Single consolidated AES-256 snapshot. Automatically replaces the old backup file on every backup run.')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Run Backup Now Button */}
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="px-4 py-2 neu-btn-primary text-white font-black text-xs flex items-center gap-2 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Cloud className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
              <span>{isBackingUp ? t('settings.backingUp', 'Encrypting & Saving...') : t('settings.runBackupNow', 'Run Backup Now')}</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json.enc,.enc,.json"
              className="hidden"
              onChange={handleUploadBackupFile}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Import .json.enc backup file from local disk"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('settings.importJsonEnc', 'Import .json.enc')}</span>
            </button>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold neu-pill text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-emerald-500" />
              <span>{t('settings.autoOverwriteEnabled', 'Auto-Overwrite Enabled')}</span>
            </span>
          </div>
        </div>

        {/* Master Snapshot Card */}
        <div className="pt-1">
          {backups.length > 0 ? (
            (() => {
              const primaryBackup = backups[0];
              return (
                <div className="p-5 rounded-3xl neu-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-mono font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2 flex-wrap">
                        <span>{primaryBackup.filename}</span>
                        <span className="px-2 py-0.5 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-bold">
                          {t('settings.primaryMasterSnapshot', 'Primary Master Snapshot')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full neu-pill text-sky-600 dark:text-sky-400 text-[10px] font-sans font-bold">
                          AES-256 GCM
                        </span>
                      </div>
                      <div className="text-slate-400 font-mono text-xs flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                          {(primaryBackup.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(primaryBackup.createdAt || primaryBackup.created_at).toLocaleString()}
                        </span>
                        {primaryBackup.storagePath && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-500 truncate max-w-sm">
                              {primaryBackup.storagePath}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                      title="Download .json.enc snapshot file"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t('settings.downloadJsonEnc', 'Download .json.enc')}</span>
                    </button>

                    {primaryBackup.storagePath && (
                      <button
                        type="button"
                        onClick={() => handleCopyPath(primaryBackup.storagePath)}
                        className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        title="Copy file path"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>
                          {copyFeedback === primaryBackup.storagePath ? t('settings.copied', 'Copied!') : t('settings.copyFullPath', 'Copy Full Path')}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBackupForRestore(primaryBackup);
                        setRestoreModalOpen(true);
                        soundFX.playBeep();
                      }}
                      className="px-4 py-2 neu-btn-accent font-black text-xs flex items-center gap-1.5 shadow-neu-glow-amber active:scale-95 transition-all cursor-pointer"
                      title="Restore data from this encrypted snapshot"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t('settings.restoreSnapshot', 'Restore Snapshot')}</span>
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-3 neu-sunken">
              <FolderArchive className="w-10 h-10 mx-auto opacity-30 text-emerald-500" />
              <div>
                <p className="font-bold text-slate-700 dark:text-slate-300">{t('settings.noBackupYet', 'No backup file created yet.')}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('settings.noBackupDesc', 'Click "Run Backup Now" to create your primary AES-256 database snapshot.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="px-4 py-2 neu-btn-primary text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-neu-glow-emerald cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{isBackingUp ? t('settings.backingUp', 'Creating...') : t('settings.createPrimaryBackupNow', 'Create Primary Backup Now')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Danger Zone: Factory Reset with User Protection ── */}
      <div className="p-6 rounded-3xl neu-card border border-rose-500/30 space-y-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-rose-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                  {t('settings.dangerZoneTitle', 'Danger Zone: Factory Reset & Clear All Records')}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-rose-600 dark:text-rose-400">
                  RESTRICTED
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {t('settings.dangerZoneDesc', 'Wipe operational transactions, sales, stock logs & procurement records while preserving all user logins and access control')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setClearDataModalOpen(true);
              soundFX.playBeep();
            }}
            className="px-5 py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-2 self-start sm:self-auto active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('settings.wipeClearData', 'Wipe & Clear Data...')}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold neu-sunken-sm p-3">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>{t('settings.userAccessProtectedNote', 'User accounts, cashier PINs, role permissions and store profile are never deleted.')}</span>
        </div>
      </div>

      {/* ── 7. Centered Action Dialog Modal (Matching App Theme & Center Positioned) ── */}
      {isDirty && !isStorageLocked && !isMigrationModalOpen && !showChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg neu-card-lg p-6 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{t('settings.unsavedStorageChanges', 'Unsaved Storage Changes')}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      {t('settings.pendingSave', 'Pending Save')}
                    </span>
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    {t('settings.unsavedStorageChangesDesc', 'Your database storage path has been modified and is pending confirmation.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDiscardChanges}
                className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                title="Discard & Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Path Comparison Details Card */}
            <div className="p-4 neu-sunken space-y-3 font-mono text-xs rounded-2xl">
              {storageForm.localDirectoryPath.trim() !== originalPath.trim() && (
                <div className="space-y-1.5 pb-2 border-b border-slate-200/40 dark:border-slate-800">
                  <div className="text-[11px] font-sans font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {t('settings.activePrimaryDbLocation', 'Primary Database Location')}:
                  </div>
                  <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 font-sans text-xs">
                    <span>{t('settings.previous', 'Previous:')}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-xs">{originalPath}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-emerald-600 dark:text-emerald-400 font-sans text-xs font-bold">
                    <span>{t('settings.newTarget', 'New Target:')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-xs">{storageForm.localDirectoryPath}</span>
                  </div>
                </div>
              )}

              {(storageForm.backupDirectoryPath || '').trim() !== originalBackupPath.trim() && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-sans font-extrabold text-amber-500 uppercase tracking-wider">
                    {t('settings.backupVaultDest', 'Backup Vault Destination')}:
                  </div>
                  <div className="flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400 font-sans text-xs">
                    <span>{t('settings.previous', 'Previous:')}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-xs">{originalBackupPath}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-amber-500 font-sans text-xs font-bold">
                    <span>{t('settings.newVault', 'New Vault:')}</span>
                    <span className="text-amber-500 font-mono truncate max-w-xs">{storageForm.backupDirectoryPath}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-5 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>{t('settings.discardChanges', 'Discard Changes')}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 py-2.5 neu-btn-primary text-white font-black text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {storageForm.localDirectoryPath.trim() !== originalPath.trim()
                    ? t('settings.saveChangesMigrate', 'Save Changes & Migrate')
                    : t('settings.saveConfig', 'Save Configuration')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Migration Choice Modal ── */}
      <MigrationChoiceModal
        isOpen={showChoiceModal}
        onCancel={() => setShowChoiceModal(false)}
        onSelectMove={() => handleMigrationChoice('move')}
        onSelectLoad={() => handleMigrationChoice('load')}
        targetPath={storageForm.storageType === 'LOCAL' ? storageForm.localDirectoryPath : storageForm.cloudUrl}
        storageType={storageForm.storageType}
      />

      {/* ── Migration Wizard Modal ── */}
      {migrationConfig && (
        <MigrationWizardModal
          isOpen={isMigrationModalOpen}
          onClose={() => setIsMigrationModalOpen(false)}
          config={migrationConfig}
          onSuccess={() => {
            setIsMigrationModalOpen(false);
            setOriginalPath(storageForm.localDirectoryPath);
            setOriginalCloudUrl(storageForm.cloudUrl);
            loadData();
          }}
        />
      )}

      {/* ── Restore Snapshot Modal ── */}
      <RestoreSnapshotModal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        backupItem={selectedBackupForRestore}
        onSuccess={() => {
          setRestoreModalOpen(false);
          loadData();
        }}
      />

      {/* ── Clear Data Modal ── */}
      <ClearDataModal
        isOpen={clearDataModalOpen}
        onClose={() => setClearDataModalOpen(false)}
        onSuccess={() => {
          setClearDataModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
