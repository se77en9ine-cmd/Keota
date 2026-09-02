import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  ReceiptConfig,
  PaperProfile,
  FontSizeScale,
  ItemDisplayFormat,
  PaymentQrType,
  PaperCutStyle,
  PaperTexture,
  PrintEngine,
  PrintableReceiptData,
  DEFAULT_RECEIPT_CONFIG,
  AVAILABLE_PRINTER_DEVICES,
  PrinterDevice,
} from '../../utils/printEngine';
import {
  LAO_BANKS,
  LaoBankPreset,
  generateUniversalQrImageUrl,
} from '../../utils/qrEngine';
import {
  Printer,
  FileText,
  Smartphone,
  Tag,
  Save,
  CheckCircle2,
  Upload,
  Trash2,
  QrCode,
  Sparkles,
  Eye,
  Store,
  Wifi,
  Sliders,
  Type,
  Layers,
  HelpCircle,
  Scissors,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ruler,
  Check,
  Package,
  Coffee,
  Receipt,
  Grid,
  Usb,
  Bluetooth,
  Monitor,
  HardDrive,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomCheckbox } from '../common/CustomCheckbox';

export const BillCustomizerTab: React.FC = () => {
  const { t } = useTranslation();
  const { store, receiptConfig, updateReceiptConfig } = useSettingsStore();

  const initialFormConfig: ReceiptConfig = (() => {
    const cfg = { ...DEFAULT_RECEIPT_CONFIG, ...receiptConfig };
    if (!cfg.paymentQrAccountNo || cfg.paymentQrAccountNo === '030120000172042001') {
      cfg.paymentQrAccountNo =
        '00020101021115312031041800520446CH5F30D5486E68138590016A00526628466257701082771041802030020316mch5f30d5486e6815204546253034185802LA59052 M D6002SV62150211020585211156304C756';
      cfg.paymentQrAccountName = '2 M D';
      cfg.paymentQrBankName = 'BCEL OnePay (LAPNet / Lao QR)';
    }
    return cfg;
  })();

  const [form, setForm] = useState<ReceiptConfig>(initialFormConfig);

  const [activeSubTab, setActiveSubTab] = useState<'PAGE_SETUP' | 'BRANDING' | 'ITEMS' | 'PAYMENT_QR'>('PAGE_SETUP');
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testQrAmount, setTestQrAmount] = useState<number>(2000);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize form if store config changes externally
  React.useEffect(() => {
    if (receiptConfig) {
      const cfg = { ...DEFAULT_RECEIPT_CONFIG, ...receiptConfig };
      if (!cfg.paymentQrAccountNo || cfg.paymentQrAccountNo === '030120000172042001') {
        cfg.paymentQrAccountNo =
          '00020101021115312031041800520446CH5F30D5486E68138590016A00526628466257701082771041802030020316mch5f30d5486e6815204546253034185802LA59052 M D6002SV62150211020585211156304C756';
        cfg.paymentQrAccountName = '2 M D';
        cfg.paymentQrBankName = 'BCEL OnePay (LAPNet / Lao QR)';
      }
      setForm(cfg);
    }
  }, [receiptConfig]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateReceiptConfig(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save receipt settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = (
    profile: PaperProfile,
    widthMm: number,
    heightMm: number,
    isContinuous: boolean,
    marginMm: number,
    cutStyle: PaperCutStyle
  ) => {
    setForm((prev) => ({
      ...prev,
      defaultPaperProfile: profile,
      paperWidthMm: widthMm,
      paperHeightMm: heightMm,
      isContinuousRoll: isContinuous,
      paperMarginMm: marginMm,
      paperCutStyle: cutStyle,
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((prev) => ({ ...prev, showLogo: true, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((prev) => ({ ...prev, showPaymentQr: true, paymentQrImageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  // Mock Sample Receipt Data for Live Simulator
  const sampleReceiptData: PrintableReceiptData = {
    invoiceNo: 'INV-202608-885512',
    createdAt: new Date().toISOString(),
    cashierName: 'Supper Cashier',
    channel: 'In-Store POS',
    orderType: 'Dine-In',
    tableNo: 'T-08',
    customerName: 'Somxai Vongxay',
    customerPhone: '+856 20 555-3939',
    customerTier: 'VIP GOLD',
    items: [
      {
        name: 'ລາບໄກ່ພື້ນເມືອງ (Lao Minced Chicken)',
        variantName: 'Medium Spicy',
        code: 'FOOD-001',
        quantity: 2,
        unitPrice: 45000,
        discountAmount: 5000,
        totalPrice: 85000,
      },
      {
        name: 'ຕຳໝາກຮຸ່ງຫຼວງພະບາງ (Luang Prabang Papaya Salad)',
        variantName: 'Original Pad Dek',
        code: 'FOOD-004',
        quantity: 1,
        unitPrice: 35000,
        discountAmount: 0,
        totalPrice: 35000,
      },
      {
        name: 'Beerlao Gold 330ml Can',
        variantName: 'Chilled',
        code: 'BEV-009',
        quantity: 4,
        unitPrice: 20000,
        discountAmount: 0,
        totalPrice: 80000,
      },
    ],
    subtotal: 200000,
    discountAmount: 5000,
    taxAmount: 13650,
    taxRate: 7,
    taxName: 'VAT',
    serviceCharge: 10000,
    deliveryFee: 0,
    totalAmount: 218650,
    paidAmount: 220000,
    changeAmount: 1350,
    payments: [
      {
        paymentMethod: 'BCEL One QR Pay',
        amount: 220000,
        currency: 'LAK',
        referenceNo: 'TXN-98442211',
      },
    ],
    currencySymbol: '₭',
  };

  const handleTestPrint = () => {
    PrintEngine.print(sampleReceiptData, form, store);
  };

  // Convert mm width to simulator pixel width (approx 3.78px per mm at 96dpi on screen)
  const currentMmWidth = form.paperWidthMm || 80;
  const currentMmHeight = form.paperHeightMm || 0;
  const currentMarginMm = form.paperMarginMm !== undefined ? form.paperMarginMm : 3;
  const printableWidthMm = Math.max(currentMmWidth - currentMarginMm * 2, 20);

  // Scaled CSS width in pixels
  const simulatorWidthPx = Math.min(Math.max(currentMmWidth * 3.8, 220), 520);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-xs">
      {/* Top Banner & Action Header */}
      <div className="p-6 neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <span>{t('settings.billCustomizerTitle', 'Print Bill & Page Setup Studio')}</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            {t(
              'settings.billCustomizerSubtitle',
              'Customize layout, paper dimensions, margin guides, and physical format setup with live interactive simulation'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-200 font-extrabold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-emerald-500" />
            <span>{t('settings.testPrintBtn', 'Test Print Sample')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
                <span>{t('common.saved', 'Saved Successfully!')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('settings.savePrintConfig', 'Save Configuration')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation for Deep Customization */}
      <div className="flex items-center gap-1.5 p-1 neu-tab-container overflow-x-auto">
        {[
          { id: 'PAGE_SETUP', label: t('settings.billSubtabPageSetup', '1. Paper Size & Page Setup'), icon: Ruler, badge: `${currentMmWidth}mm` },
          { id: 'BRANDING', label: t('settings.billSubtabBranding', '2. Store Branding & Header'), icon: Store },
          { id: 'ITEMS', label: t('settings.billSubtabItems', '3. Line Items & Breakdown'), icon: Layers },
          { id: 'PAYMENT_QR', label: t('settings.billSubtabPaymentQr', '4. Payment QR & Policy'), icon: QrCode },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-full font-extrabold text-xs flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-full font-mono text-[9.5px] font-black neu-pill text-emerald-600 dark:text-emerald-400">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left Setup Controls (7 cols) + Right Tactile Live Simulator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* TAB 1: PAPER SIZE & TACTILE PAGE SETUP */}
          {activeSubTab === 'PAGE_SETUP' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* 1. AVAILABLE HARDWARE PRINTER STATIONS */}
              <div className="p-6 neu-card-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                      <span>{t('settings.printerStationsTitle', 'Available Hardware Printer Stations')}</span>
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {t('settings.printerStationsSubtitle', 'Select active hardware terminal or tap to switch default printing device')}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('settings.stationsReady', '{{count}} Stations Ready', { count: AVAILABLE_PRINTER_DEVICES.length })}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AVAILABLE_PRINTER_DEVICES.map((dev) => {
                    const isSelected = form.selectedPrinterDeviceId === dev.id || (!form.selectedPrinterDeviceId && dev.id === 'epson-tm-t88');
                    return (
                      <div
                        key={dev.id}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            selectedPrinterDeviceId: dev.id,
                            defaultPaperProfile: dev.paperProfile,
                            defaultTemplateStyle: dev.templateStyle,
                          }));
                          const presetWidths: Record<string, number> = {
                            '80MM': 80,
                            '58MM': 58,
                            '100MM': 100,
                            'A4': 210,
                            'LABEL_50X30': 50,
                          };
                          if (presetWidths[dev.paperProfile]) {
                            setForm((prev) => ({
                              ...prev,
                              paperWidthMm: presetWidths[dev.paperProfile],
                            }));
                          }
                        }}
                        className={`p-3.5 neu-card-interactive cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'ring-2 ring-emerald-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {dev.connection === 'USB' ? (
                              <Usb className="w-4 h-4 text-emerald-500" />
                            ) : dev.connection === 'NETWORK' ? (
                              <Wifi className="w-4 h-4 text-blue-500" />
                            ) : dev.connection === 'BLUETOOTH' ? (
                              <Bluetooth className="w-4 h-4 text-purple-500" />
                            ) : (
                              <Monitor className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="font-extrabold text-[12px] text-slate-800 dark:text-white truncate">
                              {dev.name}
                            </span>
                          </div>

                          <span className="text-[8.5px] px-2 py-0.5 rounded-full font-bold uppercase neu-pill text-emerald-600 dark:text-emerald-400">
                            {dev.status}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mb-2">
                          {dev.address}
                        </div>

                        <div className="flex items-center justify-between text-[9.5px] pt-1.5 border-t border-slate-200/40 dark:border-slate-800 font-mono">
                          <span className="text-slate-600 dark:text-slate-300 font-bold">
                            {dev.paperName}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Check className="w-3 h-3" />
                              <span>{t('settings.activeStation', 'Active Station')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Hardware Paper Size Presets */}
              <div className="p-6 neu-card-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-emerald-500" />
                      <span>{t('settings.paperFormatsTitle', 'Hardware Paper Formats & Geometry')}</span>
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {t('settings.paperFormatsSubtitle', 'Freely adjust custom millimeter dimensions and page margins')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black neu-pill text-emerald-600 dark:text-emerald-400">
                    {t('common.active', 'Active')}: {currentMmWidth}mm Roll
                  </span>
                </div>

                {/* Preset Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: '80MM',
                      label: '80mm POS Roll',
                      sub: 'Standard POS Counter',
                      width: 80,
                      height: 0,
                      continuous: true,
                      margin: 3,
                      cut: 'TEAR_ZIGZAG' as PaperCutStyle,
                      icon: Printer,
                    },
                    {
                      id: '58MM',
                      label: '58mm Handheld',
                      sub: 'Sunmi / Bluetooth',
                      width: 58,
                      height: 0,
                      continuous: true,
                      margin: 1.5,
                      cut: 'TEAR_ZIGZAG' as PaperCutStyle,
                      icon: Smartphone,
                    },
                    {
                      id: '100MM',
                      label: '100mm Wide Roll',
                      sub: 'Kitchen Order Slip',
                      width: 100,
                      height: 0,
                      continuous: true,
                      margin: 4,
                      cut: 'STRAIGHT_CUT' as PaperCutStyle,
                      icon: Receipt,
                    },
                    {
                      id: 'LABEL_50X30',
                      label: '50×30mm Box Tag',
                      sub: 'Delivery Label',
                      width: 50,
                      height: 30,
                      continuous: false,
                      margin: 1,
                      cut: 'CARD_ROUNDED' as PaperCutStyle,
                      icon: Package,
                    },
                    {
                      id: 'LABEL_40X30',
                      label: '40×30mm Cup Label',
                      sub: 'Beverage & Cafe',
                      width: 40,
                      height: 30,
                      continuous: false,
                      margin: 1,
                      cut: 'CARD_ROUNDED' as PaperCutStyle,
                      icon: Coffee,
                    },
                    {
                      id: 'A5',
                      label: 'A5 Half Sheet',
                      sub: '148×210mm Invoice',
                      width: 148,
                      height: 210,
                      continuous: false,
                      margin: 10,
                      cut: 'STRAIGHT_CUT' as PaperCutStyle,
                      icon: FileText,
                    },
                    {
                      id: 'A4',
                      label: 'A4 Full Sheet',
                      sub: '210×297mm Tax Doc',
                      width: 210,
                      height: 297,
                      continuous: false,
                      margin: 15,
                      cut: 'STRAIGHT_CUT' as PaperCutStyle,
                      icon: FileText,
                    },
                    {
                      id: 'CUSTOM',
                      label: 'Custom Width',
                      sub: 'Custom Dimension',
                      width: form.paperWidthMm || 80,
                      height: form.paperHeightMm || 0,
                      continuous: form.isContinuousRoll,
                      margin: form.paperMarginMm || 3,
                      cut: form.paperCutStyle || 'TEAR_ZIGZAG',
                      icon: Sliders,
                    },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = form.defaultPaperProfile === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          handleApplyPreset(
                            p.id as PaperProfile,
                            p.width,
                            p.height,
                            p.continuous,
                            p.margin,
                            p.cut
                          )
                        }
                        className={`p-3 neu-card-interactive cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'ring-2 ring-emerald-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'neu-sunken-sm text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                        <div>
                          <div className="font-extrabold text-[11px] text-slate-800 dark:text-white leading-tight">
                            {p.label}
                          </div>
                          <div className="text-[9.5px] text-slate-400 mt-0.5">{p.sub}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Physical Dimension Sliders & Tactile Customizer */}
              <div className="p-6 neu-card-lg space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/40 dark:border-slate-800">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <span>{t('settings.marginControlsTitle', 'Millimeter Geometry & Paper Margin Controls')}</span>
                  </h4>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {t('settings.printableWidth', 'Printable Width')}: <strong className="text-emerald-600 dark:text-emerald-400">{printableWidthMm}mm</strong>
                  </div>
                </div>

                {/* Paper Width Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{t('settings.paperRollWidth', 'Physical Paper Roll Width')}</span>
                    </label>
                    <div className="flex items-center gap-1 font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                      <span>{currentMmWidth} mm</span>
                      <span className="text-[10px] text-slate-400">({(currentMmWidth * 0.03937).toFixed(2)} in)</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={210}
                    step={1}
                    value={currentMmWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setForm({
                        ...form,
                        paperWidthMm: val,
                        defaultPaperProfile: val === 80 ? '80MM' : val === 58 ? '58MM' : val === 210 ? 'A4' : 'CUSTOM',
                      });
                    }}
                    className="w-full accent-emerald-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>40mm (Cup)</span>
                    <span>58mm (Handheld)</span>
                    <span>80mm (Standard POS)</span>
                    <span>100mm (Kitchen)</span>
                    <span>210mm (A4)</span>
                  </div>
                </div>

                {/* Continuous Roll vs Fixed Sheet Height */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800">
                  <div className="p-4 neu-card-sm space-y-2">
                    <div
                      onClick={() => setForm({ ...form, isContinuousRoll: !form.isContinuousRoll })}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white text-[11px]">{t('settings.continuousRoll', 'Continuous Roll Length')}</div>
                        <div className="text-[10px] text-slate-400">{t('settings.continuousRollSub', 'Auto extends based on item count')}</div>
                      </div>
                      <CustomCheckbox
                        checked={form.isContinuousRoll}
                        onChange={(checked) => setForm({ ...form, isContinuousRoll: checked })}
                      />
                    </div>
                  </div>

                  {!form.isContinuousRoll && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{t('settings.fixedHeight', 'Fixed Page Height')}:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{form.paperHeightMm || 100} mm</span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={297}
                        step={5}
                        value={form.paperHeightMm || 100}
                        onChange={(e) => setForm({ ...form, paperHeightMm: Number(e.target.value) })}
                        className="w-full accent-emerald-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Margins */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{t('settings.paperMargins', 'Paper Margins')}:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{currentMarginMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={15}
                      step={0.5}
                      value={currentMarginMm}
                      onChange={(e) => setForm({ ...form, paperMarginMm: Number(e.target.value) })}
                      className="w-full accent-emerald-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Paper Cut Edge Style & Texture */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('settings.tearCutStyle', 'Receipt Tear & Cut Style')}
                    </label>
                    <CustomSelect
                      value={form.paperCutStyle}
                      onChange={(val) => setForm({ ...form, paperCutStyle: val as PaperCutStyle })}
                      options={[
                        { value: 'TEAR_ZIGZAG', label: '✂️ Serrated Zig-Zag Tear (Thermal)' },
                        { value: 'STRAIGHT_CUT', label: '✂️ Auto-Guillotine Straight Cut' },
                        { value: 'PERFORATED', label: '🎟️ Perforated Ticket Dotted' },
                        { value: 'CARD_ROUNDED', label: '🏷️ Rounded Die-Cut Label' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('settings.fontSizeScaling', 'Font Size Scaling')}
                    </label>
                    <CustomSelect
                      value={form.fontSizeScale}
                      onChange={(val) => setForm({ ...form, fontSizeScale: val as FontSizeScale })}
                      options={[
                        { value: 'COMPACT', label: 'Compact (Tight, saves paper)' },
                        { value: 'STANDARD', label: 'Standard (Balanced, recommended)' },
                        { value: 'COMFORTABLE', label: 'Comfortable (Medium large)' },
                        { value: 'LARGE', label: 'Large (High legibility)' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STORE BRANDING & HEADER */}
          {activeSubTab === 'BRANDING' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 neu-card-lg space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  <span>{t('settings.storeBrandingTitle', 'Store Branding & Receipt Header Elements')}</span>
                </h4>

                {/* Logo Upload Box */}
                <div className="p-4 neu-card-sm space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setForm({ ...form, showLogo: !form.showLogo })}>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{t('settings.printLogoTitle', 'Print Store Logo at Top of Bill')}</div>
                      <div className="text-[11px] text-slate-400">{t('settings.printLogoDesc', 'High contrast bitmap or monochrome logo')}</div>
                    </div>
                    <CustomCheckbox
                      checked={form.showLogo}
                      onChange={(checked) => setForm({ ...form, showLogo: checked })}
                    />
                  </div>

                  {form.showLogo && (
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-200/40 dark:border-slate-800">
                      <div className="w-20 h-14 rounded-xl neu-sunken-sm flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <Upload className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-1.5 rounded-xl neu-btn-primary text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{t('settings.uploadLogo', 'Upload Logo')}</span>
                          </button>
                          {form.logoUrl && (
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, logoUrl: '' })}
                              className="neu-circle-btn w-7 h-7 text-rose-500 cursor-pointer"
                              title="Remove Logo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{t('settings.logoSpecs', 'PNG, JPG, or SVG. Under 2MB.')}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Header Information Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    { key: 'showStoreName', label: t('settings.storeName', 'Store Name'), sub: store?.name || '39POS Flagship Store' },
                    { key: 'showStoreAddress', label: t('settings.storeAddress', 'Store Address'), sub: store?.address || 'Lane Xang Ave, Vientiane' },
                    { key: 'showStorePhone', label: t('settings.contactPhone', 'Contact Phone'), sub: store?.phone || '+856 21 213939' },
                    { key: 'showTaxId', label: t('settings.taxRegId', 'Tax Registration ID'), sub: store?.taxId || 'LA-TAX-99887766' },
                    { key: 'showWifiInfo', label: t('settings.wifiCredentials', 'WiFi Credentials'), sub: `${form.wifiSsid} / ${form.wifiPassword}` },
                    { key: 'showCustomerDetails', label: t('settings.customerInfo', 'Customer Info'), sub: t('settings.customerInfoSub', 'Name, Phone & VIP Tier') },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => setForm({ ...form, [item.key]: !(form as any)[item.key] })}
                      className="p-3.5 neu-card-interactive flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-800 dark:text-white text-[11px]">{item.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.sub}</div>
                      </div>
                      <CustomCheckbox
                        checked={(form as any)[item.key]}
                        onChange={(checked) => setForm({ ...form, [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>

                {/* Custom Welcome Message */}
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('settings.customHeaderNotice', 'Custom Header Welcome Notice')}
                  </label>
                  <input
                    type="text"
                    value={form.customHeaderNote || ''}
                    onChange={(e) => setForm({ ...form, customHeaderNote: e.target.value })}
                    placeholder="e.g. Welcome! Multi-Currency Accepted • Free WiFi"
                    className="w-full h-10 px-3 neu-input font-mono text-[11px] outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LINE ITEMS & BREAKDOWN */}
          {activeSubTab === 'ITEMS' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 neu-card-lg space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>{t('settings.lineItemsTitle', 'Line Items Layout & Price Breakdown')}</span>
                </h4>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    {t('settings.itemDisplayFormat', 'Item Display Format')}
                  </label>
                  <CustomSelect
                    value={form.itemDisplayFormat}
                    onChange={(val) => setForm({ ...form, itemDisplayFormat: val as ItemDisplayFormat })}
                    options={[
                      { value: 'TWO_LINES', label: t('settings.formatTwoLines', 'Two Lines (Product Name above, Qty × Price below)') },
                      { value: 'SINGLE_LINE', label: t('settings.formatSingleLine', 'Single Line Table (Compact side-by-side)') },
                    ]}
                  />
                </div>

                {/* Financial Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {[
                    { key: 'showItemCode', label: t('settings.showSkuBarcode', 'Show SKU / Barcode'), sub: t('settings.showSkuBarcodeSub', 'Print product code below item') },
                    { key: 'showDiscountBreakdown', label: t('settings.showDiscountBreakdown', 'Item Discount Breakdown'), sub: t('settings.showDiscountBreakdownSub', 'Show negative discount amount') },
                    { key: 'showTaxBreakdown', label: t('settings.showTaxVatBreakdown', 'Tax & VAT Breakdown'), sub: t('settings.showTaxVatBreakdownSub', 'Show itemized VAT and rate') },
                    { key: 'showCashierName', label: t('settings.showCashierName', 'Cashier Staff ID'), sub: t('settings.showCashierNameSub', 'Print processed by staff name') },
                    { key: 'showDeliveryBadge', label: t('settings.showCourierFreight', 'Courier & Freight Info'), sub: t('settings.showCourierFreightSub', 'Tracking # and freight payer') },
                  ].map((item) => (
                    <div
                      key={item.key}
                      onClick={() => setForm({ ...form, [item.key]: !(form as any)[item.key] })}
                      className="p-3.5 neu-card-interactive flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-800 dark:text-white text-[11px]">{item.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.sub}</div>
                      </div>
                      <CustomCheckbox
                        checked={(form as any)[item.key]}
                        onChange={(checked) => setForm({ ...form, [item.key]: checked })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENT QR & POLICY */}
          {activeSubTab === 'PAYMENT_QR' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 neu-card-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-500" />
                      <span>{t('settings.paymentQrTitle', 'Dynamic Payment QR Code (Lao QR / LAPNet / Multi-Bank)')}</span>
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {t('settings.paymentQrSubtitle', 'Standard-compliant EMVCo QR code for all Lao banks, PromptPay, and Customer Display')}
                    </p>
                  </div>
                  <CustomCheckbox
                    size="lg"
                    checked={form.showPaymentQr}
                    onChange={(checked) => setForm({ ...form, showPaymentQr: checked })}
                  />
                </div>

                {form.showPaymentQr && (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    {/* Row 1: QR Standard & Bank Preset */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          {t('settings.paymentQrStandard', 'Payment QR Standard')}
                        </label>
                        <CustomSelect
                          value={form.paymentQrType || 'LAO_QR_LAPNET'}
                          onChange={(val) => setForm({ ...form, paymentQrType: val as PaymentQrType })}
                          options={[
                            { value: 'LAO_QR_LAPNET', label: '🇱🇦 Lao QR (LAPNet - All 18+ Lao Banks)' },
                            { value: 'BCEL_ONE', label: '🔴 BCEL One Direct LA QR Pay' },
                            { value: 'PROMPTPAY', label: '🇹🇭 PromptPay Thailand QR (BOT Standard)' },
                            { value: 'VIET_QR', label: '🇻🇳 VietQR (NAPAS Standard)' },
                            { value: 'KHQR', label: '🇰🇭 KHQR (Bakong Cambodia)' },
                            { value: 'CUSTOM_IMAGE', label: '🖼️ Custom Uploaded Merchant QR' },
                            { value: 'ORDER_TRACKING_URL', label: '🌐 Dynamic Web Order Tracking URL' },
                          ]}
                        />
                      </div>

                      {/* Bank Preset Selection for Lao QR */}
                      {(form.paymentQrType === 'LAO_QR_LAPNET' || form.paymentQrType === 'BCEL_ONE' || !form.paymentQrType) && (
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            {t('settings.laoBankPresetSwitch', 'Lao Bank Preset / Switch')}
                          </label>
                          <CustomSelect
                            value={form.paymentQrBankCode || 'ALL_BANKS'}
                            onChange={(val) => {
                              const found = LAO_BANKS.find((b) => b.code === val);
                              setForm({
                                ...form,
                                paymentQrBankCode: val as LaoBankPreset,
                                paymentQrBankName: found ? found.name : form.paymentQrBankName,
                              });
                            }}
                            options={LAO_BANKS.map((b) => ({
                              value: b.code,
                              label: `${b.logoText} - ${b.shortName}`,
                              subtitle: `App: ${b.app} • BIN: ${b.bin}`,
                            }))}
                          />
                        </div>
                      )}
                    </div>

                    {/* Dynamic Matching Amount Toggle */}
                    <div
                      onClick={() => setForm({ ...form, paymentQrDynamicAmount: form.paymentQrDynamicAmount === false })}
                      className="p-4 neu-card-sm flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t('settings.autoInjectAmountTitle', 'Auto-Inject Matching POS Payable Total into QR (Recommended)')}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t('settings.autoInjectAmountDesc', 'Encodes the exact bill total and currency into the QR code so customer banking apps (BCEL One, etc.) automatically fill the amount with 0 manual typing.')}
                        </div>
                      </div>
                      <CustomCheckbox
                        checked={form.paymentQrDynamicAmount !== false}
                        onChange={(checked) => setForm({ ...form, paymentQrDynamicAmount: checked })}
                      />
                    </div>

                    {/* Row 2: Account Number, Beneficiary Name, Custom Bank Title */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                              {t('settings.lapnetMerchantCode', 'LAPNet Merchant Code / Base QR String')}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setForm({
                                  ...form,
                                  paymentQrAccountNo:
                                    '00020101021115312031041800520446CH5F30D5486E68138590016A00526628466257701082771041802030020316mch5f30d5486e6815204546253034185802LA59052 M D6002SV62150211020585211156304C756',
                                  paymentQrAccountName: '2 M D',
                                  paymentQrBankName: 'BCEL OnePay (LAPNet Lao QR)',
                                });
                              }}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                            >
                              {t('settings.resetToOnePay', 'Reset to 2 M D OnePay')}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={form.paymentQrAccountNo || ''}
                            onChange={(e) => setForm({ ...form, paymentQrAccountNo: e.target.value })}
                            placeholder="mch5f30d5486e681 or 000201..."
                            className="w-full h-10 px-3 neu-input font-mono text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
                            {t('settings.beneficiaryLegalName', 'Beneficiary Legal Business Name')}
                          </label>
                          <input
                            type="text"
                            value={form.paymentQrAccountName || ''}
                            onChange={(e) => setForm({ ...form, paymentQrAccountName: e.target.value })}
                            placeholder="2 M D"
                            className="w-full h-10 px-3 neu-input font-mono text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
                            {t('settings.displayBankTitle', 'Display Bank Title')}
                          </label>
                          <input
                            type="text"
                            value={form.paymentQrBankName || ''}
                            onChange={(e) => setForm({ ...form, paymentQrBankName: e.target.value })}
                            placeholder="BCEL OnePay (LAPNet / Lao QR)"
                            className="w-full h-10 px-3 neu-input font-mono text-xs outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Live EMVCo Live QR Inspector & Test Box */}
                    {(() => {
                      const activeAcc =
                        !form.paymentQrAccountNo || form.paymentQrAccountNo === '030120000172042001'
                          ? '00020101021115312031041800520446CH5F30D5486E68138590016A00526628466257701082771041802030020316mch5f30d5486e6815204546253034185802LA59052 M D6002SV62150211020585211156304C756'
                          : form.paymentQrAccountNo;

                      const testRes = generateUniversalQrImageUrl(
                        {
                          standard: form.paymentQrType || 'LAO_QR_LAPNET',
                          bankCode: form.paymentQrBankCode || 'BCEL',
                          accountNo: activeAcc,
                          accountName: form.paymentQrAccountName || '2 M D',
                          storeName: store?.name || '2 M D',
                          bankName: form.paymentQrBankName,
                          amount: form.paymentQrDynamicAmount !== false ? testQrAmount : undefined,
                          currency: 'LAK',
                          invoiceNo: 'INV-LIVE-TEST',
                          customImageUrl: form.paymentQrImageUrl,
                        },
                        180
                      );

                      return (
                        <div className="p-4 neu-sunken rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                          <div className="w-36 h-36 bg-white p-2 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-emerald-500/40">
                            <img src={testRes.qrImageUrl} alt="Live Test QR" className="w-full h-full object-contain" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-2 text-left w-full">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md neu-pill text-emerald-600 dark:text-emerald-400">
                                  {t('settings.emvcoTag54Verified', 'EMVCo Tag 54 Verified (BCEL One & All Banks)')}
                                </span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">{testRes.standardTitle}</span>
                              </div>
                            </div>

                            {/* Interactive Test Amount Selector */}
                            <div className="flex items-center gap-2 flex-wrap pt-0.5">
                              <span className="text-[11px] font-bold text-slate-400">Test Matching Amount:</span>
                              {[2000, 15000, 50000, 218850].map((amt) => (
                                <button
                                  key={amt}
                                  type="button"
                                  onClick={() => setTestQrAmount(amt)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                    testQrAmount === amt
                                      ? 'neu-btn-primary text-white font-black'
                                      : 'neu-btn text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {amt.toLocaleString()} ₭
                                </button>
                              ))}
                              <input
                                type="number"
                                value={testQrAmount}
                                onChange={(e) => setTestQrAmount(Number(e.target.value) || 0)}
                                className="w-24 h-6 px-2 rounded-lg neu-input text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold outline-none"
                                placeholder="Custom ₭"
                              />
                            </div>

                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Encoded Payable Total: {testQrAmount.toLocaleString()} LAK (Tag 54: {testQrAmount.toFixed(2)})</span>
                            </div>

                            <div className="text-[9.5px] text-slate-400 font-mono truncate max-w-full neu-sunken-sm p-1.5 rounded-lg">
                              Payload: {testRes.qrRawData}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Policy Notes */}
              <div className="p-6 neu-card-lg space-y-4">
                <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>{t('settings.footerNoticePolicyTitle', 'Footer Notice & Return Policy')}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('settings.thankYouMessage', 'Thank You Message')}
                    </label>
                    <input
                      type="text"
                      value={form.customFooterNote || ''}
                      onChange={(e) => setForm({ ...form, customFooterNote: e.target.value })}
                      placeholder="*** Thank You! Please Come Again ***"
                      className="w-full h-10 px-3 neu-input font-mono outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('settings.returnPolicy', 'Return / Refund Policy')}
                    </label>
                    <input
                      type="text"
                      value={form.returnPolicyText || ''}
                      onChange={(e) => setForm({ ...form, returnPolicyText: e.target.value })}
                      placeholder="Goods sold are refundable within 3 days with receipt."
                      className="w-full h-10 px-3 neu-input font-mono outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tactile Live Receipt Studio Viewport (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 neu-card-lg shadow-xl sticky top-6 space-y-4">
            {/* Viewport Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  {t('settings.tactileSimulatorTitle', 'Tactile Paper Simulator')}
                </span>
              </div>

              {/* Toolbar Actions (Zoom & Ruler) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowRuler(!showRuler)}
                  className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    showRuler ? 'neu-btn-primary text-white' : 'neu-btn text-slate-600 dark:text-slate-300'
                  }`}
                  title="Toggle Millimeter Ruler Guide"
                >
                  <Ruler className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.max(prev - 25, 75))}
                  className="neu-circle-btn w-7 h-7 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 px-1 font-bold">{zoomScale}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale((prev) => Math.min(prev + 25, 150))}
                  className="neu-circle-btn w-7 h-7 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dimension Gauge Bar */}
            <div className="flex items-center justify-between px-3 py-2 neu-sunken-sm text-[10px] font-mono rounded-xl">
              <span className="text-slate-400">
                {t('settings.gaugeRoll', 'Roll')}: <strong className="text-slate-800 dark:text-white">{currentMmWidth}mm</strong>
              </span>
              <span className="text-slate-400">
                {t('settings.gaugePrintable', 'Printable')}: <strong className="text-emerald-600 dark:text-emerald-400">{printableWidthMm}mm</strong>
              </span>
              <span className="text-slate-400">
                {t('settings.gaugeMargin', 'Margin')}: <strong className="text-emerald-600 dark:text-emerald-400">{currentMarginMm}mm</strong>
              </span>
              <span className="text-slate-400">
                {t('settings.gaugeCut', 'Cut')}: <strong className="text-amber-500">{form.paperCutStyle.split('_')[0]}</strong>
              </span>
            </div>

            {/* Simulated Paper Environment */}
            <div className="neu-sunken p-4 rounded-2xl flex justify-center max-h-[640px] overflow-y-auto relative">
              {/* Millimeter Ruler Header */}
              {showRuler && (
                <div className="absolute top-1 left-4 right-4 h-3 flex justify-between border-b border-emerald-500/40 text-[7px] font-mono text-emerald-600 dark:text-emerald-400/80 pointer-events-none">
                  <span>0mm</span>
                  <span>20mm</span>
                  <span>40mm</span>
                  <span>60mm</span>
                  <span>{currentMmWidth}mm</span>
                </div>
              )}

              {/* The Paper Component */}
              <div
                style={{
                  width: `${simulatorWidthPx}px`,
                  transform: `scale(${zoomScale / 100})`,
                  transformOrigin: 'top center',
                }}
                className={`bg-white text-slate-900 shadow-2xl font-mono leading-relaxed transition-all relative ${
                  form.paperCutStyle === 'CARD_ROUNDED'
                    ? 'rounded-3xl p-5'
                    : 'rounded-none p-5 pt-7 pb-8'
                } ${
                  form.fontSizeScale === 'COMPACT'
                    ? 'text-[10px]'
                    : form.fontSizeScale === 'LARGE'
                    ? 'text-xs'
                    : 'text-[11px]'
                }`}
              >
                {/* Serrated Zigzag Tear Edge Top */}
                {form.paperCutStyle === 'TEAR_ZIGZAG' && (
                  <div
                    className="absolute -top-2 left-0 right-0 h-2 bg-white"
                    style={{
                      maskImage:
                        'radial-gradient(circle at 5px 0px, transparent 5px, black 5.5px)',
                      maskSize: '10px 10px',
                      maskRepeat: 'repeat-x',
                    }}
                  />
                )}

                {/* Store Header */}
                <div className="text-center pb-2.5 border-b border-dashed border-slate-300">
                  {form.showLogo && form.logoUrl && (
                    <img
                      src={form.logoUrl}
                      alt="Logo"
                      className="max-h-12 object-contain mx-auto mb-1.5"
                      style={{ maxWidth: currentMmWidth <= 58 ? '70px' : '110px' }}
                    />
                  )}
                  {form.showStoreName && (
                    <div className="font-black text-sm tracking-tight text-slate-950">
                      {form.storeNameOverride || store?.name || '39POS ENTERPRISE STORE'}
                    </div>
                  )}
                  {form.showStoreAddress && (
                    <div className="text-[10px] text-slate-600">{store?.address || 'Lane Xang Ave, Vientiane'}</div>
                  )}
                  {form.showStorePhone && (
                    <div className="text-[10px] text-slate-600">Tel: {store?.phone || '+856 21 213939'}</div>
                  )}
                  {form.showTaxId && (
                    <div className="text-[10px] text-slate-600">Tax ID: {store?.taxId || 'LA-TAX-99887766'}</div>
                  )}
                  {form.showWifiInfo && (
                    <div className="text-[9.5px] text-slate-500 mt-0.5">
                      WiFi: <strong>{form.wifiSsid}</strong> / Pass: <strong>{form.wifiPassword}</strong>
                    </div>
                  )}
                  {form.customHeaderNote && (
                    <div className="text-[9.5px] italic text-slate-500 mt-1">{form.customHeaderNote}</div>
                  )}
                </div>

                {/* Transaction Meta */}
                <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>INV: 202608-885512</span>
                    <span>11:01:36 PM</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Date: 27/08/2026</span>
                    {form.showCashierName && <span>Cashier: Supper</span>}
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Channel: <strong>In-Store POS</strong></span>
                    <span>Table: <strong>T-08</strong></span>
                  </div>
                  {form.showCustomerDetails && (
                    <div className="pt-1 text-[9.5px] text-slate-700 border-t border-dotted border-slate-200">
                      Customer: <strong>Somxai Vongxay</strong> (VIP GOLD)
                    </div>
                  )}
                </div>

                {/* Line Items */}
                <div className="py-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between font-bold text-[10px] mb-1 uppercase">
                    <span>Item / Qty</span>
                    <span>Amount (₭)</span>
                  </div>
                  <div className="space-y-1.5">
                    {sampleReceiptData.items.map((item, idx) => (
                      <div key={idx}>
                        <div className="font-bold text-slate-900 truncate">
                          {item.name} {item.variantName ? `(${item.variantName})` : ''}
                        </div>
                        {form.showItemCode && (
                          <div className="text-[8.5px] text-slate-400 font-mono">SKU: {item.code}</div>
                        )}
                        <div className="flex justify-between text-slate-600 text-[10px]">
                          <span>
                            {item.quantity} × {item.unitPrice.toLocaleString()}
                            {item.discountAmount ? <span className="text-rose-600 ml-1">(-{item.discountAmount})</span> : ''}
                          </span>
                          <span className="font-bold text-slate-900">{item.totalPrice?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 border-b border-dashed border-slate-300 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>200,000 ₭</span>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Discount:</span>
                    <span>-5,000 ₭</span>
                  </div>
                  {form.showTaxBreakdown && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax (VAT 7%):</span>
                      <span>+13,650 ₭</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Service Charge:</span>
                    <span>+10,000 ₭</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-slate-900 pt-1 border-t border-slate-300">
                    <span>TOTAL DUE:</span>
                    <span>218,650 ₭</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-0.5">
                    <span>Paid (BCEL One):</span>
                    <span>220,000 ₭</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Change Returned:</span>
                    <span>1,350 ₭</span>
                  </div>
                </div>

                {/* Dynamic Payment QR */}
                {form.showPaymentQr && (
                  <div className="py-2 border-b border-dashed border-slate-300 text-center space-y-1">
                    <img
                      src={
                        form.paymentQrImageUrl ||
                        `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=00020101021129370016A0000006770101110113${form.paymentQrAccountNo || '160120000998877'}53034185802LA`
                      }
                      alt="Payment QR"
                      className="w-20 h-20 object-contain mx-auto"
                    />
                    <div className="font-bold text-[9.5px]">{form.paymentQrBankName || 'BCEL One QR Pay'}</div>
                    {form.paymentQrAccountNo && (
                      <div className="text-[9px] text-slate-500 font-mono">A/C: {form.paymentQrAccountNo}</div>
                    )}
                    {form.paymentQrAccountName && (
                      <div className="text-[8px] text-slate-400">{form.paymentQrAccountName}</div>
                    )}
                  </div>
                )}

                {/* Footer Policy */}
                <div className="text-center pt-2 text-[9px] text-slate-500 space-y-0.5">
                  {form.customFooterNote && (
                    <div className="font-bold text-slate-800">{form.customFooterNote}</div>
                  )}
                  {form.showReturnPolicy && form.returnPolicyText && (
                    <div className="text-[8.5px]">{form.returnPolicyText}</div>
                  )}
                  <div className="text-[8px] text-slate-400 pt-1">Powered by 39POS Enterprise System</div>
                </div>

                {/* Serrated Zigzag Tear Edge Bottom */}
                {form.paperCutStyle === 'TEAR_ZIGZAG' && (
                  <div
                    className="absolute -bottom-2 left-0 right-0 h-2 bg-white"
                    style={{
                      maskImage:
                        'radial-gradient(circle at 5px 10px, transparent 5px, black 5.5px)',
                      maskSize: '10px 10px',
                      maskRepeat: 'repeat-x',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Bottom Simulator Action Button */}
            <button
              type="button"
              onClick={handleTestPrint}
              className="w-full py-3 neu-btn-primary text-white font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{t('settings.printTestSample', 'Print {{width}}mm Test Sample', { width: currentMmWidth })}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
