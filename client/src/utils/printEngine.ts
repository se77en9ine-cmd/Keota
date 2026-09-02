import { StoreDTO } from '39pos-shared';
import {
  QrStandard,
  LaoBankPreset,
  generateUniversalQrImageUrl,
  LAO_BANKS,
} from './qrEngine';

export type PaperProfile = '80MM' | '58MM' | '100MM' | 'A4' | 'A5' | 'LABEL_50X30' | 'LABEL_40X30' | 'CUSTOM';
export type FontSizeScale = 'COMPACT' | 'STANDARD' | 'COMFORTABLE' | 'LARGE';
export type ItemDisplayFormat = 'SINGLE_LINE' | 'TWO_LINES';
export type PaymentQrType = QrStandard;
export type PaperCutStyle = 'TEAR_ZIGZAG' | 'STRAIGHT_CUT' | 'PERFORATED' | 'CARD_ROUNDED';
export type PaperTexture = 'THERMAL_SMOOTH' | 'KRAFT_VINTAGE' | 'MODERN_CLEAN' | 'SLATE_DARK_PREVIEW';
export type PrintTemplateStyle = 'STANDARD' | 'DETAILED' | 'DELIVERY_COD' | 'KITCHEN_TICKET';

export interface PrinterDevice {
  id: string;
  name: string;
  brand: string;
  model: string;
  connection: 'USB' | 'NETWORK' | 'BLUETOOTH' | 'SYSTEM_PRINT';
  address?: string;
  status: 'ONLINE' | 'READY' | 'STANDBY';
  paperProfile: PaperProfile;
  paperName: string;
  templateStyle: PrintTemplateStyle;
  badgeColor: string;
  icon: 'countertop' | 'mobile' | 'kitchen' | 'label' | 'office' | 'system';
}

export const AVAILABLE_PRINTER_DEVICES: PrinterDevice[] = [
  {
    id: 'epson-tm-t88',
    name: 'Epson TM-T88VI (Main POS)',
    brand: 'Epson',
    model: 'TM-T88VI High-Speed Thermal',
    connection: 'USB',
    address: 'USB001 • Direct Port',
    status: 'ONLINE',
    paperProfile: '80MM',
    paperName: '80mm Thermal Roll',
    templateStyle: 'STANDARD',
    badgeColor: 'emerald',
    icon: 'countertop',
  },
  {
    id: 'sunmi-v2-pro',
    name: 'Sunmi V2 Pro / Handheld',
    brand: 'Sunmi',
    model: '58mm Built-in Mobile Printer',
    connection: 'BLUETOOTH',
    address: 'BT: SUNMI-V2-58',
    status: 'ONLINE',
    paperProfile: '58MM',
    paperName: '58mm Mobile Roll',
    templateStyle: 'STANDARD',
    badgeColor: 'purple',
    icon: 'mobile',
  },
  {
    id: 'kitchen-xprinter',
    name: 'Kitchen Star / XP-N160',
    brand: 'Xprinter',
    model: '100mm/80mm Impact Kitchen Buzzer',
    connection: 'NETWORK',
    address: '192.168.1.188:9100',
    status: 'ONLINE',
    paperProfile: '100MM',
    paperName: '100mm Kitchen Slip',
    templateStyle: 'KITCHEN_TICKET',
    badgeColor: 'blue',
    icon: 'kitchen',
  },
  {
    id: 'zebra-zd220',
    name: 'Zebra ZD220 / XP-365B',
    brand: 'Zebra',
    model: 'Thermal Barcode & Delivery Tag',
    connection: 'USB',
    address: 'USB002 • Label Sensor',
    status: 'READY',
    paperProfile: 'LABEL_50X30',
    paperName: '50×30mm Delivery Tag',
    templateStyle: 'DELIVERY_COD',
    badgeColor: 'amber',
    icon: 'label',
  },
  {
    id: 'office-laser-a4',
    name: 'HP LaserJet Pro / Office',
    brand: 'HP',
    model: 'Laser Multi-Function Tax Sheet',
    connection: 'NETWORK',
    address: '192.168.1.80:631 (IPP)',
    status: 'ONLINE',
    paperProfile: 'A4',
    paperName: 'A4 Full Tax Invoice',
    templateStyle: 'DETAILED',
    badgeColor: 'cyan',
    icon: 'office',
  },
  {
    id: 'system-default-pdf',
    name: 'Universal Browser / PDF',
    brand: 'System',
    model: 'OS Print Manager & PDF Exporter',
    connection: 'SYSTEM_PRINT',
    address: 'Windows / Mac Default Engine',
    status: 'READY',
    paperProfile: '80MM',
    paperName: 'Any Custom Paper Size',
    templateStyle: 'STANDARD',
    badgeColor: 'slate',
    icon: 'system',
  },
];

