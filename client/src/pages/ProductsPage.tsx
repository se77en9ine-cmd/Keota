import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { sanitizeImageUrl } from '../utils/imageUrl';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Barcode,
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ExternalLink,
  Store,
  UtensilsCrossed,
  ShoppingBag,
  Zap,
  Sparkles,
  DollarSign,
  TrendingUp,
  Coins,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Filter,
  Hourglass,
  Clock,
  Folder,
  AlertTriangle,
  PackagePlus,
  Boxes,
  ChevronDown,
  Tag,
  CheckSquare,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { ExpiryBadge } from '../components/common/ExpiryBadge';
import { StockAdjustmentModal } from '../components/inventory/StockAdjustmentModal';

export const ProductsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [posModeFilter, setPosModeFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [stockAdjustItem, setStockAdjustItem] = useState<any | null>(null);
  
  // Single & Bulk Delete State
  type DeleteTarget =
    | { type: 'single'; product: any }
    | { type: 'selected'; ids: string[]; count: number }
    | { type: 'all'; count: number };
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Multi-Select & Batch Operation States
  const lastSelectedIdRef = useRef<string | null>(null);
  const quickSelectRef = useRef<HTMLDivElement>(null);
  const [quickSelectOpen, setQuickSelectOpen] = useState<boolean>(false);
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState<boolean>(false);
  const [bulkPosModeModalOpen, setBulkPosModeModalOpen] = useState<boolean>(false);
  const [bulkStockModalOpen, setBulkStockModalOpen] = useState<boolean>(false);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);
  const [bulkSelectedCategory, setBulkSelectedCategory] = useState<string>('');
  const [bulkSelectedPosMode, setBulkSelectedPosMode] = useState<string>('ALL');
  const [bulkStockQty, setBulkStockQty] = useState<number>(10);
  const [bulkExportLoading, setBulkExportLoading] = useState<boolean>(false);

  // Picture Upload States
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Preview Modal State
  const [lightboxData, setLightboxData] = useState<{
    url: string;
    title: string;
    sku?: string;
    category?: string;
    price?: number;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const { format, convert, currentCurrency, baseCurrency, currencies } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';
  const [modalCurrency, setModalCurrency] = useState<string>(currentCurrency || baseCode);

  interface VariantItem {
    id?: string;
    name: string;
    sku: string;
    barcode: string;
    priceAdjustment: number;
    costAdjustment: number;
    initialStock: number;
  }

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    purchasePrice: 0,
    sellingPrice: 0,
    taxRate: 7,
    initialStock: 0,
    batchNumber: '',
    expiryDate: '',
    description: '',
    imageUrl: '',
    posMode: 'ALL' as string,
    hasVariants: false,
    variants: [] as VariantItem[],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, metaRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/meta'),
      ]);
      setProducts(prodRes.data.products || []);
      setCategories(metaRes.data.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Click outside to close quick select dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickSelectRef.current && !quickSelectRef.current.contains(e.target as Node)) {
        setQuickSelectOpen(false);
      }
    };
    if (quickSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [quickSelectOpen]);

  // Keyboard shortcut for modals (Esc to close modals / deselect items)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bulkCategoryModalOpen) {
          setBulkCategoryModalOpen(false);
        } else if (bulkPosModeModalOpen) {
          setBulkPosModeModalOpen(false);
        } else if (bulkStockModalOpen) {
          setBulkStockModalOpen(false);
        } else if (quickSelectOpen) {
          setQuickSelectOpen(false);
        } else if (deleteTarget && !isDeleting) {
          setDeleteTarget(null);
        } else if (lightboxData) {
          setLightboxData(null);
          setZoomLevel(1);
        } else if (modalOpen) {
          setModalOpen(false);
        } else if (selectedProductIds.size > 0) {
          setSelectedProductIds(new Set());
          lastSelectedIdRef.current = null;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    lightboxData,
    deleteTarget,
    modalOpen,
    isDeleting,
    bulkCategoryModalOpen,
    bulkPosModeModalOpen,
    bulkStockModalOpen,
    quickSelectOpen,
    selectedProductIds,
  ]);

  // Modal Step Wizard State (1 to 4)
  const [modalStep, setModalStep] = useState<number>(1);
  const [variantPresetTab, setVariantPresetTab] = useState<'ALL' | 'RETAIL' | 'CAFE' | 'ONLINE'>('ALL');

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setUploadError('');
    setSaveError(null);
    setIsSaving(false);
    setImageMode('upload');
    setModalStep(1);
    setVariantPresetTab('ALL');
    const targetCurr = currentCurrency || 'USD';
    setModalCurrency(targetCurr);
    const baseSku = `SKU-${Date.now().toString().slice(-6)}`;
    setFormData({
      name: '',
      sku: baseSku,
      barcode: `885${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      categoryId: categories[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      taxRate: 7,
      initialStock: 20,
      batchNumber: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      expiryDate: '',
      description: '',
      imageUrl: '',
      posMode: 'ALL',
      hasVariants: false,
      variants: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setUploadError('');
    setSaveError(null);
    setIsSaving(false);
    setModalStep(1);
    setVariantPresetTab('ALL');
    setImageMode(p.imageUrl && p.imageUrl.startsWith('http') ? 'url' : 'upload');
    const targetCurr = currentCurrency || baseCode;
    setModalCurrency(targetCurr);
    // Convert stored base prices into the active editing currency
    const localCost = convert(p.purchasePrice || 0, baseCode, targetCurr);
    const localPrice = convert(p.sellingPrice || 0, baseCode, targetCurr);

    const existingVariants: VariantItem[] = (p.variants || []).map((v: any) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode || '',
      priceAdjustment: Number(convert(v.priceAdjustment || 0, baseCode, targetCurr).toFixed(2)),
      costAdjustment: Number(convert(v.costAdjustment || 0, baseCode, targetCurr).toFixed(2)),
      initialStock: 0,
    }));

    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      categoryId: p.categoryId || '',
      purchasePrice: Number(localCost.toFixed(2)),
      sellingPrice: Number(localPrice.toFixed(2)),
      taxRate: p.taxRate,
      initialStock: p.stockQuantity ?? 0,
      batchNumber: p.batchNumber || '',
      expiryDate: p.expiryDate || '',
      description: p.description || '',
      imageUrl: p.imageUrl || '',
      posMode: p.posMode || 'ALL',
      hasVariants: Boolean(p.hasVariants && existingVariants.length > 0),
      variants: existingVariants,
    });
    setModalOpen(true);
  };

  // Convert unit cost & selling price on the fly when switching input currency inside modal
  const handleModalCurrencyChange = (newCurr: string) => {
    if (newCurr === modalCurrency) return;
    const convertedCost = convert(formData.purchasePrice, modalCurrency, newCurr);
    const convertedPrice = convert(formData.sellingPrice, modalCurrency, newCurr);
    
    // Also convert variant adjustments
    const updatedVariants = (formData.variants || []).map((v) => ({
      ...v,
      priceAdjustment: Number(convert(v.priceAdjustment, modalCurrency, newCurr).toFixed(2)),
      costAdjustment: Number(convert(v.costAdjustment, modalCurrency, newCurr).toFixed(2)),
    }));

    setFormData((prev) => ({
      ...prev,
      purchasePrice: Number(convertedCost.toFixed(2)),
      sellingPrice: Number(convertedPrice.toFixed(2)),
      variants: updatedVariants,
    }));
    setModalCurrency(newCurr);
  };

  // ── Multi-Channel Variant & Size Preset Generators ──
  type PresetType =
    | 'SIZES_SML'
    | 'SIZES_SMLXL'
    | 'PACK_SINGLE_6_BOX'
    | 'WEIGHT_250_500_1KG'
    | 'DRINK_CUPS_SML'
    | 'DRINK_HOT_ICED_FRAPPE'
    | 'SWEETNESS_LEVELS'
    | 'FOOD_PORTIONS'
    | 'BUNDLE_SINGLE_DUO_FAMILY'
    | 'GIFT_SET_PREMIUM';

  const applyVariantPreset = (presetType: PresetType) => {
    const baseSku = formData.sku || 'SKU';
    let newVariants: VariantItem[] = [];

    switch (presetType) {
      case 'SIZES_SML':
        newVariants = [
          { name: 'Size S', sku: `${baseSku}-S`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 10 },
          { name: 'Size M', sku: `${baseSku}-M`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(0.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.2, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
          { name: 'Size L', sku: `${baseSku}-L`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.4, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
        ];
        break;
      case 'SIZES_SMLXL':
        newVariants = [
          { name: 'Size S', sku: `${baseSku}-S`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 10 },
          { name: 'Size M', sku: `${baseSku}-M`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(0.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.2, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
          { name: 'Size L', sku: `${baseSku}-L`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.4, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
          { name: 'Size XL', sku: `${baseSku}-XL`, barcode: `${formData.barcode || '885000000000'}4`, priceAdjustment: Number(convert(1.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.6, 'USD', modalCurrency).toFixed(2)), initialStock: 5 },
        ];
        break;
      case 'PACK_SINGLE_6_BOX':
        newVariants = [
          { name: 'Single Item', sku: `${baseSku}-1PC`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 24 },
          { name: '6-Pack Bundle', sku: `${baseSku}-6PK`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(2.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
          { name: 'Full Box (24pcs)', sku: `${baseSku}-BOX24`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(9.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(4.0, 'USD', modalCurrency).toFixed(2)), initialStock: 5 },
        ];
        break;
      case 'WEIGHT_250_500_1KG':
        newVariants = [
          { name: '250g Pack', sku: `${baseSku}-250G`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 15 },
          { name: '500g Pack', sku: `${baseSku}-500G`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(1.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.7, 'USD', modalCurrency).toFixed(2)), initialStock: 15 },
          { name: '1kg Bulk', sku: `${baseSku}-1KG`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(3.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(1.5, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
        ];
        break;
      case 'DRINK_CUPS_SML':
        newVariants = [
          { name: 'Small (12oz)', sku: `${baseSku}-S12`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 20 },
          { name: 'Regular (16oz)', sku: `${baseSku}-R16`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(0.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.2, 'USD', modalCurrency).toFixed(2)), initialStock: 30 },
          { name: 'Large (22oz)', sku: `${baseSku}-L22`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.4, 'USD', modalCurrency).toFixed(2)), initialStock: 20 },
        ];
        break;
      case 'DRINK_HOT_ICED_FRAPPE':
        newVariants = [
          { name: 'Hot', sku: `${baseSku}-HOT`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 20 },
          { name: 'Iced', sku: `${baseSku}-ICED`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(0.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.2, 'USD', modalCurrency).toFixed(2)), initialStock: 35 },
          { name: 'Frappe / Blended', sku: `${baseSku}-FRAP`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.4, 'USD', modalCurrency).toFixed(2)), initialStock: 15 },
        ];
        break;
      case 'SWEETNESS_LEVELS':
        newVariants = [
          { name: '0% No Sugar', sku: `${baseSku}-SW0`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 20 },
          { name: '50% Less Sweet', sku: `${baseSku}-SW50`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: 0, costAdjustment: 0, initialStock: 30 },
          { name: '100% Standard', sku: `${baseSku}-SW100`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: 0, costAdjustment: 0, initialStock: 40 },
        ];
        break;
      case 'FOOD_PORTIONS':
        newVariants = [
          { name: 'Regular Portion', sku: `${baseSku}-REG`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 25 },
          { name: 'Special (+Extra)', sku: `${baseSku}-SPEC`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(1.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.5, 'USD', modalCurrency).toFixed(2)), initialStock: 20 },
          { name: 'Jumbo Feast', sku: `${baseSku}-JUMBO`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(2.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(1.2, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
        ];
        break;
      case 'BUNDLE_SINGLE_DUO_FAMILY':
        newVariants = [
          { name: 'Single Item', sku: `${baseSku}-1X`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 20 },
          { name: 'Duo Pack (2pcs)', sku: `${baseSku}-DUO`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(1.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.7, 'USD', modalCurrency).toFixed(2)), initialStock: 15 },
          { name: 'Family Pack (4pcs)', sku: `${baseSku}-FAM4`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(3.5, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(1.6, 'USD', modalCurrency).toFixed(2)), initialStock: 10 },
        ];
        break;
      case 'GIFT_SET_PREMIUM':
        newVariants = [
          { name: 'Standard Packaging', sku: `${baseSku}-STD`, barcode: `${formData.barcode || '885000000000'}1`, priceAdjustment: 0, costAdjustment: 0, initialStock: 20 },
          { name: 'Gift Box (+Ribbon)', sku: `${baseSku}-GIFT`, barcode: `${formData.barcode || '885000000000'}2`, priceAdjustment: Number(convert(2.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(0.8, 'USD', modalCurrency).toFixed(2)), initialStock: 15 },
          { name: 'Luxury Hamper Set', sku: `${baseSku}-HAMPER`, barcode: `${formData.barcode || '885000000000'}3`, priceAdjustment: Number(convert(5.0, 'USD', modalCurrency).toFixed(2)), costAdjustment: Number(convert(2.2, 'USD', modalCurrency).toFixed(2)), initialStock: 8 },
        ];
        break;
    }

    setFormData((prev) => ({
      ...prev,
      hasVariants: true,
      variants: newVariants,
    }));
  };

  const handleAddCustomVariant = () => {
    const baseSku = formData.sku || 'SKU';
    const num = (formData.variants?.length || 0) + 1;
    const newVariant: VariantItem = {
      name: `Option ${num}`,
      sku: `${baseSku}-OPT${num}`,
      barcode: '',
      priceAdjustment: 0,
      costAdjustment: 0,
      initialStock: 10,
    };
    setFormData((prev) => ({
      ...prev,
      hasVariants: true,
      variants: [...(prev.variants || []), newVariant],
    }));
  };

  const handleUpdateVariant = (index: number, field: keyof VariantItem, value: any) => {
    setFormData((prev) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, variants: updated };
    });
  };

  const handleRemoveVariant = (index: number) => {
    setFormData((prev) => {
      const updated = (prev.variants || []).filter((_, i) => i !== index);
      return {
        ...prev,
        variants: updated,
        hasVariants: updated.length > 0,
      };
    });
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP, GIF, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image file size must be less than 5MB');
      return;
    }

    try {
      setUploadError('');
      setImageUploading(true);
      const data = new FormData();
      data.append('image', file);

      const res = await api.post('/products/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.imageUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.imageUrl }));
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.message || err.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openLightbox = (data: {
    url: string;
    title: string;
    sku?: string;
    category?: string;
    price?: number;
  }) => {
    setZoomLevel(1);
    setLightboxData(data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      const basePurchasePrice = convert(formData.purchasePrice, modalCurrency, baseCode);
      const baseSellingPrice = convert(formData.sellingPrice, modalCurrency, baseCode);

      // Convert variants priceAdjustment and costAdjustment to system base currency
      const processedVariants = (formData.hasVariants && formData.variants ? formData.variants : []).map((v) => ({
        ...v,
        priceAdjustment: convert(v.priceAdjustment || 0, modalCurrency, baseCode),
        costAdjustment: convert(v.costAdjustment || 0, modalCurrency, baseCode),
      }));

      const payload = {
        ...formData,
        imageUrl: sanitizeImageUrl(formData.imageUrl),
        purchasePrice: basePurchasePrice,
        sellingPrice: baseSellingPrice,
        hasVariants: Boolean(formData.hasVariants && processedVariants.length > 0),
        variants: processedVariants,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        showExportToast(`Product "${formData.name}" updated successfully`, 'success');
      } else {
        await api.post('/products', payload);
        showExportToast(`Product "${formData.name}" added to catalog successfully`, 'success');
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Save failed. Please check product details.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      setDeleteError('');

      if (deleteTarget.type === 'single') {
        await api.delete(`/products/${deleteTarget.product.id}`);
        showExportToast(`Product "${deleteTarget.product.name}" deleted successfully`, 'success');
        setSelectedProductIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.product.id);
          return next;
        });
      } else if (deleteTarget.type === 'selected') {
        await api.post('/products/bulk-delete', { ids: deleteTarget.ids });
        showExportToast(`${deleteTarget.ids.length} products deleted successfully`, 'success');
        setSelectedProductIds(new Set());
      } else if (deleteTarget.type === 'all') {
        await api.delete('/products/delete-all');
        showExportToast('All products deleted from catalog', 'success');
        setSelectedProductIds(new Set());
      }

      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || 'Delete operation failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Export Button State Machine ──
  type ExportState = 'idle' | 'loading' | 'success' | 'error';
  const [productExportState, setProductExportState] = useState<ExportState>('idle');
  const [exportToast, setExportToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const exportToastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showExportToast = (text: string, type: 'success' | 'error') => {
    if (exportToastTimer.current) clearTimeout(exportToastTimer.current);
    setExportToast({ text, type });
    exportToastTimer.current = setTimeout(() => setExportToast(null), 3200);
  };

  const handleExportExcel = async () => {
    if (productExportState === 'loading') return;
    setProductExportState('loading');
    try {
      const res = await api.get('/export/products/excel', {
        params: {
          currency: currentCurrency || 'USD',
          lang: i18n.language || 'en',
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `39pos_products_catalog_${currentCurrency || 'USD'}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProductExportState('success');
      showExportToast(`${filename} downloaded successfully (${currentCurrency})`, 'success');
      setTimeout(() => setProductExportState('idle'), 2500);
    } catch (err: any) {
      setProductExportState('error');
      const msg = err?.response?.data?.message || err?.message || 'Download failed';
      showExportToast(`Export failed: ${msg}`, 'error');
      setTimeout(() => setProductExportState('idle'), 2000);
    }
  };

  // ── Enterprise Catalog Filter & Pagination State ──
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRING_14D' | 'EXPIRED'>('ALL');
  
  // Sorting State
  type SortField = 'NAME' | 'SKU' | 'CATEGORY' | 'COST' | 'PRICE' | 'MARGIN' | 'STOCK' | 'EXPIRY';
  const [sortField, setSortField] = useState<SortField>('NAME');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25); // 10, 25, 50, 100, 999999 (All)

  const isModeActive = (posMode: string | undefined | null, targetMode: string) => {
    if (!posMode || posMode === 'ALL' || targetMode === 'ALL') return true;
    const modes = posMode.split(',').map((m) => m.trim());
    return modes.includes('ALL') || modes.includes(targetMode);
  };

  // Helper for expiry status calculation
  const getProdExpiryStatus = (expiryDate?: string | null) => {
    if (!expiryDate || !expiryDate.trim()) return null;
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    const diffTime = expDay.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      daysRemaining,
      isExpired: daysRemaining < 0,
      isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 14,
    };
  };

  // High-performance memoized filter and sort
  const filteredAndSorted = React.useMemo(() => {
    let list = products.filter((p) => {
      // POS Mode Filter
      if (!isModeActive(p.posMode, posModeFilter)) return false;

      // Category Filter
      if (categoryFilter !== 'ALL' && p.categoryId !== categoryFilter) return false;

      // Stock Status Filter
      const stock = p.stockQuantity || 0;
      if (stockStatusFilter === 'IN_STOCK' && stock <= 0) return false;
      if (stockStatusFilter === 'LOW_STOCK' && (stock <= 0 || stock > 5)) return false;
      if (stockStatusFilter === 'OUT_OF_STOCK' && stock > 0) return false;

      // Expiry Filter
      if (expiryFilter !== 'ALL') {
        const exp = getProdExpiryStatus(p.expiryDate);
        if (expiryFilter === 'EXPIRING_14D' && (!exp || (!exp.isExpiringSoon && !exp.isExpired))) return false;
        if (expiryFilter === 'EXPIRED' && (!exp || !exp.isExpired)) return false;
      }

      // Search Filter
      if (search.trim()) {
        const s = search.toLowerCase().trim();
        const matches =
          (p.name && p.name.toLowerCase().includes(s)) ||
          (p.barcode && p.barcode.toLowerCase().includes(s)) ||
          (p.sku && p.sku.toLowerCase().includes(s)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(s));
        if (!matches) return false;
      }

      return true;
    });

    // Sort Products
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'NAME':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'SKU':
          comparison = (a.sku || '').localeCompare(b.sku || '');
          break;
        case 'CATEGORY':
          comparison = (a.categoryName || '').localeCompare(b.categoryName || '');
          break;
        case 'COST':
          comparison = (a.purchasePrice || 0) - (b.purchasePrice || 0);
          break;
        case 'PRICE':
          comparison = (a.sellingPrice || 0) - (b.sellingPrice || 0);
          break;
        case 'MARGIN': {
          const marginA = a.sellingPrice > 0 ? ((a.sellingPrice - a.purchasePrice) / a.sellingPrice) * 100 : 0;
          const marginB = b.sellingPrice > 0 ? ((b.sellingPrice - b.purchasePrice) / b.sellingPrice) * 100 : 0;
          comparison = marginA - marginB;
          break;
        }
        case 'STOCK':
          comparison = (a.stockQuantity || 0) - (b.stockQuantity || 0);
          break;
        case 'EXPIRY': {
          const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : 9999999999999;
          const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : 9999999999999;
          comparison = expA - expB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [products, posModeFilter, categoryFilter, stockStatusFilter, expiryFilter, search, sortField, sortDirection]);

  // Reset page to 1 whenever any filter condition changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [posModeFilter, categoryFilter, stockStatusFilter, expiryFilter, search]);

  // Pagination Computations
  const totalItems = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedProducts = React.useMemo(() => {
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, startIndex, endIndex]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleSelect = (id: string, isShift: boolean = false) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (isShift && lastSelectedIdRef.current && lastSelectedIdRef.current !== id) {
        const idxCurrent = paginatedProducts.findIndex((p) => p.id === id);
        const idxLast = paginatedProducts.findIndex((p) => p.id === lastSelectedIdRef.current);
        if (idxCurrent !== -1 && idxLast !== -1) {
          const start = Math.min(idxCurrent, idxLast);
          const end = Math.max(idxCurrent, idxLast);
          for (let i = start; i <= end; i++) {
            next.add(paginatedProducts[i].id);
          }
          lastSelectedIdRef.current = id;
          return next;
        }
      }

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastSelectedIdRef.current = id;
      return next;
    });
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = paginatedProducts.map((p) => p.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedProductIds.has(id));

    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllCatalog = () => {
    setSelectedProductIds(new Set(products.map((p) => p.id)));
    setQuickSelectOpen(false);
  };

  const selectVisiblePage = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      paginatedProducts.forEach((p) => next.add(p.id));
      return next;
    });
    setQuickSelectOpen(false);
  };

  const selectInStock = () => {
    const inStockIds = products.filter((p) => (p.stockQuantity || 0) > 0).map((p) => p.id);
    setSelectedProductIds(new Set(inStockIds));
    setQuickSelectOpen(false);
  };

  const selectLowOrOutOfStock = () => {
    const targetIds = products.filter((p) => (p.stockQuantity || 0) <= 5).map((p) => p.id);
    setSelectedProductIds(new Set(targetIds));
    setQuickSelectOpen(false);
  };

  const deselectAll = () => {
    setSelectedProductIds(new Set());
    lastSelectedIdRef.current = null;
    setQuickSelectOpen(false);
  };

  const handleBulkUpdateCategory = async () => {
    if (selectedProductIds.size === 0) return;
    try {
      setBulkActionLoading(true);
      await api.post('/products/bulk-update', {
        ids: Array.from(selectedProductIds),
        updates: { categoryId: bulkSelectedCategory === 'NONE' ? null : bulkSelectedCategory },
      });
      const catName = categories.find((c) => c.id === bulkSelectedCategory)?.name || (bulkSelectedCategory === 'NONE' ? 'Uncategorized' : 'None');
      showExportToast(`${selectedProductIds.size} products assigned to "${catName}"`, 'success');
      setBulkCategoryModalOpen(false);
      fetchData();
    } catch (err: any) {
      showExportToast(err?.response?.data?.message || err?.message || 'Failed to update category', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdatePosMode = async (mode: string) => {
    if (selectedProductIds.size === 0) return;
    try {
      setBulkActionLoading(true);
      await api.post('/products/bulk-update', {
        ids: Array.from(selectedProductIds),
        updates: { posMode: mode },
      });
      showExportToast(`${selectedProductIds.size} products updated to operating mode "${mode}"`, 'success');
      setBulkPosModeModalOpen(false);
      fetchData();
    } catch (err: any) {
      showExportToast(err?.response?.data?.message || err?.message || 'Failed to update POS mode', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStockAdjust = async () => {
    if (selectedProductIds.size === 0 || bulkStockQty === 0) return;
    try {
      setBulkActionLoading(true);
      await api.post('/products/bulk-update', {
        ids: Array.from(selectedProductIds),
        updates: { stockAdjustment: bulkStockQty },
      });
      showExportToast(
        `Stock adjusted (${bulkStockQty > 0 ? '+' : ''}${bulkStockQty}) for ${selectedProductIds.size} products`,
        'success'
      );
      setBulkStockModalOpen(false);
      fetchData();
    } catch (err: any) {
      showExportToast(err?.response?.data?.message || err?.message || 'Failed to adjust stock', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExportSelectedExcel = async () => {
    if (selectedProductIds.size === 0 || bulkExportLoading) return;
    try {
      setBulkExportLoading(true);
      const idsParam = Array.from(selectedProductIds).join(',');
      const res = await api.get('/export/products/excel', {
        params: {
          currency: currentCurrency || 'USD',
          lang: i18n.language || 'en',
          ids: idsParam,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const filename = `39pos_selected_${selectedProductIds.size}_products_${currentCurrency || 'USD'}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showExportToast(`Exported ${selectedProductIds.size} selected products to Excel`, 'success');
    } catch (err: any) {
      showExportToast(`Selected export failed: ${err?.message || 'Error'}`, 'error');
    } finally {
      setBulkExportLoading(false);
    }
  };

  const hasActiveCustomFilters =
    categoryFilter !== 'ALL' ||
    stockStatusFilter !== 'ALL' ||
    expiryFilter !== 'ALL' ||
    search.trim().length > 0;

  const resetAllFilters = () => {
    setCategoryFilter('ALL');
    setStockStatusFilter('ALL');
    setExpiryFilter('ALL');
    setSearch('');
    setCurrentPage(1);
  };

  const minimartCount = products.filter((p) => isModeActive(p.posMode, 'RETAIL_MINIMART')).length;
  const restaurantCount = products.filter((p) => isModeActive(p.posMode, 'RESTAURANT_CAFE')).length;
  const onlineCount = products.filter((p) => isModeActive(p.posMode, 'ONLINE_HUB')).length;

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3">
      {/* Inline Export Toast */}
      {exportToast && (
        <div className={`export-toast ${exportToast.type === 'error' ? 'export-toast--error' : 'export-toast--success'}`}>
          {exportToast.type === 'error' ? '✕' : '✓'}
          <span>{exportToast.text}</span>
        </div>
      )}

      {/* Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            <span>{t('products.title', 'Product Catalog & SKU Master')}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {t('products.subtitle', 'Manage barcode numbers, pricing tiers, tax rates, and category associations')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={productExportState === 'loading'}
            className={`export-btn export-btn--products neu-btn ${
              productExportState === 'loading' ? 'export-btn--loading' : ''
            }${productExportState === 'success' ? ' export-btn--success' : ''
            }${productExportState === 'error' ? ' export-btn--error' : ''}`}
          >
            {productExportState === 'loading' ? (
              <span className="export-spinner" />
            ) : productExportState === 'success' ? (
              <CheckCircle2 className="w-4 h-4 export-check" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {productExportState === 'loading'
                ? t('reports.generating', 'Generating…')
                : productExportState === 'success'
                ? t('reports.downloaded', 'Downloaded ✓')
                : t('products.exportExcel', 'Export Excel')}
            </span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 shadow-neu-glow-emerald transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('products.addProduct', 'Add New Product')}</span>
          </button>
        </div>
      </div>

      {/* POS Operating Mode Filter Tabs & Quick View Bar (Fixed) */}
      <div className="flex-shrink-0 neu-tab-container p-1 rounded-2xl flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setPosModeFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            posModeFilter === 'ALL'
              ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-indigo-500" />
          <span>{t('products.totalProducts', 'All Catalogs')}</span>
          <span className="neu-pill px-1.5 py-0.5 text-[10px] font-black">{products.length}</span>
        </button>

        <button
          onClick={() => setPosModeFilter('RETAIL_MINIMART')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            posModeFilter === 'RETAIL_MINIMART'
              ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Store className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t('products.channelMinimart', 'Minimart & Retail')}</span>
          <span className="neu-pill px-1.5 py-0.5 text-[10px] font-black">{minimartCount}</span>
        </button>

        <button
          onClick={() => setPosModeFilter('RESTAURANT_CAFE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            posModeFilter === 'RESTAURANT_CAFE'
              ? 'neu-tab-active shadow-neu-raised-sm text-amber-500'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
          <span>{t('products.channelRestaurant', 'Restaurant & Cafe')}</span>
          <span className="neu-pill px-1.5 py-0.5 text-[10px] font-black">{restaurantCount}</span>
        </button>

        <button
          onClick={() => setPosModeFilter('ONLINE_HUB')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
            posModeFilter === 'ONLINE_HUB'
              ? 'neu-tab-active shadow-neu-raised-sm text-pink-500'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-pink-500" />
          <span>{t('products.channelOnline', 'Online Hub')}</span>
          <span className="neu-pill px-1.5 py-0.5 text-[10px] font-black">{onlineCount}</span>
        </button>
      </div>

      {/* Search and Table / Card List */}
      <div className="neu-card-lg overflow-hidden flex-1 min-h-0 flex flex-col">
        {/* Enterprise Multi-Filter Toolbar */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-b border-black/5 dark:border-white/5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left Controls: Search + Facet Filters */}
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search input */}
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('products.searchPlaceholder', 'Search by name, SKU, or barcode...')}
                  className="w-full h-10 pl-10 pr-4 neu-input text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              {/* Category Dropdown Filter */}
              <div className="w-52">
                <CustomSelect
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('products.allCategories', 'All Categories ({{count}})', { count: categories.length }),
                      icon: <Layers className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      icon: <Folder className="w-3.5 h-3.5 text-slate-400" />,
                    })),
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Stock Status Filter */}
              <div className="w-48">
                <CustomSelect
                  value={stockStatusFilter}
                  onChange={(val) => setStockStatusFilter(val as any)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('products.allStockStatus', 'All Stock Status'),
                      icon: <Package className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    {
                      value: 'IN_STOCK',
                      label: t('products.inStockOnly', 'In Stock Only'),
                      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
                    },
                    {
                      value: 'LOW_STOCK',
                      label: t('products.lowStockOnly', 'Low Stock (≤ 5 units)'),
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
                    },
                    {
                      value: 'OUT_OF_STOCK',
                      label: t('products.outOfStockOnly', 'Out of Stock (0 units)'),
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Expiry Date Filter */}
              <div className="w-48">
                <CustomSelect
                  value={expiryFilter}
                  onChange={(val) => setExpiryFilter(val as any)}
                  options={[
                    {
                      value: 'ALL',
                      label: t('products.allExpiryDates', 'All Expiry Dates'),
                      icon: <Clock className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    {
                      value: 'EXPIRING_14D',
                      label: t('products.expiringSoon', 'Expiring Soon (≤ 14d)'),
                      icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                    },
                    {
                      value: 'EXPIRED',
                      label: t('products.expiredItemsOnly', 'Expired Items Only'),
                      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
                    },
                  ]}
                  size="md"
                  dropdownWidth="w-56"
                />
              </div>

              {/* Clear Filter Reset Button */}
              {hasActiveCustomFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="h-10 px-3 rounded-xl neu-btn text-slate-600 dark:text-slate-300 text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title={t('products.clearAllFilters', 'Clear all active filters')}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('common.reset', 'Reset')}</span>
                </button>
              )}
            </div>

            {/* Right Controls: Summary & Bulk Delete */}
            <div className="flex items-center gap-3 justify-between lg:justify-end flex-shrink-0">
              {/* Batch Action Toolbar when items are selected */}
              {selectedProductIds.size > 0 ? (
                <div className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in zoom-in-95 duration-150">
                  <span className="px-2.5 py-1.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center gap-1 shadow-sm shadow-emerald-500/25">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('products.selectedCount', '{{count}} Selected', { count: selectedProductIds.size })}</span>
                  </span>

                  {/* Batch Category */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkSelectedCategory(categories[0]?.id || 'NONE');
                      setBulkCategoryModalOpen(true);
                    }}
                    className="h-8 px-2.5 rounded-xl neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    title="Change Category"
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden xl:inline">Category</span>
                  </button>

                  {/* Batch Channel */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkSelectedPosMode('ALL');
                      setBulkPosModeModalOpen(true);
                    }}
                    className="h-8 px-2.5 rounded-xl neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    title="Change POS Mode"
                  >
                    <Store className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden xl:inline">Channel</span>
                  </button>

                  {/* Batch Restock */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkStockQty(10);
                      setBulkStockModalOpen(true);
                    }}
                    className="h-8 px-2.5 rounded-xl neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    title="Quick Restock"
                  >
                    <PackagePlus className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden xl:inline">Restock</span>
                  </button>

                  {/* Batch Export */}
                  <button
                    type="button"
                    onClick={handleExportSelectedExcel}
                    disabled={bulkExportLoading}
                    className="h-8 px-2.5 rounded-xl neu-btn text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Export Selected"
                  >
                    {bulkExportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-500" />}
                    <span className="hidden xl:inline">Export</span>
                  </button>

                  {/* Batch Delete */}
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({
                        type: 'selected',
                        ids: Array.from(selectedProductIds),
                        count: selectedProductIds.size,
                      })
                    }
                    className="h-8 px-3 rounded-xl neu-btn-danger text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm shadow-rose-500/25"
                    title={t('products.deleteSelected', 'Delete Selected')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('products.deleteSelected', 'Delete Selected')}</span>
                  </button>

                  {/* Cancel / Deselect */}
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
                    title={t('common.cancel', 'Cancel (Esc)')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-bold">
                  {totalItems === 0
                    ? t('products.zeroProductsFound', '0 products found')
                    : t('products.showingProducts', 'Showing {{start}}–{{end}} of {{total}} products', {
                        start: startIndex + 1,
                        end: endIndex,
                        total: totalItems,
                      })}
                </div>
              )}

              {/* Global Delete All Products Icon Button */}
              {products.length > 0 && selectedProductIds.size === 0 && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: 'all', count: products.length })}
                  className="px-3 py-1.5 rounded-xl neu-btn-danger text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  title={t('products.deleteAllCount', 'Delete All ({{count}})', { count: products.length })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('products.deleteAllCount', 'Delete All ({{count}})', { count: products.length })}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile View: Touch-Friendly Product Cards */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto scrollbar-thin divide-y divide-black/5 dark:divide-white/5 p-3 space-y-3">
          {paginatedProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-semibold text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>{t('products.zeroProductsFound', '0 products found')}</p>
              {hasActiveCustomFilters && (
                <button
                  onClick={resetAllFilters}
                  className="mt-2 text-xs text-brand-500 font-bold underline cursor-pointer"
                >
                  {t('common.reset', 'Reset')}
                </button>
              )}
            </div>
          ) : (
            paginatedProducts.map((prod) => {
              const isSelected = selectedProductIds.has(prod.id);
              const expStatus = getProdExpiryStatus(prod.expiryDate);

              return (
                <div
                  key={prod.id}
                  className={`p-3.5 rounded-2xl neu-card-interactive space-y-3 transition-all ${
                    isSelected ? 'ring-2 ring-emerald-500/60 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Select Checkbox */}
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => handleToggleSelect(prod.id)}
                      size="sm"
                      ariaLabel={`Select ${prod.name}`}
                    />

                    <div
                      onClick={() => {
                        if (prod.imageUrl) {
                          openLightbox({
                            url: prod.imageUrl,
                            title: prod.name,
                            sku: prod.sku,
                            category: prod.categoryName,
                            price: prod.sellingPrice,
                          });
                        }
                      }}
                      className={`w-14 h-14 rounded-2xl neu-sunken-sm overflow-hidden flex-shrink-0 flex items-center justify-center relative ${
                        prod.imageUrl ? 'cursor-pointer active:scale-95' : ''
                      }`}
                    >
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.parentElement!.innerHTML =
                              '<div class="w-full h-full flex items-center justify-center font-bold text-xs text-slate-400">POS</div>';
                          }}
                        />
                      ) : (
                        <div className="font-bold text-xs text-slate-400">POS</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {prod.name}
                        </h4>
                        <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0 font-mono">
                          {format(convert(prod.sellingPrice, baseCode, currentCurrency), currentCurrency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-card-sm text-slate-600 dark:text-slate-300">
                          {prod.categoryName || 'General'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 truncate">{prod.sku}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Expiry Row */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md font-bold neu-card-sm ${
                        (prod.stockQuantity || 0) <= 0
                          ? 'text-rose-500'
                          : (prod.stockQuantity || 0) <= 5
                          ? 'text-amber-500'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {t('products.inStockCount', '{{count}} in stock', { count: prod.stockQuantity || 0 })}
                      </span>
                      {prod.expiryDate && <ExpiryBadge expiryDate={prod.expiryDate} />}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                        title={t('products.editProduct', 'Edit product')}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: 'single', product: prod })}
                        className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                        title={t('products.deleteProduct', 'Delete product')}
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

        {/* Desktop View: High Density Table with Clickable Sort Headers */}
        <div className="hidden md:block flex-1 min-h-0 overflow-y-auto overflow-x-auto scrollbar-thin relative">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 neu-sunken-sm bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-400 uppercase font-black tracking-wider select-none shadow-sm">
              <tr>
                <th className="py-4 pl-3.5 pr-2 w-16 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <CustomCheckbox
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((p) => selectedProductIds.has(p.id))
                      }
                      indeterminate={
                        selectedProductIds.size > 0 &&
                        !paginatedProducts.every((p) => selectedProductIds.has(p.id))
                      }
                      onChange={handleToggleSelectAllVisible}
                      size="sm"
                      ariaLabel="Select all visible products"
                    />
                    <div className="relative" ref={quickSelectRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickSelectOpen((prev) => !prev);
                        }}
                        className={`p-1 rounded-md transition-all cursor-pointer ${
                          quickSelectOpen
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        title="Selection Presets"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {quickSelectOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 z-40 text-left normal-case tracking-normal space-y-0.5 animate-in fade-in zoom-in-95 duration-150 font-sans"
                        >
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">
                            Quick Select
                          </div>
                          <button
                            type="button"
                            onClick={selectVisiblePage}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>Select Visible Page</span>
                            <span className="font-mono text-[10px] font-bold text-slate-400">{paginatedProducts.length}</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectAllCatalog}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>Select All in Catalog</span>
                            <span className="font-mono text-[10px] font-bold text-slate-400">{products.length}</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectInStock}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>In Stock Only</span>
                            <span className="font-mono text-[10px] font-bold text-emerald-500">{products.filter((p) => (p.stockQuantity || 0) > 0).length}</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectLowOrOutOfStock}
                            className="w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span>Low / Out of Stock</span>
                            <span className="font-mono text-[10px] font-bold text-rose-500">{products.filter((p) => (p.stockQuantity || 0) <= 5).length}</span>
                          </button>
                          {selectedProductIds.size > 0 && (
                            <>
                              <div className="border-t border-black/5 dark:border-white/5 my-1" />
                              <button
                                type="button"
                                onClick={deselectAll}
                                className="w-full px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <span>Deselect All</span>
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                {/* Sortable: Item Name */}
                <th
                  onClick={() => handleSort('NAME')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colName', 'Item Details')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'NAME' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                {/* Sortable: SKU */}
                <th
                  onClick={() => handleSort('SKU')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colBarcode', 'SKU / Barcode')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'SKU' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                {/* Sortable: Category */}
                <th
                  onClick={() => handleSort('CATEGORY')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colCategory', 'Category')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'CATEGORY' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                <th className="p-4">{t('products.colPosMode', 'POS Mode')}</th>

                {/* Sortable: Cost */}
                <th
                  onClick={() => handleSort('COST')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colCost', 'Cost Price')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'COST' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                {/* Sortable: Price */}
                <th
                  onClick={() => handleSort('PRICE')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colPrice', 'Selling Price')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'PRICE' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                {/* Sortable: Margin */}
                <th
                  onClick={() => handleSort('MARGIN')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colMargin', 'Gross Margin')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'MARGIN' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                {/* Sortable: Stock */}
                <th
                  onClick={() => handleSort('STOCK')}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{t('products.colStock', 'Stock')}</span>
                    <ArrowUpDown
                      className={`w-3.5 h-3.5 ${
                        sortField === 'STOCK' ? 'text-brand-500' : 'opacity-30'
                      }`}
                    />
                  </div>
                </th>

                <th className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span>{t('common.actions', 'Actions')}</span>
                    {products.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ type: 'all', count: products.length })}
                        className="w-7 h-7 neu-circle-btn text-rose-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                        title={t('products.deleteAllTooltip', 'Delete All Products in Catalog')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-300">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-bold text-sm">{t('products.zeroProductsFound', '0 products found')}</p>
                    {hasActiveCustomFilters && (
                      <button
                        onClick={resetAllFilters}
                        className="mt-2 text-xs text-brand-500 font-bold underline cursor-pointer"
                      >
                        {t('common.reset', 'Reset')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod) => {
                  const isSelected = selectedProductIds.has(prod.id);
                  const expStatus = getProdExpiryStatus(prod.expiryDate);

                  return (
                    <tr
                      key={prod.id}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          handleToggleSelect(prod.id, true);
                        }
                      }}
                      className={`transition-all duration-150 ${
                        isSelected
                          ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] border-l-[3.5px] border-l-emerald-500 hover:bg-emerald-500/[0.12]'
                          : 'border-l-[3.5px] border-l-transparent hover:bg-slate-500/5'
                      }`}
                    >
                      <td
                        className="py-4 pl-3.5 pr-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(prod.id)}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              handleToggleSelect(prod.id, true);
                            }
                          }}
                          size="sm"
                          ariaLabel={`Select ${prod.name}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Product Thumbnail with Lightbox click trigger */}
                          <div
                            onClick={() => {
                              if (prod.imageUrl) {
                                openLightbox({
                                  url: prod.imageUrl,
                                  title: prod.name,
                                  sku: prod.sku,
                                  category: prod.categoryName,
                                  price: prod.sellingPrice,
                                });
                              }
                            }}
                            className={`w-11 h-11 rounded-xl neu-sunken-sm overflow-hidden flex-shrink-0 flex items-center justify-center relative group/img ${
                              prod.imageUrl ? 'cursor-zoom-in' : ''
                            }`}
                          >
                            {prod.imageUrl ? (
                              <>
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-110"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.parentElement!.innerHTML =
                                      '<div class="w-full h-full flex items-center justify-center font-bold text-[10px] text-slate-400">POS</div>';
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-3.5 h-3.5" />
                                </div>
                              </>
                            ) : (
                              <div className="font-extrabold text-[10px] text-slate-400">POS</div>
                            )}
                          </div>

                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{prod.name}</span>
                              {prod.hasVariants && (
                                <span className="px-1.5 py-0.5 rounded-md neu-card-sm text-brand-500 text-[10px] font-bold">
                                  {t('products.variantsCount', '{{count}} Variants', { count: prod.variants?.length || 0 })}
                                </span>
                              )}
                              {prod.expiryDate && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <ExpiryBadge
                                    expiryDate={prod.expiryDate}
                                    batchQuantity={prod.activeBatchQty}
                                    totalQuantity={prod.stockQuantity}
                                    batchCount={prod.batchCount}
                                  />
                                  {Boolean(
                                    prod.batchCount &&
                                      prod.batchCount > 1 &&
                                      prod.activeBatchQty &&
                                      prod.stockQuantity &&
                                      prod.stockQuantity > prod.activeBatchQty
                                  ) && (
                                    <span
                                      className="text-[9.5px] px-1.5 py-0.5 rounded-md font-bold tracking-normal bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                      title={`${(prod.stockQuantity || 0) - (prod.activeBatchQty || 0)} fresh units in next lot`}
                                    >
                                      +{(prod.stockQuantity || 0) - (prod.activeBatchQty || 0)} Fresh
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {prod.description && (
                              <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                                {prod.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{prod.sku}</div>
                        {prod.barcode && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            <span>{prod.barcode}</span>
                          </div>
                        )}
                        {prod.batchNumber && (
                          <div className="text-[10px] text-slate-500 font-sans">
                            {t('products.batchLabel', 'Batch: {{batch}}', { batch: prod.batchNumber })}
                            {Boolean(
                              prod.activeBatchQty &&
                                prod.stockQuantity &&
                                prod.stockQuantity > prod.activeBatchQty
                            )
                              ? ` (${prod.activeBatchQty} pcs)`
                              : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold neu-card-sm text-slate-600 dark:text-slate-300">
                          {prod.categoryName || 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const mode = prod.posMode || 'ALL';
                          if (mode === 'RETAIL_MINIMART') {
                            return (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-card-sm text-emerald-600 dark:text-emerald-400">
                                {t('products.modeBadgeMinimart', 'Minimart')}
                              </span>
                            );
                          }
                          if (mode === 'RESTAURANT_CAFE') {
                            return (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-card-sm text-amber-600 dark:text-amber-400">
                                {t('products.modeBadgeRestaurant', 'Restaurant')}
                              </span>
                            );
                          }
                          if (mode === 'ONLINE_HUB') {
                            return (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-card-sm text-pink-600 dark:text-pink-400">
                                {t('products.modeBadgeOnline', 'Online Hub')}
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold neu-card-sm text-slate-500">
                              {t('products.modeBadgeAll', 'All Modes')}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {format(convert(prod.purchasePrice, baseCode, currentCurrency), currentCurrency)}
                        </div>
                        {currentCurrency !== baseCode && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {format(prod.purchasePrice, baseCode)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {format(convert(prod.sellingPrice, baseCode, currentCurrency), currentCurrency)}
                        </div>
                        {currentCurrency !== baseCode && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {format(prod.sellingPrice, baseCode)}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono">
                        {(() => {
                          const profit = prod.sellingPrice - prod.purchasePrice;
                          const margin = prod.sellingPrice > 0 ? (profit / prod.sellingPrice) * 100 : 0;
                          return (
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg neu-card-sm ${
                                  margin >= 30
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : margin > 0
                                    ? 'text-amber-500'
                                    : 'text-rose-500'
                                }`}
                              >
                                <TrendingUp className="w-2.5 h-2.5" />
                                <span>{margin >= 0 ? '+' : ''}{margin.toFixed(1)}%</span>
                              </span>
                              <div className="text-[10px] text-slate-400 font-medium">
                                +{format(convert(profit, baseCode, currentCurrency), currentCurrency)}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            setStockAdjustItem({
                              productId: prod.id,
                              productName: prod.name,
                              sku: prod.sku,
                              quantity: prod.stockQuantity || 0,
                              avgCost: prod.purchasePrice || 0,
                              batchNumber: prod.batchNumber || '',
                              expiryDate: prod.expiryDate || '',
                            })
                          }
                          className={`px-2.5 py-1 rounded-xl font-black text-[11px] neu-card-sm flex items-center gap-1.5 transition-all group cursor-pointer hover:border-emerald-500/50 ${
                            (prod.stockQuantity || 0) <= 0
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
                              : (prod.stockQuantity || 0) <= 5
                              ? 'text-amber-500 bg-amber-500/10'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                          title={t('products.clickToRestock', 'Click to Restock / Adjust Stock')}
                        >
                          <span>{t('products.inStockCount', '{{count}} in stock', { count: prod.stockQuantity || 0 })}</span>
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-black opacity-60 group-hover:opacity-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                            +
                          </span>
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setStockAdjustItem({
                                productId: prod.id,
                                productName: prod.name,
                                sku: prod.sku,
                                quantity: prod.stockQuantity || 0,
                                avgCost: prod.purchasePrice || 0,
                                batchNumber: prod.batchNumber || '',
                                expiryDate: prod.expiryDate || '',
                              })
                            }
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 flex items-center justify-center cursor-pointer"
                            title={t('products.quickRestock', 'Quick Restock / Stock Adjustment')}
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 flex items-center justify-center cursor-pointer"
                            title={t('products.editProduct', 'Edit product')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: 'single', product: prod })}
                            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer"
                            title={t('products.deleteProduct', 'Delete product')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Bar */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 neu-surface flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Left: Page Size Selector & Record Count */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">{t('products.rowsPerPage', 'Rows per page:')}</span>
            <div className="w-24">
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
                  { value: '999999', label: t('products.allWithCount', `All (${totalItems})`, { total: totalItems }) },
                ]}
                size="sm"
                dropdownWidth="w-28"
              />
            </div>

            <span className="text-slate-400 font-medium">
              {t('products.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
            </span>
          </div>

          {/* Right: Pagination Jump Buttons */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={effectivePage <= 1}
              className="w-8 h-8 neu-circle-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title={t('common.firstPage', 'First Page')}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Previous Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={effectivePage <= 1}
              className="w-8 h-8 neu-circle-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title={t('common.previousPage', 'Previous Page')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers Pill Selection */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 1)
              .map((pageNumber, idx, arr) => {
                const prev = arr[idx - 1];
                return (
                  <React.Fragment key={pageNumber}>
                    {prev && pageNumber - prev > 1 && (
                      <span className="px-1 text-slate-400 font-bold select-none">…</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all active:scale-95 ${
                        pageNumber === effectivePage
                          ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                          : 'neu-btn text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </React.Fragment>
                );
              })}

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={effectivePage >= totalPages}
              className="w-8 h-8 neu-circle-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title={t('common.nextPage', 'Next Page')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={effectivePage >= totalPages}
              className="w-8 h-8 neu-circle-btn text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              title={t('common.lastPage', 'Last Page')}
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-lg neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-500" />
                <span>{editingProduct ? t('products.editProductTitle', 'Edit Product') : t('products.addProductTitle', 'Add New Product')}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                title={t('common.close', 'Close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── High-Design Glassmorphic Step Process Bar (1 to 4) ── */}
            <div className="p-2 neu-tab-container rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs gap-1">
                {[
                  { step: 1, label: t('products.stepBasicInfo', '1. Basic Info'), icon: Package },
                  { step: 2, label: t('products.stepPricingPos', '2. Pricing & POS'), icon: DollarSign },
                  { step: 3, label: t('products.stepOptionsSizes', '3. Options / Sizes'), icon: Layers },
                  { step: 4, label: t('products.stepReviewStock', '4. Review & Stock'), icon: CheckCircle2 },
                ].map((s) => {
                  const Icon = s.icon;
                  const isActive = modalStep === s.step;
                  const isDone = modalStep > s.step;
                  const isStep1Valid = Boolean(formData.name.trim() && formData.sku.trim() && formData.barcode.trim());
                  const isStep2Valid = formData.sellingPrice >= 0;
                  const canClick = s.step < modalStep || (s.step === 2 && isStep1Valid) || (s.step === 3 && isStep1Valid && isStep2Valid) || (s.step === 4 && isStep1Valid && isStep2Valid);

                  return (
                    <button
                      key={s.step}
                      type="button"
                      disabled={!canClick && s.step > modalStep}
                      onClick={() => canClick && setModalStep(s.step)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl font-extrabold text-[11px] transition-all cursor-pointer ${
                        isActive
                          ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400'
                          : isDone
                          ? 'neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-extrabold'
                          : 'text-slate-400 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline whitespace-nowrap">{s.label}</span>
                      <span className="sm:hidden">{s.step}</span>
                    </button>
                  );
                })}
              </div>

              {/* Animated Glowing Progress Bar Line */}
              <div className="w-full neu-sunken-sm h-1.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(modalStep / 4) * 100}%` }}
                />
              </div>
            </div>

            {/* Error Callout Banner */}
            {saveError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 font-bold">{saveError}</div>
                <button
                  type="button"
                  onClick={() => setSaveError(null)}
                  className="w-6 h-6 neu-circle-btn text-rose-400 hover:text-rose-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* ── STEP 1: Basic Info & Picture ── */}
              {modalStep === 1 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  {/* Product Picture Management */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-brand-500" />
                        <span>{t('products.productImage', 'Product Image / Picture')}</span>
                      </label>

                      {/* Mode Selector */}
                      <div className="p-1 neu-tab-container flex items-center gap-1 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setImageMode('upload')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            imageMode === 'upload'
                              ? 'neu-tab-active shadow-neu-raised-sm text-brand-600 dark:text-brand-400'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          <span>{t('products.upload', 'Upload')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageMode('url')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            imageMode === 'url'
                              ? 'neu-tab-active shadow-neu-raised-sm text-brand-600 dark:text-brand-400'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>{t('products.url', 'URL')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Picture Container */}
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Preview with Split Eye Preview + Remove Actions */}
                      <div className="w-24 h-24 rounded-2xl neu-sunken-sm overflow-hidden flex-shrink-0 flex items-center justify-center relative group">
                        {imageUploading ? (
                          <div className="flex flex-col items-center justify-center text-brand-500 gap-1">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-[9px] font-bold">{t('products.uploading', 'Uploading')}</span>
                          </div>
                        ) : formData.imageUrl ? (
                          <>
                            <img
                              src={formData.imageUrl}
                              alt="Product Preview"
                              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                              onClick={() =>
                                openLightbox({
                                  url: formData.imageUrl,
                                  title: formData.name || 'Image Preview',
                                  sku: formData.sku,
                                })
                              }
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />

                            {/* Interactive Hover Actions Overlay */}
                            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openLightbox({
                                    url: formData.imageUrl,
                                    title: formData.name || 'Image Preview',
                                    sku: formData.sku,
                                  })
                                }
                                className="px-2 py-1 rounded-lg bg-white/20 hover:bg-brand-600 text-white font-bold text-[10px] flex items-center gap-1 w-full justify-center transition-colors shadow-sm cursor-pointer"
                                title={t('products.preview', 'Preview')}
                              >
                                <Eye className="w-3 h-3" />
                                <span>{t('products.preview', 'Preview')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="px-2 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-[10px] flex items-center gap-1 w-full justify-center transition-colors shadow-sm cursor-pointer"
                                title={t('products.remove', 'Remove')}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{t('products.remove', 'Remove')}</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-slate-400">
                            <ImageIcon className="w-7 h-7 mx-auto opacity-40 mb-1" />
                            <span className="text-[9px] font-bold block">{t('products.noPicture', 'No Picture')}</span>
                          </div>
                        )}
                      </div>

                      {/* Uploader / URL Field */}
                      <div className="flex-1">
                        {imageMode === 'upload' ? (
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
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
                              className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all px-3 text-center border-slate-300 dark:border-slate-700 hover:border-brand-500/80 neu-sunken-sm ${
                                isDragging ? 'border-brand-500 bg-brand-500/10' : ''
                              }`}
                            >
                              <Upload className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                {imageUploading ? t('products.processingUpload', 'Processing upload...') : t('products.dropImage', 'Click to browse or drop image')}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {t('products.imageLimitNotice', 'PNG, JPG, WEBP up to 5MB')}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={formData.imageUrl}
                              onChange={(e) => {
                                const clean = sanitizeImageUrl(e.target.value);
                                setFormData({ ...formData, imageUrl: clean });
                              }}
                              onPaste={(e) => {
                                const pasteText = e.clipboardData.getData('text');
                                if (pasteText) {
                                  e.preventDefault();
                                  const clean = sanitizeImageUrl(pasteText);
                                  setFormData((prev) => ({ ...prev, imageUrl: clean }));
                                }
                              }}
                              placeholder={t('products.pasteUrlPlaceholder', 'Paste direct image URL or Google Images link...')}
                              className="w-full h-10 px-3 neu-input font-medium text-xs"
                            />
                            <span className="text-[10px] text-slate-400 block">
                              {t('products.pasteUrlHint', 'Paste direct image link (JPG, PNG, WebP) or Google Images link.')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {uploadError && (
                      <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-bold bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t('products.productTitle', 'Product Title')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Signature Iced Caramel Latte"
                      className="w-full h-10 px-3 neu-input font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        {t('products.skuCode', 'SKU Code')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full h-10 px-3 neu-input font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        {t('products.barcodeEan13', 'Barcode (EAN-13)')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        className="w-full h-10 px-3 neu-input font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">{t('products.category', 'Category')}</label>
                    <CustomSelect
                      value={formData.categoryId}
                      onChange={(val) => setFormData({ ...formData, categoryId: val })}
                      options={categories.map((cat) => ({
                        value: cat.id,
                        label: cat.name,
                        subtitle: cat.code ? `Code: ${cat.code}` : undefined,
                      }))}
                      placeholder={t('products.selectCategoryPlaceholder', 'Select a category...')}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 2: Pricing & POS Availability ── */}
              {modalStep === 2 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  {/* Pricing & Cost Suite */}
                  <div className="p-4 rounded-2xl neu-sunken-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span>{t('products.unitCostSellingPrice', 'Unit Cost & Selling Price')}</span>
                      </label>

                      {/* Input Currency Switcher */}
                      <div className="flex items-center gap-1.5 neu-card-sm px-2.5 py-1 rounded-xl shadow-xs">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{t('products.currencyLabel', 'Currency:')}</span>
                        <select
                          value={modalCurrency}
                          onChange={(e) => handleModalCurrencyChange(e.target.value)}
                          className="bg-transparent text-xs font-black text-brand-600 dark:text-brand-400 focus:outline-none cursor-pointer"
                        >
                          {currencies.filter((c) => c.isActive !== false).map((c) => (
                            <option key={c.code} value={c.code} className="dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                              {c.code} ({c.symbol})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400 text-xs">
                            {t('products.costPriceWithCurr', 'Cost Price ({{currency}})', { currency: modalCurrency })}
                          </label>
                          {modalCurrency !== 'USD' ? (
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              {(() => {
                                const val = convert(formData.purchasePrice, modalCurrency, 'USD');
                                return val > 0 && val < 0.01 ? '≈ <$0.01 USD' : `≈ $${val.toFixed(2)} USD`;
                              })()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              ≈ {format(convert(formData.purchasePrice, modalCurrency, baseCode), baseCode)}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                            {currencies.find((c) => c.code === modalCurrency)?.symbol || modalCurrency}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
                            onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full h-10 pl-8 pr-3 neu-input font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400 text-xs">
                            {t('products.sellingPriceWithCurr', 'Selling Price ({{currency}})', { currency: modalCurrency })} <span className="text-rose-500">*</span>
                          </label>
                          {modalCurrency !== 'USD' ? (
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              {(() => {
                                const val = convert(formData.sellingPrice, modalCurrency, 'USD');
                                return val > 0 && val < 0.01 ? '≈ <$0.01 USD' : `≈ $${val.toFixed(2)} USD`;
                              })()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              ≈ {format(convert(formData.sellingPrice, modalCurrency, baseCode), baseCode)}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500">
                            {currencies.find((c) => c.code === modalCurrency)?.symbol || modalCurrency}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            required
                            value={formData.sellingPrice === 0 ? '' : formData.sellingPrice}
                            onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full h-10 pl-8 pr-3 neu-input font-mono font-black text-emerald-600 dark:text-emerald-400"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-600 dark:text-slate-400 text-xs">
                            {t('products.stockQtyUnits', 'Stock QTY (Units)')}
                          </label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            {formData.hasVariants ? t('products.variants', 'Variants') : t('products.inStock', 'In Stock')}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                            #
                          </span>
                          <input
                            type="number"
                            min="0"
                            disabled={formData.hasVariants}
                            value={formData.hasVariants ? formData.variants.reduce((acc, v) => acc + (v.initialStock || 0), 0) : formData.initialStock}
                            onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })}
                            placeholder="0"
                            className={`w-full h-10 pl-8 pr-3 neu-input font-mono font-bold ${
                              formData.hasVariants ? 'opacity-70 cursor-not-allowed' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live Profit Margin Calculation HUD */}
                    {formData.sellingPrice > 0 && (
                      <div className="p-2.5 rounded-xl neu-card-sm flex items-center justify-between text-xs font-bold shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[11px]">{t('products.grossProfit', 'Gross Profit:')}</span>
                          <span className={formData.sellingPrice >= formData.purchasePrice ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-500 font-black'}>
                            {format(formData.sellingPrice - formData.purchasePrice, modalCurrency)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-slate-400 text-[11px]">{t('products.margin', 'Margin:')}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black neu-pill ${
                              ((formData.sellingPrice - formData.purchasePrice) / formData.sellingPrice) >= 0.3
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ((formData.sellingPrice - formData.purchasePrice) / formData.sellingPrice) >= 0
                                ? 'text-amber-500'
                                : 'text-rose-500'
                            }`}
                          >
                            {(((formData.sellingPrice - formData.purchasePrice) / formData.sellingPrice) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* POS Operating Mode Visibility Card */}
                  <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>{t('products.posOperatingChannels', 'POS Operating Channels')}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.posMode || formData.posMode === 'ALL') {
                            setFormData({ ...formData, posMode: 'RESTAURANT_CAFE' });
                          } else {
                            setFormData({ ...formData, posMode: 'ALL' });
                          }
                        }}
                        className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{(!formData.posMode || formData.posMode === 'ALL') ? t('products.selectSpecific', 'Select Specific') : t('products.selectAllModes', 'Select All Modes')}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          id: 'RETAIL_MINIMART',
                          label: t('products.channelMinimart', 'Minimart & Retail'),
                          desc: t('products.channelMinimartDesc', 'Barcode groceries & retail'),
                          icon: Store,
                          color: 'text-emerald-500',
                          activeClass: 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400',
                        },
                        {
                          id: 'RESTAURANT_CAFE',
                          label: t('products.channelRestaurant', 'Restaurant & Cafe'),
                          desc: t('products.channelRestaurantDesc', 'Dining tables & menu'),
                          icon: UtensilsCrossed,
                          color: 'text-amber-500',
                          activeClass: 'neu-tab-active shadow-neu-raised-sm text-amber-600 dark:text-amber-400',
                        },
                        {
                          id: 'ONLINE_HUB',
                          label: t('products.channelOnline', 'Online Hub'),
                          desc: t('products.channelOnlineDesc', 'Delivery (Grab, Panda)'),
                          icon: ShoppingBag,
                          color: 'text-pink-500',
                          activeClass: 'neu-tab-active shadow-neu-raised-sm text-pink-600 dark:text-pink-400',
                        },
                      ].map((mode) => {
                        const Icon = mode.icon;
                        const isAll = !formData.posMode || formData.posMode === 'ALL';
                        const isChecked = isAll || (formData.posMode && formData.posMode.split(',').map((m: string) => m.trim()).includes(mode.id));

                        const handleToggle = () => {
                          let activeList: string[];
                          if (isAll) {
                            activeList = ['RETAIL_MINIMART', 'RESTAURANT_CAFE', 'ONLINE_HUB'].filter((m) => m !== mode.id);
                          } else {
                            const current = formData.posMode.split(',').map((m: string) => m.trim());
                            if (current.includes(mode.id)) {
                              activeList = current.filter((m: string) => m !== mode.id);
                            } else {
                              activeList = [...current, mode.id];
                            }
                          }
                          if (activeList.length === 3 || activeList.length === 0) {
                            setFormData({ ...formData, posMode: 'ALL' });
                          } else {
                            setFormData({ ...formData, posMode: activeList.join(',') });
                          }
                        };

                        return (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={handleToggle}
                            className={`p-2.5 rounded-2xl text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                              isChecked
                                ? mode.activeClass
                                : 'neu-card-interactive text-slate-400 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <Icon className={`w-4 h-4 ${isChecked ? mode.color : 'text-slate-400'}`} />
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-brand-500 text-white'
                                  : 'neu-sunken-sm'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                            <div>
                              <span className={`font-extrabold text-[11px] block leading-tight ${isChecked ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>{mode.label}</span>
                              <span className="text-[9px] text-slate-400 leading-tight block mt-0.5">{mode.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Options & Variants (Sizes S, M, L) ── */}
              {modalStep === 3 && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl neu-sunken-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl neu-card-sm text-indigo-500 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white text-xs block leading-tight">
                          {t('products.enableVariants', 'Enable Product Variants & Options')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {t('products.enableVariantsDesc', 'Sizes S/M/L, beverage styles, pack options')}
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasVariants}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked && (!formData.variants || formData.variants.length === 0)) {
                            applyVariantPreset('SIZES_SML');
                          } else {
                            setFormData({ ...formData, hasVariants: checked });
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {formData.hasVariants ? (
                    <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-3">
                      {/* Multi-Channel Preset Category Tabs */}
                      <div className="flex items-center justify-between gap-1 border-b border-slate-200/50 dark:border-slate-800/60 pb-2">
                        <div className="p-1 neu-tab-container flex items-center gap-1 text-[10px] font-bold">
                          {[
                            { id: 'ALL', label: t('products.allPresets', 'All Presets') },
                            { id: 'RETAIL', label: t('products.presetMinimart', '🛒 Minimart') },
                            { id: 'CAFE', label: t('products.presetCafe', '☕ Cafe & Resto') },
                            { id: 'ONLINE', label: t('products.presetOnline', '🛍️ Online Hub') },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setVariantPresetTab(tab.id as any)}
                              className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                                variantPresetTab === tab.id
                                  ? 'neu-tab-active shadow-neu-raised-sm text-indigo-600 dark:text-indigo-400'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handleAddCustomVariant}
                          className="px-2.5 py-1 rounded-lg neu-btn-primary text-white font-extrabold text-[10px] shadow-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t('products.addOption', '+ Add Option')}</span>
                        </button>
                      </div>

                      {/* Preset Chips */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(variantPresetTab === 'ALL' || variantPresetTab === 'RETAIL') && (
                          <>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('SIZES_SML')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Size S / M / L
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('SIZES_SMLXL')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Size S / M / L / XL
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('PACK_SINGLE_6_BOX')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Single / 6-Pack / Box
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('WEIGHT_250_500_1KG')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              250g / 500g / 1kg
                            </button>
                          </>
                        )}

                        {(variantPresetTab === 'ALL' || variantPresetTab === 'CAFE') && (
                          <>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('DRINK_CUPS_SML')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Cup Size S / M / L
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('DRINK_HOT_ICED_FRAPPE')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Hot / Iced / Frappe
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('SWEETNESS_LEVELS')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Sweet 0% / 50% / 100%
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('FOOD_PORTIONS')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Regular / Special / Jumbo
                            </button>
                          </>
                        )}

                        {(variantPresetTab === 'ALL' || variantPresetTab === 'ONLINE') && (
                          <>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('BUNDLE_SINGLE_DUO_FAMILY')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Single / Duo / Family Pack
                            </button>
                            <button
                              type="button"
                              onClick={() => applyVariantPreset('GIFT_SET_PREMIUM')}
                              className="px-2.5 py-1 rounded-md neu-card-sm text-slate-700 dark:text-slate-300 font-bold text-[10px] transition-all cursor-pointer hover:text-indigo-500"
                            >
                              Standard / Gift Set / Luxury
                            </button>
                          </>
                        )}
                      </div>

                      {/* Variant Items Matrix */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5 scrollbar-thin">
                        {(formData.variants || []).map((v, idx) => {
                          const finalPrice = formData.sellingPrice + (v.priceAdjustment || 0);
                          const finalCost = formData.purchasePrice + (v.costAdjustment || 0);
                          return (
                            <div
                              key={idx}
                              className="p-3 rounded-xl neu-card-sm shadow-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <input
                                    type="text"
                                    required
                                    value={v.name}
                                    onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                                    placeholder="Option name (e.g. Size M)"
                                    className="w-28 h-8 px-2 neu-input font-bold text-xs"
                                  />
                                  <input
                                    type="text"
                                    required
                                    value={v.sku}
                                    onChange={(e) => handleUpdateVariant(idx, 'sku', e.target.value)}
                                    placeholder="SKU"
                                    className="flex-1 h-8 px-2 neu-input font-mono text-[11px]"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveVariant(idx)}
                                  className="w-7 h-7 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                                  title={t('products.remove', 'Remove')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Adjustment and Stock Row */}
                              <div className="grid grid-cols-3 gap-2 text-[11px]">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                    Price Adj (+/-)
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={v.priceAdjustment}
                                    onChange={(e) =>
                                      handleUpdateVariant(idx, 'priceAdjustment', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full h-7 px-2 neu-input font-mono font-bold text-xs"
                                  />
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5 truncate">
                                    Price: {format(finalPrice, modalCurrency)}
                                  </span>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                    Cost Adj (+/-)
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={v.costAdjustment}
                                    onChange={(e) =>
                                      handleUpdateVariant(idx, 'costAdjustment', parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full h-7 px-2 neu-input font-mono font-bold text-xs"
                                  />
                                  <span className="text-[9px] text-slate-400 font-medium block mt-0.5 truncate">
                                    Cost: {format(finalCost, modalCurrency)}
                                  </span>
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                                    Initial Stock
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={v.initialStock || 0}
                                    onChange={(e) =>
                                      handleUpdateVariant(idx, 'initialStock', parseInt(e.target.value) || 0)
                                    }
                                    className="w-full h-7 px-2 neu-input font-mono font-bold text-xs"
                                  />
                                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                                    units
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl neu-sunken-sm text-center space-y-2">
                      <Layers className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        {t('products.singleSkuNoOptions', 'Single Standard SKU (No Options)')}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        {t('products.toggleSwitchToAddOptions', 'Toggle the switch above to add Size S, M, L or beverage style options.')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Inventory Stock & Review Summary ── */}
              {modalStep === 4 && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  {/* Summary Overview Card */}
                  <div className="p-4 rounded-2xl neu-sunken-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl neu-sunken-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {formData.imageUrl ? (
                          <img src={formData.imageUrl} alt="Review" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {formData.name || 'Untitled Product'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold neu-card-sm text-slate-700 dark:text-slate-300">
                            {categories.find((c) => c.id === formData.categoryId)?.name || 'General'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{formData.sku}</span>
                        </div>
                        <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          Selling: {format(formData.sellingPrice, modalCurrency)}
                          <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                            (Cost: {format(formData.purchasePrice, modalCurrency)})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Variants Breakdown */}
                    {formData.hasVariants && (formData.variants?.length || 0) > 0 ? (
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-indigo-500">
                          {formData.variants.length} Configured Options / Sizes:
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {formData.variants.map((v, i) => (
                            <div
                              key={i}
                              className="p-1.5 rounded-lg neu-card-sm text-[10px] flex items-center justify-between"
                            >
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{v.name}</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {format(formData.sellingPrice + (v.priceAdjustment || 0), modalCurrency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60 text-[11px] text-slate-400">
                        {t('products.singleStandardSkuWithoutVariants', 'Single Standard SKU without variants.')}
                      </div>
                    )}
                  </div>

                  {/* Stock Quantity (QTY) Allocation Card */}
                  <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span>{formData.hasVariants ? t('products.totalVariantStockAllocation', 'Total Variant Stock Allocation') : t('products.inventoryStockQty', 'Inventory Stock Quantity (QTY)')}</span>
                      </label>
                      <span className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400 neu-card-sm px-2 py-0.5 rounded-md">
                        {formData.hasVariants
                          ? t('products.totalUnitsCount', '{{count}} Total Units', { count: formData.variants.reduce((acc, v) => acc + (v.initialStock || 0), 0) })
                          : t('products.unitsInStockCount', '{{count}} Units in Stock', { count: formData.initialStock || 0 })}
                      </span>
                    </div>

                    {formData.hasVariants ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {t('products.stockTrackedPerOption', "Stock is tracked per option/size. You can adjust each size's stock in Step 3 (Options/Sizes).")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, initialStock: Math.max(0, (formData.initialStock || 0) - 10) })}
                          className="px-2.5 py-2 rounded-xl neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, initialStock: Math.max(0, (formData.initialStock || 0) - 10) })}
                          className="px-3 py-2 rounded-xl neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={formData.initialStock}
                          onChange={(e) => setFormData({ ...formData, initialStock: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          className="flex-1 h-10 px-3 text-center neu-input font-mono font-black text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, initialStock: (formData.initialStock || 0) + 1 })}
                          className="px-3 py-2 rounded-xl neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, initialStock: (formData.initialStock || 0) + 10 })}
                          className="px-2.5 py-2 rounded-xl neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Initial Batch & Freshness Tracking (Opening Stock) */}
                  {(formData.initialStock > 0 || (formData.hasVariants && formData.variants.some((v) => (v.initialStock || 0) > 0))) && (
                    <div className="p-3.5 rounded-2xl neu-sunken-sm space-y-3 animate-in fade-in zoom-in-95 duration-150 border border-emerald-500/10">
                      <div className="flex items-center justify-between">
                        <label className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          <span>{t('products.batchFreshnessTracking', 'Batch & Freshness Tracking (Opening Stock)')}</span>
                        </label>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded-md font-mono">
                          {t('products.openingLot', 'Opening Lot')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Batch / Lot Number Input */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('products.batchLotNo', 'Batch / Lot No.')}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                              #
                            </span>
                            <input
                              type="text"
                              value={formData.batchNumber}
                              onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                              placeholder={`LOT-${new Date().getFullYear()}-01`}
                              className="w-full h-10 pl-8 pr-3 neu-input font-mono font-bold text-xs"
                            />
                          </div>
                        </div>

                        {/* Expiration Date Picker */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('products.expiryDateOptional', 'Expiry Date (Optional)')}
                          </label>
                          <CustomDatePicker
                            value={formData.expiryDate}
                            onChange={(date) => setFormData({ ...formData, expiryDate: date })}
                            placeholder="YYYY-MM-DD"
                            presets={true}
                          />
                        </div>
                      </div>

                      {/* Live Expiry Tag Preview Badge HUD */}
                      {formData.expiryDate && (
                        <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-bold text-slate-400">
                            {t('products.catalogTagPreview', 'Catalog Tag Preview:')}
                          </span>
                          <ExpiryBadge expiryDate={formData.expiryDate} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Modal Step Wizard Bottom Controls ── */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-500 font-bold transition-colors cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>

                <div className="flex items-center gap-2">
                  {modalStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setModalStep((prev) => Math.max(1, prev - 1))}
                      className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold transition-all active:scale-95 cursor-pointer"
                    >
                      {t('common.back', '← Back')}
                    </button>
                  )}

                  {modalStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (modalStep === 1 && (!formData.name.trim() || !formData.sku.trim() || !formData.barcode.trim())) {
                          setSaveError('Please enter Product Title, SKU Code, and Barcode before proceeding.');
                          return;
                        }
                        setSaveError(null);
                        setModalStep((prev) => Math.min(4, prev + 1));
                      }}
                      className="px-5 py-2.5 neu-btn-primary text-white font-bold active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t('products.nextStep', 'Next Step')}</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 neu-btn-primary text-white font-extrabold active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('common.saving', 'Saving...')}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{editingProduct ? t('products.saveChanges', 'Save Changes') : t('products.launchProduct', 'Launch Product')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── High-Design Image Lightbox / Full-Size Preview Modal ── */}
      {lightboxData && (
        <div
          onClick={() => {
            setLightboxData(null);
            setZoomLevel(1);
          }}
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 select-none animate-in fade-in duration-200"
        >
          {/* Lightbox Top Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl flex items-center justify-between px-5 py-3 rounded-2xl neu-card-lg shadow-xl text-white z-10"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl neu-card-sm text-brand-400 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{lightboxData.title}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  {lightboxData.sku && <span className="font-mono">{lightboxData.sku}</span>}
                  {lightboxData.category && (
                    <span className="px-2 py-0.5 rounded-full neu-card-sm text-brand-500 font-semibold text-[10px]">
                      {lightboxData.category}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center neu-tab-container p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-bold px-2 text-slate-300 min-w-[3.5rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              <a
                href={lightboxData.url}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-xl neu-circle-btn text-slate-400 hover:text-brand-500 flex items-center justify-center transition-colors"
                title="Open Original Image in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setLightboxData(null);
                  setZoomLevel(1);
                }}
                className="w-8 h-8 rounded-xl neu-circle-btn text-rose-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lightbox Center Image Stage */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center p-4 overflow-hidden w-full max-w-5xl"
          >
            <div
              className="relative transition-transform duration-200 ease-out shadow-2xl rounded-3xl overflow-hidden neu-sunken-sm p-2"
              style={{
                transform: `scale(${zoomLevel})`,
                maxHeight: '75vh',
                maxWidth: '90vw',
              }}
            >
              <img
                src={lightboxData.url}
                alt={lightboxData.title}
                className="w-auto h-auto max-h-[75vh] max-w-[85vw] object-contain rounded-2xl"
              />
            </div>
          </div>

          {/* Lightbox Footer Tip */}
          <div className="text-[11px] text-slate-500 font-medium">
            Click anywhere outside or press <kbd className="px-1.5 py-0.5 rounded neu-card-sm text-slate-300 font-mono text-[10px]">Esc</kbd> to close
          </div>
        </div>
      )}

      {/* ── High-Design Glassmorphic Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div
          onClick={() => !isDeleting && setDeleteTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative overflow-hidden"
          >
            {/* Subtle top red danger glow line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-rose-500 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                  {deleteTarget.type === 'single' && t('products.deleteProductModalTitle', 'Delete Product?')}
                  {deleteTarget.type === 'selected' && t('products.deleteSelectedModalTitle', 'Delete {{count}} Selected Products?', { count: deleteTarget.count })}
                  {deleteTarget.type === 'all' && t('products.deleteAllModalTitle', 'Delete All {{count}} Products in Catalog?', { count: deleteTarget.count })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {deleteTarget.type === 'all'
                    ? t('products.deleteAllWarningPermanent', 'This will wipe the entire product master catalog. This action cannot be undone.')
                    : t('products.deleteActionPermanent', 'This action is permanent and cannot be undone.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setDeleteTarget(null)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Single Product Preview Snapshot Card */}
            {deleteTarget.type === 'single' && (
              <div className="p-3.5 rounded-2xl neu-sunken-sm flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl neu-card-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {deleteTarget.product.imageUrl ? (
                    <img src={deleteTarget.product.imageUrl} alt={deleteTarget.product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                    {deleteTarget.product.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{deleteTarget.product.sku}</span>
                    <span>•</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">
                      {format(convert(deleteTarget.product.sellingPrice, baseCode, currentCurrency), currentCurrency)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    {t('products.inStockCount', '{{count}} in stock', { count: deleteTarget.product.stockQuantity || 0 })}
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Selection Summary List */}
            {deleteTarget.type === 'selected' && (
              <div className="p-3 rounded-2xl neu-sunken-sm max-h-36 overflow-y-auto space-y-1.5 text-xs font-semibold scrollbar-thin">
                <div className="text-[10px] font-bold uppercase text-slate-400">Items to be removed:</div>
                {deleteTarget.ids.slice(0, 5).map((id) => {
                  const p = products.find((prod) => prod.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="truncate max-w-[200px]">{p?.name || id}</span>
                      <span className="font-mono text-[10px] text-slate-400">{p?.sku}</span>
                    </div>
                  );
                })}
                {deleteTarget.ids.length > 5 && (
                  <div className="text-[10px] text-slate-400 italic">
                    ...and {deleteTarget.ids.length - 5} more items
                  </div>
                )}
              </div>
            )}

            {/* Danger Callout Warning */}
            {deleteTarget.type !== 'all' && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {t('products.deleteCatalogConsequences', 'Deleting will remove SKU records from active POS catalogs, barcode lookups, and inventory stock balances across all locations.')}
                </span>
              </div>
            )}

            {/* Inline Error if delete fails */}
            {deleteError && (
              <div className="p-3 rounded-2xl bg-rose-600/20 border border-rose-500 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span className="font-semibold">{deleteError}</span>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 neu-btn-danger text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('common.deleting', 'Deleting...')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {deleteTarget.type === 'single' && t('products.confirmDelete', 'Confirm Delete')}
                      {deleteTarget.type === 'selected' && t('products.deleteSelectedCount', 'Delete {{count}} Items', { count: deleteTarget.count })}
                      {deleteTarget.type === 'all' && t('products.deleteAllBtnCount', 'Delete All ({{count}})', { count: deleteTarget.count })}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stock In / Restock & Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={!!stockAdjustItem}
        onClose={() => setStockAdjustItem(null)}
        onSuccess={fetchData}
        inventoryItem={stockAdjustItem}
      />

      {/* Floating Glassmorphic Batch Action Dock */}
      {selectedProductIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] sm:max-w-max animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/15 px-3.5 py-2 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] flex items-center gap-2 sm:gap-3 text-white">
            {/* Selection Counter Pill */}
            <div className="flex items-center gap-2 pr-2 border-r border-white/15">
              <span className="px-2.5 py-1 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{selectedProductIds.size} Selected</span>
              </span>
              {selectedProductIds.size < products.length && (
                <button
                  type="button"
                  onClick={selectAllCatalog}
                  className="hidden md:inline text-[11px] font-bold text-slate-300 hover:text-white underline cursor-pointer"
                >
                  Select all ({products.length})
                </button>
              )}
            </div>

            {/* Batch Action: Change Category */}
            <button
              type="button"
              onClick={() => {
                setBulkSelectedCategory(categories[0]?.id || 'NONE');
                setBulkCategoryModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Change category for selected items"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Category</span>
            </button>

            {/* Batch Action: POS Mode */}
            <button
              type="button"
              onClick={() => {
                setBulkSelectedPosMode('ALL');
                setBulkPosModeModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Set POS operating channels"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Channel</span>
            </button>

            {/* Batch Action: Quick Restock */}
            <button
              type="button"
              onClick={() => {
                setBulkStockQty(10);
                setBulkStockModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Batch restock / adjust stock quantity"
            >
              <PackagePlus className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Restock</span>
            </button>

            {/* Batch Action: Export Selected */}
            <button
              type="button"
              onClick={handleExportSelectedExcel}
              disabled={bulkExportLoading}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Export selected rows to Excel"
            >
              {bulkExportLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Batch Action: Delete Selected */}
            <button
              type="button"
              onClick={() =>
                setDeleteTarget({
                  type: 'selected',
                  ids: Array.from(selectedProductIds),
                  count: selectedProductIds.size,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-rose-600/40 active:scale-95 transition-all cursor-pointer"
              title="Delete all selected items"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            {/* Deselect All */}
            <button
              type="button"
              onClick={deselectAll}
              className="w-7 h-7 rounded-xl hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Deselect all (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Batch Change Category Modal */}
      {bulkCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl neu-card-lg border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Change Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign {selectedProductIds.size} selected products to category
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkCategoryModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Target Category
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin p-1">
                <div
                  onClick={() => setBulkSelectedCategory('NONE')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                    bulkSelectedCategory === 'NONE'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-black/5 dark:border-white/5 neu-card-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>No Category (Uncategorized)</span>
                  </div>
                  {bulkSelectedCategory === 'NONE' && <Check className="w-4 h-4" />}
                </div>

                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setBulkSelectedCategory(cat.id)}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                      bulkSelectedCategory === cat.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-black/5 dark:border-white/5 neu-card-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span>{cat.name}</span>
                    </div>
                    {bulkSelectedCategory === cat.id && <Check className="w-4 h-4" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkCategoryModalOpen(false)}
                className="px-4 py-2 neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkUpdateCategory}
                disabled={bulkActionLoading}
                className="px-5 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-neu-glow-emerald"
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Change POS Mode Modal */}
      {bulkPosModeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl neu-card-lg border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Set POS Mode
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update channel availability for {selectedProductIds.size} products
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkPosModeModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ALL', label: 'All Modes', desc: 'Available across all channels', icon: <Zap className="w-4 h-4 text-indigo-500" /> },
                { id: 'RETAIL_MINIMART', label: 'Minimart & Retail', desc: 'Barcode quick-checkout', icon: <Store className="w-4 h-4 text-emerald-500" /> },
                { id: 'RESTAURANT_CAFE', label: 'Restaurant & Cafe', desc: 'Dine-in, tables & kitchen', icon: <UtensilsCrossed className="w-4 h-4 text-amber-500" /> },
                { id: 'ONLINE_HUB', label: 'Online Hub', desc: 'Delivery & takeaway orders', icon: <ShoppingBag className="w-4 h-4 text-pink-500" /> },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setBulkSelectedPosMode(m.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                    bulkSelectedPosMode === m.id
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'border-black/5 dark:border-white/5 neu-card-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    {m.icon}
                    {bulkSelectedPosMode === m.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                  <div className="font-extrabold">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkPosModeModalOpen(false)}
                className="px-4 py-2 neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkUpdatePosMode(bulkSelectedPosMode)}
                disabled={bulkActionLoading}
                className="px-5 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-neu-glow-emerald"
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Restock / Stock Adjust Modal */}
      {bulkStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md p-6 rounded-3xl neu-card-lg border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Quick Restock
                  </h3>
                  <p className="text-xs text-slate-500">
                    Adjust inventory units for {selectedProductIds.size} products
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkStockModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Quantity Adjustment per Item
              </label>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[5, 10, 25, 50, 100].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setBulkStockQty(qty)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
                      bulkStockQty === qty
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : 'neu-btn text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    +{qty}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkStockQty((prev) => Math.max(-1000, prev - 5))}
                  className="w-10 h-10 neu-circle-btn text-slate-600 dark:text-slate-300 font-black text-sm flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  value={bulkStockQty}
                  onChange={(e) => setBulkStockQty(Number(e.target.value) || 0)}
                  className="flex-1 h-10 neu-input text-center text-sm font-black text-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setBulkStockQty((prev) => prev + 5)}
                  className="w-10 h-10 neu-circle-btn text-slate-600 dark:text-slate-300 font-black text-sm flex items-center justify-center active:scale-95 cursor-pointer"
                >
                  +
                </button>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Note: Each selected product's stock will change by {bulkStockQty > 0 ? `+${bulkStockQty}` : bulkStockQty} units. Negative adjustments are clamped at 0.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkStockModalOpen(false)}
                className="px-4 py-2 neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkStockAdjust}
                disabled={bulkActionLoading || bulkStockQty === 0}
                className="px-5 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-neu-glow-emerald"
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Adjustment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
