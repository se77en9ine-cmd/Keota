import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { soundFX } from '../utils/audio';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Award,
  CreditCard,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Sliders,
  Sparkles,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
  DollarSign,
  ShieldCheck,
  Building,
  RefreshCw,
  Receipt,
  Crown,
  Star,
  Boxes,
  Package,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { WhatsAppPhoneBadge } from '../components/common/WhatsAppPhoneBadge';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';

export type SupplierTier = 'STRATEGIC' | 'PREFERRED' | 'STANDARD' | 'ONE_OFF';

export interface Supplier {
  id: string;
  name: string;
  companyName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  tier: SupplierTier;
  creditLimit: number;
  balance: number;
  createdAt: string;
  updatedAt?: string;
}

const TIER_STYLES: Record<
  SupplierTier,
  { label: string; badge: string; avatarGlow: string; ring: string; Icon: React.ComponentType<{ className?: string }>; desc: string }
> = {
  STRATEGIC: {
    label: 'Strategic Key Partner',
    badge: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    avatarGlow: 'from-purple-600 to-indigo-600',
    ring: 'ring-purple-500/40',
    Icon: Crown,
    desc: 'Top priority vendor with flexible terms and high SLA credit',
  },
  PREFERRED: {
    label: 'Preferred Tier 1',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    avatarGlow: 'from-amber-500 to-yellow-600',
    ring: 'ring-amber-500/40',
    Icon: Star,
    desc: 'Regular high-volume procurement vendor',
  },
  STANDARD: {
    label: 'Standard Approved',
    badge: 'bg-slate-400/15 text-slate-300 border border-slate-400/30',
    avatarGlow: 'from-slate-400 to-slate-600',
    ring: 'ring-slate-400/40',
    Icon: ShieldCheck,
    desc: 'Approved vendor with standard commercial terms',
  },
  ONE_OFF: {
    label: 'Spot / One-Off',
    badge: 'bg-orange-800/15 text-orange-400 border border-orange-700/30',
    avatarGlow: 'from-orange-700 to-amber-900',
    ring: 'ring-orange-600/40',
    Icon: Boxes,
    desc: 'Ad-hoc or emergency supplier',
  },
};

