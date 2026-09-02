# Design Specification: Multi-Device Print Bill Customization & Page Setup Engine

**Date:** 2026-08-27  
**Module:** 39POS Universal Print Engine & Bill Customizer  
**Status:** Approved for Implementation Planning

---

## 1. Overview & Objectives

Provide a unified, multi-device receipt & bill printing architecture for 39POS. This enables stores to print perfectly formatted bills across desktop POS counters, mobile phones, tablets, Android handheld terminals (Sunmi, PAX, iMin), and office printers with zero layout clipping or distorted Lao/Thai fonts.

---

## 2. Supported Paper Profiles & Dimensions

| Paper Profile | Physical Width | Printable Width | Target Device | CSS `@page` Specification |
|---|---|---|---|---|
| **80mm Thermal** | 80mm | ~72mm (576px at 203 DPI) | Countertop POS Thermal Printers (Epson, Xprinter, Rongta) | `@page { size: 80mm auto; margin: 3mm; }` |
| **58mm Compact** | 58mm | ~48mm (384px at 203 DPI) | Mobile Bluetooth & Handheld POS (Sunmi V2, PAX) | `@page { size: 58mm auto; margin: 1.5mm; }` |
| **A4 Formal** | 210mm × 297mm | 180mm | Office Laser/Inkjet (Invoices, B2B, Delivery Sheets) | `@page { size: A4 portrait; margin: 15mm; }` |
| **Sticky Label** | 50mm × 30mm | 46mm × 26mm | Cup, Box, Delivery Bag Barcode Labels | `@page { size: 50mm 30mm; margin: 1mm; }` |

---

## 3. Architecture & Data Schema

### 3.1 Bill Customization Config Schema (`ReceiptConfig`)

```typescript
export interface ReceiptConfig {
  defaultPaperProfile: '80MM' | '58MM' | 'A4' | 'LABEL';
  fontSizeScale: 'COMPACT' | 'STANDARD' | 'COMFORTABLE';
  
  // Header Section
  showLogo: boolean;
  logoUrl?: string;
  logoWidthPx: number; // e.g. 120px
  showStoreName: boolean;
  storeNameOverride?: string;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  showTaxId: boolean;
  showWifiInfo: boolean;
  customHeaderNote?: string;

  // Body / Line Items Section
  itemDisplayFormat: 'SINGLE_LINE' | 'TWO_LINES';
  showItemCode: boolean;
  showDiscountBreakdown: boolean;
  showTaxBreakdown: boolean;
  showCashierName: boolean;
  showCustomerDetails: boolean;
  showDeliveryBadge: boolean;

  // Footer & Payment QR Section
  showPaymentQr: boolean;
  paymentQrType: 'BCEL_ONE' | 'PROMPTPAY' | 'CUSTOM_IMAGE' | 'ORDER_TRACKING_URL';
  paymentQrImageUrl?: string;
  paymentQrAccountNo?: string;
  paymentQrAccountName?: string;
  showReturnPolicy: boolean;
  returnPolicyText?: string;
  customFooterNote?: string;
  autoCutFeedLines: number;
}
```

---

## 4. Key Components to Build / Update

1. **`client/src/utils/printEngine.ts`**:
   - Centralized HTML and CSS print renderer.
   - Generates responsive, standalone, self-contained printable documents rendered inside a hidden iframe or popup.
   - Integrates Lao (`Noto Sans Lao / Phetsarath`), Thai (`Noto Sans Thai / Sarabun`), and English fonts with monospace tables.

2. **`client/src/components/settings/BillCustomizerTab.tsx`**:
   - Full interactive customizer in **SettingsPage**:
     - Paper size radio picker (`80mm`, `58mm`, `A4`, `Label`).
     - Logo uploader (drag & drop image / preview / remove).
     - Header, line item, and footer toggle switches.
     - Payment QR code configuration (BCEL One / PromptPay / Custom QR).
     - Real-time **Live Bill Simulator** previewing changes side-by-side as you toggle options.

3. **`client/src/components/pos/ReceiptModal.tsx` & `LiveOrdersPipeline.tsx` & `TransactionAuditDrawer.tsx`**:
   - Replace one-off print handlers with the unified `printEngine.print(receiptData, config)` call.
   - Add on-the-fly paper profile selector in the modal before clicking Print.

---

## 5. Verification Plan

1. Verify real-time simulator updates in Settings.
2. Test print triggering for 80mm, 58mm, and A4 formats.
3. Validate Lao and Thai character rendering in printable output.
4. Verify logo rendering and payment QR code placement.
