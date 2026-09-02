import React, { useState } from 'react';
import { api } from '../../api/client';
import { useCurrencyStore } from '../../store/useCurrencyStore';
import { soundFX } from '../../utils/audio';
import {
  UserPlus,
  X,
  User,
  HeartHandshake,
  Sparkles,
  Users,
  Phone,
  MapPin,
  Mail,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { PosCustomer } from './CustomerSelectModal';

export type CustomerGender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNSPECIFIED';

interface QuickAddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onCustomerCreated: (customer: PosCustomer) => void;
}

const GENDER_OPTIONS: { id: CustomerGender; label: string; Icon: React.ComponentType<{ className?: string }>; color: string; badge: string }[] = [
  { id: 'MALE', label: 'Male', Icon: User, color: 'text-sky-400', badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { id: 'FEMALE', label: 'Female', Icon: HeartHandshake, color: 'text-pink-400', badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
  { id: 'OTHER', label: 'Other', Icon: Sparkles, color: 'text-purple-400', badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { id: 'UNSPECIFIED', label: 'Unspecified', Icon: Users, color: 'text-slate-400', badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
];

const CURRENCIES = ['USD', 'THB', 'LAK', 'EUR', 'GBP', 'CNY', 'SGD', 'MYR'];

export const QuickAddCustomerModal: React.FC<QuickAddCustomerModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onCustomerCreated,
}) => {
  const { currentCurrency } = useCurrencyStore();

  const isNumeric = /^[0-9+ -]+$/.test(initialQuery.trim()) && initialQuery.trim().length > 3;
  const initialName = isNumeric ? '' : initialQuery.trim();
  const initialPhone = isNumeric ? initialQuery.trim() : '';

  const [form, setForm] = useState<{
    name: string;
    surname: string;
    gender: CustomerGender;
    phone: string;
    address: string;
    currency: string;
  }>({
    name: initialName,
    surname: '',
    gender: 'UNSPECIFIED',
    phone: initialPhone,
    address: '',
    currency: currentCurrency || 'USD',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name.trim(),
        surname: form.surname.trim() || null,
        gender: form.gender,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        currency: form.currency,
        tier: 'BRONZE',
        points: 0,
        creditLimit: 500,
      };

      const res = await api.post('/customers', payload);
      soundFX.playCashSuccess();

      if (res.data && res.data.customer) {
        onCustomerCreated(res.data.customer);
      } else {
        // Fallback reconstructed customer
        onCustomerCreated({
          id: res.data?.id || `cust-${Date.now()}`,
          name: form.name.trim(),
          surname: form.surname.trim() || null,
          gender: form.gender,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          currency: form.currency,
          tier: 'BRONZE',
          points: 0,
          creditLimit: 500,
          balance: 0,
        });
      }
      onClose();
    } catch (err: any) {
      soundFX.playError();
      alert(`Failed to add customer: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md neu-card-lg rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Quick Add New Customer</h3>
              <p className="text-[10px] text-slate-400 font-medium">Saves to Customers CRM & auto-links to this order</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Sex / Gender Pill Selector */}
          <div>
            <label className="font-bold text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5">Sex / Gender</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 neu-tab-container rounded-2xl">
              {GENDER_OPTIONS.map((g) => {
                const isSelected = form.gender === g.id;
                const IconComp = g.Icon;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm({ ...form, gender: g.id })}
                    className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'neu-tab-active shadow-neu-raised-sm text-emerald-600 dark:text-emerald-400 font-black'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-inherit' : g.color}`} />
                    <span className="text-[10px]">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">First Name <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Somchai"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full h-9 px-3 rounded-xl neu-input text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">Surname</label>
              <input
                type="text"
                placeholder="e.g. Prasert"
                value={form.surname}
                onChange={(e) => setForm({ ...form, surname: e.target.value })}
                className="w-full h-9 px-3 rounded-xl neu-input text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Phone & Currency */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 020 5555 1234"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full h-9 px-3 rounded-xl neu-input text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full h-9 px-3 rounded-xl neu-input text-xs font-mono font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur} className="dark:bg-slate-900">{cur}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="font-bold text-[11px] block mb-1 text-slate-700 dark:text-slate-300">Delivery Address / Notes</label>
            <input
              type="text"
              placeholder="e.g. Building B, Room 304"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full h-9 px-3 rounded-xl neu-input text-xs font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl neu-btn font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className="px-5 py-2 rounded-xl neu-btn-primary text-white font-extrabold flex items-center gap-1.5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>Save & Link Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
