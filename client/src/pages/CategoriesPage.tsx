import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { soundFX } from '../utils/audio';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Package,
  Coffee,
  Utensils,
  Cake,
  ShoppingBag,
  HeartPulse,
  Laptop,
  Shirt,
  Dumbbell,
  Car,
  Home,
  Music,
  BookOpen,
  Palette,
  Gem,
  Flower2,
  Baby,
  Dog,
  Wrench,
  Sofa,
  Glasses,
  Search,
  ArrowUpDown,
  RotateCcw,
  LayoutList,
  GitFork,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  CornerDownRight,
  Folder,
  Layers,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';

// ── Icon Registry ────────────────────────────────────────────────
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Coffee,
  Utensils,
  Cake,
  ShoppingBag,
  HeartPulse,
  Laptop,
  Shirt,
  Dumbbell,
  Car,
  Home,
  Music,
  BookOpen,
  Palette,
  Gem,
  Flower2,
  Baby,
  Dog,
  Wrench,
  Sofa,
  Glasses,
  Package,
};

const ICON_NAMES = Object.keys(ICON_MAP);

// ── Color hues for category badges ───────────────────────────────
const BADGE_COLORS = [
  'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
  'bg-sky-500/15 text-sky-400 ring-sky-500/25',
  'bg-amber-500/15 text-amber-400 ring-amber-500/25',
  'bg-rose-500/15 text-rose-400 ring-rose-500/25',
  'bg-violet-500/15 text-violet-400 ring-violet-500/25',
  'bg-teal-500/15 text-teal-400 ring-teal-500/25',
  'bg-fuchsia-500/15 text-fuchsia-400 ring-fuchsia-500/25',
  'bg-orange-500/15 text-orange-400 ring-orange-500/25',
];

function badgeColor(index: number) {
  return BADGE_COLORS[index % BADGE_COLORS.length];
}

// ── Types ────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  code: string;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  productCount: number;
}

export type CategorySortField = 'ORDER' | 'NAME' | 'CODE' | 'PRODUCTS';
export type CategoryViewMode = 'TABLE' | 'TREE';

const EMPTY_FORM = { name: '', code: '', icon: 'Package', parentId: '' };

