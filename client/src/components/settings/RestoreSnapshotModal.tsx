import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  X,
  Database,
  Sparkles,
  Layers,
  ArrowRight,
  HardDrive,
  FileCheck2
} from 'lucide-react';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';

interface RestoreSnapshotModalProps {
  isOpen: boolean;
  backupItem: any | null;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const RestoreSnapshotModal: React.FC<RestoreSnapshotModalProps> = ({
  isOpen,
  backupItem,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();

  const [modalStage, setModalStage] = useState<'CONFIRM' | 'RESTORING' | 'DONE'>('CONFIRM');
  const [progressPhase, setProgressPhase] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setModalStage('CONFIRM');
      setProgressPhase(0);
      setProgressPercent(0);
      setErrorMsg(null);
      setRestoreResult(null);
    }
  }, [isOpen, backupItem]);

  if (!isOpen || !backupItem) return null;

  const phases = [
    {
      title: t('settings.restorePhase1Title', 'Decrypting AES-256 Snapshot Archive'),
      desc: t('settings.restorePhase1Desc', 'Validating encryption keys and unpacking database tables...'),
      icon: ShieldCheck,
    },
    {
      title: t('settings.restorePhase2Title', 'Restoring Product Catalog & Inventory'),
      desc: t('settings.restorePhase2Desc', 'Writing products, barcodes, batches and warehouse stock quantities...'),
      icon: Database,
    },
    {
      title: t('settings.restorePhase3Title', 'Synchronizing Sales Ledger & Accounting'),
      desc: t('settings.restorePhase3Desc', 'Restoring all transactions, invoices, expenses and shift closings...'),
      icon: FileCheck2,
    },
    {
      title: t('settings.restorePhase4Title', 'Rebuilding Indexes & Verifying Integrity'),
      desc: t('settings.restorePhase4Desc', 'Optimizing database indexes and syncing store profile...'),
      icon: Layers,
    },
  ];

  const handleExecuteRestore = async () => {
    setModalStage('RESTORING');
    setErrorMsg(null);
    setProgressPercent(15);
    setProgressPhase(0);
    soundFX.playBeep();

    const p1 = setTimeout(() => {
      setProgressPhase(1);
      setProgressPercent(45);
    }, 800);

    const p2 = setTimeout(() => {
      setProgressPhase(2);
      setProgressPercent(75);
    }, 1600);

    const p3 = setTimeout(() => {
      setProgressPhase(3);
      setProgressPercent(90);
    }, 2400);

    try {
      let response;
      if (backupItem.rawPayload) {
        response = await api.post('/backups/restore-file', {
          payload: backupItem.rawPayload,
          filename: backupItem.filename,
        });
      } else {
        response = await api.post(`/backups/${backupItem.id || 'backup-primary'}/restore`);
      }
      const data = response.data;

      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);

      if (!data.success) {
        throw new Error(data.message || 'Failed to restore snapshot');
      }

      setProgressPercent(100);
      setProgressPhase(3);
      setRestoreResult(data);
      setModalStage('DONE');
      soundFX.playCashSuccess();
    } catch (err: any) {
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      setModalStage('CONFIRM');
      setErrorMsg(err.response?.data?.message || err.message || 'Server error occurred during restoration.');
      soundFX.playError();
    }
  };

  const handleFinalDone = () => {
    soundFX.playCashSuccess();
    onSuccess(restoreResult || { success: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl neu-card-lg overflow-hidden text-xs animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t('settings.restoreModalTitle', 'Restore Database Snapshot')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold neu-pill text-amber-600 dark:text-amber-400">
                  AES-256
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {t('settings.restoreModalSubtitle', 'Roll back and synchronize all database tables to this point-in-time')}
              </p>
            </div>
          </div>

          {modalStage !== 'RESTORING' && (
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
          {/* STAGE 1: CONFIRMATION PROMPT */}
          {modalStage === 'CONFIRM' && (
            <>
              {/* Snapshot Details Card */}
              <div className="p-4 neu-card-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Snapshot File</span>
                  <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {backupItem.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Creation Date</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {new Date(backupItem.createdAt || backupItem.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Archive Size</span>
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                    {(backupItem.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-4 neu-card-sm flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl neu-sunken-sm text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-amber-600 dark:text-amber-400">
                    {t('settings.restoreWarningTitle', 'Point-In-Time Database Synchronization')}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t('settings.restoreWarningBody', 'Restoring will synchronize all products, stock logs, transactions, and expenses back to the exact state when this snapshot was created.')}
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold text-xs animate-in fade-in">
                  {errorMsg}
                </div>
              )}
            </>
          )}

          {/* STAGE 2: RESTORING ANIMATED CHAMBER */}
          {modalStage === 'RESTORING' && (
            <div className="py-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center neu-sunken rounded-full">
                <div className="w-14 h-14 rounded-full neu-card-sm text-amber-500 flex items-center justify-center animate-pulse">
                  <RotateCcw className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {progressPercent}%
                </div>
                <div className="font-extrabold text-sm text-amber-500">
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
                          ? 'neu-sunken text-amber-500 ring-2 ring-amber-500/40'
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

          {/* STAGE 3: DONE / SUCCESS WITH EXPLICIT FINISH BUTTON */}
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
                  {t('settings.restoreSuccessHeading', 'Database Restored Successfully!')}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {t('settings.restoreSuccessBody', 'All database tables have been synchronized to the selected snapshot point.')}
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
          {modalStage === 'CONFIRM' && (
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
                onClick={handleExecuteRestore}
                className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t('settings.btnConfirmRestoreNow', 'Yes, Restore Snapshot Now')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
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
export default RestoreSnapshotModal;
