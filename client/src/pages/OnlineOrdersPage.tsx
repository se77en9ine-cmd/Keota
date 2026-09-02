import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { usePlatformStore, OnlinePlatformItem } from '../store/usePlatformStore';
import { soundFX } from '../utils/audio';
import {
  Globe,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Award,
  CreditCard,
  Upload,
  AlertCircle,
  LayoutGrid,
  List,
  CheckCircle2,
  Zap,
  ShoppingBag,
  RefreshCw,
  Percent,
  DollarSign,
  TrendingUp,
  Store,
  Layers,
  Users,
  User,
  HeartHandshake,
  Sparkles,
  ShieldAlert,
  Ban,
  Truck,
  Coins,
  ExternalLink,
  ZoomIn,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Palette,
  Package,
  Navigation,
  Plane,
  Home,
  Building2,
  ShieldCheck,
  Clock,
  Box,
  UtensilsCrossed,
  Smartphone,
  Coffee,
  Tag,
  MessageSquare,
  Flame,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Loader2,
  X,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { WhatsAppPhoneBadge } from '../components/common/WhatsAppPhoneBadge';
import { LiveOrdersPipeline } from '../components/pos/LiveOrdersPipeline';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';
import { useCourierStore, CourierItem, DeliveryFeePayer } from '../store/useCourierStore';
import { useLiveOrdersStore } from '../store/useLiveOrdersStore';
import { sanitizeImageUrl } from '../utils/imageUrl';

export type PlatformSortField = 'NAME' | 'CODE' | 'COMMISSION' | 'ORDERS' | 'STATUS';
export type CourierSortField = 'NAME' | 'CODE' | 'PHONE' | 'FEE' | 'PAYER' | 'STATUS';
export type CustomerSortField = 'NAME' | 'GENDER' | 'PHONE' | 'ORDERS' | 'VALUES' | 'CURRENCY' | 'TIER';

export const PLATFORM_EMOJI_PRESETS = [
  { emoji: '🛵', label: 'Scooter / Rider' },
  { emoji: '🥡', label: 'Takeout Food' },
  { emoji: '🛍️', label: 'Shopping Bags' },
  { emoji: '🛒', label: 'Cart / Retail' },
  { emoji: '🍔', label: 'Fast Food' },
  { emoji: '📦', label: 'Express Parcel' },
  { emoji: '🚴', label: 'Bicycle Express' },
  { emoji: '🚚', label: 'Logistics Van' },
  { emoji: '⚡', label: 'Instant Dispatch' },
  { emoji: '🍜', label: 'Noodles / Dine' },
  { emoji: '🥤', label: 'Beverage / Cafe' },
  { emoji: '🍰', label: 'Bakery & Sweets' },
];

export const VECTOR_COURIER_PRESETS: Array<{ id: string; Icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = [
  { id: 'truck', Icon: Truck, label: 'Express Truck', color: 'text-purple-500 bg-purple-500/15 border-purple-500/30' },
  { id: 'zap', Icon: Zap, label: 'Flash Fast', color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
  { id: 'package', Icon: Package, label: 'Parcel Box', color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
  { id: 'navigation', Icon: Navigation, label: 'Rider Courier', color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'plane', Icon: Plane, label: 'Air Freight', color: 'text-sky-500 bg-sky-500/15 border-sky-500/30' },
  { id: 'globe', Icon: Globe, label: 'Global Express', color: 'text-indigo-500 bg-indigo-500/15 border-indigo-500/30' },
  { id: 'home', Icon: Home, label: 'Door Delivery', color: 'text-rose-500 bg-rose-500/15 border-rose-500/30' },
  { id: 'building', Icon: Building2, label: 'Logistics Hub', color: 'text-teal-500 bg-teal-500/15 border-teal-500/30' },
  { id: 'shield', Icon: ShieldCheck, label: 'Insured Delivery', color: 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30' },
  { id: 'clock', Icon: Clock, label: '24H Express', color: 'text-orange-500 bg-orange-500/15 border-orange-500/30' },
];

export const EMOJI_TO_LUCIDE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  '🚚': Truck,
  '🚛': Truck,
  '🛵': Navigation,
  '🏃': Navigation,
  '⚡': Zap,
  '📦': Package,
  '✈️': Plane,
  '🌐': Globe,
  '🏠': Home,
  '📮': Building2,
  'truck': Truck,
  'zap': Zap,
  'package': Package,
  'navigation': Navigation,
  'plane': Plane,
  'globe': Globe,
  'home': Home,
  'building': Building2,
  'shield': ShieldCheck,
  'clock': Clock,
};

const COLOR_THEMES: Record<string, { badge: string; border: string; bg: string; text: string }> = {
  emerald: { badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  pink: { badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30', border: 'border-pink-500/30', bg: 'bg-pink-500/10', text: 'text-pink-500' },
  orange: { badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30', border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-500' },
  purple: { badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30', border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  cyan: { badge: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
  teal: { badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30', border: 'border-teal-500/30', bg: 'bg-teal-500/10', text: 'text-teal-400' },
  indigo: { badge: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  slate: { badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30', border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';

export interface CustomerItem {
  id: string;
  name: string;
  surname?: string | null;
  gender: CustomerGender;
  phone?: string | null;
  email?: string | null;
  memberCode?: string | null;
  points: number;
  creditLimit: number;
  balance: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  avatarUrl?: string | null;
  address?: string | null;
  currency: string;
  manualOrdersCount?: number;
  manualTotalSpent?: number;
  actualOrdersCount?: number;
  actualTotalSpent?: number;
  totalOrders: number;
  totalSpent: number;
  isBlacklisted?: boolean;
  codRejectionCount?: number;
  blacklistReason?: string | null;
  createdAt: string;
  updatedAt?: string;
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

const GENDER_CONFIG: Record<
  CustomerGender,
  { label: string; Icon: React.ComponentType<{ className?: string }>; badge: string; color: string }
> = {
  MALE: {
    label: 'Male',
    Icon: User,
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    color: 'text-sky-400',
  },
  FEMALE: {
    label: 'Female',
    Icon: HeartHandshake,
    badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30',
    color: 'text-pink-400',
  },
  OTHER: {
    label: 'Other',
    Icon: Sparkles,
    badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    color: 'text-purple-400',
  },
  UNSPECIFIED: {
    label: 'Unspecified',
    Icon: Users,
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    color: 'text-slate-400',
  },
};

const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'THB', symbol: '฿', label: 'THB (฿) - Thai Baht' },
  { code: 'LAK', symbol: '₭', label: 'LAK (₭) - Lao Kip' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'CNY', symbol: '¥', label: 'CNY (¥) - Chinese Yuan' },
  { code: 'SGD', symbol: '$', label: 'SGD ($) - Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', label: 'MYR (RM) - Malaysian Ringgit' },
];

export const OnlineOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const { platforms, isLoading, fetchPlatforms, createPlatform, updatePlatform, deletePlatform } = usePlatformStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const activeCodCount = useLiveOrdersStore((s) => s.activeCodCount);
  const resetNewBadge = useLiveOrdersStore((s) => s.resetNewBadge);

  const [mainTab, setMainTab] = useState<'DIRECTORY' | 'DISPATCH' | 'COURIERS' | 'CUSTOMERS'>('DIRECTORY');
  const [sales, setSales] = useState<any[]>([]);

  // Courier Store & State
  const {
    couriers,
    isLoading: loadingCouriers,
    fetchCouriers,
    createCourier,
    updateCourier,
    deleteCourier,
    toggleCourierStatus,
  } = useCourierStore();

  const [courierSearch, setCourierSearch] = useState('');
  const [courierStatusFilter, setCourierStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'CUSTOMER_PAYS' | 'SELLER_PAYS'>('ALL');
  const [courierViewMode, setCourierViewMode] = useState<'cards' | 'table'>('cards');
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<CourierItem | null>(null);
  const [deleteCourierConfirm, setDeleteCourierConfirm] = useState<CourierItem | null>(null);

  const [courierForm, setCourierForm] = useState<{
    name: string;
    code: string;
    icon: string;
    color: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'teal' | 'orange' | 'slate';
    phone: string;
    trackingUrlTemplate: string;
    defaultFee: number;
    defaultFeePayer: DeliveryFeePayer;
    isActive: boolean;
    notes: string;
  }>({
    name: '',
    code: '',
    icon: '🚚',
    color: 'purple',
    phone: '',
    trackingUrlTemplate: '',
    defaultFee: 20000,
    defaultFeePayer: 'CUSTOMER_PAYS',
    isActive: true,
    notes: '',
  });

  // Courier Upload & Pagination State
  const [courierUploadMode, setCourierUploadMode] = useState<'presets' | 'file' | 'url'>('presets');
  const [courierIsUploading, setCourierIsUploading] = useState<boolean>(false);
  const [courierIsDragging, setCourierIsDragging] = useState<boolean>(false);
  const courierFileInputRef = useRef<HTMLInputElement>(null);

  const [courierSortField, setCourierSortField] = useState<CourierSortField>('NAME');
  const [courierSortOrder, setCourierSortOrder] = useState<'asc' | 'desc'>('asc');
  const [courierCurrentPage, setCourierCurrentPage] = useState<number>(1);
  const [courierPageSize, setCourierPageSize] = useState<number>(12);

  const handleToggleCourierSort = (field: CourierSortField) => {
    if (courierSortField === field) {
      setCourierSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCourierSortField(field);
      setCourierSortOrder(field === 'FEE' ? 'desc' : 'asc');
    }
    setCourierCurrentPage(1);
  };

  // Platform Filter, Sort & View
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [platformSortField, setPlatformSortField] = useState<PlatformSortField>('NAME');
  const [platformSortOrder, setPlatformSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const handleTogglePlatformSort = (field: PlatformSortField) => {
    if (platformSortField === field) {
      setPlatformSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setPlatformSortField(field);
      setPlatformSortOrder(field === 'COMMISSION' || field === 'ORDERS' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Platform Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<OnlinePlatformItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<OnlinePlatformItem | null>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<{ icon: string; title: string; code: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Upload States for Platform Logo
  const [uploadMode, setUploadMode] = useState<'presets' | 'file' | 'url'>('presets');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Platform Form State
  const [form, setForm] = useState({
    name: '',
    code: '',
    icon: '🛵',
    color: 'emerald',
    commissionRate: 0,
    isActive: true,
  });

  // CUSTOMER STATE & CRUD
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerGenderFilter, setCustomerGenderFilter] = useState<string>('ALL');
  const [customerTierFilter, setCustomerTierFilter] = useState<string>('ALL');
  const [customerBlacklistFilter, setCustomerBlacklistFilter] = useState<boolean | null>(null);
  const [customerViewMode, setCustomerViewMode] = useState<'cards' | 'table'>('cards');
  const [customerSortField, setCustomerSortField] = useState<CustomerSortField>('NAME');
  const [customerSortOrder, setCustomerSortOrder] = useState<'asc' | 'desc'>('asc');
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(12);

  const handleToggleCustomerSort = (field: CustomerSortField) => {
    if (customerSortField === field) {
      setCustomerSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setCustomerSortField(field);
      setCustomerSortOrder(field === 'ORDERS' || field === 'VALUES' ? 'desc' : 'asc');
    }
    setCustomerCurrentPage(1);
  };

  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [deleteCustomerConfirm, setDeleteCustomerConfirm] = useState<CustomerItem | null>(null);
  const [customerAvatarMode, setCustomerAvatarMode] = useState<'file' | 'url'>('file');
  const [customerAvatarUploading, setCustomerAvatarUploading] = useState<boolean>(false);
  const [customerIsDragging, setCustomerIsDragging] = useState<boolean>(false);
  const customerFileInputRef = useRef<HTMLInputElement>(null);

  const [customerForm, setCustomerForm] = useState<{
    name: string;
    surname: string;
    gender: CustomerGender;
    phone: string;
    email: string;
    address: string;
    currency: string;
    totalOrders: number;
    totalSpent: number;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    points: number;
    creditLimit: number;
    avatarUrl: string;
    isBlacklisted?: boolean;
    blacklistReason?: string;
  }>({
    name: '',
    surname: '',
    gender: 'UNSPECIFIED',
    phone: '',
    email: '',
    address: '',
    currency: 'USD',
    totalOrders: 0,
    totalSpent: 0,
    tier: 'BRONZE',
    points: 0,
    creditLimit: 500,
    avatarUrl: '',
    isBlacklisted: false,
    blacklistReason: '',
  });

  useEffect(() => {
    fetchPlatforms();
    fetchSalesHistory();
    fetchCustomers();
  }, [fetchPlatforms]);

  const fetchSalesHistory = async () => {
    try {
      const res = await api.get('/pos/recent?limit=200');
      setSales(res.data.sales || []);
    } catch {}
  };

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const res = await api.get('/customers');
      setCustomers(res.data.customers || []);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilter, pageSize]);

  useEffect(() => {
    setCustomerCurrentPage(1);
  }, [customerSearch, customerGenderFilter, customerTierFilter]);

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

  const handleCustomerAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit');
      return;
    }
    try {
      setCustomerAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/customers/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success && res.data.avatarUrl) {
        setCustomerForm((prev) => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        soundFX.playCashSuccess();
      }
    } catch (err: any) {
      soundFX.playError();
      alert(`Avatar upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setCustomerAvatarUploading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingPlatform(null);
    setForm({ name: '', code: '', icon: '🛵', color: 'emerald', commissionRate: 0, isActive: true });
    setUploadMode('presets');
    setModalOpen(true);
  };

  const handleOpenEdit = (p: OnlinePlatformItem) => {
    setEditingPlatform(p);
    setForm({ name: p.name, code: p.code, icon: p.icon, color: p.color || 'emerald', commissionRate: p.commissionRate || 0, isActive: p.isActive });
    if (p.icon && (p.icon.startsWith('http://') || p.icon.startsWith('https://') || p.icon.startsWith('data:'))) {
      setUploadMode('url');
    } else if (p.icon && p.icon.startsWith('/uploads/')) {
      setUploadMode('file');
    } else {
      setUploadMode('presets');
    }
    setModalOpen(true);
  };

  const handleSavePlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      soundFX.playCashSuccess();
      if (editingPlatform) await updatePlatform(editingPlatform.id, form);
      else await createPlatform(form);
      setModalOpen(false);
    } catch (err: any) {
      soundFX.playError();
      alert(`Save failed: ${err.message}`);
    }
  };

  const handleToggleStatus = async (p: OnlinePlatformItem) => {
    try {
      soundFX.playBeep();
      await updatePlatform(p.id, { isActive: !p.isActive });
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      soundFX.playBeep();
      await deletePlatform(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err: any) {
      soundFX.playError();
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleBlacklist = async (cust: CustomerItem) => {
    try {
      soundFX.playBeep();
      await api.post(`/customers/${cust.id}/toggle-blacklist`, {
        reason: cust.isBlacklisted ? null : 'Manually blacklisted by manager',
      });
      await fetchCustomers();
    } catch (err: any) {
      alert(`Blacklist toggle failed: ${err.message}`);
    }
  };

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      surname: '',
      gender: 'UNSPECIFIED',
      phone: '',
      email: '',
      address: '',
      currency: currentCurrency || 'USD',
      totalOrders: 0,
      totalSpent: 0,
      tier: 'BRONZE',
      points: 0,
      creditLimit: 500,
      avatarUrl: '',
    });
    setCustomerAvatarMode('file');
    setCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (c: CustomerItem) => {
    setEditingCustomer(c);
    setCustomerForm({
      name: c.name || '',
      surname: c.surname || '',
      gender: c.gender || 'UNSPECIFIED',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      currency: c.currency || 'USD',
      totalOrders: c.totalOrders || 0,
      totalSpent: c.totalSpent || 0,
      tier: c.tier || 'BRONZE',
      points: c.points || 0,
      creditLimit: c.creditLimit || 0,
      avatarUrl: c.avatarUrl || '',
    });
    if (c.avatarUrl && (c.avatarUrl.startsWith('http://') || c.avatarUrl.startsWith('https://') || c.avatarUrl.startsWith('data:'))) {
      setCustomerAvatarMode('url');
    } else {
      setCustomerAvatarMode('file');
    }
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      soundFX.playCashSuccess();
      const payload = {
        name: customerForm.name.trim(),
        surname: customerForm.surname.trim() || null,
        gender: customerForm.gender,
        phone: customerForm.phone.trim() || null,
        email: customerForm.email.trim() || null,
        address: customerForm.address.trim() || null,
        currency: customerForm.currency,
        totalOrders: Number(customerForm.totalOrders) || 0,
        totalSpent: Number(customerForm.totalSpent) || 0,
        manualOrdersCount: Number(customerForm.totalOrders) || 0,
        manualTotalSpent: Number(customerForm.totalSpent) || 0,
        tier: customerForm.tier,
        points: Number(customerForm.points) || 0,
        creditLimit: Number(customerForm.creditLimit) || 0,
        avatarUrl: customerForm.avatarUrl || null,
      };
      if (editingCustomer) await api.put(`/customers/${editingCustomer.id}`, payload);
      else await api.post('/customers', payload);
      await fetchCustomers();
      setCustomerModalOpen(false);
      setEditingCustomer(null);
    } catch (err: any) {
      soundFX.playError();
      alert(`Customer save failed: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerConfirm) return;
    try {
      soundFX.playBeep();
      await api.delete(`/customers/${deleteCustomerConfirm.id}`);
      await fetchCustomers();
      setDeleteCustomerConfirm(null);
    } catch (err: any) {
      soundFX.playError();
      alert(`Delete failed: ${err.response?.data?.message || err.message}`);
    }
  };

  // COURIER HANDLERS
  const handleCourierFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit');
      return;
    }
    try {
      setCourierIsUploading(true);
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/online-platforms/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success && res.data.url) {
        setCourierForm((prev) => ({ ...prev, icon: res.data.url }));
        soundFX.playCashSuccess();
      }
    } catch (err: any) {
      soundFX.playError();
      alert(`Courier logo upload failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setCourierIsUploading(false);
    }
  };

  const handleOpenAddCourier = () => {
    setEditingCourier(null);
    setCourierUploadMode('presets');
    setCourierForm({
      name: '',
      code: '',
      icon: '🚚',
      color: 'purple',
      phone: '',
      trackingUrlTemplate: '',
      defaultFee: 20000,
      defaultFeePayer: 'CUSTOMER_PAYS',
      isActive: true,
      notes: '',
    });
    setCourierModalOpen(true);
  };

  const handleOpenEditCourier = (c: CourierItem) => {
    setEditingCourier(c);
    const isImg = c.icon && (c.icon.startsWith('/uploads/') || c.icon.startsWith('http') || c.icon.startsWith('data:'));
    setCourierUploadMode(isImg ? (c.icon.startsWith('/uploads/') ? 'file' : 'url') : 'presets');
    setCourierForm({
      name: c.name,
      code: c.code,
      icon: c.icon || '🚚',
      color: c.color || 'purple',
      phone: c.phone || '',
      trackingUrlTemplate: c.trackingUrlTemplate || '',
      defaultFee: c.defaultFee || 0,
      defaultFeePayer: c.defaultFeePayer || 'CUSTOMER_PAYS',
      isActive: c.isActive,
      notes: c.notes || '',
    });
    setCourierModalOpen(true);
  };

  const handleSaveCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierForm.name.trim() || !courierForm.code.trim()) {
      alert('Courier Name and Code are required.');
      return;
    }
    soundFX.playCashSuccess();
    if (editingCourier) {
      await updateCourier(editingCourier.id, courierForm);
    } else {
      await createCourier(courierForm);
    }
    setCourierModalOpen(false);
  };

  const handleDeleteCourier = async () => {
    if (!deleteCourierConfirm) return;
    soundFX.playBeep();
    await deleteCourier(deleteCourierConfirm.id);
    setDeleteCourierConfirm(null);
  };

  const filteredCouriers = couriers.filter((c) => {
    if (courierStatusFilter === 'ACTIVE' && !c.isActive) return false;
    if (courierStatusFilter === 'INACTIVE' && c.isActive) return false;
    if (courierStatusFilter === 'CUSTOMER_PAYS' && c.defaultFeePayer !== 'CUSTOMER_PAYS') return false;
    if (courierStatusFilter === 'SELLER_PAYS' && c.defaultFeePayer !== 'SELLER_PAYS') return false;
    if (courierSearch.trim()) {
      const q = courierSearch.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCode = c.code.toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchPhone) return false;
    }
    return true;
  });

  const activeCouriersCount = couriers.filter((c) => c.isActive).length;
  const sellerPaidCouriersCount = couriers.filter((c) => c.defaultFeePayer === 'SELLER_PAYS').length;
  const avgDeliveryFee = couriers.length > 0 ? couriers.reduce((sum, c) => sum + (c.defaultFee || 0), 0) / couriers.length : 0;

  const filteredPlatforms = platforms.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedFilter === 'ACTIVE') return p.isActive;
    if (selectedFilter === 'INACTIVE') return !p.isActive;
    if (selectedFilter === 'ZERO_COMMISSION') return p.commissionRate === 0;
    if (selectedFilter === 'HIGH_COMMISSION') return p.commissionRate >= 15;
    return true;
  });

  const filteredCustomers = customers.filter((c) => {
    const s = customerSearch.toLowerCase();
    const fullName = `${c.name || ''} ${c.surname || ''}`.toLowerCase();
    if (customerGenderFilter !== 'ALL' && c.gender !== customerGenderFilter) return false;
    if (customerTierFilter !== 'ALL' && c.tier !== customerTierFilter) return false;
    if (customerBlacklistFilter !== null && Boolean(c.isBlacklisted) !== customerBlacklistFilter) return false;
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      const matchName = `${c.name || ''} ${c.surname || ''}`.toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q);
      const matchAddress = (c.address || '').toLowerCase().includes(q);
      const matchCode = (c.memberCode || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchAddress && !matchCode) return false;
    }
    return true;
  });

  const totalPlatforms = platforms.length;
  const activePlatforms = platforms.filter((p) => p.isActive).length;
  const zeroCommPlatforms = platforms.filter((p) => p.commissionRate === 0).length;
  const avgCommRate = totalPlatforms > 0 ? platforms.reduce((sum, p) => sum + p.commissionRate, 0) / totalPlatforms : 0;
  const totalCustomersCount = customers.length;
  const totalCustomerOrdersSum = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const totalCustomerValuesSum = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const maleCount = customers.filter((c) => c.gender === 'MALE').length;
  const femaleCount = customers.filter((c) => c.gender === 'FEMALE').length;

  // ── Sorted & Paginated Platforms ──
  const sortedPlatforms = useMemo<OnlinePlatformItem[]>(() => {
    const list = [...filteredPlatforms];
    list.sort((a, b) => {
      let comparison = 0;
      switch (platformSortField) {
        case 'NAME':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'CODE':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'COMMISSION':
          comparison = (a.commissionRate || 0) - (b.commissionRate || 0);
          break;
        case 'ORDERS': {
          const ordersA = sales.filter((s) => (s.channel || '').toUpperCase() === a.code.toUpperCase()).length;
          const ordersB = sales.filter((s) => (s.channel || '').toUpperCase() === b.code.toUpperCase()).length;
          comparison = ordersA - ordersB;
          break;
        }
        case 'STATUS':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return platformSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredPlatforms, platformSortField, platformSortOrder, sales]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedPlatforms.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedPlatforms = useMemo<OnlinePlatformItem[]>(() => {
    if (pageSize === -1) return sortedPlatforms;
    const start = (effectivePage - 1) * pageSize;
    return sortedPlatforms.slice(start, start + pageSize);
  }, [sortedPlatforms, effectivePage, pageSize]);

  // ── Sorted & Paginated Couriers ──
  const sortedCouriers = useMemo<CourierItem[]>(() => {
    const list = [...filteredCouriers];
    list.sort((a, b) => {
      let comparison = 0;
      switch (courierSortField) {
        case 'NAME':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'CODE':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'PHONE':
          comparison = (a.phone || '').localeCompare(b.phone || '');
          break;
        case 'FEE':
          comparison = (a.defaultFee || 0) - (b.defaultFee || 0);
          break;
        case 'PAYER':
          comparison = (a.defaultFeePayer || '').localeCompare(b.defaultFeePayer || '');
          break;
        case 'STATUS':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return courierSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredCouriers, courierSortField, courierSortOrder]);

  const courierTotalPages = courierPageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedCouriers.length / courierPageSize));
  const courierEffectivePage = Math.min(courierCurrentPage, courierTotalPages);
  const paginatedCouriers = useMemo<CourierItem[]>(() => {
    if (courierPageSize === -1) return sortedCouriers;
    const start = (courierEffectivePage - 1) * courierPageSize;
    return sortedCouriers.slice(start, start + courierPageSize);
  }, [sortedCouriers, courierEffectivePage, courierPageSize]);

  // ── Sorted & Paginated Customers ──
  const sortedCustomers = useMemo<CustomerItem[]>(() => {
    const list = [...filteredCustomers];
    list.sort((a, b) => {
      let comparison = 0;
      switch (customerSortField) {
        case 'NAME': {
          const nameA = `${a.name || ''} ${a.surname || ''}`.trim();
          const nameB = `${b.name || ''} ${b.surname || ''}`.trim();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'GENDER':
          comparison = (a.gender || '').localeCompare(b.gender || '');
          break;
        case 'PHONE':
          comparison = (a.phone || '').localeCompare(b.phone || '');
          break;
        case 'ORDERS':
          comparison = (a.totalOrders || 0) - (b.totalOrders || 0);
          break;
        case 'VALUES':
          comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
          break;
        case 'CURRENCY':
          comparison = (a.currency || '').localeCompare(b.currency || '');
          break;
        case 'TIER': {
          const rank = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
          comparison = (rank[a.tier] || 0) - (rank[b.tier] || 0);
          break;
        }
        default:
          comparison = 0;
      }
      return customerSortOrder === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredCustomers, customerSortField, customerSortOrder]);

  const customerTotalPages = customerPageSize === -1 ? 1 : Math.max(1, Math.ceil(sortedCustomers.length / customerPageSize));
  const customerEffectivePage = Math.min(customerCurrentPage, customerTotalPages);
  const paginatedCustomers = useMemo<CustomerItem[]>(() => {
    if (customerPageSize === -1) return sortedCustomers;
    const start = (customerEffectivePage - 1) * customerPageSize;
    return sortedCustomers.slice(start, start + customerPageSize);
  }, [sortedCustomers, customerEffectivePage, customerPageSize]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Top Header Row (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            {mainTab === 'CUSTOMERS' ? (
              <>
                <div className="p-1.5 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <span>{t('onlineOrders.customerTitle', 'Online Customers & CRM Delivery System')}</span>
              </>
            ) : mainTab === 'COURIERS' ? (
              <>
                <div className="p-1.5 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-2xs">
                  <Truck className="w-5 h-5" />
                </div>
                <span>{t('onlineOrders.courierTitle', 'Delivery Companies & Express Dispatch')}</span>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-2xs">
                  <Globe className="w-5 h-5" />
                </div>
                <span>{t('onlineOrders.title', 'Online Platforms & Delivery Hub')}</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed">
            {mainTab === 'CUSTOMERS'
              ? t('onlineOrders.customerSubtitle', 'Manage delivery customer profiles, sex/gender demographics, addresses, order history, and total spend')
              : mainTab === 'COURIERS'
              ? t('onlineOrders.courierSubtitle', 'Manage courier partners, live waybill tracking links, standard delivery fees, and fee payer accounting')
              : mainTab === 'DISPATCH'
              ? t('onlineOrders.dispatchSubtitle', 'Monitor Cash-On-Delivery (COD) dispatch pipeline, tracking numbers, couriers, and settlement')
              : t('onlineOrders.subtitle', 'Configure platform names, codes, icons, commission rates, and delivery integrations')}
          </p>
        </div>

        {/* Top Right Action CTA Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {mainTab === 'CUSTOMERS' ? (
            <button
              onClick={handleOpenAddCustomer}
              className="h-9 px-3.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('onlineOrders.addCustomer', 'Add Customer')}</span>
            </button>
          ) : mainTab === 'COURIERS' ? (
            <button
              onClick={handleOpenAddCourier}
              className="h-9 px-3.5 neu-btn text-purple-600 dark:text-purple-400 font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('onlineOrders.addCourier', 'Add Courier')}</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="h-9 px-3.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-1.5 shadow-neu-glow-emerald active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('onlineOrders.addPlatform', 'Add Platform')}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (mainTab === 'CUSTOMERS') fetchCustomers();
              else if (mainTab === 'COURIERS') fetchCouriers();
              else fetchPlatforms();
            }}
            className="h-9 w-9 neu-circle-btn text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || loadingCustomers || loadingCouriers ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Full-Width Dedicated Modern Tab Bar (Fixed) */}
      <div className="flex-shrink-0 p-1 neu-tab-container grid grid-cols-2 sm:grid-cols-4 gap-1">
        <button
          onClick={() => setMainTab('DIRECTORY')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'DIRECTORY'
              ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{t('onlineOrders.tabPlatforms', 'Platforms List')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono neu-sunken-sm text-slate-600 dark:text-slate-300 font-black">
            {totalPlatforms}
          </span>
        </button>

        <button
          onClick={() => {
            setMainTab('DISPATCH');
            resetNewBadge();
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'DISPATCH'
              ? 'neu-tab-active shadow-neu-raised-sm text-amber-600 dark:text-amber-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="truncate">{t('onlineOrders.tabOrders', 'COD Order Hub')}</span>
          {activeCodCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black shadow-neu-glow-amber animate-pulse">
              {activeCodCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setMainTab('COURIERS')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'COURIERS'
              ? 'neu-tab-active shadow-neu-raised-sm text-purple-600 dark:text-purple-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <span className="truncate">{t('onlineOrders.tabCouriers', 'Couriers & Express')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono neu-pill text-purple-600 dark:text-purple-400 font-black">
            {couriers.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('CUSTOMERS')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'CUSTOMERS'
              ? 'neu-tab-active shadow-neu-raised-sm text-brand-500'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span className="truncate">{t('onlineOrders.tabCustomers', 'Customers CRM')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono neu-pill text-brand-500 font-black">
            {customers.length}
          </span>
        </button>
      </div>

      {/* Main Tab Body Scrollable Container */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">

      {/* KPI Cards */}
      {mainTab === 'CUSTOMERS' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.totalCustomers', 'Total Customers')}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{totalCustomersCount}</div>
              <div className="text-[10px] font-semibold text-emerald-500 mt-0.5">
                {t('onlineOrders.genderDemographics', '{{male}} Male • {{female}} Female', { male: maleCount, female: femaleCount })}
              </div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500"><Users className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.ordersPlaced', 'Orders Placed')}</div>
              <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono mt-0.5">{totalCustomerOrdersSum}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-sky-500"><ShoppingBag className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.totalGrossValues', 'Total Gross Values')}</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                {format(convert(totalCustomerValuesSum, baseCode, currentCurrency), currentCurrency)}
              </div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500"><DollarSign className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.avgOrderValue', 'Avg Value / Order')}</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {totalCustomerOrdersSum > 0
                  ? format(convert(totalCustomerValuesSum / totalCustomerOrdersSum, baseCode, currentCurrency), currentCurrency)
                  : format(0, currentCurrency)}
              </div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-purple-500"><TrendingUp className="w-5 h-5" /></div>
          </div>
        </div>
      )}

      {mainTab === 'COURIERS' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.totalCouriers', 'Total Couriers')}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{couriers.length}</div>
              <div className="text-[10px] font-semibold text-purple-500 mt-0.5">
                {t('onlineOrders.activeCouriersCount', '{{count}} Active Partners', { count: activeCouriersCount })}
              </div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-purple-500"><Truck className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.activeDispatch', 'Active Dispatch')}</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{activeCouriersCount}</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {t('onlineOrders.activeVsDisabled', '{{active}} / {{disabled}} Disabled', { active: activeCouriersCount, disabled: couriers.length - activeCouriersCount })}
              </div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.avgStandardFee', 'Avg Standard Fee')}</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{format(convert(avgDeliveryFee, baseCode, currentCurrency), currentCurrency)}</div>
              <div className="text-[10px] font-semibold text-amber-500 mt-0.5">{t('onlineOrders.perRegionalDispatch', 'Per Regional Dispatch')}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-amber-500"><Coins className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.storePaidCouriers', 'Store-Paid Couriers')}</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{sellerPaidCouriersCount}</div>
              <div className="text-[10px] font-semibold text-indigo-500 mt-0.5">{t('onlineOrders.opexFreightExpense', 'OPEX Freight Expense')}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-indigo-500"><TrendingUp className="w-5 h-5" /></div>
          </div>
        </div>
      )}

      {mainTab === 'DIRECTORY' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.totalPlatforms', 'Total Platforms')}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">{totalPlatforms}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-emerald-500"><Globe className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.directZeroFee', 'Direct / 0% Comm.')}</div>
              <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{zeroCommPlatforms}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-cyan-500"><Store className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.avgPlatformFee', 'Avg Commission Rate')}</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{avgCommRate.toFixed(1)}%</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-amber-500"><Percent className="w-5 h-5" /></div>
          </div>
          <div className="p-4 neu-card-interactive flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('onlineOrders.integratedDelivery', 'Connected Logistics')}</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5">{platforms.filter((p) => p.commissionRate > 0).length}</div>
            </div>
            <div className="p-3 rounded-2xl neu-sunken-sm text-purple-500"><ShoppingBag className="w-5 h-5" /></div>
          </div>
        </div>
      )}

      {/* DIRECTORY TAB */}
      {mainTab === 'DIRECTORY' && (
        <>
          <div className="p-4 neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="p-1 neu-tab-container flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: t('onlineOrders.filterAll', 'All Platforms'), Icon: Zap, color: 'text-amber-400' },
                { id: 'ACTIVE', label: t('onlineOrders.filterActive', 'Active'), Icon: CheckCircle2, color: 'text-emerald-400' },
                { id: 'ZERO_COMMISSION', label: t('onlineOrders.filterDirect', '0% Direct'), Icon: Globe, color: 'text-cyan-400' },
                { id: 'HIGH_COMMISSION', label: t('onlineOrders.filterHigh', '% Commission (≥15%)'), Icon: Percent, color: 'text-orange-400' },
                { id: 'INACTIVE', label: t('onlineOrders.filterDisabled', 'Disabled'), Icon: AlertCircle, color: 'text-slate-400' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedFilter === f.id ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <f.Icon className={`w-3.5 h-3.5 ${selectedFilter === f.id ? 'text-inherit' : f.color}`} />
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('onlineOrders.searchPlatform', 'Search platform name, code...')}
                  className="w-full h-8 pl-8 pr-3 neu-input text-xs outline-none"
                />
              </div>
              <div className="p-1 neu-tab-container flex items-center gap-1">
                <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'cards' ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg cursor-pointer ${viewMode === 'table' ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedPlatforms.map((plt) => {
                const theme = COLOR_THEMES[plt.color || 'emerald'] || COLOR_THEMES.emerald;
                const totalOrders = sales.filter((s) => (s.channel || '').toUpperCase() === plt.code.toUpperCase()).length;
                const totalRev = sales.filter((s) => (s.channel || '').toUpperCase() === plt.code.toUpperCase()).reduce((sum, s) => sum + (s.totalAmount || 0), 0);
                const isImage = plt.icon && (plt.icon.startsWith('/uploads/') || plt.icon.startsWith('http') || plt.icon.startsWith('data:'));

                return (
                  <div key={plt.id} className="p-5 neu-card-interactive flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div
                        onClick={() => setLightboxUrl({ icon: plt.icon, title: plt.name, code: plt.code })}
                        className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center overflow-hidden text-2xl cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                      >
                        {isImage ? (
                          <img src={plt.icon} alt={plt.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{plt.icon || '📦'}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleStatus(plt)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold neu-pill cursor-pointer ${plt.isActive ? 'text-emerald-500' : 'text-slate-400'}`}
                      >
                        {plt.isActive ? t('onlineOrders.active', 'Active') : t('onlineOrders.disabled', 'Disabled')}
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base truncate">{plt.name}</h3>
                        <span className="font-mono text-[11px] neu-pill px-2 py-0.5 rounded">{plt.code}</span>
                      </div>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold neu-pill ${theme.text}`}>
                        {plt.commissionRate > 0
                          ? t('onlineOrders.commission', { rate: plt.commissionRate, defaultValue: `${plt.commissionRate}% Commission` })
                          : t('onlineOrders.directZeroFee', '0% Direct Order')}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl neu-sunken-sm flex justify-between text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{t('onlineOrders.ordersCount', 'Orders')}</div>
                        <div className="font-black text-sm">{totalOrders}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{t('onlineOrders.grossTotal', 'Gross Total')}</div>
                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{format(convert(totalRev, baseCode, currentCurrency), currentCurrency)}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-end gap-2 text-xs">
                      <button onClick={() => handleOpenEdit(plt)} className="px-3 py-1.5 neu-btn font-bold flex items-center gap-1.5 cursor-pointer">
                        <Edit className="w-3.5 h-3.5" />{t('common.edit', 'Edit')}
                      </button>
                      <button onClick={() => setDeleteConfirm(plt)} className="p-1.5 neu-circle-btn text-rose-500 font-bold cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black text-[10px] border-b border-slate-100 dark:border-slate-800 select-none">
                  <tr>
                    <th
                      onClick={() => handleTogglePlatformSort('NAME')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colPlatform', 'Platform')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${platformSortField === 'NAME' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleTogglePlatformSort('CODE')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colPrefix', 'Prefix')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${platformSortField === 'CODE' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleTogglePlatformSort('COMMISSION')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colCommission', 'Commission')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${platformSortField === 'COMMISSION' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleTogglePlatformSort('ORDERS')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colOrders', 'Total Orders')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${platformSortField === 'ORDERS' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleTogglePlatformSort('STATUS')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colStatus', 'Status')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${platformSortField === 'STATUS' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right">{t('onlineOrders.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedPlatforms.map((plt) => {
                    const isImage = plt.icon && (plt.icon.startsWith('/uploads/') || plt.icon.startsWith('http') || plt.icon.startsWith('data:'));
                    const totalOrders = sales.filter((s) => (s.channel || '').toUpperCase() === plt.code.toUpperCase()).length;
                    return (
                      <tr key={plt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden text-lg flex-shrink-0">
                            {isImage ? <img src={plt.icon} alt={plt.name} className="w-full h-full object-cover" /> : <span>{plt.icon || '📦'}</span>}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{plt.name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">{plt.code}</td>
                        <td className="py-3 px-3 font-bold">{plt.commissionRate > 0 ? `${plt.commissionRate}%` : '0%'}</td>
                        <td className="py-3 px-3 font-mono font-bold">{totalOrders} orders</td>
                        <td className="py-3 px-3">
                          <button onClick={() => handleToggleStatus(plt)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${plt.isActive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-slate-200 text-slate-400'}`}>
                            {plt.isActive ? t('onlineOrders.filterActive', 'Active') : t('onlineOrders.filterDisabled', 'Disabled')}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button onClick={() => handleOpenEdit(plt)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">{t('common.edit', 'Edit')}</button>
                          <button onClick={() => setDeleteConfirm(plt)} className="px-2 py-1 rounded-lg border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Platforms Pagination Footer */}
          {sortedPlatforms.length > 0 && (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                {(() => {
                  const start = pageSize === -1 ? 1 : (effectivePage - 1) * pageSize + 1;
                  const end = pageSize === -1 ? sortedPlatforms.length : Math.min(effectivePage * pageSize, sortedPlatforms.length);
                  return (
                    <span>
                      {t('onlineOrders.showingItemsCount', 'Showing {{start}}–{{end}} of {{total}} items', { start, end, total: sortedPlatforms.length })}
                    </span>
                  );
                })()}
                <div className="w-36">
                  <CustomSelect
                    value={String(pageSize)}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '12', label: '12 / page' },
                      { value: '24', label: '24 / page' },
                      { value: '48', label: '48 / page' },
                      { value: '96', label: '96 / page' },
                      { value: '-1', label: t('onlineOrders.allCount', 'All ({{count}})', { count: sortedPlatforms.length }) },
                    ]}
                    placement="up"
                    size="sm"
                  />
                </div>
              </div>

              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={effectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={effectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((pageItem, idx) => {
                        if (pageItem === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                              …
                            </span>
                          );
                        }
                        const p = pageItem as number;
                        const isActive = p === effectivePage;
                        return (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={effectivePage === totalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={effectivePage === totalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* DISPATCH / LIVE ORDERS HUB TAB */}
      {mainTab === 'DISPATCH' && (
        <LiveOrdersPipeline />
      )}

      {/* COURIERS & EXPRESS TAB */}
      {mainTab === 'COURIERS' && (
        <>
          <div className="p-4 neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            {/* Filter Pills */}
            <div className="neu-tab-container p-1 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="font-bold text-slate-400 text-[11px] whitespace-nowrap px-1">{t('onlineOrders.filterCouriers', 'Filter Couriers:')}</span>
              {[
                { id: 'ALL', label: t('onlineOrders.allPartners', 'All Partners'), count: couriers.length },
                { id: 'ACTIVE', label: t('onlineOrders.filterActive', 'Active'), count: activeCouriersCount },
                { id: 'INACTIVE', label: t('onlineOrders.filterDisabled', 'Disabled'), count: couriers.length - activeCouriersCount },
                { id: 'CUSTOMER_PAYS', label: t('onlineOrders.payerCustomer', 'Customer Pays'), count: couriers.length - sellerPaidCouriersCount },
                { id: 'SELLER_PAYS', label: t('onlineOrders.payerStore', 'Store Free Shipping'), count: sellerPaidCouriersCount },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCourierStatusFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    courierStatusFilter === f.id
                      ? 'neu-tab-active text-purple-600 dark:text-purple-400 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono neu-sunken-sm ${courierStatusFilter === f.id ? 'text-purple-600 dark:text-purple-400 font-black' : 'text-slate-500'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & View Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('onlineOrders.searchCouriers', 'Search couriers, code, phone...')}
                  value={courierSearch}
                  onChange={(e) => setCourierSearch(e.target.value)}
                  className="w-full h-9 pl-10 pr-3 neu-input text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="p-1 neu-tab-container flex items-center gap-1">
                <button
                  onClick={() => setCourierViewMode('cards')}
                  className={`p-1.5 rounded-xl cursor-pointer ${courierViewMode === 'cards' ? 'neu-tab-active text-purple-600 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
                  title={t('onlineOrders.cardView', 'Card View')}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCourierViewMode('table')}
                  className={`p-1.5 rounded-xl cursor-pointer ${courierViewMode === 'table' ? 'neu-tab-active text-purple-600 dark:text-purple-400' : 'text-slate-400 hover:text-slate-600'}`}
                  title={t('onlineOrders.tableView', 'Table View')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Cards View */}
          {courierViewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedCouriers.map((c) => {
                const colorConfig = COLOR_THEMES[c.color || 'purple'] || COLOR_THEMES.purple;
                return (
                  <div
                    key={c.id}
                    className={`p-5 neu-card-interactive space-y-4 flex flex-col justify-between ${
                      c.isActive ? '' : 'opacity-65'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const isImg = c.icon && (c.icon.startsWith('/uploads/') || c.icon.startsWith('http') || c.icon.startsWith('data:'));
                            const IconComp = (c.icon && EMOJI_TO_LUCIDE_MAP[c.icon]) || Truck;
                            return (
                              <div
                                onClick={() => {
                                  if (c.icon && isImg) setLightboxUrl({ icon: c.icon, title: c.name, code: c.code });
                                }}
                                className={`w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center flex-shrink-0 ${
                                  isImg ? 'cursor-pointer' : ''
                                } overflow-hidden group/avatar relative ${colorConfig.bg}`}
                                title={isImg ? 'Click to view full size logo' : c.name}
                              >
                                {isImg ? (
                                  <>
                                    <img
                                      src={sanitizeImageUrl(c.icon!)}
                                      alt={c.name}
                                      className="w-full h-full object-cover transition-transform duration-200 group-hover/avatar:scale-115"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-2xl text-white">
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </div>
                                  </>
                                ) : (
                                  <IconComp className={`w-5 h-5 ${colorConfig.text}`} />
                                )}
                              </div>
                            );
                          })()}
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{c.name}</span>
                            </h3>
                            <span className="font-mono text-[10px] font-bold text-slate-400 block mt-0.5">
                              {t('onlineOrders.codePrefix', 'Code: {{code}}', { code: c.code })}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => toggleCourierStatus(c.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider neu-sunken-sm transition-all cursor-pointer ${
                            c.isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {c.isActive ? t('onlineOrders.filterActive', 'Active') : t('onlineOrders.filterDisabled', 'Disabled')}
                        </button>
                      </div>

                      {/* Fee and Payer Badge */}
                      <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t('onlineOrders.standardDeliveryFee', 'Standard Fee')}</span>
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            {format(convert(c.defaultFee, baseCode, currentCurrency), currentCurrency)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-bold">{t('onlineOrders.feePayer', 'Fee Payer:')}</span>
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] neu-sunken-sm flex items-center gap-1 ${
                              c.defaultFeePayer === 'SELLER_PAYS'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {c.defaultFeePayer === 'SELLER_PAYS' ? (
                              <>
                                <Store className="w-3 h-3 flex-shrink-0" />
                                <span>{t('onlineOrders.payerStore', 'Store Free Ship')}</span>
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span>{t('onlineOrders.payerCustomer', 'Customer Pays')}</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Phone & Tracking Link */}
                      <div className="space-y-1.5 text-[11px] text-slate-500">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <WhatsAppPhoneBadge
                              phone={c.phone}
                              text={`Hello ${c.name} Dispatch! Logistics dispatch inquiry from 39POS.`}
                              size="xs"
                            />
                          </div>
                        )}
                        {c.trackingUrlTemplate && (
                          <div className="flex items-center gap-1.5 truncate text-purple-600 dark:text-purple-400">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate font-mono text-[10px]">{c.trackingUrlTemplate}</span>
                          </div>
                        )}
                        {c.notes && (
                          <p className="text-[10px] text-slate-400 italic pt-1 truncate">{c.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditCourier(c)}
                        className="flex-1 py-1.5 px-3 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{t('common.edit', 'Edit')}</span>
                      </button>
                      <button
                        onClick={() => setDeleteCourierConfirm(c)}
                        className="w-8 h-8 neu-circle-btn text-rose-500 hover:bg-rose-500/10 flex items-center justify-center active:scale-95 cursor-pointer"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {courierViewMode === 'table' && (
            <div className="neu-card-lg rounded-3xl overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/70 text-slate-400 uppercase font-black text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-sm select-none">
                    <tr>
                      <th
                        onClick={() => handleToggleCourierSort('NAME')}
                        className="py-4 px-5 min-w-[260px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colCourierPartner', 'Courier & Logistics Partner')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'NAME' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleCourierSort('CODE')}
                        className="py-4 px-4 min-w-[110px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colPrefix', 'Code')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'CODE' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleCourierSort('PHONE')}
                        className="py-4 px-4 min-w-[150px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colCourierPhone', 'Hotline / Phone')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'PHONE' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleCourierSort('FEE')}
                        className="py-4 px-4 min-w-[140px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colCourierFee', 'Standard Fee')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'FEE' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th
                        onClick={() => handleToggleCourierSort('PAYER')}
                        className="py-4 px-4 min-w-[190px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colCourierPayer', 'Default Fee Payer')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'PAYER' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th className="py-4 px-4 min-w-[90px] text-center">{t('onlineOrders.colCourierTracking', 'Tracking')}</th>
                      <th
                        onClick={() => handleToggleCourierSort('STATUS')}
                        className="py-4 px-4 min-w-[120px] cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{t('onlineOrders.colStatus', 'Status')}</span>
                          <ArrowUpDown className={`w-3 h-3 ${courierSortField === 'STATUS' ? 'text-purple-500' : 'opacity-30'}`} />
                        </div>
                      </th>
                      <th className="py-4 px-5 min-w-[130px] text-right">{t('onlineOrders.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedCouriers.map((c) => {
                      const colorConfig = COLOR_THEMES[c.color || 'purple'] || COLOR_THEMES.purple;
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group/row"
                        >
                          {/* Courier Partner Column */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              {(() => {
                                const isImg = c.icon && (c.icon.startsWith('/uploads/') || c.icon.startsWith('http') || c.icon.startsWith('data:'));
                                const IconComp = (c.icon && EMOJI_TO_LUCIDE_MAP[c.icon]) || Truck;
                                return (
                                  <div
                                    onClick={() => {
                                      if (c.icon && isImg) setLightboxUrl({ icon: c.icon, title: c.name, code: c.code });
                                    }}
                                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                                      isImg ? 'cursor-pointer' : ''
                                    } overflow-hidden group/avatar relative shadow-2xs ${colorConfig.bg} ${colorConfig.border}`}
                                    title={isImg ? 'Click to view full size logo' : c.name}
                                  >
                                    {isImg ? (
                                      <>
                                        <img
                                          src={sanitizeImageUrl(c.icon!)}
                                          alt={c.name}
                                          className="w-full h-full object-cover transition-transform duration-200 group-hover/avatar:scale-115"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity rounded-2xl text-white">
                                          <ZoomIn className="w-3.5 h-3.5" />
                                        </div>
                                      </>
                                    ) : (
                                      <IconComp className={`w-5 h-5 ${colorConfig.text}`} />
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="min-w-0">
                                <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                                  {c.name}
                                </div>
                                {c.notes ? (
                                  <div className="text-[11px] text-slate-400 font-medium truncate max-w-xs mt-0.5">
                                    {c.notes}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400/70 font-mono">{t('onlineOrders.courierPartner', 'Logistics Carrier')}</div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Code Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 font-mono font-black text-slate-800 dark:text-slate-200 text-[11px] tracking-wider uppercase inline-block">
                              {c.code}
                            </span>
                          </td>

                          {/* Hotline / Phone */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {c.phone ? (
                              <WhatsAppPhoneBadge
                                phone={c.phone}
                                text={`Hello ${c.name} Dispatch! Logistics dispatch inquiry from 39POS.`}
                                size="xs"
                              />
                            ) : (
                              <span className="text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          {/* Standard Fee */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 font-mono font-black text-xs text-slate-900 dark:text-white">
                              <Coins className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                              <span>{format(convert(c.defaultFee, baseCode, currentCurrency), currentCurrency)}</span>
                            </div>
                          </td>

                          {/* Default Fee Payer Pill */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-2xs ${
                                c.defaultFeePayer === 'SELLER_PAYS'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'bg-brand-500/15 text-brand-600 dark:text-brand-400 border-brand-500/30'
                              }`}
                            >
                              {c.defaultFeePayer === 'SELLER_PAYS' ? (
                                <>
                                  <Store className="w-3 h-3 flex-shrink-0" />
                                  <span>{t('onlineOrders.payerStore', 'Store Free Shipping')}</span>
                                </>
                              ) : (
                                <>
                                  <User className="w-3 h-3 flex-shrink-0" />
                                  <span>{t('onlineOrders.payerCustomer', 'Customer Pays')}</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Live Tracking Portal Link */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {c.trackingUrlTemplate ? (
                              <a
                                href={c.trackingUrlTemplate}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/10 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-110 active:scale-95 shadow-2xs group/track"
                                title={`Open Tracking Portal: ${c.trackingUrlTemplate}`}
                              >
                                <ExternalLink className="w-3.5 h-3.5 group-hover/track:rotate-12 transition-transform" />
                              </a>
                            ) : (
                              <span className="text-slate-400/60 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Status Toggle */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleCourierStatus(c.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 cursor-pointer ${
                                c.isActive
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs hover:bg-emerald-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              <span>{c.isActive ? t('onlineOrders.filterActive', 'Active') : t('onlineOrders.filterDisabled', 'Disabled')}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCourier(c)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs transition-all active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-400" />
                                <span>{t('common.edit', 'Edit')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCourierConfirm(c)}
                                className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95 cursor-pointer"
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

          {/* Couriers Pagination Footer */}
          {sortedCouriers.length > 0 && (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                {(() => {
                  const start = courierPageSize === -1 ? 1 : (courierEffectivePage - 1) * courierPageSize + 1;
                  const end = courierPageSize === -1 ? sortedCouriers.length : Math.min(courierEffectivePage * courierPageSize, sortedCouriers.length);
                  return (
                    <span>
                      {t('onlineOrders.showingItemsCount', 'Showing {{start}}–{{end}} of {{total}} items', { start, end, total: sortedCouriers.length })}
                    </span>
                  );
                })()}
                <div className="w-36">
                  <CustomSelect
                    value={String(courierPageSize)}
                    onChange={(val) => {
                      setCourierPageSize(Number(val));
                      setCourierCurrentPage(1);
                    }}
                    options={[
                      { value: '12', label: '12 / page' },
                      { value: '24', label: '24 / page' },
                      { value: '48', label: '48 / page' },
                      { value: '96', label: '96 / page' },
                      { value: '-1', label: t('onlineOrders.allCount', 'All ({{count}})', { count: sortedCouriers.length }) },
                    ]}
                    placement="up"
                    size="sm"
                  />
                </div>
              </div>

              {courierPageSize !== -1 && courierTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCourierCurrentPage(1)}
                    disabled={courierEffectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCourierCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={courierEffectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: courierTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === courierTotalPages || Math.abs(p - courierEffectivePage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((pageItem, idx) => {
                        if (pageItem === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                              …
                            </span>
                          );
                        }
                        const p = pageItem as number;
                        const isActive = p === courierEffectivePage;
                        return (
                          <button
                            key={p}
                            onClick={() => setCourierCurrentPage(p)}
                            className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCourierCurrentPage((p) => Math.min(courierTotalPages, p + 1))}
                    disabled={courierEffectivePage === courierTotalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCourierCurrentPage(courierTotalPages)}
                    disabled={courierEffectivePage === courierTotalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}


      {/* CUSTOMERS TAB */}
      {mainTab === 'CUSTOMERS' && (
        <>
          <div className="p-4 neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            {/* Filter Pills with Lucide Icons */}
            <div className="neu-tab-container p-1 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="font-bold text-slate-400 text-[11px] whitespace-nowrap px-1">{t('onlineOrders.filters', 'Filters:')}</span>
              {[
                { id: 'ALL', label: t('onlineOrders.allGenders', 'All Sex'), Icon: Users, color: 'text-brand-400' },
                { id: 'MALE', label: t('onlineOrders.male', 'Male'), Icon: User, color: 'text-sky-400' },
                { id: 'FEMALE', label: t('onlineOrders.female', 'Female'), Icon: HeartHandshake, color: 'text-pink-400' },
                { id: 'OTHER', label: t('onlineOrders.other', 'Other'), Icon: Sparkles, color: 'text-purple-400' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setCustomerGenderFilter(g.id);
                    setCustomerBlacklistFilter(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                    customerGenderFilter === g.id && customerBlacklistFilter === null
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <g.Icon className={`w-3.5 h-3.5 ${customerGenderFilter === g.id && customerBlacklistFilter === null ? 'text-inherit' : g.color}`} />
                  <span>{g.label}</span>
                </button>
              ))}

              {/* Blacklisted Filter Pill */}
              <button
                onClick={() => {
                  setCustomerBlacklistFilter(customerBlacklistFilter === true ? null : true);
                  setCustomerGenderFilter('ALL');
                }}
                className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  customerBlacklistFilter === true
                    ? 'neu-tab-active text-rose-600 dark:text-rose-400 font-black'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{t('onlineOrders.blacklistedCount', '🚫 Blacklisted ({{count}})', { count: customers.filter((c) => c.isBlacklisted).length })}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder={t('onlineOrders.searchCustomer', 'Search name, phone, address...')}
                  className="w-full h-9 pl-10 pr-3 neu-input text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div className="p-1 neu-tab-container flex items-center gap-1">
                <button onClick={() => setCustomerViewMode('cards')} className={`p-1.5 rounded-xl cursor-pointer ${customerViewMode === 'cards' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setCustomerViewMode('table')} className={`p-1.5 rounded-xl cursor-pointer ${customerViewMode === 'table' ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {customerViewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedCustomers.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 space-y-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                  <Users className="w-12 h-12 stroke-[1.2] opacity-30 mx-auto" />
                  <div className="font-extrabold text-sm text-slate-600 dark:text-slate-400">{t('onlineOrders.noCustomersFound', 'No customers found')}</div>
                  <p className="text-xs text-slate-400">{t('onlineOrders.tryChangingFilter', 'Try changing your search term or click "Add Customer"')}</p>
                </div>
              ) : (
                paginatedCustomers.map((cust) => {
                  const tierStyle = TIER_STYLES[cust.tier] || TIER_STYLES.BRONZE;
                  const genderInfo = GENDER_CONFIG[cust.gender] || GENDER_CONFIG.UNSPECIFIED;
                  const GenderIcon = genderInfo.Icon;
                  const isAvatarImage = cust.avatarUrl && (cust.avatarUrl.startsWith('/uploads/') || cust.avatarUrl.startsWith('http') || cust.avatarUrl.startsWith('data:'));

                  return (
                    <div
                      key={cust.id}
                      className="p-5 neu-card-interactive flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center overflow-hidden text-2xl flex-shrink-0">
                            {isAvatarImage ? (
                              <img src={cust.avatarUrl!} alt={cust.name} className="w-full h-full object-cover" />
                            ) : (
                              <GenderIcon className={`w-6 h-6 ${genderInfo.color}`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {cust.name} {cust.surname || ''}
                            </h3>
                            <div className="text-[10px] font-mono text-slate-400">{cust.memberCode || 'STANDARD'}</div>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase neu-sunken-sm ${tierStyle.badge}`}>
                          {cust.tier}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {cust.phone && (
                          <div className="pt-0.5">
                            <WhatsAppPhoneBadge
                              phone={cust.phone}
                              text={`Hello ${cust.name}! Greetings from 39POS.`}
                              size="xs"
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          <span className="truncate text-[11px]">{cust.address || t('onlineOrders.noAddress', 'No address')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold neu-sunken-sm flex items-center gap-1 ${genderInfo.badge}`}>
                            <GenderIcon className="w-3 h-3" />
                            <span>{genderInfo.label}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md neu-sunken-sm text-slate-600 dark:text-slate-400 text-[10px] font-mono font-bold">
                            {cust.currency || 'USD'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl neu-sunken-sm flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{t('onlineOrders.ordersCount', 'Orders')}</div>
                          <div className="font-black text-sm mt-0.5 text-slate-800 dark:text-white">{cust.totalOrders || 0}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{t('onlineOrders.totalValues', 'Total Values')}</div>
                          <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                            {format(convert(cust.totalSpent || 0, baseCode, currentCurrency), currentCurrency)}
                          </div>
                        </div>
                      </div>

                      {/* Blacklist Warning Badge */}
                      {cust.isBlacklisted && (
                        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-black flex items-center gap-1.5">
                          <Ban className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span>{t('onlineOrders.codBlacklistedBadge', 'COD BLACKLISTED ({{count}} Refusals)', { count: cust.codRejectionCount || 0 })}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleBlacklist(cust)}
                          title={cust.isBlacklisted ? 'Remove from COD blacklist' : 'Add to COD blacklist'}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold neu-btn flex items-center gap-1 active:scale-95 transition-all cursor-pointer ${
                            cust.isBlacklisted
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-rose-600 hover:text-rose-700'
                          }`}
                        >
                          <Ban className="w-3 h-3" />
                          <span>{cust.isBlacklisted ? t('onlineOrders.unblock', 'Unblock') : t('onlineOrders.blacklist', 'Blacklist')}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCustomer(cust)}
                            className="px-3 py-1.5 neu-btn font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>{t('common.edit', 'Edit')}</span>
                          </button>
                          <button
                            onClick={() => setDeleteCustomerConfirm(cust)}
                            className="w-8 h-8 neu-circle-btn text-rose-500 hover:bg-rose-500/10 flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {customerViewMode === 'table' && (
            <div className="neu-card-lg rounded-3xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase font-black text-[10px] border-b border-slate-100 dark:border-slate-800 select-none">
                  <tr>
                    <th
                      onClick={() => handleToggleCustomerSort('NAME')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colCustomerName', 'Customer Name & Surname')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'NAME' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('GENDER')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colGender', 'Sex')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'GENDER' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('PHONE')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colPhoneAddress', 'Phone & Address')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'PHONE' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('ORDERS')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colOrders', 'Orders')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'ORDERS' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('VALUES')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colValues', 'Values')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'VALUES' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('CURRENCY')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colCurrency', 'Currency')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'CURRENCY' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th
                      onClick={() => handleToggleCustomerSort('TIER')}
                      className="py-3.5 px-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('onlineOrders.colTier', 'Tier')}</span>
                        <ArrowUpDown className={`w-3 h-3 ${customerSortField === 'TIER' ? 'text-brand-500' : 'opacity-30'}`} />
                      </div>
                    </th>
                    <th className="py-3.5 px-3 text-right">{t('onlineOrders.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedCustomers.map((cust) => {
                    const genderInfo = GENDER_CONFIG[cust.gender] || GENDER_CONFIG.UNSPECIFIED;
                    const GenderIcon = genderInfo.Icon;
                    const tierStyle = TIER_STYLES[cust.tier] || TIER_STYLES.BRONZE;
                    const isAvatarImage = cust.avatarUrl && (cust.avatarUrl.startsWith('/uploads/') || cust.avatarUrl.startsWith('http') || cust.avatarUrl.startsWith('data:'));

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {isAvatarImage ? <img src={cust.avatarUrl!} alt={cust.name} className="w-full h-full object-cover" /> : <GenderIcon className={`w-4 h-4 ${genderInfo.color}`} />}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {cust.name} {cust.surname || ''}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">{cust.memberCode}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 w-fit ${genderInfo.badge}`}>
                            <GenderIcon className="w-3 h-3" />
                            <span>{genderInfo.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {cust.phone ? (
                            <WhatsAppPhoneBadge
                              phone={cust.phone}
                              text={`Hello ${cust.name}! Greetings from 39POS.`}
                              size="xs"
                            />
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{cust.address || '—'}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">{cust.totalOrders || 0} {t('onlineOrders.ordersUnit', 'orders')}</td>
                        <td className="py-3 px-3 font-mono font-black text-brand-600 dark:text-brand-400">
                          {format(convert(cust.totalSpent || 0, baseCode, currentCurrency), currentCurrency)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {cust.currency || baseCode}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tierStyle.badge}`}>
                            {cust.tier}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button onClick={() => handleOpenEditCustomer(cust)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">{t('common.edit', 'Edit')}</button>
                          <button onClick={() => setDeleteCustomerConfirm(cust)} className="px-2 py-1 rounded-lg border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Customers Pagination Footer */}
          {sortedCustomers.length > 0 && (
            <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                {(() => {
                  const start = customerPageSize === -1 ? 1 : (customerEffectivePage - 1) * customerPageSize + 1;
                  const end = customerPageSize === -1 ? sortedCustomers.length : Math.min(customerEffectivePage * customerPageSize, sortedCustomers.length);
                  return (
                    <span>
                      {t('onlineOrders.showingItemsCount', 'Showing {{start}}–{{end}} of {{total}} items', { start, end, total: sortedCustomers.length })}
                    </span>
                  );
                })()}
                <div className="w-36">
                  <CustomSelect
                    value={String(customerPageSize)}
                    onChange={(val) => {
                      setCustomerPageSize(Number(val));
                      setCustomerCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10 / page' },
                      { value: '25', label: '25 / page' },
                      { value: '50', label: '50 / page' },
                      { value: '100', label: '100 / page' },
                      { value: '-1', label: t('onlineOrders.allCount', 'All ({{count}})', { count: sortedCustomers.length }) },
                    ]}
                    placement="up"
                    size="sm"
                  />
                </div>
              </div>

              {customerPageSize !== -1 && customerTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCustomerCurrentPage(1)}
                    disabled={customerEffectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={customerEffectivePage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: customerTotalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === customerTotalPages || Math.abs(p - customerEffectivePage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((pageItem, idx) => {
                        if (pageItem === '...') {
                          return (
                            <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-mono">
                              …
                            </span>
                          );
                        }
                        const p = pageItem as number;
                        const isActive = p === customerEffectivePage;
                        return (
                          <button
                            key={p}
                            onClick={() => setCustomerCurrentPage(p)}
                            className={`w-7 h-7 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer ${
                              isActive
                                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCustomerCurrentPage((p) => Math.min(customerTotalPages, p + 1))}
                    disabled={customerEffectivePage === customerTotalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCustomerCurrentPage(customerTotalPages)}
                    disabled={customerEffectivePage === customerTotalPages}
                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>

      {/* PLATFORM MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg neu-card-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingPlatform ? t('onlineOrders.editPlatformTitle', 'Edit {{name}}', { name: editingPlatform.name }) : t('onlineOrders.addPlatformTitle', 'Configure Online Platform')}
              </h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSavePlatform} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.platformName', 'Platform Name')}</label>
                  <input type="text" required placeholder="e.g. GrabFood" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-9 px-3 neu-input font-bold" />
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.prefixCode', 'Prefix Code')}</label>
                  <input type="text" required maxLength={6} placeholder="e.g. GF" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full h-9 px-3 neu-input font-mono font-bold uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.commissionRate', 'Commission Rate (%)')}</label>
                  <input type="number" step="0.5" min="0" max="100" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: parseFloat(e.target.value) || 0 })} className="w-full h-9 px-3 neu-input font-mono font-bold" />
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.statusInPos', 'Status in POS')}</label>
                  <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })} className={`w-full h-9 rounded-xl font-bold cursor-pointer transition-all ${form.isActive ? 'neu-tab-active text-emerald-600 dark:text-emerald-400' : 'neu-btn text-slate-400'}`}>
                    {form.isActive ? t('onlineOrders.filterActive', 'Active') : t('onlineOrders.filterDisabled', 'Disabled')}
                  </button>
                </div>
              </div>
              {/* Platform Logo / Icon Management */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('onlineOrders.platformLogo', 'Platform Logo / Icon')}</span>
                  </label>

                  <div className="flex items-center neu-tab-container p-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setUploadMode('presets')}
                      className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        uploadMode === 'presets'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      <span>{t('onlineOrders.presets', 'Presets')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        uploadMode === 'file'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('onlineOrders.uploadMode', 'Upload')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('url')}
                      className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        uploadMode === 'url'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{t('onlineOrders.imageUrlMode', 'Image URL')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Platform Logo Preview Box */}
                  <div className="w-16 h-16 rounded-2xl neu-sunken overflow-hidden flex-shrink-0 flex items-center justify-center relative group">
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center text-emerald-500 gap-0.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[7px] font-bold">{t('common.uploading', 'Uploading')}</span>
                      </div>
                    ) : form.icon && (form.icon.startsWith('/uploads/') || form.icon.startsWith('http') || form.icon.startsWith('data:')) ? (
                      <>
                        <img
                          src={sanitizeImageUrl(form.icon)}
                          alt="Platform Logo"
                          className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxUrl({
                                icon: form.icon,
                                title: form.name || 'Platform Logo Preview',
                                code: form.code || 'ICON',
                              });
                            }}
                            title={t('common.preview', 'Preview')}
                            className="neu-circle-btn w-6 h-6 text-emerald-400 hover:text-white flex items-center justify-center"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, icon: '🛵' }))}
                            title={t('common.clear', 'Clear')}
                            className="neu-circle-btn w-6 h-6 text-rose-400 hover:text-white flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-2xl select-none">{form.icon || '🛵'}</span>
                    )}
                  </div>

                  {/* Mode Tabs Body */}
                  <div className="flex-1 min-w-0">
                    {uploadMode === 'presets' && (
                      <div className="grid grid-cols-6 gap-1.5 max-h-24 overflow-y-auto p-1 scrollbar-thin">
                        {PLATFORM_EMOJI_PRESETS.map((p) => (
                          <button
                            key={p.emoji}
                            type="button"
                            title={p.label}
                            onClick={() => setForm((prev) => ({ ...prev, icon: p.emoji }))}
                            className={`h-8 rounded-xl text-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                              form.icon === p.emoji
                                ? 'neu-tab-active ring-2 ring-emerald-500 scale-105'
                                : 'neu-btn hover:neu-card-sm'
                            }`}
                          >
                            {p.emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {uploadMode === 'file' && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                          }}
                        />
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                          }}
                          onClick={() => fileInputRef.current?.click()}
                          className={`h-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all px-3 text-center border-slate-300 dark:border-slate-700 hover:border-emerald-500/80 neu-sunken-sm ${
                            isDragging ? 'border-emerald-500 bg-emerald-500/10' : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                            {isUploading ? t('common.uploading', 'Uploading...') : t('common.clickOrDropImage', 'Click to upload or drop image')}
                          </span>
                          <span className="text-[8px] text-slate-400">PNG, JPG, SVG, WebP up to 5MB</span>
                        </div>
                      </div>
                    )}

                    {uploadMode === 'url' && (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://example.com/logo.png or image link..."
                            value={form.icon && (form.icon.startsWith('http') || form.icon.startsWith('data:')) ? form.icon : ''}
                            onChange={(e) => {
                              const clean = sanitizeImageUrl(e.target.value);
                              setForm((prev) => ({ ...prev, icon: clean }));
                            }}
                            onPaste={(e) => {
                              const pasteText = e.clipboardData.getData('text');
                              if (pasteText) {
                                e.preventDefault();
                                const clean = sanitizeImageUrl(pasteText);
                                setForm((prev) => ({ ...prev, icon: clean }));
                              }
                            }}
                            className="w-full h-9 px-3 neu-input font-medium text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block">
                          {t('onlineOrders.pasteUrlHint', 'Paste direct image URL (PNG, JPG, WebP, SVG) or Google image link')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 neu-btn font-bold cursor-pointer">{t('common.cancel', 'Cancel')}</button>
                <button type="submit" className="px-5 py-2 neu-btn-primary font-black cursor-pointer">{t('common.save', 'Save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER MODAL */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl neu-card-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingCustomer ? t('onlineOrders.editCustomerTitle', 'Edit Customer Details') : t('onlineOrders.addCustomerTitle', 'Add New Customer Profile')}
              </h3>
              <button onClick={() => setCustomerModalOpen(false)} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">{t('onlineOrders.genderSelectLabel', 'Sex / Gender')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'] as CustomerGender[]).map((g) => {
                    const info = GENDER_CONFIG[g];
                    const isSelected = customerForm.gender === g;
                    const IconComp = info.Icon;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setCustomerForm({ ...customerForm, gender: g })}
                        className={`p-2.5 rounded-2xl font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                            : 'neu-btn text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <IconComp className={`w-5 h-5 ${isSelected ? 'text-inherit' : info.color}`} />
                        <span className="text-[11px]">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.firstName', 'First Name')} <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full h-9 px-3 neu-input font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.surname', 'Surname / Last Name')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Smith"
                    value={customerForm.surname}
                    onChange={(e) => setCustomerForm({ ...customerForm, surname: e.target.value })}
                    className="w-full h-9 px-3 neu-input font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.phone', 'Phone Number')}</label>
                  <input
                    type="text"
                    placeholder="e.g. +856 20 5555 1234"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full h-9 px-3 neu-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.email', 'Email Address')}</label>
                  <input
                    type="email"
                    placeholder="e.g. customer@example.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full h-9 px-3 neu-input"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">{t('onlineOrders.deliveryAddress', 'Delivery Address / Drop-off Point')}</label>
                <input
                  type="text"
                  placeholder="e.g. Building A, Samsenthai Road"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full h-9 px-3 neu-input"
                />
              </div>

              <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-3">
                <div className="font-extrabold text-xs flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                  <span>{t('onlineOrders.ordersValuesCurrency', 'Orders, Values & Currency')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">{t('onlineOrders.totalOrdersField', 'Orders (Total Orders)')}</label>
                    <input
                      type="number"
                      min="0"
                      value={customerForm.totalOrders}
                      onChange={(e) => setCustomerForm({ ...customerForm, totalOrders: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 px-3 neu-input font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">{t('onlineOrders.totalValuesField', 'Values (Total Values Order)')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customerForm.totalSpent}
                      onChange={(e) => setCustomerForm({ ...customerForm, totalSpent: parseFloat(e.target.value) || 0 })}
                      className="w-full h-9 px-3 neu-input font-mono font-bold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">{t('onlineOrders.preferredCurrency', 'Preferred Currency')}</label>
                    <select
                      value={customerForm.currency}
                      onChange={(e) => setCustomerForm({ ...customerForm, currency: e.target.value })}
                      className="w-full h-9 px-3 neu-input font-mono font-bold"
                    >
                      {AVAILABLE_CURRENCIES.map((cur) => (
                        <option key={cur.code} value={cur.code}>
                          {cur.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Profile Photo / Avatar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('onlineOrders.profilePhoto', 'Customer Profile Photo')}</span>
                  </label>

                  <div className="flex items-center neu-tab-container p-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCustomerAvatarMode('file')}
                      className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        customerAvatarMode === 'file'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('onlineOrders.uploadMode', 'Upload')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerAvatarMode('url')}
                      className={`px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                        customerAvatarMode === 'url'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{t('onlineOrders.imageUrlMode', 'Image URL')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Circular Avatar Preview Box */}
                  <div className="w-16 h-16 rounded-full neu-sunken overflow-hidden flex-shrink-0 flex items-center justify-center relative group">
                    {customerAvatarUploading ? (
                      <div className="flex flex-col items-center justify-center text-emerald-500 gap-0.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-[7px] font-bold">{t('common.uploading', 'Uploading')}</span>
                      </div>
                    ) : customerForm.avatarUrl ? (
                      <>
                        <img
                          src={sanitizeImageUrl(customerForm.avatarUrl)}
                          alt="Customer Avatar"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxUrl({
                                icon: customerForm.avatarUrl,
                                title: `${customerForm.name} ${customerForm.surname || ''}`.trim() || 'Customer Avatar Preview',
                                code: 'CUSTOMER',
                              });
                            }}
                            title={t('common.preview', 'Preview')}
                            className="neu-circle-btn w-6 h-6 text-emerald-400 hover:text-white flex items-center justify-center"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerForm((prev) => ({ ...prev, avatarUrl: '' }))}
                            title={t('common.clear', 'Clear')}
                            className="neu-circle-btn w-6 h-6 text-rose-400 hover:text-white flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <Users className="w-6 h-6 text-slate-400 opacity-60" />
                    )}
                  </div>

                  {/* Customer Avatar Input Body */}
                  <div className="flex-1 min-w-0">
                    {customerAvatarMode === 'file' ? (
                      <div>
                        <input
                          ref={customerFileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleCustomerAvatarUpload(e.target.files[0]);
                          }}
                        />
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setCustomerIsDragging(true);
                          }}
                          onDragLeave={() => setCustomerIsDragging(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setCustomerIsDragging(false);
                            if (e.dataTransfer.files?.[0]) handleCustomerAvatarUpload(e.dataTransfer.files[0]);
                          }}
                          onClick={() => customerFileInputRef.current?.click()}
                          className={`h-16 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all px-3 text-center border-slate-300 dark:border-slate-700 hover:border-emerald-500/80 neu-sunken-sm ${
                            customerIsDragging ? 'border-emerald-500 bg-emerald-500/10' : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                            {customerAvatarUploading ? t('common.uploading', 'Uploading...') : t('onlineOrders.clickOrDropPortrait', 'Click to upload portrait photo')}
                          </span>
                          <span className="text-[8px] text-slate-400">PNG, JPG, WebP up to 5MB</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://example.com/avatar.jpg or image link..."
                            value={customerForm.avatarUrl && (customerForm.avatarUrl.startsWith('http') || customerForm.avatarUrl.startsWith('data:')) ? customerForm.avatarUrl : ''}
                            onChange={(e) => {
                              const clean = sanitizeImageUrl(e.target.value);
                              setCustomerForm((prev) => ({ ...prev, avatarUrl: clean }));
                            }}
                            onPaste={(e) => {
                              const pasteText = e.clipboardData.getData('text');
                              if (pasteText) {
                                e.preventDefault();
                                const clean = sanitizeImageUrl(pasteText);
                                setCustomerForm((prev) => ({ ...prev, avatarUrl: clean }));
                              }
                            }}
                            className="w-full h-9 px-3 neu-input font-medium text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block">
                          {t('onlineOrders.pasteUrlHint', 'Paste direct image URL (PNG, JPG, WebP) or Google image link')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex justify-end gap-2">
                <button type="button" onClick={() => setCustomerModalOpen(false)} className="px-4 py-2 neu-btn font-bold cursor-pointer">{t('common.cancel', 'Cancel')}</button>
                <button type="submit" className="px-5 py-2 neu-btn-primary font-black cursor-pointer">{t('common.save', 'Save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE PLATFORM MODAL */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={t('onlineOrders.deletePlatformPrompt', 'Delete Online Platform?')}
        message={t('onlineOrders.deletePlatformConfirm', 'Are you sure you want to delete {{name}}?', { name: deleteConfirm?.name || '' })}
        itemName={deleteConfirm?.name}
        imageUrl={deleteConfirm?.icon && (deleteConfirm.icon.startsWith('/uploads/') || deleteConfirm.icon.startsWith('http')) ? deleteConfirm.icon : undefined}
        warningNote={t('onlineOrders.deletePlatformWarning', 'Order history and active integrations tied to this channel will be archived.')}
        variant="danger"
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
      />

      {/* DELETE CUSTOMER MODAL */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteCustomerConfirm)}
        onClose={() => setDeleteCustomerConfirm(null)}
        onConfirm={handleDeleteCustomer}
        title={t('onlineOrders.deleteCustomerPrompt', 'Delete Customer Profile?')}
        message={t('onlineOrders.deleteCustomerConfirm', 'Are you sure you want to delete {{name}}?', { name: deleteCustomerConfirm ? `${deleteCustomerConfirm.name} ${deleteCustomerConfirm.surname || ''}`.trim() : '' })}
        itemName={deleteCustomerConfirm ? `${deleteCustomerConfirm.name} ${deleteCustomerConfirm.surname || ''}`.trim() : undefined}
        variant="danger"
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
      />

      {/* ADD / EDIT COURIER MODAL */}
      {courierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-purple-500 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {editingCourier ? t('onlineOrders.editCourierTitle', 'Edit Courier Partner') : t('onlineOrders.addCourierTitle', 'Add New Courier Partner')}
                  </h3>
                  <p className="text-[10px] text-slate-400">{t('onlineOrders.courierModalSubtitle', 'Configure logistics company & default delivery fee')}</p>
                </div>
              </div>
              <button onClick={() => setCourierModalOpen(false)} className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveCourier} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold block mb-1">{t('onlineOrders.courierCompanyName', 'Courier / Company Name')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flash Express, Anousith"
                    value={courierForm.name}
                    onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })}
                    className="w-full h-8 px-2.5 neu-input text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.colPrefix', 'Code')} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLASH"
                    value={courierForm.code}
                    onChange={(e) => setCourierForm({ ...courierForm, code: e.target.value.toUpperCase() })}
                    className="w-full h-8 px-2.5 neu-input text-xs font-mono font-bold text-slate-900 dark:text-white uppercase"
                  />
                </div>
              </div>

              {/* Icon / Image Control Mode Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold block text-slate-800 dark:text-white">{t('onlineOrders.courierLogoLabel', 'Courier Logo / Avatar')}</label>
                  <div className="p-1 neu-tab-container flex items-center gap-1 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCourierUploadMode('presets')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        courierUploadMode === 'presets'
                          ? 'neu-tab-active shadow-neu-raised-sm text-purple-600 dark:text-purple-300'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t('onlineOrders.presets', 'Presets')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourierUploadMode('file')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        courierUploadMode === 'file'
                          ? 'neu-tab-active shadow-neu-raised-sm text-purple-600 dark:text-purple-300'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t('onlineOrders.uploadMode', 'Upload')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourierUploadMode('url')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                        courierUploadMode === 'url'
                          ? 'neu-tab-active shadow-neu-raised-sm text-purple-600 dark:text-purple-300'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t('onlineOrders.imageUrlMode', 'Image URL')}</span>
                    </button>
                  </div>
                </div>

                {/* Mode 1: Vector Lucide Presets */}
                {courierUploadMode === 'presets' && (
                  <div className="grid grid-cols-5 gap-2 p-2.5 rounded-2xl neu-sunken-sm">
                    {VECTOR_COURIER_PRESETS.map((preset) => {
                      const IconComp = preset.Icon;
                      const isSelected =
                        courierForm.icon === preset.id ||
                        courierForm.icon === preset.label ||
                        (preset.id === 'truck' && (!courierForm.icon || courierForm.icon === '🚚'));
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setCourierForm({ ...courierForm, icon: preset.id })}
                          className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer group ${
                            isSelected
                              ? 'neu-tab-active shadow-neu-raised-sm text-purple-600 dark:text-purple-300 scale-105'
                              : 'neu-btn text-slate-600 dark:text-slate-400 hover:text-purple-500'
                          }`}
                          title={preset.label}
                        >
                          <IconComp
                            className={`w-5 h-5 ${
                              isSelected
                                ? 'text-purple-600 dark:text-purple-300'
                                : 'text-slate-600 dark:text-slate-400 group-hover:text-purple-500'
                            }`}
                          />
                          <span
                            className={`text-[9px] font-bold truncate max-w-full ${
                              isSelected ? 'text-purple-600 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {preset.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mode 2: File Upload (Drag & Drop + Browse) */}
                {courierUploadMode === 'file' && (
                  <div className="space-y-2">
                    <input
                      ref={courierFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleCourierFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setCourierIsDragging(true);
                      }}
                      onDragLeave={() => setCourierIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setCourierIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleCourierFileUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => courierFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                        courierIsDragging
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-slate-300 dark:border-slate-700 hover:border-purple-500/80 neu-sunken-sm'
                      }`}
                    >
                      <Upload className="w-5 h-5 text-purple-500 mb-1" />
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                        {courierIsUploading ? t('onlineOrders.uploadingCourierLogo', 'Uploading courier logo...') : t('onlineOrders.browseOrDropCourierLogo', 'Click to browse or drop courier logo')}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, SVG, WebP up to 5MB
                      </span>
                    </div>

                    {/* Image Preview if uploaded */}
                    {courierForm.icon && (courierForm.icon.startsWith('/uploads/') || courierForm.icon.startsWith('http') || courierForm.icon.startsWith('data:')) && (
                      <div className="flex items-center justify-between p-2.5 rounded-2xl neu-sunken-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={sanitizeImageUrl(courierForm.icon)}
                            alt="Preview"
                            className="w-10 h-10 rounded-xl object-cover border border-purple-500/30 bg-white"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-purple-900 dark:text-purple-200 block truncate">{t('onlineOrders.logoAttached', 'Logo Attached')}</span>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono truncate block">
                              {courierForm.icon}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourierForm({ ...courierForm, icon: '🚚' });
                          }}
                          className="w-8 h-8 neu-circle-btn text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remove Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode 3: Image URL */}
                {courierUploadMode === 'url' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Paste image link e.g. https://example.com/logo.png"
                      value={courierForm.icon && (courierForm.icon.startsWith('http') || courierForm.icon.startsWith('/uploads/')) ? courierForm.icon : ''}
                      onChange={(e) => {
                        const clean = sanitizeImageUrl(e.target.value);
                        setCourierForm({ ...courierForm, icon: clean });
                      }}
                      onPaste={(e) => {
                        const pasteText = e.clipboardData.getData('text');
                        if (pasteText) {
                          e.preventDefault();
                          const clean = sanitizeImageUrl(pasteText);
                          setCourierForm((prev) => ({ ...prev, icon: clean }));
                        }
                      }}
                      className="w-full h-8 px-2.5 neu-input text-xs font-mono font-medium text-slate-900 dark:text-white"
                    />
                    {courierForm.icon && (courierForm.icon.startsWith('http') || courierForm.icon.startsWith('/uploads/')) && (
                      <div className="flex items-center gap-2.5 p-2 rounded-xl neu-sunken-sm">
                        <img
                          src={sanitizeImageUrl(courierForm.icon)}
                          alt="Preview"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=Invalid+URL';
                          }}
                          className="w-8 h-8 rounded-lg object-cover bg-white"
                        />
                        <div className="text-[11px] truncate flex-1 font-mono text-slate-500">
                          {courierForm.icon}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCourierForm({ ...courierForm, icon: '🚚' })}
                          className="text-rose-500 hover:text-rose-600 text-xs font-bold px-2 py-1 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone & Tracking Link */}
              <div className="space-y-3">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.hotlinePhone', 'Hotline / Dispatch Phone Number')}</label>
                  <input
                    type="text"
                    placeholder="e.g. 020 9999 8888, 1436"
                    value={courierForm.phone}
                    onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })}
                    className="w-full h-8 px-2.5 neu-input text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">
                    {t('onlineOrders.liveTrackingTemplate', 'Live Tracking URL Template')} <span className="text-[10px] font-normal text-slate-400">({'{TRACKING_NO}'} placeholder)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://flashexpress.la/tracking/{TRACKING_NO}"
                    value={courierForm.trackingUrlTemplate}
                    onChange={(e) => setCourierForm({ ...courierForm, trackingUrlTemplate: e.target.value })}
                    className="w-full h-8 px-2.5 neu-input text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Default Delivery Fee & Fee Payer Controller */}
              <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs flex items-center gap-1 text-slate-800 dark:text-white">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span>{t('onlineOrders.defaultShippingFeeLabel', 'Default Delivery Shipping Fee')}</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={courierForm.defaultFee}
                      onChange={(e) => setCourierForm({ ...courierForm, defaultFee: Number(e.target.value) || 0 })}
                      className="w-28 h-8 px-2.5 text-right neu-input font-mono font-black text-xs"
                    />
                    <span className="font-bold text-[11px] text-slate-500">{baseCode}</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[10px] text-slate-400 block mb-1.5 uppercase tracking-wider">
                    {t('onlineOrders.defaultFeePayerLabel', 'Default Fee Payer (Who Handles Shipping Cost?)')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCourierForm({ ...courierForm, defaultFeePayer: 'CUSTOMER_PAYS' })}
                      className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        courierForm.defaultFeePayer === 'CUSTOMER_PAYS'
                          ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>{t('onlineOrders.payerCustomer', 'Customer Pays')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {t('onlineOrders.payerCustomerDesc', 'Paid directly on arrival • Excluded from store P&L')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCourierForm({ ...courierForm, defaultFeePayer: 'SELLER_PAYS' })}
                      className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        courierForm.defaultFeePayer === 'SELLER_PAYS'
                          ? 'neu-tab-active shadow-neu-raised-sm text-amber-600 dark:text-amber-400 font-bold'
                          : 'neu-btn text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <div className="font-extrabold text-xs flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>{t('onlineOrders.payerStore', 'Store Pays (Free Ship)')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {t('onlineOrders.payerStoreDesc', 'Freight expense • Accounted into OPEX P&L')}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes & Active status */}
              <div className="space-y-2">
                <div>
                  <label className="font-bold block mb-1">{t('onlineOrders.internalNotes', 'Internal Notes / Delivery Areas')}</label>
                  <input
                    type="text"
                    placeholder="e.g. Vientiane Capital Express 24h"
                    value={courierForm.notes}
                    onChange={(e) => setCourierForm({ ...courierForm, notes: e.target.value })}
                    className="w-full h-8 px-2.5 neu-input text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div
                  onClick={() => setCourierForm({ ...courierForm, isActive: !courierForm.isActive })}
                  className="flex items-center gap-3 pt-1 cursor-pointer"
                >
                  <CustomCheckbox
                    checked={courierForm.isActive}
                    onChange={(checked) => setCourierForm({ ...courierForm, isActive: checked })}
                  />
                  <span className="font-bold text-xs select-none text-slate-800 dark:text-slate-200">
                    {t('onlineOrders.enableCourierToggle', 'Enable courier for live order assignment & dispatch')}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200/50 dark:border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setCourierModalOpen(false)}
                  className="px-4 py-2 neu-btn font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 neu-btn-primary font-extrabold shadow-md active:scale-95 cursor-pointer"
                >
                  {editingCourier ? t('common.saveChanges', 'Save Changes') : t('onlineOrders.createCourier', 'Create Courier')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE COURIER CONFIRM MODAL */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteCourierConfirm)}
        onClose={() => setDeleteCourierConfirm(null)}
        onConfirm={handleDeleteCourier}
        title={t('onlineOrders.deleteCourierPrompt', 'Delete Courier Partner?')}
        message={t('onlineOrders.deleteCourierConfirm', 'Are you sure you want to delete {{name}} ({{code}})?', { name: deleteCourierConfirm?.name || '', code: deleteCourierConfirm?.code || '' })}
        itemName={deleteCourierConfirm ? `${deleteCourierConfirm.name} (${deleteCourierConfirm.code})` : undefined}
        variant="danger"
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
      />

      {/* LIGHTBOX */}
      {lightboxUrl && (
        <div
          onClick={() => {
            setLightboxUrl(null);
            setZoomLevel(1);
            setRotation(0);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md neu-card-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200/80 dark:border-slate-800/80"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{lightboxUrl.title}</h3>
                  <p className="text-slate-400 font-mono text-[10px] font-bold">{t('onlineOrders.codePrefix', 'Prefix Code: {{code}}', { code: lightboxUrl.code })}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setLightboxUrl(null);
                  setZoomLevel(1);
                  setRotation(0);
                }}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-56 rounded-2xl bg-slate-950/60 dark:bg-slate-950/90 neu-sunken flex items-center justify-center overflow-hidden p-4">
              {lightboxUrl.icon && (lightboxUrl.icon.startsWith('/uploads/') || lightboxUrl.icon.startsWith('http')) ? (
                <img
                  src={lightboxUrl.icon}
                  alt={lightboxUrl.title}
                  style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
              ) : (
                <div style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }} className="text-7xl">{lightboxUrl.icon}</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
