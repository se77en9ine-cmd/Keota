import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { WhatsAppPhoneBadge } from '../common/WhatsAppPhoneBadge';
import {
  Users,
  Search,
  X,
  Check,
  Star,
  Award,
  CreditCard,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Loader2,
  Coins,
  User,
  HeartHandshake,
  Sparkles,
} from 'lucide-react';

export interface PosCustomer {
  id: string;
  name: string;
  surname?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  memberCode?: string | null;
  points: number;
  creditLimit: number;
  balance: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  avatarUrl?: string | null;
  currency?: string | null;
  totalOrders?: number;
  totalSpent?: number;
}

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomerId?: string;
  onSelectCustomer: (customer: PosCustomer | null) => void;
}

const TIER_STYLES: Record<string, { badge: string; avatarGlow: string; ring: string }> = {
  PLATINUM: {
    badge: 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30',
    avatarGlow: 'from-purple-600 to-indigo-600',
    ring: 'ring-purple-500/40',
  },
  GOLD: {
    badge: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30',
    avatarGlow: 'from-amber-500 to-yellow-600',
    ring: 'ring-amber-500/40',
  },
  SILVER: {
    badge: 'bg-gradient-to-r from-slate-400/20 to-slate-300/20 text-slate-200 border border-slate-400/30',
    avatarGlow: 'from-slate-400 to-slate-600',
    ring: 'ring-slate-400/40',
  },
  BRONZE: {
    badge: 'bg-gradient-to-r from-orange-800/20 to-amber-900/20 text-orange-400 border border-orange-700/30',
    avatarGlow: 'from-orange-700 to-amber-900',
    ring: 'ring-orange-600/40',
  },
};

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  selectedCustomerId,
  onSelectCustomer,
}) => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      const fetchList = async () => {
        try {
          setLoading(true);
          const res = await api.get('/customers');
          setCustomers(res.data.customers || []);
        } catch (err) {
          console.error('Failed to fetch customers in POS:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getInitials = (name: string, surname?: string | null) => {
    if (!name) return 'MB';
    if (surname && surname.trim()) {
      return (name.trim()[0] + surname.trim()[0]).toUpperCase();
    }
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase();
    const fullName = `${c.name || ''} ${c.surname || ''}`.toLowerCase();
    return (
      fullName.includes(s) ||
      (c.phone && c.phone.toLowerCase().includes(s)) ||
      (c.email && c.email.toLowerCase().includes(s)) ||
      (c.address && c.address.toLowerCase().includes(s)) ||
      (c.memberCode && c.memberCode.toLowerCase().includes(s))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg neu-card-lg p-5 space-y-4 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" />
              <span>{t('pos.customerLookup', 'Select Customer / Member')}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('onlineOrders.customerSubtitle', 'Attach a loyalty member to auto-apply tier discounts and redeem points')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 neu-circle-btn text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Walk-in Option */}
        <div className="space-y-2 flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('onlineOrders.searchCustomer', 'Search member by name, surname, phone, code...')}
              className="w-full h-10 pl-10 pr-3 neu-input text-xs font-medium text-slate-800 dark:text-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectCustomer(null);
              onClose();
            }}
            className="w-full py-2.5 px-3 neu-btn text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-400" />
              <span>{t('pos.walkInCustomer', 'Walk-in Customer (Guest)')}</span>
            </div>
            {!selectedCustomerId && (
              <span className="px-2 py-0.5 rounded-md neu-pill text-emerald-500 text-[10px] font-bold">
                {t('onlineOrders.active', 'Active')}
              </span>
            )}
          </button>
        </div>

        {/* Customer List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {loading ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-semibold gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span>{t('common.loading', 'Loading customer directory...')}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5 neu-card">
              <Users className="w-7 h-7 opacity-30" />
              <span>{t('common.noRecordsFound', 'No members found')} "{search}"</span>
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              const tierInfo = TIER_STYLES[c.tier] || TIER_STYLES.BRONZE;
              const pointsValueUsd = (c.points / 100).toFixed(2);
              const fullName = `${c.name} ${c.surname || ''}`.trim();

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectCustomer(c);
                    onClose();
                  }}
                  className={`p-3 neu-card-interactive flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-emerald-500/40 shadow-neu-raised-sm'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center relative ring-2 ${
                        tierInfo.ring
                      }`}
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${tierInfo.avatarGlow} flex items-center justify-center text-white font-black text-xs`}
                        >
                          {getInitials(c.name, c.surname)}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {fullName}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-black tracking-wider ${tierInfo.badge}`}
                        >
                          {c.tier}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{c.memberCode}</span>
                        {c.phone && (
                          <WhatsAppPhoneBadge
                            phone={c.phone}
                            text={`Hello ${fullName}! Greetings from 39POS.`}
                            size="xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Points Balance & Select Indicator */}
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="flex items-center justify-end gap-1 text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>{c.points} pts</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        ≈ ${pointsValueUsd} value
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] hover:bg-brand-500 hover:text-white transition-colors"
                      >
                        {t('common.select', 'Select')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