export interface ReceiptConfig {
  defaultPaperProfile: PaperProfile;
  selectedPrinterDeviceId?: string;
  fontSizeScale: FontSizeScale;
  defaultTemplateStyle?: PrintTemplateStyle;

  // Custom Dimension & Page Geometry
  paperWidthMm: number; // e.g. 80, 58, 100, 210
  paperHeightMm: number; // 0 for auto roll, or 30, 50, 150, 297
  isContinuousRoll: boolean;
  paperMarginMm: number;
  paperCutStyle: PaperCutStyle;
  paperTexture: PaperTexture;
  paperDpi: number;

  // Header Section
  showLogo: boolean;
  logoUrl?: string;
  logoWidthPx: number;
  showStoreName: boolean;
  storeNameOverride?: string;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showTaxId: boolean;
  showWifiInfo: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  customHeaderNote?: string;

  // Body Section
  itemDisplayFormat: ItemDisplayFormat;
  showItemCode: boolean;
  showDiscountBreakdown: boolean;
  showTaxBreakdown: boolean;
  showCashierName: boolean;
  showCustomerDetails: boolean;
  showDeliveryBadge: boolean;

  // Footer & Payment QR
  showPaymentQr: boolean;
  paymentQrType: PaymentQrType;
  paymentQrBankCode?: LaoBankPreset;
  paymentQrDynamicAmount?: boolean;
  paymentQrImageUrl?: string;
  paymentQrAccountNo?: string;
  paymentQrAccountName?: string;
  paymentQrBankName?: string;
  showReturnPolicy: boolean;
  returnPolicyText?: string;
  customFooterNote?: string;
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  defaultPaperProfile: '80MM',
  fontSizeScale: 'STANDARD',
  defaultTemplateStyle: 'STANDARD',

  paperWidthMm: 80,
  paperHeightMm: 0,
  isContinuousRoll: true,
  paperMarginMm: 2,
  paperCutStyle: 'TEAR_ZIGZAG',
  paperTexture: 'THERMAL_SMOOTH',
  paperDpi: 203,

  showLogo: false,
  logoUrl: '',
  logoWidthPx: 120,
  showStoreName: true,
  storeNameOverride: '',
  showStoreAddress: true,
  showStorePhone: true,
  showTaxId: true,
  showWifiInfo: true,
  wifiSsid: '39POS_Guest',
  wifiPassword: 'pos2026',
  customHeaderNote: 'Welcome! Multi-Currency Accepted',

  itemDisplayFormat: 'TWO_LINES',
  showItemCode: false,
  showDiscountBreakdown: true,
  showTaxBreakdown: true,
  showCashierName: true,
  showCustomerDetails: true,
  showDeliveryBadge: true,

  showPaymentQr: true,
  paymentQrType: 'LAO_QR_LAPNET',
  paymentQrBankCode: 'BCEL',
  paymentQrDynamicAmount: true,
  paymentQrImageUrl: '',
  paymentQrAccountNo: 'mch5f30d5486e681',
  paymentQrAccountName: '2 M D',
  paymentQrBankName: 'BCEL OnePay (LAPNet / Lao QR)',
  showReturnPolicy: true,
  returnPolicyText: 'Goods sold are refundable within 3 days with valid receipt.',
  customFooterNote: '*** Thank You! Please Come Again ***',
};

