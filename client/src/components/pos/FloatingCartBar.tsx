import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, ChevronUp, CreditCard, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { haptics } from '../../utils/haptics';

interface FloatingCartBarProps {
  onOpenCartSheet: () => void;
  onOpenPayment: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  onOpenCartSheet,
  onOpenPayment,
}) => {
  const { t } = useTranslation();
  const { items, getGrandTotal, channel } = useCartStore();
  const { format, convert, currentCurrency, baseCurrency } = useCurrencyStore();
  const baseCode = baseCurrency?.code || 'LAK';

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = getGrandTotal();
  const isOnlineChannel = channel && channel !== 'POS';

  if (items.length === 0) return null;

  return (
    <div className="lg:hidden fixed bottom-[72px] left-3 right-3 z-30 animate-slideUp select-none">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl shadow-slate-950/50 flex items-center justify-between gap-3">
        {/* Cart Tap Area */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            onOpenCartSheet();
          }}
          className="flex items-center gap-3 flex-1 text-left min-h-[44px] py-1 px-1.5 rounded-xl active:bg-slate-800/80 transition-colors"
        >
          <div
            className={`relative p-2 rounded-xl text-white shadow-md ${
              isOnlineChannel
                ? 'bg-gradient-to-tr from-pink-600 to-rose-500 shadow-pink-500/30'
                : 'bg-brand-500 shadow-brand-500/30'
            }`}
          >
            {isOnlineChannel ? <ShoppingBag className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-amber-400 text-slate-950 font-black text-[11px] rounded-full flex items-center justify-center shadow-sm">
              {totalItemsCount}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {t('pos.cartTotal', 'Order Total')}
              </span>
              {isOnlineChannel && (
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-pink-500/20 text-pink-400 rounded-md">
                  {channel}
                </span>
              )}
            </div>
            <span className="text-base font-black text-emerald-400 leading-tight">
              {format(convert(grandTotal, baseCode, currentCurrency), currentCurrency)}
            </span>
          </div>

          <ChevronUp className="w-4 h-4 text-slate-400 ml-auto mr-1" />
        </button>

        {/* 1-Tap Quick Pay / Checkout Button */}
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenCartSheet();
          }}
          className="flex items-center gap-1.5 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/30 active:scale-95 transition-all min-h-[48px]"
        >
          <CreditCard className="w-4 h-4" />
          <span>{isOnlineChannel ? 'Checkout' : t('pos.pay', 'Pay')}</span>
        </button>
      </div>
    </div>
  );
};
export default FloatingCartBar;
