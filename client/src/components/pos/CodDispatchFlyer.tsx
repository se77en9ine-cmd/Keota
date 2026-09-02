import React from 'react';
import { Truck, Sparkles, Send } from 'lucide-react';
import { useLiveOrdersStore } from '../../store/useLiveOrdersStore';

export const CodDispatchFlyer: React.FC = () => {
  const isFlying = useLiveOrdersStore((s) => s.isFlying);
  const flyingOrder = useLiveOrdersStore((s) => s.flyingOrder);

  if (!isFlying || !flyingOrder) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {/* Floating Glowing Particle / Delivery Rocket Capsule */}
      <div className="absolute left-1/2 top-1/2 cod-fly-animate">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 text-white shadow-2xl shadow-amber-500/60 border border-white/40 backdrop-blur-md ring-4 ring-amber-400/40">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Truck className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="text-left font-mono">
            <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-amber-100">
              <Send className="w-2.5 h-2.5" />
              <span>Sending COD Order</span>
            </div>
            <div className="font-extrabold text-xs text-white truncate max-w-[140px]">
              {flyingOrder.invoiceNo}
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
        </div>
      </div>
    </div>
  );
};