export interface PrintableReceiptData {
  invoiceNo: string;
  createdAt?: string | number | Date;
  cashierName?: string;
  channel?: string;
  orderType?: string;
  tableNo?: string;
  customerName?: string;
  customerPhone?: string;
  customerTier?: string;
  deliveryAddress?: string;
  courierName?: string;
  courierTrackingNo?: string;
  deliveryFee?: number;
  deliveryFeePayer?: 'SELLER_PAYS' | 'CUSTOMER_PAYS';
  items: Array<{
    id?: string;
    code?: string;
    name: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    totalPrice?: number;
  }>;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxName?: string;
  serviceCharge?: number;
  totalAmount: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentStatus?: string;
  payments?: Array<{
    paymentMethod: string;
    amount: number;
    currency?: string;
    referenceNo?: string;
  }>;
  currencySymbol?: string;
}

export interface PrintOptionsOverride {
  profile?: PaperProfile;
  templateStyle?: PrintTemplateStyle;
  copies?: number;
  customWidthMm?: number;
  customMarginMm?: number;
}

export class PrintEngine {
  /**
   * Builds the complete self-contained HTML document with strictly enforced Portrait page layout
   */
  public static generateReceiptHtml(
    data: PrintableReceiptData,
    config: ReceiptConfig = DEFAULT_RECEIPT_CONFIG,
    store: StoreDTO | null = null,
    options?: PrintOptionsOverride
  ): string {
    const profile = options?.profile || config.defaultPaperProfile || '80MM';
    const template = options?.templateStyle || config.defaultTemplateStyle || 'STANDARD';
    const storeName = config.storeNameOverride || store?.name || '39POS ENTERPRISE STORE';
    const storeAddress = store?.address || 'Lane Xang Avenue, Chanthabouly, Vientiane Capital';
    const storePhone = store?.phone || '+856 21 213939';
    const storeTaxId = store?.taxId || 'LA-TAX-99887766';
    const currency = data.currencySymbol || '₭';

    const dateStr = new Date(data.createdAt || Date.now()).toLocaleDateString();
    const timeStr = new Date(data.createdAt || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Font Scaling classes & sizing
    const fontSizes = {
      COMPACT: { base: '10.5px', header: '13px', title: '12px', lineItem: '10px', meta: '9px' },
      STANDARD: { base: '11.5px', header: '14.5px', title: '13.5px', lineItem: '11px', meta: '9.5px' },
      COMFORTABLE: { base: '12.5px', header: '16px', title: '15px', lineItem: '12px', meta: '10.5px' },
      LARGE: { base: '14px', header: '18px', title: '16px', lineItem: '13px', meta: '11.5px' },
    }[config.fontSizeScale || 'STANDARD'];

    // Determine actual physical width and margins in mm
    let targetWidthMm = options?.customWidthMm || config.paperWidthMm || 80;
    let targetHeightMm = config.paperHeightMm || 0;
    let marginMm = options?.customMarginMm !== undefined ? options.customMarginMm : (config.paperMarginMm !== undefined ? config.paperMarginMm : 2);
    let isContinuous = config.isContinuousRoll !== false;

    if (profile === '80MM') {
      targetWidthMm = 80;
      isContinuous = true;
      marginMm = 2;
    } else if (profile === '58MM') {
      targetWidthMm = 58;
      isContinuous = true;
      marginMm = 1.5;
    } else if (profile === '100MM') {
      targetWidthMm = 100;
      isContinuous = true;
      marginMm = 3;
    } else if (profile === 'A4') {
      targetWidthMm = 210;
      targetHeightMm = 297;
      isContinuous = false;
      marginMm = 12;
    } else if (profile === 'A5') {
      targetWidthMm = 148;
      targetHeightMm = 210;
      isContinuous = false;
      marginMm = 8;
    } else if (profile === 'LABEL_50X30') {
      targetWidthMm = 50;
      targetHeightMm = 30;
      isContinuous = false;
      marginMm = 1;
    } else if (profile === 'LABEL_40X30') {
      targetWidthMm = 40;
      targetHeightMm = 30;
      isContinuous = false;
      marginMm = 1;
    }

    const printableWidthMm = Math.max(targetWidthMm - marginMm * 2, 28);
    const sizeRule = isContinuous
      ? `${targetWidthMm}mm auto portrait`
      : `${targetWidthMm}mm ${targetHeightMm || 100}mm portrait`;

    // Strict CSS rules to force portrait orientation & remove unwanted browser margin offsets
    const pageCss = `
      @page {
        size: ${sizeRule};
        margin: ${marginMm}mm;
      }
      @media print {
        html, body {
          width: ${targetWidthMm}mm !important;
          max-width: ${targetWidthMm}mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .invoice-card {
          width: ${printableWidthMm}mm !important;
          max-width: 100% !important;
          margin: 0 auto !important;
        }
      }
      body {
        width: ${printableWidthMm}mm;
        margin: 0 auto;
        padding: ${profile.startsWith('A') ? '10px' : '2px 0'};
      }
      .invoice-card {
        width: 100%;
        ${profile.startsWith('A') ? 'border: 1px solid #cbd5e1; padding: 24px; border-radius: 10px;' : ''}
      }
      ${targetWidthMm <= 58 ? '.header-logo { max-width: 75px !important; } .qr-code-img { width: 80px !important; height: 80px !important; }' : ''}
    `;

    // Render single receipt body
    const renderReceiptBody = (copyLabel?: string) => `
      <div class="invoice-card" style="${copyLabel ? 'page-break-after: always; margin-bottom: 20px;' : ''}">
        ${copyLabel ? `<div class="center bold" style="font-size: 10px; background: #0f172a; color: #fff; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px; text-transform: uppercase;">${copyLabel}</div>` : ''}

        ${
          template !== 'KITCHEN_TICKET'
            ? `
          <!-- Store Header -->
          <div class="center" style="margin-bottom: 4px;">
            ${
              config.showLogo && config.logoUrl
                ? `<img src="${config.logoUrl}" alt="Store Logo" class="header-logo" style="max-width: ${config.logoWidthPx || 120}px; max-height: 55px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />`
                : ''
            }
            ${config.showStoreName ? `<div class="store-name">${storeName}</div>` : ''}
            ${config.showStoreAddress && storeAddress ? `<div class="store-sub">${storeAddress}</div>` : ''}
            ${config.showStorePhone && storePhone ? `<div class="store-sub">Tel: ${storePhone}</div>` : ''}
            ${config.showTaxId && storeTaxId ? `<div class="store-sub">Tax ID: ${storeTaxId}</div>` : ''}
            ${
              config.showWifiInfo && (config.wifiSsid || config.wifiPassword)
                ? `<div class="store-sub">WiFi: <strong>${config.wifiSsid}</strong> / Pass: <strong>${config.wifiPassword}</strong></div>`
                : ''
            }
            ${
              config.customHeaderNote
                ? `<div class="store-sub italic" style="margin-top: 2px;">${config.customHeaderNote}</div>`
                : ''
            }
          </div>
          <div class="divider-double"></div>
        `
            : `
          <!-- Kitchen Header -->
          <div class="center" style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 2px solid #000;">
            <div class="bold" style="font-size: 16px;">🔥 KITCHEN ORDER TICKET 🔥</div>
            ${data.tableNo ? `<div class="bold" style="font-size: 18px; margin: 2px 0;">TABLE: ${data.tableNo}</div>` : ''}
          </div>
        `
        }

        <!-- Transaction Meta -->
        <div style="margin: 3px 0;">
          <div class="meta-row bold">
            <span>INVOICE: ${data.invoiceNo}</span>
            <span>${timeStr}</span>
          </div>
          <div class="meta-row">
            <span>Date: ${dateStr}</span>
            ${config.showCashierName ? `<span>Cashier: ${data.cashierName || 'Staff'}</span>` : ''}
          </div>
          ${
            data.channel
              ? `<div class="meta-row">
                  <span>Channel: <strong>${data.channel}</strong></span>
                  ${data.orderType ? `<span>Type: ${data.orderType}</span>` : ''}
                </div>`
              : ''
          }
          ${data.tableNo && template !== 'KITCHEN_TICKET' ? `<div class="meta-row bold"><span>Dining Table:</span><span>${data.tableNo}</span></div>` : ''}
          
          ${
            (template === 'DELIVERY_COD' || config.showCustomerDetails) && (data.customerName || data.customerPhone)
              ? `
              <div class="meta-row" style="margin-top: 2px; padding-top: 2px; border-top: 1px dotted #cbd5e1;">
                <span>Cust: <strong>${data.customerName || 'Guest'}</strong>${data.customerTier ? ` (${data.customerTier})` : ''}</span>
                <span>${data.customerPhone || ''}</span>
              </div>
            `
              : ''
          }

          ${
            data.deliveryAddress
              ? `<div class="meta-row" style="font-size: 9px; color: #334155;"><span>Addr: ${data.deliveryAddress}</span></div>`
              : ''
          }

          ${
            data.courierName
              ? `
              <div class="meta-row">
                <span>Courier: ${data.courierName}</span>
                ${data.courierTrackingNo ? `<span>#${data.courierTrackingNo}</span>` : ''}
              </div>
            `
              : ''
          }
        </div>

        <div class="divider-dashed"></div>

        <!-- Line Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 55%;">ITEM / QTY</th>
              ${template !== 'KITCHEN_TICKET' ? `<th class="right" style="width: 45%;">AMOUNT (${currency})</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map((item) => {
                const lineTotal =
                  (Number(item.totalPrice) || (Number(item.quantity) * Number(item.unitPrice))) -
                  (Number(item.discountAmount) || 0);
                const formattedLineTotal = lineTotal.toLocaleString();
                const formattedUnit = Number(item.unitPrice).toLocaleString();

                if (template === 'KITCHEN_TICKET') {
                  return `
                    <tr>
                      <td style="padding: 4px 0; border-bottom: 1px dotted #94a3b8;">
                        <div class="bold" style="font-size: 14px;">[ ${item.quantity}x ] ${item.name}</div>
                        ${item.variantName ? `<div style="font-size: 11px; color: #334155; font-style: italic;">➜ ${item.variantName}</div>` : ''}
                      </td>
                    </tr>
                  `;
                }

                if (config.itemDisplayFormat === 'SINGLE_LINE' && targetWidthMm > 58) {
                  return `
                    <tr>
                      <td>
                        <strong>${item.name}</strong> ${item.variantName ? `(${item.variantName})` : ''}
                        ${config.showItemCode && item.code ? `<span class="italic" style="font-size: 9px; color: #64748b;"> [${item.code}]</span>` : ''}
                        <div style="font-size: 10px; color: #475569;">${item.quantity} x ${formattedUnit}</div>
                      </td>
                      <td class="right bold">${formattedLineTotal}</td>
                    </tr>
                  `;
                }

                return `
                  <tr>
                    <td colspan="2" style="padding-top: 3px;">
                      <div class="bold">${item.name} ${item.variantName ? `<span style="font-weight: normal;">(${item.variantName})</span>` : ''}</div>
                      ${config.showItemCode && item.code ? `<div style="font-size: 9px; color: #64748b;">SKU: ${item.code}</div>` : ''}
                      <div class="flex-between" style="font-size: ${fontSizes.meta}; color: #334155; margin-top: 1px;">
                        <span>${item.quantity} x ${formattedUnit}${item.discountAmount && item.discountAmount > 0 ? ` <span style="color: #dc2626;">(-${Number(item.discountAmount).toLocaleString()})</span>` : ''}</span>
                        <span class="bold" style="color: #0f172a;">${formattedLineTotal}</span>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        ${
          template !== 'KITCHEN_TICKET'
            ? `
          <div class="divider-dashed"></div>

          <!-- Financial Breakdown -->
          <div style="margin: 3px 0;">
            <div class="meta-row">
              <span>Subtotal:</span>
              <span>${Number(data.subtotal).toLocaleString()} ${currency}</span>
            </div>

            ${
              config.showDiscountBreakdown && data.discountAmount && data.discountAmount > 0
                ? `<div class="meta-row" style="color: #b91c1c;">
                    <span>Discount:</span>
                    <span>-${Number(data.discountAmount).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }

            ${
              config.showTaxBreakdown && data.taxAmount && data.taxAmount > 0
                ? `<div class="meta-row">
                    <span>${data.taxName || 'Tax'} (${data.taxRate || 7}%):</span>
                    <span>+${Number(data.taxAmount).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }

            ${
              data.serviceCharge && data.serviceCharge > 0
                ? `<div class="meta-row">
                    <span>Service Charge:</span>
                    <span>+${Number(data.serviceCharge).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }

            ${
              data.deliveryFee && data.deliveryFee > 0
                ? `<div class="meta-row">
                    <span>Delivery Fee (${data.deliveryFeePayer === 'SELLER_PAYS' ? 'Seller Paid' : 'Cust Paid'}):</span>
                    <span>${data.deliveryFeePayer === 'SELLER_PAYS' ? '-' : '+'}${Number(data.deliveryFee).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }

            <div class="divider-solid"></div>

            <div class="flex-between total-highlight">
              <span>TOTAL DUE:</span>
              <span>${Number(data.totalAmount).toLocaleString()} ${currency}</span>
            </div>

            <div class="divider-solid"></div>

            <!-- Payments & Tenders -->
            ${
              data.payments && data.payments.length > 0
                ? data.payments
                    .map(
                      (p) => `
                  <div class="meta-row">
                    <span>Paid (${p.paymentMethod}):</span>
                    <span class="bold">${Number(p.amount).toLocaleString()} ${currency}</span>
                  </div>
                `
                    )
                    .join('')
                : data.paidAmount
                ? `<div class="meta-row">
                    <span>Paid Tendered:</span>
                    <span class="bold">${Number(data.paidAmount).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }

            ${
              data.changeAmount !== undefined && data.changeAmount > 0
                ? `<div class="meta-row bold" style="color: #047857;">
                    <span>Change Returned:</span>
                    <span>${Number(data.changeAmount).toLocaleString()} ${currency}</span>
                  </div>`
                : ''
            }
          </div>

          <!-- Dynamic Payment QR Section -->
          ${(() => {
            if (!config.showPaymentQr || template === 'DELIVERY_COD') return '';
            const qrRes = generateUniversalQrImageUrl(
              {
                standard: config.paymentQrType || 'LAO_QR_LAPNET',
                bankCode: config.paymentQrBankCode || 'ALL_BANKS',
                accountNo: config.paymentQrAccountNo || '030120000172042001',
                accountName: config.paymentQrAccountName || store?.name || '39POS Store',
                storeName: store?.name || '39POS Store',
                bankName: config.paymentQrBankName,
                amount: config.paymentQrDynamicAmount !== false ? Number(data.totalAmount) : undefined,
                currency: currency,
                invoiceNo: data.invoiceNo,
                customImageUrl: config.paymentQrImageUrl,
              },
              140
            );

            return `
              <div class="divider-dashed"></div>
              <div class="qr-box">
                <img src="${qrRes.qrImageUrl}" alt="Payment QR" class="qr-code-img" />
                <div class="bold" style="font-size: 10px;">${config.paymentQrBankName || qrRes.standardTitle}</div>
                ${
                  config.paymentQrAccountNo
                    ? `<div style="font-size: 9px; color: #475569;">A/C: <strong>${config.paymentQrAccountNo}</strong></div>`
                    : ''
                }
                ${
                  config.paymentQrAccountName
                    ? `<div style="font-size: 8.5px; color: #64748b;">${config.paymentQrAccountName}</div>`
                    : ''
                }
                ${
                  config.paymentQrDynamicAmount !== false && data.totalAmount
                    ? `<div style="font-size: 8.5px; color: #059669; font-weight: bold; margin-top: 1px;">Amount: ${Number(data.totalAmount).toLocaleString()} ${currency}</div>`
                    : ''
                }
              </div>
            `;
          })()}

          <div class="divider-dashed"></div>

          <!-- Footer Policy & Thank You -->
          <div class="footer-note">
            ${config.customFooterNote ? `<div class="bold" style="color: #0f172a; margin-bottom: 2px;">${config.customFooterNote}</div>` : ''}
            ${config.showReturnPolicy && config.returnPolicyText ? `<div style="font-size: 9px; margin-bottom: 2px;">${config.returnPolicyText}</div>` : ''}
            <div style="font-size: 8.5px; color: #94a3b8; margin-top: 3px;">Powered by 39POS Enterprise System</div>
          </div>
        `
            : `
          <div class="center bold" style="margin-top: 10px; font-size: 12px; border-top: 2px solid #000; padding-top: 6px;">
            *** END OF ORDER TICKET ***
          </div>
        `
        }
      </div>
    `;

    const copiesCount = options?.copies || 1;
    const allCopiesHtml =
      copiesCount === 2
        ? renderReceiptBody('Customer Copy') + renderReceiptBody('Merchant / Store Copy')
        : Array.from({ length: copiesCount })
            .map((_, idx) => renderReceiptBody(copiesCount > 1 ? `Copy #${idx + 1}` : undefined))
            .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Print - ${data.invoiceNo}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Noto+Sans+Lao:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          ${pageCss}
          
          body {
            font-family: 'Courier Prime', 'Noto Sans Lao', 'Noto Sans Thai', 'SFMono-Regular', Consolas, monospace;
            color: #0f172a;
            background: #fff;
            line-height: 1.35;
            -webkit-font-smoothing: antialiased;
          }

          .center { text-align: center; }
          .right { text-align: right; }
          .left { text-align: left; }
          .bold { font-weight: 700; }
          .italic { font-style: italic; }

          .divider-dashed {
            border-top: 1px dashed #475569;
            margin: 6px 0;
          }
          .divider-solid {
            border-top: 1.5px solid #0f172a;
            margin: 6px 0;
          }
          .divider-double {
            border-top: 2.5px double #0f172a;
            margin: 6px 0;
          }

          .flex-between {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
          }

          .store-name {
            font-size: ${fontSizes.header};
            font-weight: 700;
            letter-spacing: -0.2px;
            margin-bottom: 2px;
          }
          .store-sub {
            font-size: ${fontSizes.meta};
            color: #334155;
          }

          .meta-row {
            font-size: ${fontSizes.meta};
            display: flex;
            justify-content: space-between;
            margin: 1.5px 0;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
          }
          .items-table th {
            text-align: left;
            font-size: ${fontSizes.meta};
            padding: 3px 0;
            border-bottom: 1px solid #0f172a;
            text-transform: uppercase;
          }
          .items-table td {
            font-size: ${fontSizes.lineItem};
            padding: 2.5px 0;
            vertical-align: top;
          }

          .total-highlight {
            font-size: ${fontSizes.header};
            font-weight: 700;
            padding: 4px 0;
          }

          .qr-box {
            text-align: center;
            margin: 6px 0;
            padding-top: 2px;
          }
          .qr-code-img {
            width: 105px;
            height: 105px;
            object-fit: contain;
            margin: 0 auto 3px auto;
            display: block;
          }

          .footer-note {
            font-size: ${fontSizes.meta};
            color: #475569;
            text-align: center;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        ${allCopiesHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Executes printing via hidden iframe (clean, no navigation) or popup fallback
   */
  public static print(
    data: PrintableReceiptData,
    config: ReceiptConfig = DEFAULT_RECEIPT_CONFIG,
    store: StoreDTO | null = null,
    options?: PrintOptionsOverride
  ): void {
    const html = PrintEngine.generateReceiptHtml(data, config, store, options);

    try {
      let iframe = document.getElementById('39pos-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = '39pos-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        return;
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to popup window:', err);
    }

    const win = window.open('', '_blank', 'width=450,height=700');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }
}
