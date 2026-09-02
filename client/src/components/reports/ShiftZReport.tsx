import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  Receipt,
  Printer,
  FileSpreadsheet,
  Coins,
  DollarSign,
  TrendingUp,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  RotateCcw,
} from 'lucide-react';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { CustomSelect } from '../common/CustomSelect';

interface ShiftZReportProps {
  sales: any[];
  startDate?: string;
  endDate?: string;
}

export const ShiftZReport: React.FC<ShiftZReportProps> = ({ sales, startDate, endDate }) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const [openingFloat, setOpeningFloat] = useState<number>(0);
  const [actualCashCounted, setActualCashCounted] = useState<string>('');
  const [cashIn, setCashIn] = useState<number>(0);
  const [cashOut, setCashOut] = useState<number>(0);
  const [selectedCashier, setSelectedCashier] = useState<string>('ALL');

  // Filter sales for the selected date range and cashier
  const zSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.fulfillmentStatus === 'CANCELLED' || s.status === 'CANCELLED' || s.pipelineStage === 'REJECTED') {
        return false;
      }
      if (selectedCashier !== 'ALL' && s.cashierName !== selectedCashier && s.cashierId !== selectedCashier) {
        return false;
      }
      if (startDate || endDate) {
        const saleDate = s.createdAt ? s.createdAt.slice(0, 10) : '';
        if (startDate && saleDate < startDate) return false;
        if (endDate && saleDate > endDate) return false;
      }
      return true;
    });
  }, [sales, startDate, endDate, selectedCashier]);

  // Unique cashiers
  const cashierOptions = useMemo(() => {
    const cashiers = new Set<string>();
    sales.forEach((s) => {
      if (s.cashierName) cashiers.add(s.cashierName);
    });
    return [
      { value: 'ALL', label: t('reports.allCashiers', 'All Cashiers / Registers') },
      ...Array.from(cashiers).map((c) => ({ value: c, label: c })),
    ];
  }, [sales, t]);

  // Calculation Metrics
  const grossSales = zSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalDiscount = zSales.reduce((sum, s) => sum + (s.discountAmount || 0), 0);
  const totalTax = zSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
  const orderCount = zSales.length;
  const averageTicket = orderCount > 0 ? grossSales / orderCount : 0;

  // Payment Breakdown
  const cashSales = zSales
    .filter((s) => (s.paymentMethod || 'CASH').toUpperCase() === 'CASH' || (s.paymentStatus === 'PAID' && !s.paymentMethod))
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const qrSales = zSales
    .filter((s) => {
      const pm = (s.paymentMethod || '').toUpperCase();
      return pm.includes('QR') || pm.includes('ONEPAY') || pm.includes('BCEL') || pm.includes('TRANSFER');
    })
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const cardSales = zSales
    .filter((s) => {
      const pm = (s.paymentMethod || '').toUpperCase();
      return pm.includes('CARD') || pm.includes('CREDIT') || pm.includes('VISA') || pm.includes('MASTERCARD');
    })
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const otherSales = Math.max(0, grossSales - (cashSales + qrSales + cardSales));

  // Drawer Cash Reconciliation
  const expectedCashInDrawer = openingFloat + cashSales + cashIn - cashOut;
  const numActualCash = actualCashCounted === '' ? expectedCashInDrawer : Number(actualCashCounted) || 0;
  const cashVariance = numActualCash - expectedCashInDrawer;

  // Print Thermal / A4 Z-Report
  const handlePrintZReport = () => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>End of Day Z-Report - ${new Date().toLocaleDateString()}</title>
        <style>
          @page { size: 80mm portrait; margin: 5mm; }
          body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; line-height: 1.4; padding: 10px; width: 280px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .title { font-size: 16px; font-weight: 900; }
          .subtitle { font-size: 11px; margin-bottom: 6px; }
          .variance-short { color: #b91c1c; font-weight: bold; }
          .variance-over { color: #047857; font-weight: bold; }
          .sig-box { margin-top: 30px; text-align: center; border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title">39POS ENTERPRISE</div>
          <div class="subtitle">*** DAILY REGISTER Z-REPORT ***</div>
          <div>Date: ${new Date().toLocaleString()}</div>
          <div>Register / Cashier: ${selectedCashier}</div>
          <div>Period: ${startDate || 'Start'} to ${endDate || 'Today'}</div>
        </div>

        <div class="double-divider"></div>

        <div class="bold center">--- SALES SUMMARY ---</div>
        <div class="row"><span>Total Orders:</span><span class="bold">${orderCount}</span></div>
        <div class="row"><span>Gross Sales:</span><span class="bold">${format(convert(grossSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>Discounts Given:</span><span>-${format(convert(totalDiscount, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>Tax Collected:</span><span>${format(convert(totalTax, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>Average Ticket:</span><span>${format(convert(averageTicket, baseCode, currentCurrency), currentCurrency)}</span></div>

        <div class="divider"></div>

        <div class="bold center">--- TENDER BREAKDOWN ---</div>
        <div class="row"><span>Cash Sales:</span><span class="bold">${format(convert(cashSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>QR / BCEL OnePay:</span><span class="bold">${format(convert(qrSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>Credit / Debit Card:</span><span class="bold">${format(convert(cardSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        ${otherSales > 0 ? `<div class="row"><span>Other / Credit:</span><span>${format(convert(otherSales, baseCode, currentCurrency), currentCurrency)}</span></div>` : ''}

        <div class="double-divider"></div>

        <div class="bold center">--- CASH DRAWER BALANCING ---</div>
        <div class="row"><span>(+) Opening Float:</span><span>${format(convert(openingFloat, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row"><span>(+) Cash Sales:</span><span>${format(convert(cashSales, baseCode, currentCurrency), currentCurrency)}</span></div>
        ${cashIn > 0 ? `<div class="row"><span>(+) Cash In / Float:</span><span>+${format(convert(cashIn, baseCode, currentCurrency), currentCurrency)}</span></div>` : ''}
        ${cashOut > 0 ? `<div class="row"><span>(-) Cash Out / Payout:</span><span>-${format(convert(cashOut, baseCode, currentCurrency), currentCurrency)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row bold"><span>(=) Expected Cash:</span><span>${format(convert(expectedCashInDrawer, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row bold"><span>Actual Counted:</span><span>${format(convert(numActualCash, baseCode, currentCurrency), currentCurrency)}</span></div>
        <div class="row bold">
          <span>Difference / Variance:</span>
          <span>${cashVariance >= 0 ? '+' : ''}${format(convert(cashVariance, baseCode, currentCurrency), currentCurrency)}</span>
        </div>

        <div class="double-divider"></div>

        <div class="sig-box">
          Cashier Sign-off
        </div>
        <div class="sig-box">
          Shift Manager / Supervisor
        </div>

        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="p-5 rounded-3xl neu-card-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {t('reports.shiftZReportTitle', 'End-of-Day Shift Z-Report & Cash Drawer Balancing')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black neu-pill text-emerald-600 dark:text-emerald-400 uppercase">
                Z-Closeout
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('reports.shiftZReportSubtitle', 'Audit daily register sales, tender totals, drawer float, and cash variances.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <CustomSelect
              value={selectedCashier}
              onChange={(val) => setSelectedCashier(val)}
              options={cashierOptions}
              placeholder={t('reports.selectCashier', 'Filter Cashier...')}
            />
          </div>

          <button
            type="button"
            onClick={handlePrintZReport}
            className="neu-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer text-white shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>{t('reports.printZReportSlip', 'Print Z-Report Slip')}</span>
          </button>
        </div>
      </div>

      {/* Top KPI Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{t('reports.grossSales', 'Total Sales')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {format(convert(grossSales, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {orderCount} {t('reports.ordersSettled', 'orders settled')}
          </div>
        </div>

        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{t('reports.cashTendered', 'Cash Collected')}</span>
            <Coins className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {format(convert(cashSales, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {((cashSales / (grossSales || 1)) * 100).toFixed(1)}% of total volume
          </div>
        </div>

        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{t('reports.digitalPayments', 'QR & Bank / Card')}</span>
            <DollarSign className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {format(convert(qrSales + cardSales, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            OnePay QR ({format(convert(qrSales, baseCode, currentCurrency), currentCurrency)}) + Card
          </div>
        </div>

        <div className="p-5 rounded-3xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">{t('reports.drawerVariance', 'Drawer Variance')}</span>
            <Scale className="w-4 h-4 text-purple-500" />
          </div>
          <div
            className={`text-2xl lg:text-3xl font-black font-mono ${
              cashVariance === 0
                ? 'text-emerald-500'
                : cashVariance > 0
                ? 'text-sky-500'
                : 'text-rose-500'
            }`}
          >
            {cashVariance >= 0 ? `+${format(convert(cashVariance, baseCode, currentCurrency), currentCurrency)}` : format(convert(cashVariance, baseCode, currentCurrency), currentCurrency)}
          </div>
          <div className="text-[11px] font-bold">
            {cashVariance === 0 ? (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Balanced Exactly
              </span>
            ) : cashVariance > 0 ? (
              <span className="text-sky-500">Drawer Over (+Cash Surplus)</span>
            ) : (
              <span className="text-rose-500 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Drawer Short (-Shortage)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Breakdown: Left Tender Split vs Right Drawer Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Payment Method & Sales Breakdown (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="neu-card-lg p-5 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white pb-3 border-b border-black/5 dark:border-white/5">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span>{t('reports.tenderSummary', 'Tender & Sales Breakdown')}</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between p-3 rounded-2xl neu-sunken-sm items-center">
                <span className="font-sans font-bold text-slate-600 dark:text-slate-300">💵 Cash Sales</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{format(convert(cashSales, baseCode, currentCurrency), currentCurrency)}</span>
              </div>

              <div className="flex justify-between p-3 rounded-2xl neu-sunken-sm items-center">
                <span className="font-sans font-bold text-slate-600 dark:text-slate-300">📱 QR / BCEL OnePay</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{format(convert(qrSales, baseCode, currentCurrency), currentCurrency)}</span>
              </div>

              <div className="flex justify-between p-3 rounded-2xl neu-sunken-sm items-center">
                <span className="font-sans font-bold text-slate-600 dark:text-slate-300">💳 Credit / Debit Card</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">{format(convert(cardSales, baseCode, currentCurrency), currentCurrency)}</span>
              </div>

              {otherSales > 0 && (
                <div className="flex justify-between p-3 rounded-2xl neu-sunken-sm items-center">
                  <span className="font-sans font-bold text-slate-600 dark:text-slate-300">🛍️ Other / Customer Credit</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{format(convert(otherSales, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Sales Total:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{format(convert(grossSales, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>Discounts Given:</span>
                  <span>-{format(convert(totalDiscount, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax & Surcharges:</span>
                  <span>{format(convert(totalTax, baseCode, currentCurrency), currentCurrency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Cash Drawer Reconciliation (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="neu-card-lg p-5 rounded-3xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
                <Scale className="w-4 h-4 text-purple-500" />
                <span>{t('reports.drawerReconciliation', 'Cash Drawer Balancing Calculator')}</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Shift End Verification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('reports.openingFloat', '(+) Opening Float')}
                </label>
                <input
                  type="number"
                  value={openingFloat || ''}
                  onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-10 px-3 neu-input font-mono font-bold text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('reports.cashIn', '(+) Cash In / Add')}
                </label>
                <input
                  type="number"
                  value={cashIn || ''}
                  onChange={(e) => setCashIn(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-10 px-3 neu-input font-mono font-bold text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('reports.cashOut', '(-) Cash Out / Payout')}
                </label>
                <input
                  type="number"
                  value={cashOut || ''}
                  onChange={(e) => setCashOut(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-10 px-3 neu-input font-mono font-bold text-xs outline-none"
                />
              </div>
            </div>

            {/* Reconciliation Comparison Box */}
            <div className="p-4 rounded-2xl neu-sunken-sm space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Calculated Expected Cash in Drawer:</span>
                <span className="font-black text-sm text-slate-900 dark:text-white">
                  {format(convert(expectedCashInDrawer, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Actual Physical Cash Counted in Till:
                </span>
                <div className="w-48">
                  <input
                    type="number"
                    value={actualCashCounted}
                    onChange={(e) => setActualCashCounted(e.target.value)}
                    placeholder={String(expectedCashInDrawer)}
                    className="w-full h-9 px-3 neu-input font-mono font-black text-sm text-right text-emerald-600 dark:text-emerald-400 outline-none"
                  />
                </div>
              </div>

              <div
                className={`p-3 rounded-xl flex items-center justify-between font-black text-sm ${
                  cashVariance === 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : cashVariance > 0
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  {cashVariance === 0 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  <span>Variance / Difference:</span>
                </div>
                <span>
                  {cashVariance >= 0 ? `+${format(convert(cashVariance, baseCode, currentCurrency), currentCurrency)}` : format(convert(cashVariance, baseCode, currentCurrency), currentCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
