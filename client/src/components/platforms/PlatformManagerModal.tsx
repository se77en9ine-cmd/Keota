import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlatformStore, OnlinePlatformItem } from '../../store/usePlatformStore';
import { soundFX } from '../../utils/audio';
import { api } from '../../api/client';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Percent,
  Sparkles,
  Save,
  Globe,
  SlidersHorizontal,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface PlatformManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS = ['🟢', '🩷', '🟠', '🎵', '🌐', '💬', '🛵', '📞', '📦', '🍔', '☕', '🛍️', '📱', '🚀'];
const PRESET_COLORS = [
  { label: 'Emerald Green', value: 'emerald', bg: 'bg-emerald-500' },
  { label: 'Rose Pink', value: 'pink', bg: 'bg-pink-500' },
  { label: 'Vibrant Orange', value: 'orange', bg: 'bg-orange-500' },
  { label: 'Electric Purple', value: 'purple', bg: 'bg-purple-500' },
  { label: 'Cyan Blue', value: 'cyan', bg: 'bg-cyan-500' },
  { label: 'Teal Green', value: 'teal', bg: 'bg-teal-500' },
  { label: 'Indigo Blue', value: 'indigo', bg: 'bg-indigo-500' },
  { label: 'Slate Gray', value: 'slate', bg: 'bg-slate-500' },
];