export const SuppliersPage: React.FC = () => {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | SupplierTier | 'PAYABLE' | 'CLEAR'>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);

  // Lightbox Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Upload State
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState<{
    name: string;
    companyName: string;
    taxId: string;
    email: string;
    phone: string;
    address: string;
    logoUrl: string;
    tier: SupplierTier;
    creditLimit: number;
    balance: number;
  }>({
    name: '',
    companyName: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    logoUrl: '',
    tier: 'STANDARD',
    creditLimit: 0,
    balance: 0,
  });

  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      setSuppliers(res.data.suppliers || []);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTierFilter, pageSize]);

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setModalError(null);
    setIsSaving(false);
    setForm({
      name: '',
      companyName: '',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      logoUrl: '',
      tier: 'STANDARD',
      creditLimit: 0,
      balance: 0,
    });
    setUploadMode('file');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      companyName: s.companyName || '',
      taxId: s.taxId || '',
      email: s.email || '',
      phone: s.phone || '',
      address: s.address || '',
      logoUrl: s.logoUrl || '',
      tier: s.tier || 'STANDARD',
      creditLimit: s.creditLimit || 0,
      balance: s.balance || 0,
    });
    setUploadMode(s.logoUrl?.startsWith('http') ? 'url' : 'file');
    setModalOpen(true);
  };

  // Handle Logo Upload File
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, WEBP, GIF, SVG)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5MB limit', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const res = await api.post('/suppliers/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setForm((prev) => ({ ...prev, logoUrl: res.data.logoUrl }));
        soundFX.playBeep();
        showToast('Logo uploaded successfully', 'success');
      }
    } catch (err: any) {
      soundFX.playError();
      showToast(`Logo upload failed: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & drop handlers
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Save Supplier (Create or Update)
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      setModalError(null);
      soundFX.playCashSuccess();
      const payload = {
        ...form,
        logoUrl: sanitizeImageUrl(form.logoUrl),
      };
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        showToast(`Supplier "${form.name}" updated successfully`, 'success');
      } else {
        await api.post('/suppliers', payload);
        showToast(`Supplier "${form.name}" created successfully`, 'success');
      }
      setModalOpen(false);
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      soundFX.playError();
      const msg = err.response?.data?.message || err.message || 'Failed to save supplier';
      setModalError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Supplier
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      soundFX.playBeep();
      await api.delete(`/suppliers/${deleteConfirm.id}`);
      showToast(`Supplier "${deleteConfirm.name}" deleted successfully`, 'success');
      setDeleteConfirm(null);
      fetchSuppliers();
    } catch (err: any) {
      soundFX.playError();
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  // Lightbox handlers
  const handleOpenLightbox = (url: string, title: string) => {
    setPreviewImage({ url, title });
    setZoomLevel(1);
    setRotation(0);
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
      (s.taxId && s.taxId.toLowerCase().includes(search.toLowerCase())) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedTierFilter === 'ALL') return true;
    if (selectedTierFilter === 'PAYABLE') return (s.balance || 0) > 0;
    if (selectedTierFilter === 'CLEAR') return (s.balance || 0) === 0;
    return s.tier === selectedTierFilter;
  });

  // KPI Calculations
  const totalSuppliers = suppliers.length;
  const totalPayable = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  const totalCreditLimit = suppliers.reduce((sum, s) => sum + (s.creditLimit || 0), 0);
  const strategicCount = suppliers.filter((s) => s.tier === 'STRATEGIC').length;
  const payableCount = suppliers.filter((s) => (s.balance || 0) > 0).length;

  // Pagination Slice
  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1;
  const paginatedSuppliers = filteredSuppliers.slice(
(currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Inline Toast Banner */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] px-4 py-3 rounded-2xl neu-card-lg shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
            toast.type === 'error'
              ? 'text-rose-500 border border-rose-500/30'
              : 'text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('suppliers.title', 'Supplier Master Directory & CRM')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('suppliers.subtitle', 'Vendor accounts, procurement contracts, credit limits, photo logos & payment terms')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-neu-glow-emerald"
          >
            <Plus className="w-4 h-4" />
            <span>{t('suppliers.addSupplier', 'Add Supplier')}</span>
          </button>

          <button
            onClick={fetchSuppliers}
            className="w-9 h-9 neu-circle-btn text-slate-500 hover:text-emerald-500 cursor-pointer"
            title={t('suppliers.refreshDirectory', 'Refresh Directory')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bento KPI Stats Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('suppliers.totalSuppliers', 'Total Suppliers')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {totalSuppliers}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('suppliers.strategicPartners', { count: strategicCount })}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('suppliers.accountsPayable', 'Accounts Payable')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-rose-500">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
            {format(convert(totalPayable, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('suppliers.pendingBalances', { count: payableCount })}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('suppliers.creditLimitPool', 'Total Credit Limits')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-indigo-500">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            {format(convert(totalCreditLimit, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('suppliers.approvedTerms', 'Approved trade credit')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('suppliers.strategicKey', 'Strategic Key Vendors')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
              <Crown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {strategicCount}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('suppliers.primaryPartners', 'Priority replenishment tier')}
          </div>
        </div>
      </div>

      {/* SEARCH + FILTER TABS + VIEW TOGGLE (Fixed) */}
      <div className="flex-shrink-0 p-3 neu-card-lg rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Filter Buttons */}
        <div className="p-1 neu-tab-container flex items-center gap-1 overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: t('suppliers.allVendors', 'All Vendors'), Icon: Building2, color: 'text-emerald-500' },
            { id: 'STRATEGIC', label: t('suppliers.strategicKey', 'Strategic (Key)'), Icon: Crown, color: 'text-purple-400' },
            { id: 'PREFERRED', label: t('suppliers.preferredTier1', 'Preferred (Tier 1)'), Icon: Star, color: 'text-amber-400' },
            { id: 'STANDARD', label: t('suppliers.standardApproved', 'Standard Approved'), Icon: ShieldCheck, color: 'text-slate-400' },
            { id: 'ONE_OFF', label: t('suppliers.spotOneOff', 'Spot / One-Off'), Icon: Boxes, color: 'text-orange-400' },
            { id: 'PAYABLE', label: t('suppliers.hasBalanceDue', 'Has Balance Due'), Icon: AlertCircle, color: 'text-rose-400' },
            { id: 'CLEAR', label: t('suppliers.clearZeroDue', 'Clear / Zero Due'), Icon: CheckCircle2, color: 'text-emerald-400' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedTierFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedTierFilter === f.id
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <f.Icon className={`w-3.5 h-3.5 ${selectedTierFilter === f.id ? 'text-inherit' : f.color}`} />
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Search & View Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('suppliers.searchPlaceholder', 'Search...')}
              className="w-full pl-8 pr-3 py-2 neu-input text-xs font-medium outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="p-1 neu-tab-container flex items-center gap-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title={t('suppliers.cardsGridView', 'Cards Grid View')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title={t('suppliers.tableListView', 'Table List View')}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CARDS GRID VIEW (Scrollable) */}
      {viewMode === 'cards' && (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedSuppliers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 space-y-2 neu-card-lg rounded-3xl">
              <Building2 className="w-12 h-12 stroke-[1.2] opacity-30 mx-auto" />
              <div className="font-extrabold text-sm text-slate-600 dark:text-slate-400">
                {t('suppliers.noSuppliers', 'No suppliers found')}
              </div>
              <p className="text-xs text-slate-400">
                {t('suppliers.noSuppliersSub', 'Try adjusting your filters or register a new vendor account')}
              </p>
            </div>
          ) : (
            paginatedSuppliers.map((s) => {
              const tierConfig = TIER_STYLES[s.tier || 'STANDARD'] || TIER_STYLES.STANDARD;
              return (
                <div
                  key={s.id}
                  className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-4 group relative overflow-hidden"
                >
                  <div>
                    {/* Top Row: Avatar/Logo + Name + Actions */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar with Click-to-Preview Lightbox */}
                        <div
                          onClick={() =>
                            s.logoUrl && handleOpenLightbox(s.logoUrl, `${s.name} (${s.companyName || 'Supplier'})`)
                          }
                          className={`w-12 h-12 rounded-2xl relative overflow-hidden flex-shrink-0 flex items-center justify-center font-black text-sm uppercase cursor-pointer ${
                            s.logoUrl
                              ? 'neu-sunken-sm hover:ring-2 hover:ring-emerald-500 transition-all'
                              : `bg-gradient-to-br ${tierConfig.avatarGlow} text-white shadow-sm`
                          }`}
                          title={s.logoUrl ? 'Click to inspect logo in Lightbox' : s.name}
                        >
                          {s.logoUrl ? (
                            <>
                              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-950/30 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                <Eye className="w-4 h-4" />
                              </div>
                            </>
                          ) : (
                            <span>{s.name.slice(0, 2)}</span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                              {s.name}
                            </h3>
                          </div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 truncate max-w-[160px]">
                            {s.companyName || 'Private Vendor'}
                          </div>
                        </div>
                      </div>

                      {/* Top Right: Tier Badge & Action Menu */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 neu-pill`}>
                          <tierConfig.Icon className="w-3 h-3" />
                          <span>{s.tier || 'STANDARD'}</span>
                        </span>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                            title={t('common.edit', 'Edit Supplier')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(s)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                            title={t('common.delete', 'Delete Supplier')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Tax Info */}
                    <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {s.phone && (
                        <div className="pt-0.5">
                          <WhatsAppPhoneBadge
                            phone={s.phone}
                            text={`Hello ${s.name}! Purchasing and inventory inquiry from 39POS.`}
                            size="xs"
                          />
                        </div>
                      )}
                      {s.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{s.email}</span>
                        </div>
                      )}
                      {s.taxId && (
                        <div className="flex items-center gap-2 font-mono">
                          <Receipt className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>Tax ID: {s.taxId}</span>
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Footer */}
                  <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/60 neu-sunken-sm p-3 rounded-2xl flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">
                        {t('suppliers.balancePayable', 'Balance Payable')}
                      </span>
                      <span className={`font-black text-sm ${s.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {format(convert(s.balance || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-sans font-bold uppercase">
                        {t('suppliers.creditLimit', 'Credit Limit')}
                      </span>
                      <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">
                        {format(convert(s.creditLimit || 0, baseCode, currentCurrency), currentCurrency)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* TABLE LIST VIEW (Scrollable Body) */}
      {viewMode === 'table' && (
        <div className="neu-card-lg rounded-3xl overflow-hidden flex-1 min-h-0 flex flex-col space-y-0 text-xs">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin relative">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 neu-sunken-sm bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none shadow-sm">
                <tr>
                  <th className="p-4">{t('suppliers.vendorContactName', 'Supplier Name & Company')}</th>
                  <th className="p-4">{t('customers.tier', 'Tier')}</th>
                  <th className="p-4">{t('customers.phone', 'Contact')}</th>
                  <th className="p-4">{t('suppliers.taxId', 'Tax / Reg ID')}</th>
                  <th className="p-4">{t('suppliers.creditLimit', 'Credit Limit')}</th>
                  <th className="p-4">{t('suppliers.balancePayable', 'Payable Balance')}</th>
                  <th className="p-4 text-right">{t('categories.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium">
                {paginatedSuppliers.map((s) => {
                  const tierConfig = TIER_STYLES[s.tier || 'STANDARD'] || TIER_STYLES.STANDARD;
                  return (
                    <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => s.logoUrl && handleOpenLightbox(s.logoUrl, s.name)}
                            className="w-9 h-9 rounded-xl overflow-hidden neu-sunken-sm flex items-center justify-center font-bold text-[11px] cursor-pointer"
                          >
                            {s.logoUrl ? (
                              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{s.name.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">{s.name}</div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{s.companyName || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 neu-pill`}>
                          <tierConfig.Icon className="w-3 h-3" />
                          <span>{s.tier || 'STANDARD'}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        {s.phone ? (
                          <WhatsAppPhoneBadge
                            phone={s.phone}
                            text={`Hello ${s.name}! Purchasing and inventory inquiry from 39POS.`}
                            size="xs"
                          />
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5">{s.email || '—'}</div>
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {s.taxId || '—'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {format(convert(s.creditLimit || 0, baseCode, currentCurrency), currentCurrency)}
                      </td>
                      <td className="p-4 font-mono font-black">
                        <span className={s.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
                          {format(convert(s.balance || 0, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(s)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3.5 neu-sunken-sm rounded-2xl text-xs">
          <span className="text-slate-500 font-medium">
            {t('suppliers.showingSuppliers', {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, filteredSuppliers.length),
              total: filteredSuppliers.length,
            })}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-xl neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 text-xs my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingSupplier
                    ? `${t('suppliers.editSupplier', 'Edit Supplier')}: ${editingSupplier.name}`
                    : t('suppliers.registerNewSupplier', 'Register New Supplier')}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              {/* Logo Upload / URL Dropzone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {t('suppliers.supplierLogo', 'Supplier Logo / Brand Avatar')}
                  </label>
                  <div className="p-1 neu-tab-container flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${uploadMode === 'file' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                    >
                      <Upload className="w-3 h-3 inline mr-1" /> {t('suppliers.upload', 'Upload')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${uploadMode === 'url' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                    >
                      <LinkIcon className="w-3 h-3 inline mr-1" /> {t('suppliers.webUrl', 'Web URL')}
                    </button>
                  </div>
                </div>

                {uploadMode === 'file' ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all neu-sunken-sm ${
                      isDragging ? 'border-2 border-emerald-500' : ''
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    />

                    <div className="w-14 h-14 rounded-2xl neu-card-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      ) : form.logoUrl ? (
                        <img src={form.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {form.logoUrl
                          ? t('suppliers.replaceLogo', 'Click to replace logo')
                          : t('suppliers.dropLogo', 'Drop vendor logo here or browse')}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {t('suppliers.logoHelp', 'Supports PNG, JPG, WEBP, SVG up to 5MB')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Paste image link or Google Images link..."
                      value={form.logoUrl}
                      onChange={(e) => {
                        const clean = sanitizeImageUrl(e.target.value);
                        setForm({ ...form, logoUrl: clean });
                      }}
                      onPaste={(e) => {
                        const pasteText = e.clipboardData.getData('text');
                        if (pasteText) {
                          e.preventDefault();
                          const clean = sanitizeImageUrl(pasteText);
                          setForm((prev) => ({ ...prev, logoUrl: clean }));
                        }
                      }}
                      className="flex-1 px-3.5 py-2 neu-input text-slate-900 dark:text-white text-xs font-medium"
                    />
                    {form.logoUrl && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden neu-sunken-sm flex-shrink-0 flex items-center justify-center">
                        <img
                          src={sanitizeImageUrl(form.logoUrl)}
                          alt="URL preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vendor Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.vendorContactName', 'Vendor Contact Name *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Somchai Prasert"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.companyRegisteredName', 'Company Registered Name')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mega Logistics Asia Ltd."
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Tier & Tax ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.vendorClassificationTier', 'Vendor Classification Tier')}
                  </label>
                  <CustomSelect
                    value={form.tier}
                    onChange={(val) => setForm({ ...form, tier: val as SupplierTier })}
                    options={[
                      { value: 'STRATEGIC', label: 'Strategic Key Partner (Top SLA)' },
                      { value: 'PREFERRED', label: 'Preferred Tier 1 Partner' },
                      { value: 'STANDARD', label: 'Standard Approved Vendor' },
                      { value: 'ONE_OFF', label: 'Spot / One-Off Supplier' },
                    ]}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.taxId', 'Tax ID / Business Registration')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TAX-LA-882194"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.phone', 'Phone Number')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +856 20 555 9999"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.email', 'Email Address')}
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. orders@supplier.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Physical Address */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('suppliers.warehouseAddress', 'Warehouse / Physical Address')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vientiane Logistics Park, Thanaleng Dry Port"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white"
                />
              </div>

              {/* Credit Limit & Balance */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.approvedCreditLimit', 'Approved Credit Limit ($)')}
                  </label>
                  <input
                    type="number"
                    step="50"
                    min="0"
                    value={form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('suppliers.currentPayableBalance', 'Current Payable Balance ($)')}
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={form.balance}
                    onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 neu-input text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                >
                  {editingSupplier ? t('suppliers.updateSupplier', 'Update Supplier') : t('suppliers.registerSupplier', 'Register Supplier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL (Emerald Fintech Pro Design) */}
      {previewImage && (
        <div
          onClick={() => {
            setPreviewImage(null);
            setZoomLevel(1);
            setRotation(0);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full neu-card-lg p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border border-slate-200/80 dark:border-slate-800/80"
          >
            {/* Top Header & Toolbar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {previewImage.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono font-medium">
                    {t('suppliers.previewImage', 'Full Resolution Preview & Inspection')}
                  </p>
                </div>
              </div>

              {/* Glassmorphic Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center neu-tab-container p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-2 text-slate-700 dark:text-slate-300 min-w-[3.2rem] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-0.5 cursor-pointer"
                    title="Rotate 90°"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-0.5 cursor-pointer"
                    title="Reset to 100%"
                  >
                    100%
                  </button>
                </div>

                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Open Full Image in New Tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(null);
                    setZoomLevel(1);
                    setRotation(0);
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Obsidian Viewport Canvas */}
            <div className="w-full h-[60vh] max-h-[600px] rounded-2xl bg-slate-950/60 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-800/80 p-4 flex items-center justify-center overflow-hidden neu-sunken relative select-none">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={t('suppliers.deleteSupplier', 'Delete Supplier Account?')}
        message={t('suppliers.deleteConfirm', 'Are you sure you want to remove {{name}}? This action cannot be reversed.', { name: `${deleteConfirm?.name || ''} (${deleteConfirm?.companyName || 'Supplier'})` })}
        confirmLabel={t('suppliers.yesDelete', 'Yes, Delete')}
        variant="danger"
      />
    </div>
  );
};
