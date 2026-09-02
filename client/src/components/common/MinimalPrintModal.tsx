import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  PrintEngine,
  PrintableReceiptData,
  PaperProfile,
  PrintTemplateStyle,
  FontSizeScale,
  ReceiptConfig,
  PrinterDevice,
  AVAILABLE_PRINTER_DEVICES,
} from '../../utils/printEngine';
import { generateUniversalQrImageUrl } from '../../utils/qrEngine';
import {
  Printer,
  X,
  Smartphone,
  FileText,
  Package,
  Coffee,
  Receipt,
  Sparkles,
  CheckCircle2,
  Ruler,
  Wifi,
  Usb,
  Bluetooth,
  Monitor,
  Check,
  HardDrive,
  Radio,
  Sliders,
  Settings2,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { CustomCheckbox } from './CustomCheckbox';

export interface SystemPrinterDriver {
  name: string;
  driverName: string;
  portName: string;
  status: string;
  isDefault: boolean;
  isThermal: boolean;
}

interface MinimalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: PrintableReceiptData | null;
  defaultProfile?: PaperProfile;
  defaultTemplate?: PrintTemplateStyle;
}

export const MinimalPrintModal: React.FC<MinimalPrintModalProps> = ({
  isOpen,
  onClose,
  receiptData,
  defaultProfile,
  defaultTemplate,
}) => {
  const { t } = useTranslation();
  const { store, receiptConfig, updateReceiptConfig } = useSettingsStore();
  const { currentCurrency } = useCurrencyStore();

  const [activeSelectionMode, setActiveSelectionMode] = useState<'PC_DRIVERS' | 'HARDWARE_STATIONS' | 'PROFILES'>('PC_DRIVERS');
  const [systemDrivers, setSystemDrivers] = useState<SystemPrinterDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    receiptConfig.selectedPrinterDeviceId || 'driver-adobe-pdf'
  );
  const [selectedDriverName, setSelectedDriverName] = useState<string>('Adobe PDF');

  const [selectedProfile, setSelectedProfile] = useState<PaperProfile>(
    defaultProfile || receiptConfig.defaultPaperProfile || '80MM'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplateStyle>(
    defaultTemplate || receiptConfig.defaultTemplateStyle || 'STANDARD'
  );
  const [copies, setCopies] = useState<number>(1);
  const [showLogo, setShowLogo] = useState<boolean>(receiptConfig.showLogo);
  const [showQr, setShowQr] = useState<boolean>(receiptConfig.showPaymentQr);
  const [fontScale, setFontScale] = useState<FontSizeScale>(receiptConfig.fontSizeScale || 'STANDARD');
  const [rememberDefault, setRememberDefault] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Fetch real installed printer drivers from host PC
  const fetchInstalledDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const res = await api.get('/settings/printers/system-drivers');
      if (res.data.success && Array.isArray(res.data.printers)) {
        setSystemDrivers(res.data.printers);
        // If no driver selected yet, select default or first
        if (res.data.printers.length > 0) {
          const defaultDriver = res.data.printers.find((p: SystemPrinterDriver) => p.isDefault) || res.data.printers[0];
          setSelectedDriverName(defaultDriver.name);
        }
      }
    } catch (err) {
      console.warn('Could not query host PC printers:', err);
      // Fallback local list
      setSystemDrivers([
        { name: 'Adobe PDF', driverName: 'Adobe PDF Converter', portName: 'Documents\\*.pdf', status: 'READY', isDefault: true, isThermal: false },
        { name: 'Microsoft Print to PDF', driverName: 'Microsoft Print To PDF', portName: 'PORTPROMPT:', status: 'READY', isDefault: false, isThermal: false },
        { name: 'OneNote (Desktop)', driverName: 'Send to Microsoft OneNote 16 Driver', portName: 'nul:', status: 'READY', isDefault: false, isThermal: false },
      ]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInstalledDrivers();
      const initialDevId = receiptConfig.selectedPrinterDeviceId || AVAILABLE_PRINTER_DEVICES[0].id;
      setSelectedDeviceId(initialDevId);
      const dev = AVAILABLE_PRINTER_DEVICES.find((d) => d.id === initialDevId);
      setSelectedProfile(defaultProfile || dev?.paperProfile || receiptConfig.defaultPaperProfile || '80MM');
      setSelectedTemplate(defaultTemplate || dev?.templateStyle || receiptConfig.defaultTemplateStyle || 'STANDARD');
      setShowLogo(receiptConfig.showLogo);
      setShowQr(receiptConfig.showPaymentQr);
      setFontScale(receiptConfig.fontSizeScale || 'STANDARD');
      setCopies(1);
    }
  }, [isOpen, receiptConfig, defaultProfile, defaultTemplate]);

  // Keyboard shortcut listener (Enter to print, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if ((e.target as HTMLElement)?.tagName !== 'INPUT') {
          e.preventDefault();
          handleExecutePrint();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedProfile, selectedTemplate, copies, showLogo, showQr, fontScale, rememberDefault, receiptData, selectedDeviceId, selectedDriverName]);

  if (!isOpen || !receiptData) return null;

  const handleSelectHardwareDevice = (dev: PrinterDevice) => {
    setSelectedDeviceId(dev.id);
    setSelectedDriverName(dev.name);
    setSelectedProfile(dev.paperProfile);
    if (dev.templateStyle) {
      setSelectedTemplate(dev.templateStyle);
    }
  };

  const handleSelectSystemDriver = (drv: SystemPrinterDriver) => {
    setSelectedDriverName(drv.name);
    setSelectedDeviceId(`sys-${drv.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
    if (drv.isThermal) {
      setSelectedProfile('80MM');
    }
  };

  // Active configuration merged with modal overrides
  const effectiveConfig: ReceiptConfig = {
    ...receiptConfig,
    selectedPrinterDeviceId: selectedDeviceId,
    defaultPaperProfile: selectedProfile,
    fontSizeScale: fontScale,
    showLogo,
    showPaymentQr: showQr,
  };

  const handleExecutePrint = async () => {
    setIsPrinting(true);

    if (rememberDefault) {
      updateReceiptConfig({
        selectedPrinterDeviceId: selectedDeviceId,
        defaultPaperProfile: selectedProfile,
        defaultTemplateStyle: selectedTemplate,
        fontSizeScale: fontScale,
        showLogo,
        showPaymentQr: showQr,
      });
    }

    try {
      PrintEngine.print(receiptData, effectiveConfig, store, {
        profile: selectedProfile,
        templateStyle: selectedTemplate,
        copies,
      });
    } catch (err) {
      console.error('Print execution failed:', err);
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        onClose();
      }, 400);
    }
  };

  const currencySymbol = receiptData.currencySymbol || (currentCurrency === 'LAK' ? '₭' : currentCurrency === 'THB' ? '฿' : '$');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('print.quickSetup', 'Minimal Print Setup')}
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <span>{receiptData.invoiceNo}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {Number(receiptData.totalAmount).toLocaleString()} {currencySymbol}
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline-block">Press [Enter] to Print • [Esc] to Close</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split 2 columns (Preview left + Real Drivers & Options right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column: Live Paper View (5 cols) */}
          <div className="md:col-span-5 bg-slate-100 dark:bg-slate-950/80 p-5 flex flex-col items-center justify-start border-r border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[550px]">
            <div className="text-[10px] font-black uppercase text-slate-400 mb-2.5 flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand-500" />
                <span>Live Preview ({selectedProfile})</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 truncate max-w-[130px]">
                {selectedDriverName}
              </span>
            </div>

            {/* Simulated Receipt Component */}
            <div
              className={`bg-white text-slate-900 shadow-xl font-mono text-[10.5px] leading-relaxed transition-all relative ${
                selectedProfile === '58MM' || selectedProfile === 'LABEL_40X30'
                  ? 'w-[220px] p-3 text-[9px]'
                  : selectedProfile === 'A4' || selectedProfile === 'A5'
                  ? 'w-full p-4 text-[10.5px]'
                  : 'w-[260px] p-3.5'
              }`}
            >
              {/* Zigzag cut top */}
              <div
                className="absolute -top-1.5 left-0 right-0 h-1.5 bg-white"
                style={{
                  maskImage: 'radial-gradient(circle at 4px 0px, transparent 4px, black 4.5px)',
                  maskSize: '8px 8px',
                  maskRepeat: 'repeat-x',
                }}
              />

              {/* Header */}
              {selectedTemplate !== 'KITCHEN_TICKET' ? (
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  {showLogo && effectiveConfig.logoUrl && (
                    <img
                      src={effectiveConfig.logoUrl}
                      alt="Logo"
                      className="max-h-8 object-contain mx-auto mb-1"
                    />
                  )}
                  <div className="font-black text-xs text-slate-950">
                    {effectiveConfig.storeNameOverride || store?.name || '39POS ENTERPRISE STORE'}
                  </div>
                  <div className="text-[9px] text-slate-600">{store?.address || 'Lane Xang Ave, Vientiane'}</div>
                  <div className="text-[9px] text-slate-600">Tel: {store?.phone || '+856 21 213939'}</div>
                </div>
              ) : (
                <div className="text-center pb-1.5 border-b-2 border-slate-900">
                  <div className="font-black text-xs">🔥 KITCHEN TICKET 🔥</div>
                  {receiptData.tableNo && <div className="font-bold text-sm">TABLE: {receiptData.tableNo}</div>}
                </div>
              )}

              {/* Meta */}
              <div className="py-1.5 border-b border-dashed border-slate-300 text-[9px] space-y-0.5">
                <div className="flex justify-between font-bold">
                  <span>INV: {receiptData.invoiceNo}</span>
                  <span>{new Date(receiptData.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Date: {new Date(receiptData.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span>Cashier: {receiptData.cashierName || 'Staff'}</span>
                </div>
                {receiptData.customerName && (
                  <div className="text-slate-800">
                    Cust: <strong>{receiptData.customerName}</strong>
                  </div>
                )}
                {receiptData.deliveryAddress && (
                  <div className="text-[8.5px] text-slate-500 truncate">Addr: {receiptData.deliveryAddress}</div>
                )}
              </div>

              {/* Items */}
              <div className="py-1.5 border-b border-dashed border-slate-300 space-y-1">
                {receiptData.items.map((item, idx) => (
                  <div key={idx}>
                    <div className="font-bold text-slate-900 truncate">
                      {selectedTemplate === 'KITCHEN_TICKET' ? `[ ${item.quantity}x ] ` : ''}
                      {item.name} {item.variantName ? `(${item.variantName})` : ''}
                    </div>
                    {selectedTemplate !== 'KITCHEN_TICKET' && (
                      <div className="flex justify-between text-slate-600 text-[8.5px]">
                        <span>{item.quantity} × {Number(item.unitPrice).toLocaleString()}</span>
                        <span className="font-bold text-slate-900">
                          {Number(item.totalPrice || item.quantity * item.unitPrice).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Financials */}
              {selectedTemplate !== 'KITCHEN_TICKET' && (
                <div className="py-1.5 border-b border-dashed border-slate-300 space-y-0.5 text-[9px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{Number(receiptData.subtotal).toLocaleString()} {currencySymbol}</span>
                  </div>
                  {receiptData.discountAmount && receiptData.discountAmount > 0 ? (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>-{Number(receiptData.discountAmount).toLocaleString()} {currencySymbol}</span>
                    </div>
                  ) : null}
                  {receiptData.taxAmount && receiptData.taxAmount > 0 ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax (VAT {receiptData.taxRate || 7}%):</span>
                      <span>+{Number(receiptData.taxAmount).toLocaleString()} {currencySymbol}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-black text-[10.5px] text-slate-950 pt-0.5 border-t border-slate-300">
                    <span>TOTAL DUE:</span>
                    <span>{Number(receiptData.totalAmount).toLocaleString()} {currencySymbol}</span>
                  </div>
                </div>
              )}

              {/* Dynamic QR */}
              {effectiveConfig.showPaymentQr && (() => {
                const qrRes = generateUniversalQrImageUrl(
                  {
                    standard: effectiveConfig.paymentQrType || 'LAO_QR_LAPNET',
                    bankCode: effectiveConfig.paymentQrBankCode || 'ALL_BANKS',
                    accountNo: effectiveConfig.paymentQrAccountNo || '030120000172042001',
                    accountName: effectiveConfig.paymentQrAccountName || store?.name,
                    storeName: store?.name,
                    bankName: effectiveConfig.paymentQrBankName,
                    amount: effectiveConfig.paymentQrDynamicAmount !== false ? Number(receiptData.totalAmount) : undefined,
                    currency: currentCurrency,
                    invoiceNo: receiptData.invoiceNo,
                    customImageUrl: effectiveConfig.paymentQrImageUrl,
                  },
                  100
                );

                return (
                  <div className="text-center py-1 border-b border-dashed border-slate-300">
                    <img
                      src={qrRes.qrImageUrl}
                      alt="QR"
                      className="w-12 h-12 object-contain mx-auto"
                    />
                    <div className="font-bold text-[8px]">{effectiveConfig.paymentQrBankName || qrRes.standardTitle}</div>
                  </div>
                );
              })()}

              {/* Footer */}
              <div className="text-center pt-1 text-[8px] text-slate-500">
                <div>{effectiveConfig.customFooterNote || '*** Thank You! Please Come Again ***'}</div>
              </div>

              {/* Zigzag cut bottom */}
              <div
                className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-white"
                style={{
                  maskImage: 'radial-gradient(circle at 4px 8px, transparent 4px, black 4.5px)',
                  maskSize: '8px 8px',
                  maskRepeat: 'repeat-x',
                }}
              />
            </div>
          </div>

          {/* Right Column: Real PC Drivers & Options (7 cols) */}
          <div className="md:col-span-7 p-5 space-y-4">
            {/* View Switcher: PC Drivers vs Hardware Stations vs Paper Profiles */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setActiveSelectionMode('PC_DRIVERS')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSelectionMode === 'PC_DRIVERS'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 text-brand-500" />
                  <span>Real PC Drivers ({systemDrivers.length})</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSelectionMode('HARDWARE_STATIONS')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSelectionMode === 'HARDWARE_STATIONS'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>POS Stations</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSelectionMode('PROFILES')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeSelectionMode === 'PROFILES'
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Paper Sizes</span>
                </button>
              </div>

              {activeSelectionMode === 'PC_DRIVERS' && (
                <button
                  type="button"
                  onClick={fetchInstalledDrivers}
                  disabled={loadingDrivers}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                  title="Rescan Windows Printer Spooler"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDrivers ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* 1. REAL INSTALLED PC DRIVERS */}
            {activeSelectionMode === 'PC_DRIVERS' && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                  {systemDrivers.map((drv) => {
                    const isSelected = selectedDriverName === drv.name;
                    return (
                      <button
                        key={drv.name}
                        type="button"
                        onClick={() => handleSelectSystemDriver(drv)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/10 shadow-xs ring-2 ring-brand-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Printer className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-brand-500' : 'text-slate-400'}`} />
                            <span className="font-black text-[11px] text-slate-800 dark:text-white truncate">
                              {drv.name}
                            </span>
                          </div>

                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {drv.status || 'READY'}
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate mb-1">
                          {drv.driverName || 'Windows Print Driver'}
                        </div>

                        <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300 font-mono text-[8.5px] truncate max-w-[120px]">
                            Port: {drv.portName}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-bold">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. HARDWARE POS STATIONS */}
            {activeSelectionMode === 'HARDWARE_STATIONS' && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                  {AVAILABLE_PRINTER_DEVICES.map((dev) => {
                    const isSelected = selectedDeviceId === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => handleSelectHardwareDevice(dev)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand-500 bg-brand-500/10 shadow-xs ring-2 ring-brand-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {dev.connection === 'USB' ? (
                              <Usb className="w-3.5 h-3.5 text-emerald-500" />
                            ) : dev.connection === 'NETWORK' ? (
                              <Wifi className="w-3.5 h-3.5 text-blue-500" />
                            ) : dev.connection === 'BLUETOOTH' ? (
                              <Bluetooth className="w-3.5 h-3.5 text-purple-500" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="font-black text-[11px] text-slate-800 dark:text-white truncate">
                              {dev.name}
                            </span>
                          </div>

                          <span className="text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {dev.status}
                          </span>
                        </div>

                        <div className="text-[9.5px] text-slate-500 dark:text-slate-400 truncate mb-1">
                          {dev.address}
                        </div>

                        <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-300 font-mono font-bold">
                            {dev.paperName}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-bold">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. DIRECT PAPER SIZE PROFILE GRID */}
            {activeSelectionMode === 'PROFILES' && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '80MM', label: '80mm POS', sub: 'Standard Counter', icon: Printer },
                  { id: '58MM', label: '58mm Pocket', sub: 'Sunmi / Bluetooth', icon: Smartphone },
                  { id: '100MM', label: '100mm Wide', sub: 'Kitchen Roll', icon: Receipt },
                  { id: 'A4', label: 'A4 Sheet', sub: 'Full Invoice', icon: FileText },
                  { id: 'LABEL_50X30', label: '50×30mm', sub: 'Delivery Tag', icon: Package },
                  { id: 'LABEL_40X30', label: '40×30mm', sub: 'Cup Sticker', icon: Coffee },
                ].map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProfile(p.id as PaperProfile)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? 'border-brand-500 bg-brand-500/10 shadow-xs ring-1 ring-brand-500/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-brand-500' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="font-extrabold text-[11px] text-slate-800 dark:text-white truncate">
                          {p.label}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate">{p.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Template Style & Copies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Template Style
                </label>
                <CustomSelect
                  value={selectedTemplate}
                  onChange={(val) => setSelectedTemplate(val as PrintTemplateStyle)}
                  options={[
                    { value: 'STANDARD', label: 'Standard Retail Slip' },
                    { value: 'DETAILED', label: 'Detailed Tax Invoice' },
                    { value: 'DELIVERY_COD', label: 'Delivery & COD Manifest' },
                    { value: 'KITCHEN_TICKET', label: 'Kitchen / Bar Ticket' },
                  ]}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Copies Count
                </label>
                <div className="flex items-center gap-1.5">
                  {[
                    { count: 1, label: '1x' },
                    { count: 2, label: '2x (Cust+Store)' },
                    { count: 3, label: '3x' },
                  ].map((c) => (
                    <button
                      key={c.count}
                      type="button"
                      onClick={() => setCopies(c.count)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        copies === c.count
                          ? 'border-brand-500 bg-brand-500 text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Feature Toggles */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div
                onClick={() => setShowLogo(!showLogo)}
                className="p-3 rounded-xl neu-card-interactive flex items-center justify-between cursor-pointer"
              >
                <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Print Store Logo</span>
                <CustomCheckbox
                  checked={showLogo}
                  onChange={(checked) => setShowLogo(checked)}
                />
              </div>

              <div
                onClick={() => setShowQr(!showQr)}
                className="p-3 rounded-xl neu-card-interactive flex items-center justify-between cursor-pointer"
              >
                <span className="font-bold text-xs text-slate-700 dark:text-slate-200">Payment QR Code</span>
                <CustomCheckbox
                  checked={showQr}
                  onChange={(checked) => setShowQr(checked)}
                />
              </div>
            </div>

            {/* Remember as Terminal Default */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800">
              <div
                onClick={() => setRememberDefault(!rememberDefault)}
                className="flex items-center gap-2.5 cursor-pointer"
              >
                <CustomCheckbox
                  checked={rememberDefault}
                  onChange={(checked) => setRememberDefault(checked)}
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Save {selectedDriverName} as default for this terminal
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExecutePrint}
                disabled={isPrinting}
                className="flex-1 py-3 px-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isPrinting
                    ? 'Dispatching Document...'
                    : `Print via ${selectedDriverName} [Enter]`}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