export const PlatformManagerModal: React.FC<PlatformManagerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { platforms, createPlatform, updatePlatform, deletePlatform } = usePlatformStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<OnlinePlatformItem | null>(null);

  // Upload States
  const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'presets'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    icon: '🛵',
    color: 'emerald',
    commissionRate: 0,
    isActive: true,
  });

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.post('/online-platforms/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success && res.data.url) {
        setForm((prev) => ({ ...prev, icon: res.data.url }));
        soundFX.playCashSuccess();
      }
    } catch (err: any) {
      soundFX.playError();
      alert(`Logo upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleStartCreate = () => {
    setEditingPlatform(null);
    setForm({
      name: '',
      code: '',
      icon: '🛵',
      color: 'emerald',
      commissionRate: 0,
      isActive: true,
    });
    setUploadMode('file');
    setIsCreating(true);
  };

  const handleStartEdit = (p: OnlinePlatformItem) => {
    setIsCreating(false);
    setEditingPlatform(p);
    setForm({
      name: p.name,
      code: p.code,
      icon: p.icon,
      color: p.color,
      commissionRate: p.commissionRate,
      isActive: p.isActive,
    });
    setUploadMode(p.icon && (p.icon.startsWith('/uploads/') || p.icon.startsWith('http')) ? 'file' : 'presets');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      soundFX.playCashSuccess();
      if (editingPlatform) {
        await updatePlatform(editingPlatform.id, form);
      } else {
        await createPlatform(form);
      }
      setIsCreating(false);
      setEditingPlatform(null);
    } catch (err: any) {
      soundFX.playError();
      alert(`Operation failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('platforms.deleteConfirm', 'Are you sure you want to delete platform "{{name}}"?', { name }))) return;
    try {
      soundFX.playBeep();
      await deletePlatform(id);
    } catch (err: any) {
      soundFX.playError();
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl neu-card-lg overflow-hidden p-6 space-y-4 text-xs max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {t('platforms.modalTitle', 'Online Platforms & Delivery Services Manager')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                {t('platforms.modalSubtitle', 'Create, customize, and configure GrabFood, Foodpanda, Shopee, TikTok Shop, WhatsApp & custom platforms')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="neu-circle-btn w-8 h-8 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Top Actions: Add New Platform */}
          {!isCreating && !editingPlatform && (
            <div className="flex justify-between items-center neu-card-sm p-4">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {t('platforms.configuredCount', '{{count}} Configured Sales Platforms', { count: platforms.length })}
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('platforms.addCustomPlatform', 'Add Custom Platform')}</span>
              </button>
            </div>
          )}

          {/* Form (Create / Edit) */}
          {(isCreating || editingPlatform) && (
            <form onSubmit={handleSave} className="p-5 neu-card space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>
                    {editingPlatform
                      ? t('platforms.editPlatform', 'Edit {{name}}', { name: editingPlatform.name })
                      : t('platforms.addNewPlatform', 'Add New Online Platform')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlatform(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('platforms.platformName', 'Platform Name')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('platforms.platformNamePlaceholder', 'e.g. Lineman, UberEats, Robinhood')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full h-10 px-3 neu-input text-slate-900 dark:text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('platforms.prefixCode', 'Prefix / Code (e.g. LM, GF)')}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder={t('platforms.prefixCodePlaceholder', 'e.g. LM, UB, RB')}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 neu-input font-mono font-bold text-slate-900 dark:text-white uppercase outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('platforms.commissionRateLabel', 'Commission Rate (%)')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={form.commissionRate}
                      onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 pr-8 neu-input font-mono text-slate-900 dark:text-white font-bold outline-none"
                    />
                    <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('platforms.status', 'Status')}
                  </label>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className={`px-4 py-2 rounded-full font-bold neu-pill transition-colors cursor-pointer ${
                        form.isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {form.isActive ? t('platforms.activeEnabled', 'Active (Enabled)') : t('platforms.inactiveHidden', 'Inactive (Hidden)')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Platform Logo / Image Suite */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {t('platforms.brandLogoIcon', 'Platform Brand Logo / Icon')}
                  </label>
                  <div className="p-1 neu-tab-container flex gap-1">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                        uploadMode === 'file' ? 'neu-tab-active' : 'text-slate-400'
                      }`}
                    >
                      <Upload className="w-3 h-3 inline mr-1" /> {t('platforms.uploadTab', 'Upload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                        uploadMode === 'url' ? 'neu-tab-active' : 'text-slate-400'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" /> {t('platforms.urlTab', 'Web URL')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('presets')}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                        uploadMode === 'presets' ? 'neu-tab-active' : 'text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1" /> {t('platforms.presetsTab', 'Presets')}
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`neu-sunken p-4 flex items-center gap-4 cursor-pointer transition-all ${
                      isDragging ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />

                    <div className="w-14 h-14 rounded-2xl neu-sunken-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      ) : form.icon && (form.icon.startsWith('/uploads/') || form.icon.startsWith('http') || form.icon.startsWith('data:')) ? (
                        <img src={form.icon} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">{form.icon || '🛵'}</span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {form.icon && (form.icon.startsWith('/uploads/') || form.icon.startsWith('http'))
                          ? t('platforms.dropReplace', 'Click or drag to replace logo image')
                          : t('platforms.dropBrowse', 'Drop platform logo here or browse')}
                      </div>
                      <p className="text-[11px] text-slate-400">{t('platforms.uploadHint', 'Supports PNG, JPG, WEBP, SVG up to 5MB')}</p>
                    </div>
                  </div>
                )}

                {uploadMode === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="flex-1 h-10 px-3 neu-input text-slate-900 dark:text-white outline-none"
                    />
                    {form.icon && (
                      <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center neu-sunken-sm">
                        {form.icon.startsWith('http') || form.icon.startsWith('/uploads/') ? (
                          <img src={form.icon} alt="URL preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">{form.icon}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {uploadMode === 'presets' && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {PRESET_ICONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setForm({ ...form, icon: emoji })}
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm transition-all cursor-pointer ${
                          form.icon === emoji
                            ? 'neu-sunken scale-105 ring-2 ring-emerald-500'
                            : 'neu-card-interactive'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingPlatform(null);
                  }}
                  className="px-5 py-2 neu-btn text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 neu-btn-primary text-white font-extrabold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('platforms.savePlatform', 'Save Platform')}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Platforms */}
          <div className="space-y-2.5">
            {platforms.map((p) => (
              <div
                key={p.id}
                className="p-3.5 neu-card-interactive flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.icon && (p.icon.startsWith('/uploads/') || p.icon.startsWith('http') || p.icon.startsWith('data:')) ? (
                      <img src={p.icon} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">{p.icon || '📦'}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="px-2 py-0.5 rounded-full neu-pill font-mono text-[10px] text-slate-500 dark:text-slate-300 font-bold">
                        {p.code}
                      </span>
                      {p.isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                          {t('platforms.active', 'Active')}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-slate-400">
                          {t('platforms.disabled', 'Disabled')}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('platforms.commissionColon', 'Commission:')} <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{p.commissionRate}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(p)}
                    className="neu-circle-btn w-8 h-8 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title={t('platforms.editTooltip', 'Edit Platform')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="neu-circle-btn w-8 h-8 text-rose-500 hover:text-rose-600 cursor-pointer"
                    title={t('platforms.deleteTooltip', 'Delete Platform')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
          >
            {t('common.done', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default PlatformManagerModal;
