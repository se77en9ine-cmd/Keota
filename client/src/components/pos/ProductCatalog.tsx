import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductDTO, ProductVariantDTO } from '39pos-shared';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { soundFX } from '../../utils/audio';
import {
  Search,
  Plus,
  Layers,
  AlertCircle,
  QrCode,
  LayoutGrid,
  List,
  Grid2X2,
  FolderOpen,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Hourglass,
  Clock,
  AlertTriangle,
  Calendar,
  ArrowDownAZ,
  ArrowUpZA,
  TrendingUp,
  TrendingDown,
  Boxes,
} from 'lucide-react';
import { FloatingScannerHUD } from './FloatingScannerHUD';
import { ExpiryBadge } from '../common/ExpiryBadge';
import { getExpiryTierInfo, calculateDaysDiff } from '../../utils/expiryTagUtils';

export type CatalogViewMode = 'GRID' | 'COMPACT' | 'TILES';
export type CatalogSortOption =
  | 'DEFAULT'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'STOCK_DESC'
  | 'LOW_STOCK'
  | 'EXPIRY_SOON'
  | 'EXPIRED_FIRST';

interface ProductCatalogProps {
  products: ProductDTO[];
  categories: any[];
  onOpenPayment?: () => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ products, categories, onOpenPayment }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<CatalogViewMode>('GRID');
  const [sortBy, setSortBy] = useState<CatalogSortOption>('DEFAULT');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [expiring14DaysOnly, setExpiring14DaysOnly] = useState<boolean>(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [activeVariantProduct, setActiveVariantProduct] = useState<ProductDTO | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [outOfStockToast, setOutOfStockToast] = useState<{ message: string; productName?: string } | null>(null);

  const catScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const { addItem } = useCartStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const { businessMode, expiryTagConfig } = useSettingsStore();
  const warningDays = expiryTagConfig?.tiers?.warning?.daysThreshold ?? 30;

  // Auto-dismiss out-of-stock toast
  useEffect(() => {
    if (outOfStockToast) {
      const timer = setTimeout(() => setOutOfStockToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [outOfStockToast]);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setSortDropdownOpen(false);
      }
    };
    if (sortDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [sortDropdownOpen]);

  // Global Keyboard shortcuts: F2 = Search, F3 = Category Navigator, F4 = Cycle View Mode
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCategoryModalOpen((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'GRID' ? 'COMPACT' : prev === 'COMPACT' ? 'TILES' : 'GRID'));
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  const handleCatWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (catScrollRef.current && e.deltaY !== 0) {
      catScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (catScrollRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      catScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Products available in current POS Operating Mode
  const modeProducts = useMemo(() => {
    return products.filter((p) => {
      if (businessMode === 'HYBRID') return true;
      if (!p.posMode || p.posMode === 'ALL') return true;
      const modes = p.posMode.split(',').map((m) => m.trim());
      return modes.includes('ALL') || modes.includes(businessMode);
    });
  }, [products, businessMode]);

  // Count items expiring within warning threshold (or already expired)
  const expiring14dCount = useMemo(() => {
    return modeProducts.filter((p) => {
      if (!p.expiryDate) return false;
      const days = calculateDaysDiff(p.expiryDate);
      return days <= warningDays;
    }).length;
  }, [modeProducts, warningDays]);

  // Filtered and Sorted Products (Optimized with useMemo for high-speed POS responsiveness)
  const filteredProducts = useMemo(() => {
    let list = modeProducts.filter((p) => {
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const s = search.toLowerCase().trim();
      const matchesSearch =
        !s ||
        p.name.toLowerCase().includes(s) ||
        p.barcode?.toLowerCase().includes(s) ||
        p.sku?.toLowerCase().includes(s);

      const matchesStock = !inStockOnly || (p.stockQuantity !== undefined && p.stockQuantity > 0);

      let matchesExpiry = true;
      if (expiring14DaysOnly) {
        if (!p.expiryDate) return false;
        const days = calculateDaysDiff(p.expiryDate);
        matchesExpiry = days <= warningDays;
      }

      return matchesCat && matchesSearch && matchesStock && matchesExpiry;
    });

    // Sorting Logic
    if (sortBy === 'NAME_ASC') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'NAME_DESC') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'PRICE_ASC') {
      list.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (sortBy === 'PRICE_DESC') {
      list.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (sortBy === 'STOCK_DESC') {
      list.sort((a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0));
    } else if (sortBy === 'LOW_STOCK') {
      list.sort((a, b) => (a.stockQuantity || 0) - (b.stockQuantity || 0));
    } else if (sortBy === 'EXPIRY_SOON') {
      // FEFO: items with earliest expiry first
      list.sort((a, b) => {
        const daysA = calculateDaysDiff(a.expiryDate);
        const daysB = calculateDaysDiff(b.expiryDate);
        return daysA - daysB;
      });
    } else if (sortBy === 'EXPIRED_FIRST') {
      list.sort((a, b) => {
        const daysA = calculateDaysDiff(a.expiryDate);
        const daysB = calculateDaysDiff(b.expiryDate);
        const expA = daysA <= 0 ? -1 : 1;
        const expB = daysB <= 0 ? -1 : 1;
        return expA - expB;
      });
    }

    return list;
  }, [modeProducts, selectedCategory, search, inStockOnly, expiring14DaysOnly, sortBy, warningDays]);

  const handleProductClick = (product: ProductDTO) => {
    // If product has variants, open variant modal to check per-variant stock
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      setActiveVariantProduct(product);
      return;
    }

    // Strict stock check: block adding to cart if stock <= 0
    const stock = product.stockQuantity ?? 0;
    if (stock <= 0) {
      soundFX.playError();
      setOutOfStockToast({
        message: t('pos.cannotAddOutOfStock', 'Cannot add: "{{name}}" is out of stock (0 in stock)', {
          name: product.name,
        }),
        productName: product.name,
      });
      return;
    }

    soundFX.playBeep();
    addItem(product);
  };

  const handleSelectVariant = (product: ProductDTO, variant: ProductVariantDTO) => {
    // Check variant specific stock or fallback to product stock
    const variantStock = variant.stockQuantity !== undefined ? variant.stockQuantity : (product.stockQuantity ?? 0);
    if (variantStock <= 0) {
      soundFX.playError();
      setOutOfStockToast({
        message: t('pos.cannotAddVariantOutOfStock', 'Cannot add: "{{name}} ({{variant}})" is out of stock', {
          name: product.name,
          variant: variant.name,
        }),
        productName: `${product.name} - ${variant.name}`,
      });
      return;
    }

    soundFX.playBeep();
    addItem(product, variant);
    setActiveVariantProduct(null);
  };

  // Handle Search Input Enter (Scan Barcode / SKU)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = search.trim().toLowerCase();
      if (!q) return;

      const exactMatch = modeProducts.find(
        (p) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q
      );

      if (exactMatch) {
        e.preventDefault();
        handleProductClick(exactMatch);
        setSearch('');
      } else if (filteredProducts.length === 1) {
        e.preventDefault();
        handleProductClick(filteredProducts[0]);
        setSearch('');
      }
    }
  };

  // Handle Camera / QR Scanner Detection
  const handleCameraScan = (code: string) => {
    const q = code.trim().toLowerCase();
    const exactMatch = modeProducts.find(
      (p) => p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q
    );

    if (exactMatch) {
      handleProductClick(exactMatch);
    }
  };

  // Filtered categories for the Category Navigator Modal
  const filteredCategoriesForModal = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const currentCategoryName = useMemo(() => {
    if (selectedCategory === 'ALL') return t('pos.allItems', 'All Items');
    const match = categories.find((c) => c.id === selectedCategory);
    return match ? match.name : selectedCategory;
  }, [selectedCategory, categories, t]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden pr-2 relative">
      {/* Floating Out of Stock Toast Notification */}
      {outOfStockToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-none">
          <div className="px-5 py-3 rounded-2xl shadow-2xl bg-rose-600/95 text-white border border-rose-400/50 backdrop-blur-xl flex items-center gap-3 text-xs font-black shadow-rose-500/30">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span>{outOfStockToast.message}</span>
          </div>
        </div>
      )}

      {/* Compact 2-Row Controls Header */}
      <div className="space-y-2 pb-2">
        {/* Row 1: Unified Action Bar (Search + Expiring 14d + In Stock + Sort + View Switcher) */}
        <div className="flex items-center gap-2">
          {/* Search Input with Scanner Icon & F2 Shortcut */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('pos.scanBarcode', 'Scan barcode / search items (F2)...')}
              className="w-full h-10 pl-10 pr-24 neu-input text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
            />

            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="hidden md:inline-block px-1.5 py-0.5 rounded neu-sunken-sm text-slate-400 font-mono text-[9px] font-bold select-none">
                F2
              </kbd>
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="px-2 py-1 neu-btn text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-extrabold transition-all active:scale-95 cursor-pointer"
                title="Scan Barcode / QR Code with Camera"
              >
                <QrCode className="w-3 h-3" />
                <span className="hidden sm:inline">{t('pos.scan', 'Scan')}</span>
              </button>
            </div>
          </div>

          {/* Dynamic Expiry Reminding Filter Tag */}
          <button
            type="button"
            onClick={() => setExpiring14DaysOnly(!expiring14DaysOnly)}
            className={`h-10 px-2.5 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 cursor-pointer ${
              expiring14DaysOnly
                ? 'neu-sunken text-amber-500 border border-amber-500/40'
                : expiring14dCount > 0
                ? 'neu-btn text-amber-500 shadow-neu-glow-amber'
                : 'neu-btn text-slate-400'
            }`}
            title={`Filter items expiring within ${warningDays} days`}
          >
            <Hourglass className={`w-3.5 h-3.5 ${expiring14DaysOnly ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">{t('pos.filterExpiringDays', 'Expiring ≤{{days}}d', { days: warningDays })}</span>
            <span className="xl:hidden">≤{warningDays}d</span>
            {expiring14dCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  expiring14DaysOnly ? 'bg-amber-500 text-white' : 'neu-pill text-amber-500'
                }`}
              >
                {expiring14dCount}
              </span>
            )}
          </button>

          {/* In Stock Only Toggle */}
          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`h-10 px-2.5 neu-btn text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0 active:scale-95 cursor-pointer ${
              inStockOnly
                ? 'neu-sunken text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30'
                : 'text-slate-400'
            }`}
            title={t('pos.filterInStock', 'Toggle In-Stock Only')}
          >
            <Check className={`w-3 h-3 ${inStockOnly ? 'opacity-100 text-emerald-500' : 'opacity-30'}`} />
            <span className="hidden lg:inline">{t('pos.filterInStock', 'In Stock')}</span>
          </button>

          {/* Custom Theme-Matched Sort Dropdown */}
          <div ref={sortDropdownRef} className="relative flex items-center flex-shrink-0">
            {(() => {
              const sortOptions: { id: CatalogSortOption; label: string; icon: React.ComponentType<{ className?: string }>; color?: string }[] = [
                { id: 'DEFAULT', label: t('pos.sortDefault', 'Sort: Default'), icon: ArrowUpDown, color: 'text-slate-400' },
                { id: 'EXPIRY_SOON', label: t('pos.sortExpirySoon', '⏳ Expiring Soonest (FEFO)'), icon: Hourglass, color: 'text-amber-500' },
                { id: 'EXPIRED_FIRST', label: t('pos.sortExpiredFirst', '⚠️ Expired Items Alert'), icon: AlertTriangle, color: 'text-rose-500' },
                { id: 'NAME_ASC', label: t('pos.sortNameAsc', 'Name (A → Z)'), icon: ArrowDownAZ, color: 'text-emerald-500' },
                { id: 'NAME_DESC', label: t('pos.sortNameDesc', 'Name (Z → A)'), icon: ArrowUpZA, color: 'text-emerald-500' },
                { id: 'PRICE_ASC', label: t('pos.sortPriceAsc', 'Price: Low to High'), icon: TrendingUp, color: 'text-emerald-500' },
                { id: 'PRICE_DESC', label: t('pos.sortPriceDesc', 'Price: High to Low'), icon: TrendingDown, color: 'text-sky-500' },
                { id: 'STOCK_DESC', label: t('pos.sortStockDesc', 'Stock: Highest First'), icon: Boxes, color: 'text-indigo-500' },
                { id: 'LOW_STOCK', label: t('pos.sortLowStock', 'Stock: Low Stock Alert'), icon: AlertCircle, color: 'text-amber-500' },
              ];

              const currentSort = sortOptions.find((s) => s.id === sortBy) || sortOptions[0];
              const CurrentIcon = currentSort.icon;

              return (
                <>
                  <button
                    type="button"
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className={`h-10 px-3 neu-btn flex items-center gap-2 text-[11px] font-extrabold transition-all cursor-pointer select-none active:scale-95 max-w-[150px] sm:max-w-[200px] ${
                      sortDropdownOpen
                        ? 'neu-sunken text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/30'
                        : sortBy !== 'DEFAULT'
                        ? 'neu-sunken text-emerald-600 dark:text-emerald-400'
                        : ''
                    }`}
                  >
                    <CurrentIcon className={`w-3.5 h-3.5 flex-shrink-0 ${currentSort.color || 'text-slate-400'}`} />
                    <span className="truncate flex-1 text-left">{currentSort.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
                        sortDropdownOpen ? 'rotate-180 text-emerald-500' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Floating Menu with Neumorphic Card */}
                  {sortDropdownOpen && (
                    <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 p-1.5 neu-card-lg shadow-neu-raised-lg space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      {sortOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = sortBy === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              soundFX.playBeep();
                              setSortBy(opt.id);
                              setSortDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'neu-sunken text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/30'
                                : 'text-slate-700 dark:text-slate-300 hover:neu-card-sm font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? 'neu-sunken text-emerald-500'
                                    : 'text-slate-400'
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${opt.color || ''}`} />
                              </div>
                              <span className="truncate">{opt.label}</span>
                            </div>

                            {isSelected && (
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-1.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 neu-tab-container flex-shrink-0 h-10">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'GRID'
                  ? 'neu-tab-active shadow-neu-raised-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid Card View (F4)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('COMPACT')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'COMPACT'
                  ? 'neu-tab-active shadow-neu-raised-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Compact List View (F4)"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TILES')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'TILES'
                  ? 'neu-tab-active shadow-neu-raised-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Mini Tiles (F4)"
            >
              <Grid2X2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Touch-Friendly Category Bar (44px Height, Large Legible Pills) */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Quick Category Navigator Button */}
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            className="h-11 px-4 neu-btn text-xs sm:text-sm font-extrabold flex items-center gap-2 flex-shrink-0 transition-all active:scale-95 cursor-pointer"
            title="Open Category Directory (F3)"
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">{t('pos.allCategories', 'Categories')}</span>
            <span className="px-2 py-0.5 rounded-full neu-sunken-sm text-amber-500 text-xs font-mono font-black">
              {categories.length}
            </span>
          </button>

          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="hidden sm:flex w-8 h-11 neu-circle-btn !w-8 !h-11 !rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white items-center justify-center transition-all flex-shrink-0 cursor-pointer"
            title="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Horizontal Category Pills */}
          <div
            ref={catScrollRef}
            onWheel={handleCatWheel}
            className="flex-1 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar smooth-scroll items-center"
          >
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`h-11 px-4 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all active:scale-95 flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'neu-sunken text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'neu-btn text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{t('pos.allItems', 'All Items')}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                  selectedCategory === 'ALL'
                    ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                    : 'neu-sunken-sm text-slate-400'
                }`}
              >
                {modeProducts.length}
              </span>
            </button>

            {categories.map((cat) => {
              const count = modeProducts.filter((p) => p.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-11 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 flex-shrink-0 transition-all active:scale-95 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'neu-sunken text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'neu-btn text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                      isSelected ? 'neu-pill text-emerald-600 dark:text-emerald-400' : 'neu-sunken-sm text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="hidden sm:flex w-8 h-11 neu-circle-btn !w-8 !h-11 !rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white items-center justify-center transition-all flex-shrink-0 cursor-pointer"
            title="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Display Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <AlertCircle className="w-8 h-8 opacity-40" />
            <p className="text-sm font-semibold">{t('pos.noProducts', 'No products found matching criteria')}</p>
            {(inStockOnly || expiring14DaysOnly) && (
              <div className="flex gap-2 mt-1">
                {inStockOnly && (
                  <button
                    type="button"
                    onClick={() => setInStockOnly(false)}
                    className="text-xs text-brand-500 font-bold underline"
                  >
                    {t('pos.clearInStockFilter', 'Clear In Stock filter')}
                  </button>
                )}
                {expiring14DaysOnly && (
                  <button
                    type="button"
                    onClick={() => setExpiring14DaysOnly(false)}
                    className="text-xs text-amber-500 font-bold underline"
                  >
                    {t('pos.clearExpiryFilter', 'Clear Expiry filter')}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : viewMode === 'COMPACT' ? (
          /* View 1: High-Speed Compact List Rows (With Expiry Tag) */
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const priceConverted = convert(product.sellingPrice, baseCode, currentCurrency);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="w-full px-3.5 py-2.5 neu-card-interactive flex items-center justify-between transition-all cursor-pointer group active:scale-[0.99] select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl neu-sunken-sm overflow-hidden flex-shrink-0 relative">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                          39
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                          {product.name}
                        </h4>
                        {product.hasVariants && (
                          <span className="px-1.5 py-0.2 rounded-md neu-pill text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                            {t('pos.variants', 'Variants')}
                          </span>
                        )}
                        {product.expiryDate && (
                          <ExpiryBadge
                            expiryDate={product.expiryDate}
                            batchQuantity={product.activeBatchQty}
                            totalQuantity={product.stockQuantity}
                            batchCount={product.batchCount}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="font-mono">{product.sku}</span>
                        {product.batchNumber && (
                          <span>
                            • Batch: <span className="font-mono">{product.batchNumber}</span>
                            {Boolean(
                              product.activeBatchQty &&
                                product.stockQuantity &&
                                product.stockQuantity > product.activeBatchQty
                            )
                              ? ` (${product.activeBatchQty} pcs)`
                              : ''}
                          </span>
                        )}
                        {product.stockQuantity !== undefined && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              product.stockQuantity <= 5
                                ? 'neu-sunken-sm text-rose-500 font-extrabold'
                                : 'neu-sunken-sm text-slate-400'
                            }`}
                            title={`${(product.stockQuantity || 0).toLocaleString()} in stock`}
                          >
                            {product.stockQuantity > 999999
                              ? `${(product.stockQuantity / 1e6).toFixed(1)}M in stock`
                              : product.stockQuantity > 9999
                              ? `${(product.stockQuantity / 1e3).toFixed(0)}k in stock`
                              : t('pos.inStockCount', '{{count}} in stock', { count: product.stockQuantity || 0 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {format(priceConverted, currentCurrency)}
                      </div>
                      {currentCurrency !== baseCode && (
                        <div className="text-[9px] text-slate-400">
                          {format(product.sellingPrice, baseCode)}
                        </div>
                      )}
                    </div>

                    {product.stockQuantity !== undefined && product.stockQuantity <= 0 ? (
                      <div
                        className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center cursor-not-allowed shadow-inner"
                        title={t('pos.cannotAddOutOfStock', 'Out of stock (0 in stock)')}
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl neu-circle-btn !w-7 !h-7 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:neu-btn-primary group-hover:text-white transition-all">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'TILES' ? (
          /* View 2: Compact Mini Quick Tiles (With Expiry Tag) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
            {filteredProducts.map((product) => {
              const priceConverted = convert(product.sellingPrice, baseCode, currentCurrency);

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="neu-card-interactive p-2.5 flex flex-col justify-between select-none h-28"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-[11px] font-black text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-emerald-500 transition-colors flex-1">
                        {product.name}
                      </h4>
                    </div>
                    <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">{product.sku}</p>

                    {/* Compact Expiry tag */}
                    {product.expiryDate && (
                      <div className="mt-1">
                        <ExpiryBadge expiryDate={product.expiryDate} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-black/5 dark:border-white/5 mt-1">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {format(priceConverted, currentCurrency)}
                    </span>
                    {product.stockQuantity !== undefined && (
                      <span className="text-[9px] font-bold text-slate-400 font-mono" title={`${(product.stockQuantity || 0).toLocaleString()} in stock`}>
                        {product.stockQuantity > 999999
                          ? `${(product.stockQuantity / 1e6).toFixed(1)}M`
                          : product.stockQuantity > 9999
                          ? `${(product.stockQuantity / 1e3).toFixed(0)}k`
                          : `${product.stockQuantity}x`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View 3: Visual Grid Cards (With Expiry Tag) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredProducts.map((product) => {
              const priceConverted = convert(product.sellingPrice, baseCode, currentCurrency);
              const isOutOfStock = product.stockQuantity !== undefined && product.stockQuantity <= 0;

              return (
                <div
                  key={product.id}
                  draggable={!isOutOfStock}
                  onDragStart={(e) => {
                    if (isOutOfStock) {
                      e.preventDefault();
                      soundFX.playError();
                      setOutOfStockToast({
                        message: t('pos.cannotAddOutOfStock', 'Cannot add: "{{name}}" is out of stock (0 in stock)', {
                          name: product.name,
                        }),
                        productName: product.name,
                      });
                      return;
                    }
                    e.dataTransfer.setData('application/json', JSON.stringify(product));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleProductClick(product)}
                  className={`neu-card-interactive p-3 flex flex-col justify-between group select-none relative overflow-hidden ${
                    isOutOfStock
                      ? 'cursor-not-allowed opacity-75'
                      : 'cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <div className="h-28 w-full rounded-2xl neu-sunken-sm overflow-hidden mb-2.5 relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-lg">
                        39POS
                      </div>
                    )}

                    {/* Expiry Reminding Badge on Card */}
                    {product.expiryDate && (
                      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 flex-wrap max-w-[85%]">
                        <ExpiryBadge
                          expiryDate={product.expiryDate}
                          batchQuantity={product.activeBatchQty}
                          totalQuantity={product.stockQuantity}
                          batchCount={product.batchCount}
                        />
                        {Boolean(
                          product.batchCount &&
                            product.batchCount > 1 &&
                            product.activeBatchQty &&
                            product.stockQuantity &&
                            product.stockQuantity > product.activeBatchQty
                        )}
                      </div>
                    )}

                    {product.hasVariants && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full neu-pill text-[10px] font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{t('pos.variants', 'Variants')}</span>
                      </span>
                    )}

                    {product.stockQuantity !== undefined && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold max-w-[140px] truncate ${
                            product.stockQuantity <= 5
                              ? 'bg-rose-500 text-white'
                              : 'neu-pill text-slate-700 dark:text-slate-200'
                          }`}
                          title={`${(product.stockQuantity || 0).toLocaleString()} total in stock`}
                        >
                          {product.stockQuantity > 999999
                            ? `${(product.stockQuantity / 1e6).toFixed(1)}M in stock`
                            : product.stockQuantity > 9999
                            ? `${(product.stockQuantity / 1e3).toFixed(0)}k in stock`
                            : t('pos.inStockCount', '{{count}} in stock', { count: product.stockQuantity || 0 })}
                        </span>
                        {Boolean(
                          product.batchCount &&
                            product.batchCount > 1 &&
                            product.activeBatchQty &&
                            product.stockQuantity &&
                            product.stockQuantity > product.activeBatchQty
                        ) && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-sm shadow-sm"
                            title={`${(product.stockQuantity || 0) - (product.activeBatchQty || 0)} fresh units in next lot`}
                          >
                            +{(product.stockQuantity || 0) - (product.activeBatchQty || 0)} {t('expiryTags.fresh', 'fresh')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title & SKU */}
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="font-mono">{product.sku}</span>
                      {product.batchNumber && (
                        <span title={`Active Batch: ${product.batchNumber}`}>
                          • <span className="font-mono">{product.batchNumber}</span>
                          {Boolean(
                            product.activeBatchQty &&
                              product.stockQuantity &&
                              product.stockQuantity > product.activeBatchQty
                          )
                            ? ` (${product.activeBatchQty} pcs)`
                            : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Add button */}
                  <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {format(priceConverted, currentCurrency)}
                      </div>
                      {currentCurrency !== baseCode && (
                        <div className="text-[10px] text-slate-400">
                          {format(product.sellingPrice, baseCode)}
                        </div>
                      )}
                    </div>

                    {product.stockQuantity !== undefined && product.stockQuantity <= 0 ? (
                      <div
                        className="w-7 h-7 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center cursor-not-allowed shadow-inner"
                        title={t('pos.cannotAddOutOfStock', 'Out of stock (0 in stock)')}
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl neu-circle-btn !w-7 !h-7 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:neu-btn-primary group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Navigator Modal (Quick Multi-Department Drawer) */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{t('pos.allCategoriesModalTitle', 'All Product Categories')}</h3>
                  <p className="text-xs text-slate-400">
                    {t('pos.allCategoriesModalSubtitle', 'Jump to any catalog department or filter items ({{count}} categories)', { count: categories.length })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Category Filter Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder={t('pos.searchCategoryPlaceholder', 'Search category name or code...')}
                className="w-full h-10 pl-10 pr-3 rounded-xl neu-input text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
              {/* All Items Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('ALL');
                  setCategoryModalOpen(false);
                }}
                className={`p-3 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400 font-black'
                    : 'neu-card-interactive text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="font-extrabold text-xs">{t('pos.allItems', 'All Items')}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{t('pos.completeInventory', 'Complete inventory')}</div>
                </div>
                <span className="px-2 py-0.5 rounded-lg neu-pill text-[10px] font-mono font-bold">
                  {modeProducts.length}
                </span>
              </button>

              {filteredCategoriesForModal.map((cat) => {
                const count = modeProducts.filter((p) => p.categoryId === cat.id).length;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setCategoryModalOpen(false);
                    }}
                    className={`p-3 rounded-2xl text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400 font-black'
                        : 'neu-card-interactive text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-extrabold text-xs truncate">{cat.name}</div>
                      {cat.code && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cat.code}</div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-lg neu-pill text-[10px] font-mono font-bold flex-shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Variant Selector Popup Modal */}
      {activeVariantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div>
                <div className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('pos.selectVariant', 'Select Option / Variant')}</span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {activeVariantProduct.name}
                </h3>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-400 font-bold block">{t('pos.basePrice', 'Base Price')}</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {format(
                    convert(activeVariantProduct.sellingPrice, baseCode, currentCurrency),
                    currentCurrency
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
              {activeVariantProduct.variants?.map((v) => {
                const variantStock = v.stockQuantity !== undefined ? v.stockQuantity : (activeVariantProduct.stockQuantity ?? 0);
                const isOutOfStock = variantStock <= 0;
                const adjConverted = convert(v.priceAdjustment || 0, baseCode, currentCurrency);
                const finalPriceConverted = convert(
                  activeVariantProduct.sellingPrice + (v.priceAdjustment || 0),
                  baseCode,
                  currentCurrency
                );
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariant(activeVariantProduct, v)}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all active:scale-95 group cursor-pointer ${
                      isOutOfStock
                        ? 'neu-card-interactive opacity-75 border-rose-500/20'
                        : 'neu-card-interactive'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 dark:text-white font-extrabold text-xs block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {v.name}
                        </span>
                        {isOutOfStock && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                            {t('pos.outOfStock', 'Out of stock')}
                          </span>
                        )}
                      </div>
                      {v.sku && (
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {v.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-xs block">
                        {format(finalPriceConverted, currentCurrency)}
                      </span>
                      {v.priceAdjustment !== 0 && (
                        <span
                          className={`text-[10px] font-bold block ${
                            v.priceAdjustment > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {v.priceAdjustment > 0 ? '+' : ''}
                          {format(adjConverted, currentCurrency)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setActiveVariantProduct(null)}
              className="w-full py-2.5 rounded-xl neu-btn text-xs font-bold text-slate-500 cursor-pointer"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Live Picture-in-Picture (PiP) Barcode & QR Scanner HUD */}
      <FloatingScannerHUD
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScan={handleCameraScan}
        products={modeProducts}
      />
    </div>
  );
};
export default ProductCatalog;
