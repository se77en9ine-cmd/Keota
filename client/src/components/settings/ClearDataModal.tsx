import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Trash2,
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Database,
  Sparkles,
  ShoppingBag,
  Users,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';
import { CustomCheckbox } from '../common/CustomCheckbox';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useTranslation();

  const [modalStage, setModalStage] = useState<'CONFIG' | 'CONFIRM_PROMPT' | 'PURGING' | 'DONE'>('CONFIG');
  const [wipeCatalog, setWipeCatalog] = useState(false);
  const [createAutoBackup, setCreateAutoBackup] = useState(true);

  const [progressPhase, setProgressPhase] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [purgeResult, setPurgeResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setModalStage('CONFIG');
      setProgressPhase(0);
      setProgressPercent(0);
      setErrorMsg(null);
      setPurgeResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const phases = [
    {
      title: t('settings.purgePhase1Title', 'Generating Emergency AES-256 Snapshot'),
      desc: t('settings.purgePhase1Desc', 'Backing up all current data to your local archive folder before wiping...'),
      icon: ShieldCheck,
      color: 'text-emerald-500',
    },
    {
      title: t('settings.purgePhase2Title', 'Purging POS Sales, Orders & Payments'),
      desc: t('settings.purgePhase2Desc', 'Clearing all completed sales, invoices, payment records & order receipts...'),
      icon: Trash2,
      color: 'text-rose-500',
    },
    {
      title: t('settings.purgePhase3Title', 'Resetting Stock Movements & Procurement'),
      desc: t('settings.purgePhase3Desc', 'Clearing inventory batches, purchase orders, expenses & shift closures...'),
      icon: Database,
      color: 'text-amber-500',
    },
    {
      title: t('settings.purgePhase4Title', 'Verifying Access Control & Preserving Users'),
      desc: t('settings.purgePhase4Desc', 'Protecting user credentials, cashier PINs, permissions and store settings...'),
      icon: Lock,
      color: 'text-brand-500',
    },
  ];

  const handleExecutePurge = async () => {
    setModalStage('PURGING');
    setErrorMsg(null);
    setProgressPercent(10);
    setProgressPhase(0);
    soundFX.playBeep();

    const p1 = setTimeout(() => {
      setProgressPhase(1);
      setProgressPercent(35);
    }, 800);

    const p2 = setTimeout(() => {
      setProgressPhase(2);
      setProgressPercent(65);
    }, 1600);

    const p3 = setTimeout(() => {
      setProgressPhase(3);
      setProgressPercent(88);
    }, 2400);

    try {
      const response = await api.post('/backups/clear-all-records', {
        wipeCatalog,
        createAutoBackup,
      });

      const data = response.data;

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);

      if (!data.success) {
        throw new Error(data.message || 'Failed to clear records');
      }

      setProgressPercent(100);
      setProgressPhase(3);
      setPurgeResult(data);
      setModalStage('DONE');
      soundFX.playCashSuccess();
    } catch (err: any) {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      setModalStage('CONFIG');
      setErrorMsg(err.response?.data?.message || err.message || 'Server error occurred during data purge.');
      soundFX.playError();
    }
  };

  const handleFinalDone = () => {
    soundFX.playCashSuccess();
    onSuccess(purgeResult || { success: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl neu-card-lg overflow-hidden text-xs animate-in zoom-in-95 duration-200">
        {/* Modal Top Header Banner */}
        <div className="p-5 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t('settings.clearDataModalTitle', 'Factory Reset: Clear All Data Records')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-rose-600 dark:text-rose-400">
                  DANGER ZONE
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {t('settings.clearDataModalSubtitle', 'Irreversibly clears business transactions while protecting user login accounts')}
              </p>
            </div>
          </div>

          {modalStage !== 'PURGING' && (
            <button
              onClick={onClose}
              className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* STAGE 1: CONFIG VIEW */}
          {modalStage === 'CONFIG' && (
            <>
              {/* Preservation Assurance Banner */}
              <div className="p-4 neu-card-sm flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-emerald-600 dark:text-emerald-400">
                    {t('settings.preservationGuaranteeTitle', 'Guaranteed User & Access Control Protection')}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t('settings.preservationGuaranteeBody', 'This operation will NEVER delete Admin or Cashier user accounts, passwords, PIN codes, roles, permissions, or core store settings. You can log right back in.')}
                  </p>
                </div>
              </div>

              {/* What will be cleared vs kept list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Purged items */}
                <div className="p-4 neu-card-sm space-y-2">
                  <div className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('settings.itemsPurged', 'Records That Will Be Cleared:')}</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 pl-4 list-disc">
                    <li>{t('settings.purgeItemSales', 'All POS Sales & Order Receipts')}</li>
                    <li>{t('settings.purgeItemInventory', 'Inventory Logs & Stock Takes')}</li>
                    <li>{t('settings.purgeItemPurchases', 'Purchase Orders & Supplier Invoices')}</li>
                    <li>{t('settings.purgeItemAccounting', 'Expenses, Incomes & Cash Closings')}</li>
                  </ul>
                </div>

                {/* Preserved items */}
                <div className="p-4 neu-card-sm space-y-2">
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('settings.itemsPreserved', 'Preserved & Protected:')}</span>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 pl-4 list-disc">
                    <li>{t('settings.keepUsers', 'All Staff & User Accounts')}</li>
                    <li>{t('settings.keepPins', 'Cashier PIN Codes & Passwords')}</li>
                    <li>{t('settings.keepRoles', 'Role Permissions & Access Matrix')}</li>
                    <li>{t('settings.keepSettings', 'Tax, Currency & Store Profile')}</li>
                  </ul>
                </div>
              </div>

              {/* Option checkboxes */}
              <div className="space-y-2.5 pt-1 border-t border-slate-200/40 dark:border-slate-800">
                <div
                  onClick={() => setCreateAutoBackup(!createAutoBackup)}
                  className="flex items-center gap-3.5 p-3.5 neu-card-interactive cursor-pointer transition-all"
                >
                  <CustomCheckbox
                    checked={createAutoBackup}
                    onChange={(checked) => setCreateAutoBackup(checked)}
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {t('settings.optAutoBackup', 'Create Emergency AES-256 Snapshot first (Recommended)')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t('settings.optAutoBackupDesc', 'Allows you to restore everything with one click if needed')}
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setWipeCatalog(!wipeCatalog)}
                  className="flex items-center gap-3.5 p-3.5 neu-card-interactive cursor-pointer transition-all"
                >
                  <CustomCheckbox
                    checked={wipeCatalog}
                    onChange={(checked) => setWipeCatalog(checked)}
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
                      <span>{t('settings.optWipeCatalog', 'Also Delete Product Catalog, Categories & Customers')}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t('settings.optWipeCatalogDesc', 'Leave unchecked to keep your product barcode catalog and only reset quantities & transactions to zero')}
                    </div>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold text-xs animate-in fade-in">
                  {errorMsg}
                </div>
              )}
            </>
          )}

          {/* STAGE 2: CONFIRMATION PROMPT DIALOG */}
          {modalStage === 'CONFIRM_PROMPT' && (
            <div className="py-4 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full neu-sunken text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  {t('settings.confirmPromptHeading', 'Are you sure you want to delete all records?')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('settings.confirmPromptBody', 'This will permanently wipe all POS sales transactions, order receipts, stock quantities, and expenses. Your user accounts and store profile will be preserved.')}
                </p>
              </div>

              <div className="p-3.5 neu-card-sm text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>{t('settings.confirmPromptBackupNote', 'An emergency AES-256 backup snapshot will be saved automatically.')}</span>
              </div>
            </div>
          )}

          {/* STAGE 3: ANIMATED PURGING PROGRESS */}
          {modalStage === 'PURGING' && (
            <div className="py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center neu-sunken rounded-full">
                <div className="w-14 h-14 rounded-full neu-card-sm text-rose-500 flex items-center justify-center animate-pulse">
                  <Trash2 className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {progressPercent}%
                </div>
                <div className="font-extrabold text-sm text-rose-500">
                  {phases[progressPhase]?.title}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {phases[progressPhase]?.desc}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 text-left">
                {phases.map((ph, idx) => {
                  const Icon = ph.icon;
                  const isActive = progressPhase === idx;
                  const isPassed = progressPhase > idx;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl transition-all ${
                        isPassed
                          ? 'neu-card-sm text-emerald-500'
                          : isActive
                          ? 'neu-sunken text-rose-500 ring-2 ring-rose-500/40'
                          : 'neu-card-sm text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[10px]">
                        {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                        <span>Step {idx + 1}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 4: DONE / SUCCESS WITH CONFIRM BUTTON */}
          {modalStage === 'DONE' && (
            <div className="py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full neu-sunken text-emerald-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  100%
                </div>
                <div className="font-extrabold text-base text-slate-900 dark:text-white">
                  {t('settings.purgeComplete', 'Database Purge Completed Successfully!')}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t('settings.purgeCompleteSub', 'Clean slate initialized. Preserved staff login credentials intact.')}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-2 text-left">
                {phases.map((_, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 neu-card-sm text-emerald-500 font-bold text-[10px] flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Step {idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-end gap-3">
          {modalStage === 'CONFIG' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalStage('CONFIRM_PROMPT');
                  soundFX.playBeep();
                }}
                className="px-6 py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('settings.btnClearAllRecords', 'Clear All Records...')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {modalStage === 'CONFIRM_PROMPT' && (
            <>
              <button
                type="button"
                onClick={() => setModalStage('CONFIG')}
                className="px-5 py-2 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                {t('common.back', 'Go Back')}
              </button>

              <button
                type="button"
                onClick={handleExecutePurge}
                className="px-6 py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('settings.btnFinalConfirmPurge', 'Yes, Delete All Records Now')}</span>
              </button>
            </>
          )}

          {modalStage === 'DONE' && (
            <button
              type="button"
              onClick={handleFinalDone}
              className="w-full sm:w-auto px-8 py-3 neu-btn-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t('settings.btnConfirmDoneAndClose', 'Confirm & Finish (ສຳເລັດ)')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default ClearDataModal;

