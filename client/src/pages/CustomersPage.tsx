import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import {
  Users,
  Plus,
  Search,
  Star,
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
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { WhatsAppPhoneBadge } from '../components/common/WhatsAppPhoneBadge';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';
import { sanitizeImageUrl } from '../utils/imageUrl';
import { useCurrencyStore } from '../store/useCurrencyStore';

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  memberCode?: string | null;
  points: number;
  creditLimit: number;
  balance: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  avatarUrl?: string | null;
  address?: string | null;
  createdAt: string;
}

interface TierRule {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  name: string;
  minPoints: number;
  discountPercent: number;
  creditLimit: number;
  description: string;
}

const TIER_STYLES: Record<
  string,
  { badge: string; avatarGlow: string; ring: string; tabActive: string; tabInactive: string }
> = {
  PLATINUM: {
    badge: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30',
    avatarGlow: 'from-purple-600 to-indigo-600',
    ring: 'ring-purple-500/40',
    tabActive: 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 border-purple-500',
    tabInactive: 'text-purple-400 hover:bg-purple-500/10 border-transparent',
  },
  GOLD: {
    badge: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30',
    avatarGlow: 'from-amber-500 to-yellow-600',
    ring: 'ring-amber-500/40',
    tabActive: 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 border-amber-400',
    tabInactive: 'text-amber-400 hover:bg-amber-500/10 border-transparent',
  },
  SILVER: {
    badge: 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 text-slate-200 border border-slate-400/30',
    avatarGlow: 'from-slate-400 to-slate-600',
    ring: 'ring-slate-400/40',
    tabActive: 'bg-slate-300 text-slate-900 font-black shadow-lg shadow-slate-400/25 border-slate-200',
    tabInactive: 'text-slate-300 hover:bg-slate-500/10 border-transparent',
  },
  BRONZE: {
    badge: 'bg-gradient-to-r from-orange-800/20 to-amber-900/20 text-orange-400 border border-orange-700/30',
    avatarGlow: 'from-orange-700 to-amber-900',
    ring: 'ring-orange-600/40',
    tabActive: 'bg-orange-700 text-white shadow-lg shadow-orange-700/25 border-orange-600',
    tabInactive: 'text-orange-400 hover:bg-orange-600/10 border-transparent',
  },
};

