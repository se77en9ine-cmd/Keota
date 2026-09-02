import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import {
  Printer,
  FileText,
  ArrowUpRight,
  TrendingUp,
  Package,
  Truck,
  Building2,
  Coins,
} from 'lucide-react';

interface FormalIncomeStatementProps {
  startDate: string;
  endDate: string;
  grossSalesRevenue: number;
  filteredIncomes: any[];
  totalCogs?: number;
  deliveryFreightLosses: number;
  sellerPaidDeliveryFees?: number;
  filteredExpenses: any[];
  totalGrossIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export const FormalIncomeStatement: React.FC<FormalIncomeStatementProps> = ({
  startDate,
  endDate,
  grossSalesRevenue,
  filteredIncomes,
  totalCogs = 0,
  deliveryFreightLosses,
  sellerPaidDeliveryFees = 0,
  filteredExpenses,
  totalGrossIncome,
}) => {
  const { t } = useTranslation();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  // ── Standard GAAP Calculations ──
  const totalRevenue = totalGrossIncome;
  const cogs = totalCogs || 0;

  // Tier 2: Cost of Sales / Direct Costs
  const totalDirectCosts = cogs + deliveryFreightLosses + sellerPaidDeliveryFees;
  const grossProfit = totalRevenue - totalDirectCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Tier 3: Operating Expenses (OPEX Only)
  const expensesByCategory = filteredExpenses.reduce((acc: Record<string, number>, exp) => {
    const cat = exp.category || 'OPERATIONS';
    acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
    return acc;
  }, {});

  const totalOpex = Object.values(expensesByCategory).reduce((sum, amt) => sum + (amt as number), 0);

  // Bottom Line: Net Profit
  const netProfit = grossProfit - totalOpex;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const formatShare = (amount: number) => {
    if (totalRevenue <= 0) return '0.0%';
    return `${((amount / totalRevenue) * 100).toFixed(1)}%`;
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('reports.formalStatementTitle', 'Income Statement (P&L)')} - 39POS Enterprise</title>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Lao:wght@400;600;700;800&family=Noto+Sans+Thai:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { 
            font-family: 'Noto Sans Lao', 'Noto Sans Thai', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            font-size: 13px; 
            color: #0f172a; 
            line-height: 1.5; 
            padding: 20px; 
          }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .store-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
          .report-title { font-size: 16px; font-weight: 800; color: #059669; text-transform: uppercase; margin-top: 4px; }
          .period { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { text-align: left; background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 800; }
          td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
          .bold { font-weight: bold; }
          .section-head { background: #f1f5f9; font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 12px; border-top: 1px solid #cbd5e1; }
          .subtotal-row { background: #fafafa; font-weight: bold; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
          .bottom-line { background: #f0fdf4; font-size: 14px; font-weight: 900; color: #065f46; border-top: 2px solid #059669; border-bottom: 3px double #059669; }
          .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
          .sig-box { width: 200px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; color: #475569; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">39POS ENTERPRISE</div>
          <div class="report-title">${t('reports.formalStatementTitle', '3-Tier Formal Income Statement (Profit & Loss)')}</div>
          <div class="period">
            ${t('reports.reportingPeriod', 'Reporting Period')}: ${startDate ? startDate : t('reports.start', 'Start')} ${t('reports.to', 'to')} ${endDate ? endDate : t('reports.present', 'Present')} • ${t('reports.generatedOn', 'Generated on')} ${new Date().toLocaleString()}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('reports.colAccountDescription', 'Account / Line Item Description')}</th>
              <th class="text-center">${t('reports.flowType', 'Flow')}</th>
              <th class="text-right">${t('reports.colAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}</th>
              <th class="text-right">${t('reports.colPercentRevenue', '% of Revenue')}</th>
            </tr>
          </thead>
          <tbody>
            <tr class="section-head"><td colspan="4">${t('reports.tier1OperatingRevenue', '1. Operating Revenue & Inflows')}</td></tr>
            <tr>
              <td style="padding-left: 20px;">${t('reports.posOmnichannelSales', 'POS & Omnichannel Sales Revenue')}</td>
              <td class="text-center"><span style="color: #059669; font-weight: bold;">+ Inflow</span></td>
              <td class="text-right font-mono">${format(convert(grossSalesRevenue, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono">${formatShare(grossSalesRevenue)}</td>
            </tr>
            ${filteredIncomes.map(inc => `
              <tr>
                <td style="padding-left: 20px;">${inc.title || inc.description || t('reports.otherIncome', 'Other Store Income')}</td>
                <td class="text-center"><span style="color: #059669; font-weight: bold;">+ Inflow</span></td>
                <td class="text-right font-mono">${format(convert(inc.amount, baseCode, currentCurrency), currentCurrency)}</td>
                <td class="text-right font-mono">${formatShare(inc.amount)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal-row">
              <td class="bold">${t('reports.totalOperatingRevenue', 'TOTAL OPERATING REVENUE')}</td>
              <td class="text-center bold">100.0%</td>
              <td class="text-right font-mono bold">${format(convert(totalRevenue, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono bold">100.0%</td>
            </tr>

            <tr class="section-head"><td colspan="4">${t('reports.tier2DirectCosts', '2. Cost of Sales & Direct Costs (COGS)')}</td></tr>
            <tr>
              <td style="padding-left: 20px;">${t('reports.cogsFromPos', 'Cost of Goods Sold (Wholesale Unit Costs from POs)')}</td>
              <td class="text-center"><span style="color: #e11d48; font-weight: bold;">- Cost</span></td>
              <td class="text-right font-mono">-${format(convert(cogs, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono">${formatShare(cogs)}</td>
            </tr>
            ${deliveryFreightLosses > 0 ? `
            <tr>
              <td style="padding-left: 20px;">${t('reports.codRefusalLosses', 'COD Delivery Refusal Freight Losses')}</td>
              <td class="text-center"><span style="color: #e11d48; font-weight: bold;">- Loss</span></td>
              <td class="text-right font-mono">-${format(convert(deliveryFreightLosses, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono">${formatShare(deliveryFreightLosses)}</td>
            </tr>
            ` : ''}
            ${sellerPaidDeliveryFees > 0 ? `
            <tr>
              <td style="padding-left: 20px;">${t('reports.sellerPaidDelivery', 'Store Free Shipping (Seller-Paid Delivery)')}</td>
              <td class="text-center"><span style="color: #d97706; font-weight: bold;">- Free Ship</span></td>
              <td class="text-right font-mono">-${format(convert(sellerPaidDeliveryFees, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono">${formatShare(sellerPaidDeliveryFees)}</td>
            </tr>
            ` : ''}
            <tr class="subtotal-row">
              <td class="bold">${t('reports.grossProfit', 'GROSS PROFIT')}</td>
              <td class="text-center bold">MARGIN: ${grossMargin.toFixed(1)}%</td>
              <td class="text-right font-mono bold">${format(convert(grossProfit, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono bold">${grossMargin.toFixed(1)}%</td>
            </tr>

            <tr class="section-head"><td colspan="4">${t('reports.tier3Opex', '3. Operating Expenses (OPEX)')}</td></tr>
            ${Object.entries(expensesByCategory).length > 0 ? Object.entries(expensesByCategory).map(([cat, amt]) => `
              <tr>
                <td style="padding-left: 20px;">${String(t(`expenseCategory.${cat}`, cat))} ${t('reports.storeExpensesSuffix', 'Store Expenses')}</td>
                <td class="text-center"><span style="color: #e11d48; font-weight: bold;">- OPEX</span></td>
                <td class="text-right font-mono">-${format(convert(amt as number, baseCode, currentCurrency), currentCurrency)}</td>
                <td class="text-right font-mono">${formatShare(amt as number)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td style="padding-left: 20px; color: #94a3b8;">${t('reports.noOpexRecorded', 'No general overhead or store expenses recorded in this period')}</td>
                <td class="text-center" style="color: #94a3b8;">—</td>
                <td class="text-right font-mono" style="color: #94a3b8;">-${format(convert(0, baseCode, currentCurrency), currentCurrency)}</td>
                <td class="text-right font-mono" style="color: #94a3b8;">0.0%</td>
              </tr>
            `}
            <tr class="subtotal-row">
              <td class="bold">${t('reports.totalOpex', 'TOTAL OPERATING EXPENSES')}</td>
              <td class="text-center bold">OPEX: ${formatShare(totalOpex)}</td>
              <td class="text-right font-mono bold">-${format(convert(totalOpex, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono bold">${formatShare(totalOpex)}</td>
            </tr>

            <tr class="bottom-line">
              <td>${t('reports.netOperatingProfitEbitda', 'NET OPERATING PROFIT (EBITDA)')}</td>
              <td class="text-center">NET MARGIN: ${profitMargin.toFixed(1)}%</td>
              <td class="text-right font-mono">${format(convert(netProfit, baseCode, currentCurrency), currentCurrency)}</td>
              <td class="text-right font-mono">${profitMargin.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">${t('reports.sigPreparedBy', 'Prepared by: Store Accountant')}</div>
          <div class="sig-box">${t('reports.sigVerifiedBy', 'Verified by: General Manager')}</div>
          <div class="sig-box">${t('reports.sigApprovedBy', 'Approved by: Managing Director')}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="p-6 neu-card-lg space-y-5 text-xs animate-in fade-in duration-200">
      {/* Header & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/40 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                {t('reports.formalStatementTitle', '3-Tier Formal Income Statement (Profit & Loss)')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-slate-600 dark:text-slate-300">
                Standard GAAP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              {t('reports.formalStatementSubtitle', 'Standard GAAP multi-step breakdown: Revenue → Gross Profit → OPEX → Net Profit')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="h-10 px-5 neu-btn text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-emerald-500" />
          <span>{t('reports.btnPrintStatement', 'Print Statement (PDF / A4)')}</span>
        </button>
      </div>

      {/* Structured Clean Financial Statement Table */}
      <div className="overflow-x-auto rounded-2xl neu-sunken p-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/40 dark:border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
              <th className="py-3 px-5">{t('reports.colAccountDescription', 'Account / Line Item Description')}</th>
              <th className="py-3 px-4 text-center">{t('reports.flowType', 'Flow')}</th>
              <th className="py-3 px-5 text-right">{t('reports.colAmountCurrency', 'Amount ({{currency}})', { currency: currentCurrency })}</th>
              <th className="py-3 px-5 text-right">{t('reports.colPercentRevenue', '% of Revenue')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
            
            {/* ══════════════════════════════════════════════════ */}
            {/* TIER 1: OPERATING REVENUE & INFLOWS */}
            {/* ══════════════════════════════════════════════════ */}
            <tr className="bg-slate-200/30 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-slate-200 text-[11px] border-t border-slate-200/40 dark:border-slate-800">
              <td colSpan={4} className="py-2.5 px-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="uppercase tracking-wider font-extrabold text-slate-900 dark:text-white">
                    {t('reports.tier1OperatingRevenue', '1. Operating Revenue & Inflows')}
                  </span>
                </div>
              </td>
            </tr>

            <tr className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
              <td className="py-3 px-5 pl-8 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>{t('reports.posOmnichannelSales', 'POS & Omnichannel Sales Revenue')}</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-600 dark:text-emerald-400 neu-pill">
                  + Inflow
                </span>
              </td>
              <td className="py-3 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {format(convert(grossSalesRevenue, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-3 px-5 text-right font-mono text-slate-500 dark:text-slate-400">{formatShare(grossSalesRevenue)}</td>
            </tr>

            {filteredIncomes.map((inc) => (
              <tr key={inc.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-5 pl-8 text-slate-800 dark:text-slate-200">
                  {inc.title || inc.description || t('reports.otherIncome', 'Other Store Income')}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-600 dark:text-emerald-400 neu-pill">
                    + Inflow
                  </span>
                </td>
                <td className="py-3 px-5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{format(convert(inc.amount, baseCode, currentCurrency), currentCurrency)}
                </td>
                <td className="py-3 px-5 text-right font-mono text-slate-500 dark:text-slate-400">{formatShare(inc.amount)}</td>
              </tr>
            ))}

            {/* Total Revenue Subtotal */}
            <tr className="bg-slate-200/40 dark:bg-slate-800/50 border-t border-b border-slate-200/40 dark:border-slate-800 font-bold">
              <td className="py-3 px-5 text-slate-900 dark:text-white uppercase tracking-wide font-extrabold">
                {t('reports.totalOperatingRevenue', 'TOTAL OPERATING REVENUE')}
              </td>
              <td className="py-3 px-4 text-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold">BASE</span>
              </td>
              <td className="py-3 px-5 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                {format(convert(totalRevenue, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-3 px-5 text-right font-mono font-bold text-slate-900 dark:text-white">100.0%</td>
            </tr>

            {/* ══════════════════════════════════════════════════ */}
            {/* TIER 2: COST OF SALES & DIRECT COSTS */}
            {/* ══════════════════════════════════════════════════ */}
            <tr className="bg-slate-200/30 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-slate-200 text-[11px] border-t border-slate-200/40 dark:border-slate-800">
              <td colSpan={4} className="py-2.5 px-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="uppercase tracking-wider font-extrabold text-slate-900 dark:text-white">
                    {t('reports.tier2DirectCosts', '2. Cost of Sales & Direct Costs (COGS)')}
                  </span>
                </div>
              </td>
            </tr>

            <tr className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
              <td className="py-3 px-5 pl-8 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                <span>{t('reports.cogsFromPos', 'Cost of Goods Sold (Wholesale Unit Costs from POs)')}</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 dark:text-rose-400 neu-pill">
                  - Cost
                </span>
              </td>
              <td className="py-3 px-5 text-right font-mono font-bold text-rose-500">
                -{format(convert(cogs, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-3 px-5 text-right font-mono text-rose-400">{formatShare(cogs)}</td>
            </tr>

            {deliveryFreightLosses > 0 && (
              <tr className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-5 pl-8 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                  <span>{t('reports.codRefusalLosses', 'COD Delivery Refusal Freight Losses')}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 dark:text-rose-400 neu-pill">
                    - Loss
                  </span>
                </td>
                <td className="py-3 px-5 text-right font-mono font-bold text-rose-500">
                  -{format(convert(deliveryFreightLosses, baseCode, currentCurrency), currentCurrency)}
                </td>
                <td className="py-3 px-5 text-right font-mono text-rose-400">{formatShare(deliveryFreightLosses)}</td>
              </tr>
            )}

            {sellerPaidDeliveryFees > 0 && (
              <tr className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-5 pl-8 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>{t('reports.sellerPaidDelivery', 'Store Free Shipping (Seller-Paid Delivery)')}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-amber-600 dark:text-amber-400 neu-pill">
                    - Free Ship
                  </span>
                </td>
                <td className="py-3 px-5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                  -{format(convert(sellerPaidDeliveryFees, baseCode, currentCurrency), currentCurrency)}
                </td>
                <td className="py-3 px-5 text-right font-mono text-amber-500">{formatShare(sellerPaidDeliveryFees)}</td>
              </tr>
            )}

            {/* Gross Profit Subtotal */}
            <tr className="bg-slate-200/40 dark:bg-slate-800/50 border-t border-b border-slate-200/40 dark:border-slate-800 font-bold">
              <td className="py-3 px-5 text-slate-900 dark:text-white uppercase tracking-wide font-extrabold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span>{t('reports.grossProfit', 'GROSS PROFIT')}</span>
              </td>
              <td className="py-3 px-4 text-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold neu-pill text-purple-600 dark:text-purple-400">
                  Margin: {grossMargin.toFixed(1)}%
                </span>
              </td>
              <td className="py-3 px-5 text-right font-mono font-black text-purple-600 dark:text-purple-400 text-sm">
                {format(convert(grossProfit, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-3 px-5 text-right font-mono font-bold text-purple-600 dark:text-purple-400">{grossMargin.toFixed(1)}%</td>
            </tr>

            {/* ══════════════════════════════════════════════════ */}
            {/* TIER 3: OPERATING EXPENSES (OPEX) */}
            {/* ══════════════════════════════════════════════════ */}
            <tr className="bg-slate-200/30 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-slate-200 text-[11px] border-t border-slate-200/40 dark:border-slate-800">
              <td colSpan={4} className="py-2.5 px-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="uppercase tracking-wider font-extrabold text-slate-900 dark:text-white">
                    {t('reports.tier3Opex', '3. Operating Expenses (OPEX)')}
                  </span>
                </div>
              </td>
            </tr>

            {Object.entries(expensesByCategory).length > 0 ? (
              Object.entries(expensesByCategory).map(([cat, amt]) => (
                <tr key={cat} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-5 pl-8 flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{String(t(`expenseCategory.${cat}`, cat))} {t('reports.storeExpensesSuffix', 'Store Expenses')}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-600 dark:text-rose-400 neu-pill">
                      - OPEX
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-bold text-rose-500">
                    -{format(convert(amt as number, baseCode, currentCurrency), currentCurrency)}
                  </td>
                  <td className="py-3 px-5 text-right font-mono text-slate-400">{formatShare(amt as number)}</td>
                </tr>
              ))
            ) : (
              <tr className="text-slate-400 italic">
                <td className="py-3 px-5 pl-8">{t('reports.noOpexRecorded', 'No general overhead or store expenses recorded in this period')}</td>
                <td className="py-3 px-4 text-center text-[10px] text-slate-400">—</td>
                <td className="py-3 px-5 text-right font-mono text-slate-400">-{format(convert(0, baseCode, currentCurrency), currentCurrency)}</td>
                <td className="py-3 px-5 text-right font-mono text-slate-400">0.0%</td>
              </tr>
            )}

            {/* Total OPEX Subtotal */}
            <tr className="bg-slate-200/40 dark:bg-slate-800/50 border-t border-b border-slate-200/40 dark:border-slate-800 font-bold">
              <td className="py-3 px-5 text-slate-900 dark:text-white uppercase tracking-wide font-extrabold">
                {t('reports.totalOpex', 'TOTAL OPERATING EXPENSES')}
              </td>
              <td className="py-3 px-4 text-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold">OPEX</span>
              </td>
              <td className="py-3 px-5 text-right font-mono text-rose-500 text-sm font-bold">
                -{format(convert(totalOpex, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-3 px-5 text-right font-mono text-slate-400 font-bold">{formatShare(totalOpex)}</td>
            </tr>

            {/* ══════════════════════════════════════════════════ */}
            {/* BOTTOM LINE: NET OPERATING PROFIT (EBITDA) */}
            {/* ══════════════════════════════════════════════════ */}
            <tr className="bg-emerald-500/15 dark:bg-emerald-950/40 border-t-2 border-b-2 border-emerald-500/50 dark:border-emerald-500/60 font-black">
              <td className="py-4 px-5 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <span>{t('reports.netOperatingProfitEbitda', 'NET OPERATING PROFIT (EBITDA)')}</span>
              </td>
              <td className="py-4 px-4 text-center">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black neu-pill text-emerald-700 dark:text-emerald-300">
                  Net Margin: {profitMargin.toFixed(1)}%
                </span>
              </td>
              <td className="py-4 px-5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-base font-black">
                {format(convert(netProfit, baseCode, currentCurrency), currentCurrency)}
              </td>
              <td className="py-4 px-5 text-right font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                {profitMargin.toFixed(1)}%
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
};
