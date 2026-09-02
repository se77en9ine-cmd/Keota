import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Upload,
  Download,
  ArrowRight,
  FolderOpen,
  Database,
  FileText,
  AlertTriangle,
  Check,
  X,
  Loader2,
  HardDrive,
  Cloud,
} from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface MigrationChoiceModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onSelectMove: () => void;
  onSelectLoad: (filename?: string) => void;
  targetPath: string;
  storageType: 'LOCAL' | 'CLOUD';
}

export const MigrationChoiceModal: React.FC<MigrationChoiceModalProps> = ({
  isOpen,
  onCancel,
  onSelectMove,
  onSelectLoad,
  targetPath,
  storageType,
}) => {
  const { t } = useTranslation();
  const [hoverCard, setHoverCard] = useState<'move' | 'load' | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHoverCard(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl neu-card-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200/40 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{t('settings.storageMigrationDetected', 'Storage Destination Change Detected')}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                  WIZARD
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('settings.chooseMigrationAction', 'How would you like to handle your data for this new destination?')}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Target Summary Box */}
          <div className="p-4 neu-sunken flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-500" />
              <span>{t('settings.newTargetPath', 'New Target Path:')}</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold truncate max-w-xs sm:max-w-md">
              {targetPath}
            </span>
          </div>

          {/* Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Choice 1: Relocate / Copy Current Database */}
            <div
              onClick={() => {
                soundFX.playBeep();
                onSelectMove();
              }}
              className="p-6 neu-card-interactive cursor-pointer flex flex-col items-center text-center gap-3 relative"
            >
              <div className="w-14 h-14 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t('settings.choiceMoveTitle', 'Relocate & Export to Target')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('settings.choiceMoveDesc', 'Creates an automatic safety backup and exports your current active database & transactions into the new destination.')}
                </p>
              </div>
              <button
                type="button"
                className="mt-2 w-full py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t('settings.btnExportCurrentData', 'Relocate Current Data')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Choice 2: Load / Import from Target Folder */}
            <div
              onClick={() => {
                soundFX.playBeep();
                onSelectLoad();
              }}
              className="p-6 neu-card-interactive cursor-pointer flex flex-col items-center text-center gap-3 relative"
            >
              <div className="w-14 h-14 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center">
                <Download className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t('settings.choiceLoadTitle', 'Switch Pointer Only (Link Path)')}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('settings.choiceLoadDesc', 'Keep the new folder path as your active destination and immediately start writing future automated snapshots there.')}
                </p>
              </div>
              <button
                type="button"
                className="mt-2 w-full py-2.5 neu-btn text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{t('settings.btnSwitchPointerOnly', 'Switch Pointer Only')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/40 dark:border-slate-800 flex justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default MigrationChoiceModal;