export const CustomersPage: React.FC = () => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'ALL' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [tierRulesModalOpen, setTierRulesModalOpen] = useState(false);

  // Tier Rules State
  const [tierRules, setTierRules] = useState<TierRule[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcBanner, setRecalcBanner] = useState<string | null>(null);

  // Avatar Upload States
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; title: string; tier?: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Customer Form
  const [form, setForm] = useState({
    name: '',
    memberCode: '',
    phone: '',
    email: '',
    tier: 'BRONZE',
    points: 0,
    creditLimit: 0,
    address: '',
    avatarUrl: '',
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTierRules = async () => {
    try {
      const res = await api.get('/customers/tier-rules');
      if (res.data?.rules) {
        setTierRules(res.data.rules);
      }
    } catch (err) {
      console.error('Failed to load tier rules:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchTierRules();
  }, []);

  // Keyboard shortcut for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxUrl) {
        setLightboxUrl(null);
        setZoomLevel(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxUrl]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedTierFilter, pageSize]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setUploadError('');
    setAvatarMode('upload');
    setForm({
      name: '',
      memberCode: `MBR-${Math.floor(10000 + Math.random() * 90000)}`,
      phone: '',
      email: '',
      tier: 'BRONZE',
      points: 0,
      creditLimit: 0,
      address: '',
      avatarUrl: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setUploadError('');
    setAvatarMode(c.avatarUrl && c.avatarUrl.startsWith('http') ? 'url' : 'upload');
    setForm({
      name: c.name,
      memberCode: c.memberCode || '',
      phone: c.phone || '',
      email: c.email || '',
      tier: c.tier || 'BRONZE',
      points: c.points || 0,
      creditLimit: c.creditLimit || 0,
      address: c.address || '',
      avatarUrl: c.avatarUrl || '',
    });
    setModalOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WEBP, GIF)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Avatar file size must be less than 5MB');
      return;
    }

    try {
      setUploadError('');
      setAvatarUploading(true);
      const data = new FormData();
      data.append('avatar', file);

      const res = await api.post('/customers/upload-avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.avatarUrl) {
        setForm((prev) => ({ ...prev, avatarUrl: res.data.avatarUrl }));
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveAvatar = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setForm((prev) => ({ ...prev, avatarUrl: '' }));
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        avatarUrl: sanitizeImageUrl(form.avatarUrl),
      };
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/customers', payload);
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(`Failed to save member: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/customers/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      fetchCustomers();
    } catch (err: any) {
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSaveTierRules = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRules(true);
      await api.put('/customers/tier-rules', { rules: tierRules });
      alert('Tier rules updated successfully!');
      setTierRulesModalOpen(false);
    } catch (err: any) {
      alert(`Failed to save tier rules: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingRules(false);
    }
  };

  const handleRecalculateTiers = async () => {
    if (!window.confirm('Recalculate and update membership tiers for all customers based on their points?')) {
      return;
    }
    try {
      setRecalculating(true);
      const res = await api.post('/customers/recalculate-tiers');
      setRecalcBanner(res.data.message || 'Recalculation complete.');
      fetchCustomers();
      setTimeout(() => setRecalcBanner(null), 7000);
    } catch (err: any) {
      alert(`Recalculation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setRecalculating(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'MB';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Counts per tier
  const tierCounts = {
    ALL: customers.length,
    PLATINUM: customers.filter((c) => c.tier === 'PLATINUM').length,
    GOLD: customers.filter((c) => c.tier === 'GOLD').length,
    SILVER: customers.filter((c) => c.tier === 'SILVER').length,
    BRONZE: customers.filter((c) => c.tier === 'BRONZE').length,
  };

  // Filtered customers
  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(s) ||
      (c.phone && c.phone.includes(s)) ||
      (c.email && c.email.toLowerCase().includes(s)) ||
      (c.memberCode && c.memberCode.toLowerCase().includes(s));

    const matchesTier = selectedTierFilter === 'ALL' || c.tier === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

  // KPI Stats
  const totalCustomers = customers.length;
  const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
  const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const vipCount = customers.filter((c) => c.tier === 'PLATINUM' || c.tier === 'GOLD').length;

  // Pagination calculation
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedCustomers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('customers.title', 'Customer Loyalty Program (CRM)')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('customers.subtitle', 'Manage membership tiers, reward points, store credit limits, and tier qualification rules')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTierRulesModalOpen(true)}
            className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span>{t('customers.tierRulesConfig', 'Tier Rules & Config')}</span>
          </button>

          <button
            onClick={handleRecalculateTiers}
            disabled={recalculating}
            className="px-3.5 py-2 neu-btn text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Scan and promote all member tiers based on points"
          >
            {recalculating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-500" />
            )}
            <span>{t('customers.recalculateTiers', 'Recalculate Tiers')}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-neu-glow-emerald"
          >
            <Plus className="w-4 h-4" />
            <span>{t('customers.addMember', 'Add Member')}</span>
          </button>
        </div>
      </div>

      {/* Bento KPI Stats Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('customers.totalMembers', 'Total Members')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {totalCustomers}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('customers.registeredCrm', 'Active registered accounts')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('customers.vipMembers', 'VIP Loyalty Members')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
              <Star className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {vipCount}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('customers.goldPlatinumTiers', 'Gold & Platinum tiers')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('customers.totalPointsIssued', 'Total Points Pool')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-purple-500">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
            {totalPoints.toLocaleString()} <span className="text-xs font-bold text-slate-400">pts</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('customers.unredeemedPoints', 'Available for rewards')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('customers.totalCreditLine', 'Store Credit Line')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-indigo-500">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            {format(convert(totalCredit, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('customers.authorizedLimits', 'Authorized customer credit')}
          </div>
        </div>
      </div>

      {/* Recalculate Banner */}
      {recalcBanner && (
        <div className="p-4 rounded-2xl neu-card-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span>{recalcBanner}</span>
          </div>
          <button onClick={() => setRecalcBanner(null)} className="neu-circle-btn w-7 h-7 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Controls Bar: Tier Tabs + Search + View Switcher (Fixed) */}
      <div className="flex-shrink-0 p-3 neu-card-lg space-y-2 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tier Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 neu-tab-container text-xs">
            <button
              onClick={() => setSelectedTierFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                selectedTierFilter === 'ALL'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{t('customers.allMembers', 'All Members')}</span>
              <span className="px-1.5 py-0.2 rounded-md neu-sunken-sm font-mono font-bold text-[10px]">
                {tierCounts.ALL}
              </span>
            </button>

            {(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map((tierKey) => {
              const isSelected = selectedTierFilter === tierKey;

              return (
                <button
                  key={tierKey}
                  onClick={() => setSelectedTierFilter(tierKey)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tierKey}</span>
                  <span className="px-1.5 py-0.2 rounded-md neu-sunken-sm font-mono font-bold text-[10px]">
                    {tierCounts[tierKey]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + View Mode Switcher */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('customers.searchPlaceholder', 'Search name, phone, code...')}
                className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center neu-tab-container p-1">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Compact Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Content (Cards or Table) - Fills remaining viewport space */}
      {loading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-slate-400 text-xs font-semibold neu-card-lg rounded-3xl">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mr-2" />
          <span>Loading customer records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-slate-400 gap-2 neu-card-lg rounded-3xl">
          <Users className="w-9 h-9 opacity-30" />
          <span className="text-xs font-semibold">No customers matching your filter criteria</span>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── Cards Grid View (Scrollable) ── */
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-2 scrollbar-thin">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedCustomers.map((c) => {
              const tierInfo = TIER_STYLES[c.tier] || TIER_STYLES.BRONZE;

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl neu-card-interactive flex flex-col justify-between group relative overflow-hidden space-y-3"
                >
                  <div>
                    {/* Top Bar: Avatar + Name + Tier */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => {
                            if (c.avatarUrl) {
                              setLightboxUrl({ url: sanitizeImageUrl(c.avatarUrl), title: c.name, tier: c.tier });
                            }
                          }}
                          className={`w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative neu-sunken-sm ${
                            tierInfo.ring
                          } ${c.avatarUrl ? 'cursor-zoom-in group/avatar' : ''}`}
                        >
                          {/* Always present fallback initials */}
                          <div
                            className={`w-full h-full bg-gradient-to-br ${tierInfo.avatarGlow} flex items-center justify-center text-white font-black text-xs tracking-wider`}
                          >
                            {getInitials(c.name)}
                          </div>
                          {c.avatarUrl && (
                            <img
                              src={sanitizeImageUrl(c.avatarUrl)}
                              alt={c.name}
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/avatar:scale-110"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{c.name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 font-bold">
                            {c.memberCode || '—'}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider neu-pill`}>
                        {c.tier}
                      </span>
                    </div>

                    {/* Middle: Points + Credit Line */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/50 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{t('customers.rewardPoints', 'Points')}</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {c.points} pts
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">{t('customers.creditLimit', 'Credit Limit')}</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {format(convert(c.creditLimit || 0, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Contact + Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-slate-800/50">
                    <div className="text-[11px]">
                      {c.phone ? (
                        <WhatsAppPhoneBadge
                          phone={c.phone}
                          text={`Hello ${c.name}! Greetings from 39POS.`}
                          size="xs"
                        />
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(c)}
                        className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Compact Table View (Scrollable Table Body) ── */
        <div className="neu-card-lg rounded-3xl overflow-hidden flex-1 min-h-0 flex flex-col space-y-0 text-xs">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 neu-sunken-sm bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none shadow-sm">
                <tr>
                  <th className="p-4">{t('customers.memberPhoto', 'Customer / Avatar')}</th>
                  <th className="p-4">{t('customers.memberCode', 'Member Code')}</th>
                  <th className="p-4">{t('customers.tier', 'Tier')}</th>
                  <th className="p-4">{t('customers.rewardPoints', 'Reward Points')}</th>
                  <th className="p-4">{t('customers.creditLimit', 'Credit Limit')}</th>
                  <th className="p-4">{t('customers.phone', 'Contact')}</th>
                  <th className="p-4 text-right">{t('categories.colActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {paginatedCustomers.map((c) => {
                  const tierInfo = TIER_STYLES[c.tier] || TIER_STYLES.BRONZE;

                  return (
                    <tr key={c.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => {
                              if (c.avatarUrl) {
                                setLightboxUrl({ url: sanitizeImageUrl(c.avatarUrl), title: c.name, tier: c.tier });
                              }
                            }}
                            className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative neu-sunken-sm ${
                              tierInfo.ring
                            } ${c.avatarUrl ? 'cursor-zoom-in' : ''}`}
                          >
                            <div
                              className={`w-full h-full bg-gradient-to-br ${tierInfo.avatarGlow} flex items-center justify-center text-white font-black text-xs`}
                            >
                              {getInitials(c.name)}
                            </div>
                            {c.avatarUrl && (
                              <img
                                src={sanitizeImageUrl(c.avatarUrl)}
                                alt={c.name}
                                referrerPolicy="no-referrer"
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">{c.name}</div>
                            {c.email && <div className="text-[11px] text-slate-400">{c.email}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {c.memberCode || '—'}
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider neu-pill`}>
                          {c.tier}
                        </span>
                      </td>

                      <td className="p-4 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {c.points} pts
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {format(convert(c.creditLimit || 0, baseCode, currentCurrency), currentCurrency)}
                      </td>

                      <td className="p-4 text-[11px]">
                        {c.phone ? (
                          <WhatsAppPhoneBadge
                            phone={c.phone}
                            text={`Hello ${c.name}! Greetings from 39POS.`}
                            size="xs"
                          />
                        ) : (
                          <span className="font-mono text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                            title={t('common.edit', 'Edit')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(c)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                            title={t('common.delete', 'Delete')}
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

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className="p-3.5 neu-sunken-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 font-medium">
            {t('customers.showingMembers', {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, filtered.length),
              total: filtered.length,
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">{t('customers.perPage', 'Per page:')}</span>
              <div className="w-24">
                <CustomSelect
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '9', label: '9' },
                    { value: '18', label: '18' },
                    { value: '36', label: '36' },
                    { value: '100', label: '100' },
                  ]}
                  size="sm"
                  placement="up"
                  dropdownWidth="w-24"
                />
              </div>
            </div>

            {/* Prev / Next Page Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2.5 font-bold text-slate-800 dark:text-white font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tier Rules Configuration Modal ── */}
      {tierRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl neu-card-lg rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span>{t('customers.tierRulesModalTitle', 'Membership Tier Qualification Rules')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('customers.tierRulesModalSubtitle', 'Configure point thresholds, discount percentages, and credit limits for each tier.')}
                </p>
              </div>
              <button
                onClick={() => setTierRulesModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTierRules} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierRules.map((rule, idx) => {
                  const style = TIER_STYLES[rule.tier] || TIER_STYLES.BRONZE;

                  return (
                    <div
                      key={rule.tier}
                      className="p-4 rounded-2xl neu-card-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase neu-pill`}>
                          {rule.tier}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">Tier #{idx + 1}</span>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('customers.tierDisplayName', 'Tier Display Name')}
                          </label>
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) => {
                              const copy = [...tierRules];
                              copy[idx].name = e.target.value;
                              setTierRules(copy);
                            }}
                            className="w-full px-3.5 py-2 neu-input font-medium text-slate-800 dark:text-white outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                              {t('customers.minPoints', 'Min Points (Pts)')}
                            </label>
                            <input
                              type="number"
                              value={rule.minPoints}
                              onChange={(e) => {
                                const copy = [...tierRules];
                                copy[idx].minPoints = parseInt(e.target.value) || 0;
                                setTierRules(copy);
                              }}
                              className="w-full px-3.5 py-2 neu-input font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                              {t('customers.discountRate', 'Discount Rate (%)')}
                            </label>
                            <input
                              type="number"
                              value={rule.discountPercent}
                              onChange={(e) => {
                                const copy = [...tierRules];
                                copy[idx].discountPercent = parseFloat(e.target.value) || 0;
                                setTierRules(copy);
                              }}
                              className="w-full px-3.5 py-2 neu-input font-mono font-bold text-emerald-600 dark:text-emerald-400 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('customers.defaultCreditLimit', { symbol: baseCurrency?.symbol || '$', defaultValue: `Default Credit Limit (${baseCurrency?.symbol || '$'})` })}
                          </label>
                          <input
                            type="number"
                            value={rule.creditLimit}
                            onChange={(e) => {
                              const copy = [...tierRules];
                              copy[idx].creditLimit = parseFloat(e.target.value) || 0;
                              setTierRules(copy);
                            }}
                            className="w-full px-3.5 py-2 neu-input font-mono text-slate-700 dark:text-slate-300 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRecalculateTiers}
                  disabled={recalculating}
                  className="px-4 py-2.5 neu-btn text-amber-500 font-bold flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{t('customers.applyRulesRecalculate', 'Apply Rules & Recalculate Now')}</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTierRulesModalOpen(false)}
                    className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold text-xs cursor-pointer"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={savingRules}
                    className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs cursor-pointer"
                  >
                    {savingRules ? t('common.loading', 'Saving...') : t('customers.saveRules', 'Save Rules')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add / Edit Customer Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg neu-card-lg rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Users className="w-4 h-4" />
                </div>
                <span>{editingCustomer ? t('customers.editMember', 'Edit Member Profile') : t('customers.registerMember', 'Register New Member')}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Circular Avatar Management with Preview & Remove Overlay */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>{t('customers.memberPhoto', 'Member Photo / Avatar')}</span>
                  </label>

                  <div className="flex items-center neu-tab-container p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('upload')}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        avatarMode === 'upload'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('customers.upload', 'Upload')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('url')}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        avatarMode === 'url'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{t('customers.url', 'URL')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Circular Avatar with Hover Preview & Remove Overlay */}
                  <div
                    onClick={() => {
                      if (form.avatarUrl) {
                        setLightboxUrl({
                          url: sanitizeImageUrl(form.avatarUrl),
                          title: form.name || 'Member Photo Preview',
                          tier: form.tier,
                        });
                      }
                    }}
                    className={`w-20 h-20 rounded-full neu-sunken overflow-hidden flex-shrink-0 flex items-center justify-center relative group ${
                      form.avatarUrl ? 'cursor-pointer' : ''
                    }`}
                  >
                    {avatarUploading ? (
                      <div className="flex flex-col items-center justify-center text-emerald-500 gap-1">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-[8px] font-bold">Uploading</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex flex-col items-center justify-center text-slate-400">
                          <Users className="w-6 h-6 mx-auto opacity-50 mb-0.5" />
                          <span className="text-[8px] font-bold block">{form.name ? getInitials(form.name) : 'No Photo'}</span>
                        </div>
                        {form.avatarUrl && (
                          <>
                            <img
                              src={sanitizeImageUrl(form.avatarUrl)}
                              alt="Avatar Preview"
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                            {/* Dual Action Overlay: Preview (Eye) & Remove (Trash) */}
                            <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-2 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxUrl({
                                    url: sanitizeImageUrl(form.avatarUrl),
                                    title: form.name || 'Member Photo Preview',
                                    tier: form.tier,
                                  });
                                }}
                                title="Preview Full Image"
                                className="neu-circle-btn w-7 h-7 text-emerald-400 hover:text-white"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                title="Remove Photo"
                                className="neu-circle-btn w-7 h-7 text-rose-400 hover:text-white"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Dropzone or URL input */}
                  <div className="flex-1">
                    {avatarMode === 'upload' ? (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`h-20 neu-sunken-sm rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all px-3 text-center ${
                            isDragging
                              ? 'border-2 border-emerald-500'
                              : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {avatarUploading ? 'Processing upload...' : 'Click to browse or drop avatar'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            PNG, JPG, WEBP up to 5MB
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="url"
                          value={form.avatarUrl}
                          onChange={(e) => {
                            const clean = sanitizeImageUrl(e.target.value);
                            setForm({ ...form, avatarUrl: clean });
                          }}
                          onPaste={(e) => {
                            const pasteText = e.clipboardData.getData('text');
                            if (pasteText) {
                              e.preventDefault();
                              const clean = sanitizeImageUrl(pasteText);
                              setForm((prev) => ({ ...prev, avatarUrl: clean }));
                            }
                          }}
                          placeholder="Paste image URL or Google Images link..."
                          className="w-full px-3.5 py-2 neu-input font-medium text-slate-800 dark:text-white outline-none text-xs"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Paste direct image link (JPG, PNG, WebP) or Google Images link.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-bold neu-pill px-3 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Full Name & Member Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.fullName', 'Full Name')}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Bounmy Vongphachanh"
                    className="w-full px-3.5 py-2 neu-input font-medium text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.memberCode', 'Member Code')}</label>
                  <input
                    type="text"
                    required
                    value={form.memberCode}
                    onChange={(e) => setForm({ ...form, memberCode: e.target.value.toUpperCase() })}
                    placeholder="e.g. VIP-88001"
                    className="w-full px-3.5 py-2 neu-input font-mono font-bold uppercase text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.phone', 'Phone Number')}</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+856 20 5551 2345"
                    className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.email', 'Email Address')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="member@company.com"
                    className="w-full px-3.5 py-2 neu-input text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Membership Tier */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.membershipTier', 'Membership Tier')}</label>
                <CustomSelect
                  value={form.tier}
                  onChange={(val) => setForm({ ...form, tier: val })}
                  options={[
                    { value: 'BRONZE', label: 'Bronze', subtitle: 'Standard Tier (0% Discount)' },
                    { value: 'SILVER', label: 'Silver', subtitle: 'Silver Member (5% Discount)' },
                    { value: 'GOLD', label: 'Gold', subtitle: 'Gold Member (10% Discount)' },
                    { value: 'PLATINUM', label: 'Platinum', subtitle: 'VIP Platinum (15% Discount)' },
                  ]}
                  placeholder="Select membership tier..."
                />
              </div>

              {/* Reward Points & Store Credit Limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.rewardPoints', 'Reward Points')}</label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.creditLimit', { symbol: baseCurrency?.symbol || '$', defaultValue: `Credit Limit (${baseCurrency?.symbol || '$'})` })}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('customers.address', 'Billing / Delivery Address')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, Country"
                  className="w-full px-3.5 py-2 neu-input text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                >
                  {editingCustomer ? t('customers.editMember', 'Update Member') : t('customers.registerMember', 'Save Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
                        onConfirm={handleDelete}
        title={t('customers.deleteMember', 'Delete Customer')}
        message={t('customers.deleteConfirm', 'Are you sure you want to remove {{name}} ({{code}}) from CRM? This action cannot be reversed.', { name: deleteConfirm?.name || '', code: deleteConfirm?.memberCode || '' })}
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />

      {/* ── Full-Screen Avatar Lightbox ── */}
      {lightboxUrl && (
        <div
          onClick={() => {
            setLightboxUrl(null);
            setZoomLevel(1);
          }}
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full neu-card-lg p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border border-slate-200/80 dark:border-slate-800/80"
          >
            {/* Lightbox Header */}
            <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {lightboxUrl.title}
                  </h4>
                  {lightboxUrl.tier && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono tracking-wider">
                      {lightboxUrl.tier} MEMBER
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center neu-tab-container p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Zoom Out"
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
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-0.5 cursor-pointer"
                    title="Reset to 100%"
                  >
                    100%
                  </button>
                </div>

                <a
                  href={lightboxUrl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxUrl(null);
                    setZoomLevel(1);
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Body (Obsidian Viewport with Avatar) */}
            <div className="w-full h-[50vh] max-h-[460px] rounded-2xl bg-slate-950/60 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-800/80 p-6 flex items-center justify-center overflow-hidden neu-sunken relative select-none">
              <div
                className="relative transition-transform duration-200 ease-out neu-sunken rounded-full overflow-hidden w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center shadow-2xl ring-4 ring-white/10"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <Users className="w-16 h-16 opacity-40 mb-2" />
                  <span className="text-sm font-bold text-slate-300">{lightboxUrl.title}</span>
                </div>
                <img
                  src={sanitizeImageUrl(lightboxUrl.url)}
                  alt={lightboxUrl.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomersPage;