// ── Page Component ───────────────────────────────────────────────
export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Multi-Facet Controls & View State ──
  const [viewMode, setViewMode] = useState<CategoryViewMode>('TABLE');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'ROOT' | 'SUB'>('ALL');
  const [productFilter, setProductFilter] = useState<'ALL' | 'HAS_PRODUCTS' | 'EMPTY'>('ALL');
  const [sortField, setSortField] = useState<CategorySortField>('ORDER');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10); // 10, 25, 50, 100, 999999

  // Batch Selection State
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (text: string, type: 'success' | 'error') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data.categories || []);
    } catch {
      console.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────
  const handleOpenAdd = (defaultParentId = '') => {
    setEditing(null);
    setFormData({ ...EMPTY_FORM, parentId: defaultParentId });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditing(cat);
    setFormData({
      name: cat.name,
      code: cat.code,
      icon: cat.icon || 'Package',
      parentId: cat.parentId || '',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, formData);
        showToast(`Category "${formData.name}" updated successfully`, 'success');
      } else {
        await api.post('/categories', formData);
        showToast(`Category "${formData.name}" created successfully`, 'success');
      }
      soundFX.playCashSuccess();
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      soundFX.playError();
      setErrorMsg(err.response?.data?.message || err.message || 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/categories/${deleteConfirm.id}`);
      soundFX.playCashSuccess();
      showToast(`Category "${deleteConfirm.name}" deleted successfully`, 'success');
      setDeleteConfirm(null);
      fetchCategories();
    } catch (err: any) {
      soundFX.playError();
      setErrorMsg(err.response?.data?.message || 'Delete failed');
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCategoryIds.size === 0) return;
    try {
      const ids = Array.from(selectedCategoryIds);
      await Promise.all(ids.map((id) => api.delete(`/categories/${id}`)));
      soundFX.playCashSuccess();
      showToast(`Deleted ${ids.length} categories`, 'success');
      setSelectedCategoryIds(new Set());
      setBulkDeleteConfirm(false);
      fetchCategories();
    } catch (err: any) {
      soundFX.playError();
      showToast(`Bulk delete error: ${err.message}`, 'error');
      setBulkDeleteConfirm(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const ordered = [...categories];
    [ordered[index], ordered[swapIdx]] = [ordered[swapIdx], ordered[index]];
    const orderedIds = ordered.map((c) => c.id);

    setCategories(ordered);

    try {
      await api.put('/categories/reorder', { orderedIds });
    } catch {
      fetchCategories();
    }
  };

  const handleSort = (field: CategorySortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ── High-Performance Filter & Sort ─────────────────────────────
  const filteredAndSorted = useMemo(() => {
    let list = categories.filter((cat) => {
      // Level Filter
      if (levelFilter === 'ROOT' && cat.parentId !== null) return false;
      if (levelFilter === 'SUB' && cat.parentId === null) return false;

      // Product Count Filter
      if (productFilter === 'HAS_PRODUCTS' && cat.productCount === 0) return false;
      if (productFilter === 'EMPTY' && cat.productCount > 0) return false;

      // Search Query
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matches =
          cat.name.toLowerCase().includes(s) ||
          cat.code.toLowerCase().includes(s);
        if (!matches) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'ORDER':
          comparison = a.sortOrder - b.sortOrder;
          break;
        case 'NAME':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'CODE':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'PRODUCTS':
          comparison = a.productCount - b.productCount;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [categories, levelFilter, productFilter, search, sortField, sortDirection]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [levelFilter, productFilter, search]);

  // Pagination Slicing
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedCategories = useMemo(() => {
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, startIndex, endIndex]);

  const handleToggleSelectAllVisible = () => {
    const visibleIds = paginatedCategories.map((c) => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCategoryIds.has(id));

    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActiveFilters =
    levelFilter !== 'ALL' ||
    productFilter !== 'ALL' ||
    search.trim().length > 0;

  const resetAllFilters = () => {
    setLevelFilter('ALL');
    setProductFilter('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  // ── Render helpers ─────────────────────────────────────────────
  const renderIcon = (iconName: string | null, className = 'w-5 h-5') => {
    const Icon = ICON_MAP[iconName || ''] || Package;
    return <Icon className={className} />;
  };

  const parentName = (parentId: string | null) => {
    if (!parentId) return null;
    return categories.find((c) => c.id === parentId)?.name || '—';
  };

  // Hierarchy Tree Builder
  const treeData = useMemo(() => {
    const rootNodes = categories.filter((c) => !c.parentId);
    return rootNodes.map((root) => {
      const children = categories.filter((c) => c.parentId === root.id);
      return { root, children };
    });
  }, [categories]);

  // Total products across all categories
  const totalCatalogProducts = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
  }, [categories]);

  const rootCategoriesCount = useMemo(() => categories.filter((c) => !c.parentId).length, [categories]);
  const subCategoriesCount = useMemo(() => categories.filter((c) => Boolean(c.parentId)).length, [categories]);

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
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              {t('categories.title', 'Category Manager')}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t('categories.subtitle', 'Organize product catalog departments, nested subcategories, and POS navigation')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher: Table vs Tree */}
          <div className="p-1 neu-tab-container flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t('categories.viewTable', 'Paginated Table View')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TREE')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                viewMode === 'TREE'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title={t('categories.viewTree', 'Nested Category Tree View')}
            >
              <GitFork className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => handleOpenAdd()}
            className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('categories.addCategory', 'Add Category')}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl neu-pill text-rose-500 text-xs font-bold animate-pulse">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto p-1 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bento KPI Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('categories.totalCategories', 'Total Categories')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
              <FolderTree className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
            {categories.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('categories.activeCatalogDepts', 'Active catalog departments')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('categories.rootDepartments', 'Root Departments')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-amber-500">
              <Folder className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono flex items-baseline gap-1.5">
            <span>{rootCategoriesCount}</span>
            <span className="text-[10px] font-bold text-slate-400">{t('categories.unitRoots', 'Roots')}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('categories.topLevelNavPillars', 'Top-level navigation pillars')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('categories.subCategories', 'Sub-Categories')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-blue-500">
              <CornerDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono flex items-baseline gap-1.5">
            <span>{subCategoriesCount}</span>
            <span className="text-[10px] font-bold text-slate-400">{t('categories.unitSub', 'Nested')}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('categories.nestedSubLevels', 'Nested sub-level categories')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('categories.categorizedProducts', 'Categorized Products')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-indigo-500">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight flex items-baseline gap-1.5">
            <span>{totalCatalogProducts}</span>
            <span className="text-[10px] font-bold text-slate-400">{t('categories.unitSKUs', 'SKUs')}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('categories.assignedToCategories', 'Assigned to active categories')}
          </div>
        </div>
      </div>

      {/* Main Table Management Container (Fills exact viewport height) */}
      <div className="neu-card-lg overflow-hidden flex-1 min-h-0 flex flex-col space-y-0 rounded-3xl">
        {/* Multi-Facet Filter Toolbar */}
        <div className="p-4 border-b border-slate-200/50 dark:border-slate-800/80 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('categories.searchPlaceholder', 'Search category name or code...')}
                  className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>

              {/* Hierarchy Level Dropdown */}
              <div className="w-48">
                <CustomSelect
                  value={levelFilter}
                  onChange={(val) => setLevelFilter(val as any)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('categories.allLevels', 'All Hierarchy Levels'),
                      icon: <FolderTree className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    {
                      value: 'ROOT',
                      label: t('categories.rootCategoriesOnly', 'Root Categories Only'),
                      icon: <Folder className="w-3.5 h-3.5 text-amber-500" />,
                    },
                    {
                      value: 'SUB',
                      label: t('categories.subcategoriesOnly', 'Subcategories Only'),
                      icon: <CornerDownRight className="w-3.5 h-3.5 text-blue-500" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Product Count Filter Dropdown */}
              <div className="w-48">
                <CustomSelect
                  value={productFilter}
                  onChange={(val) => setProductFilter(val as any)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('categories.allProductCounts', 'All Product Counts'),
                      icon: <Layers className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    {
                      value: 'HAS_PRODUCTS',
                      label: t('categories.hasProducts', 'Has Products (>0)'),
                      icon: <Package className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    {
                      value: 'EMPTY',
                      label: t('categories.emptyProducts', 'Empty (0 Products)'),
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                  title={t('categories.resetActiveFilters', 'Clear all active filters')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right: Summary & Bulk Actions */}
            <div className="flex items-center gap-3 justify-between lg:justify-end flex-shrink-0">
              {selectedCategoryIds.size > 0 ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-150">
                  <span className="px-2.5 py-1 rounded-xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    {t('categories.selectedCount', '{{count}} Selected', { count: selectedCategoryIds.size })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="px-3.5 py-1.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('categories.deleteSelected', 'Delete Selected')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryIds(new Set())}
                    className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-bold">
                  {totalItems === 0
                    ? t('categories.zeroCategoriesFound', '0 categories found')
                    : t('categories.showingCategories', 'Showing {{start}}–{{end}} of {{total}} categories', {
                        start: startIndex + 1,
                        end: endIndex,
                        total: totalItems,
                      })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="text-xs font-semibold">{t('common.loading', 'Loading categories...')}</span>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FolderTree className="w-10 h-10 opacity-30" />
            <span className="text-xs font-semibold">{t('categories.noMatchingCategories', 'No matching categories found')}</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-1 text-xs text-emerald-500 font-bold underline cursor-pointer"
              >
                {t('categories.resetAllFilters', 'Reset all filters')}
              </button>
            )}
          </div>
        ) : viewMode === 'TREE' ? (
          /* ── Nested Tree View ── */
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-thin">
            {treeData.map(({ root, children }) => (
              <div
                key={root.id}
                className="p-4 rounded-2xl neu-card-sm space-y-3"
              >
                {/* Root Category Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                      {renderIcon(root.icon, 'w-5 h-5')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {root.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold neu-sunken-sm text-slate-600 dark:text-slate-300">
                          {root.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {t('categories.treeSummary', '{{count}} direct products • {{subCount}} subcategories', {
                          count: root.productCount,
                          subCount: children.length,
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenAdd(root.id)}
                      className="px-3 py-1.5 neu-btn text-slate-700 dark:text-slate-300 hover:text-emerald-500 text-[11px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Add subcategory inside this department"
                    >
                      <Plus className="w-3 h-3 text-emerald-500" />
                      <span>{t('categories.btnAddSubcategory', 'Subcategory')}</span>
                    </button>
                    <button
                      onClick={() => handleOpenEdit(root)}
                      className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(root)}
                      className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                {children.length > 0 && (
                  <div className="pl-6 pt-1 border-l-2 border-slate-200/50 dark:border-slate-800/80 ml-4 space-y-2">
                    {children.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3 rounded-2xl neu-sunken-sm flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                          <div className="w-8 h-8 rounded-xl neu-card-sm flex items-center justify-center text-slate-600 dark:text-slate-300">
                            {renderIcon(sub.icon, 'w-4 h-4')}
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {sub.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg font-mono text-[9px] font-bold neu-sunken-sm text-slate-400">
                            {sub.code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {t('categories.treeSubProducts', '({{count}} products)', { count: sub.productCount })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(sub)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(sub)}
                            className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ── Table View ── */
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin relative">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 neu-sunken-sm bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none shadow-sm">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <CustomCheckbox
                      checked={
                        paginatedCategories.length > 0 &&
                        paginatedCategories.every((c) => selectedCategoryIds.has(c.id))
                      }
                      indeterminate={
                        selectedCategoryIds.size > 0 &&
                        !paginatedCategories.every((c) => selectedCategoryIds.has(c.id))
                      }
                      onChange={handleToggleSelectAllVisible}
                      size="sm"
                      ariaLabel="Select all visible categories"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('ORDER')}
                    className="p-4 w-12 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>#</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${sortField === 'ORDER' ? 'text-emerald-500' : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('NAME')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('categories.colName', 'Category Name')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${sortField === 'NAME' ? 'text-emerald-500' : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('CODE')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('categories.colCode', 'Code')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${sortField === 'CODE' ? 'text-emerald-500' : 'opacity-30'}`}
                      />
                    </div>
                  </th>
                  <th className="p-4">{t('categories.colParentLevel', 'Parent Level')}</th>
                  <th
                    onClick={() => handleSort('PRODUCTS')}
                    className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t('categories.colProductsCount', 'Products')}</span>
                      <ArrowUpDown
                        className={`w-3.5 h-3.5 ${
                          sortField === 'PRODUCTS' ? 'text-emerald-500' : 'opacity-30'
                        }`}
                      />
                    </div>
                  </th>
                  <th className="p-4 text-right">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {paginatedCategories.map((cat, idx) => {
                  const globalIdx = startIndex + idx;
                  const isSelected = selectedCategoryIds.has(cat.id);

                  return (
                    <tr
                      key={cat.id}
                      className={`transition-colors group ${
                        isSelected
                          ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                          : 'hover:bg-slate-500/5'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cat.id)}
                          size="sm"
                          ariaLabel={`Select ${cat.name}`}
                        />
                      </td>

                      {/* Order arrows */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMove(globalIdx, 'up')}
                            disabled={globalIdx === 0}
                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(globalIdx, 'down')}
                            disabled={globalIdx === categories.length - 1}
                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Name + Icon */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                            {renderIcon(cat.icon, 'w-4.5 h-4.5')}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {cat.name}
                            </div>
                            {cat.parentId && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                                <CornerDownRight className="w-3 h-3" />
                                <span>{t('categories.childOf', 'Child of {{parent}}', { parent: parentName(cat.parentId) })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold neu-sunken-sm text-slate-600 dark:text-slate-300">
                          {cat.code}
                        </span>
                      </td>

                      {/* Parent */}
                      <td className="p-4 text-slate-400">
                        {cat.parentId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg neu-sunken-sm text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                            <CornerDownRight className="w-3 h-3 text-slate-400" />
                            <span>{parentName(cat.parentId)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold text-amber-500">
                            <Folder className="w-3.5 h-3.5 text-amber-500" />
                            <span>{t('categories.rootDepartment', 'Root Department')}</span>
                          </span>
                        )}
                      </td>

                      {/* Product count */}
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-xl font-mono font-bold text-[11px] ${
                            cat.productCount > 0
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'neu-sunken-sm text-slate-400'
                          }`}
                        >
                          {t('categories.productsCountBadge', '{{count}} products', { count: cat.productCount })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                            title={t('categories.editCategory', 'Edit category')}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(cat)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title={t('categories.deleteCategory', 'Delete category')}
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
        )}

        {/* Enterprise Pagination Footer Bar */}
        {viewMode === 'TABLE' && (
          <div className="p-3.5 border-t border-slate-200/40 dark:border-slate-800/60 neu-sunken-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Left: Page Size Selector */}
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-semibold">{t('categories.categoriesPerPage', 'Categories per page:')}</span>
              <div className="w-28">
                <CustomSelect
                  value={String(pageSize)}
                  onChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                    { value: '100', label: '100' },
                    { value: '999999', label: t('categories.allWithCount', `All (${totalItems})`, { total: totalItems }) },
                  ]}
                  size="sm"
                  placement="up"
                  dropdownWidth="w-28"
                />
              </div>

              <span className="text-slate-400 font-medium">
                {t('categories.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
              </span>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={effectivePage <= 1}
                className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title={t('common.firstPage', 'First Page')}
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={effectivePage <= 1}
                className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title={t('common.previousPage', 'Previous Page')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 1)
                .map((pageNumber, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={pageNumber}>
                      {prev && pageNumber - prev > 1 && (
                        <span className="px-1 text-slate-400 select-none">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-7 h-7 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                          pageNumber === effectivePage
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'neu-btn text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={effectivePage >= totalPages}
                className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title={t('common.nextPage', 'Next Page')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={effectivePage >= totalPages}
                className="w-8 h-8 neu-circle-btn disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title={t('common.lastPage', 'Last Page')}
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                  <FolderTree className="w-4 h-4" />
                </div>
                <span>{editing ? t('categories.editCategoryTitle', 'Edit Category') : t('categories.addNewCategoryTitle', 'Add New Category')}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('categories.fieldName', 'Category Name')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Beverages & Drinks"
                  className="w-full pl-3.5 pr-3.5 py-2 neu-input text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('categories.fieldCode', 'Code')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. BEV"
                    className="w-full pl-3.5 pr-3.5 py-2 neu-input text-xs font-bold font-mono text-slate-900 dark:text-white uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('categories.fieldParent', 'Parent Category')}</label>
                  <CustomSelect
                    value={formData.parentId}
                    onChange={(val) => setFormData({ ...formData, parentId: val })}
                    options={[
                      { value: '', label: t('categories.noneRootCategory', 'None (Root Category)') },
                      ...categories
                        .filter((c) => !editing || c.id !== editing.id)
                        .map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    size="md"
                    searchable={true}
                    placeholder={t('categories.noneRootCategory', 'None (Root Category)')}
                  />
                </div>
              </div>

              {/* Icon Selector Grid */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1.5">{t('categories.fieldIcon', 'Category Icon')}</label>
                <div className="grid grid-cols-7 gap-1.5 p-2.5 rounded-2xl neu-sunken-sm max-h-36 overflow-y-auto">
                  {ICON_NAMES.map((name) => {
                    const Icon = ICON_MAP[name];
                    const selected = formData.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: name })}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          selected
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 neu-card-sm'
                        }`}
                        title={name}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs cursor-pointer"
                >
                  {editing ? t('categories.btnUpdate', 'Update Category') : t('categories.btnSave', 'Save Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Single Delete Confirmation Modal ── */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={t('categories.deleteConfirmTitle', 'Delete "{{name}}"?', { name: deleteConfirm?.name || '' })}
        message={
          (deleteConfirm?.productCount || 0) > 0
            ? t('categories.deleteConfirmWarning', 'Warning: This category contains {{count}} products. Deleting will unassign their category.', { count: deleteConfirm?.productCount || 0 })
            : t('categories.deleteConfirmMessage', 'Are you sure you want to delete this category? This action cannot be undone.')
        }
        confirmLabel={t('categories.btnDeleteCategory', 'Delete Category')}
        variant="danger"
      />

      {/* ── Bulk Delete Confirmation Modal ── */}
      <AnimatedConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={t('categories.bulkDeleteTitle', 'Delete {{count}} Selected Categories?', { count: selectedCategoryIds.size })}
        message={t('categories.bulkDeleteMessage', 'This will permanently delete the selected categories. Associated products will remain in your catalog but will have their category unassigned.')}
        confirmLabel={t('categories.btnDeleteSelected', 'Delete Selected')}
        variant="danger"
      />
    </div>
  );
};
export default CategoriesPage;
