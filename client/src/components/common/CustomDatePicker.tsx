import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  presets?: boolean | 'finance' | 'future';
  minDate?: string;
  maxDate?: string;
}

const getLocalizedWeekDays = (lng: string) => {
  const norm = (lng || 'en').toLowerCase();
  if (norm.startsWith('la')) return ['ຈັນ', 'ອັງ', 'ພຸດ', 'ພະ', 'ສຸກ', 'ເສົາ', 'ອາ'];
  if (norm.startsWith('th')) return ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  if (norm.startsWith('zh')) return ['一', '二', '三', '四', '五', '六', '日'];
  if (norm.startsWith('jp')) return ['月', '火', '水', '木', '金', '土', '日'];
  return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
};

const getLocalizedMonthName = (monthIndex: number, lng: string) => {
  const norm = (lng || 'en').toLowerCase();
  const laoMonths = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ'];
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const zhMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const jpMonths = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (norm.startsWith('la')) return laoMonths[monthIndex] || enMonths[monthIndex];
  if (norm.startsWith('th')) return thaiMonths[monthIndex] || enMonths[monthIndex];
  if (norm.startsWith('zh')) return zhMonths[monthIndex] || enMonths[monthIndex];
  if (norm.startsWith('jp')) return jpMonths[monthIndex] || enMonths[monthIndex];
  return enMonths[monthIndex];
};

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  className = '',
  presets = true,
  minDate,
  maxDate,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [placementY, setPlacementY] = useState<'down' | 'up'>('down');
  const [placementX, setPlacementX] = useState<'left' | 'right'>('left');

  // Parse initial view date
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const [y, m, d] = dStr.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const initialDate = parseDate(value);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  // Update view month/year when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Calculate smart boundary positioning on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 380;
      const popoverWidth = 320;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        setPlacementY('up');
      } else {
        setPlacementY('down');
      }

      const spaceRight = window.innerWidth - rect.left;
      if (spaceRight < popoverWidth + 20) {
        setPlacementX('right');
      } else {
        setPlacementX('left');
      }
    }
  }, [isOpen]);

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Format date for display
  const formatDisplay = (dStr: string) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-').map(Number);
    if (!y || !m || !d) return dStr;
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsLa = ['ມ.ຄ.', 'ກ.ພ.', 'ມີ.ນາ', 'ເມ.ສາ', 'ພ.ພາ', 'ມິ.ຖຸ', 'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.'];
    const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    let monthStr = monthsEn[m - 1];
    if (currentLang.toLowerCase().startsWith('la')) monthStr = monthsLa[m - 1];
    else if (currentLang.toLowerCase().startsWith('th')) monthStr = monthsTh[m - 1];

    return `${d.toString().padStart(2, '0')} ${monthStr} ${y}`;
  };

  // Month navigation
  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const jumpToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const formatted = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Generate calendar days for current viewMonth
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 = Monday
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const calendarCells = useMemo(() => {
    const cells = [];
    // Trailing days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        month: viewMonth === 0 ? 11 : viewMonth - 1,
        year: viewMonth === 0 ? viewYear - 1 : viewYear,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
      });
    }

    // Leading days from next month to complete 42 cells grid (6 rows)
    const remainingCells = 42 - cells.length;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        day: i,
        month: viewMonth === 11 ? 0 : viewMonth + 1,
        year: viewMonth === 11 ? viewYear + 1 : viewYear,
        isCurrentMonth: false,
      });
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth, firstDay, prevMonthDays]);

  const today = new Date();
  const isDaySelected = (y: number, m: number, d: number) => {
    const formatted = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    return formatted === value;
  };

  const isDayToday = (y: number, m: number, d: number) => {
    return y === today.getFullYear() && m === today.getMonth() && d === today.getDate();
  };

  const handleSelectDay = (y: number, m: number, d: number) => {
    const formatted = `${y}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
  };

  // Presets Handlers
  const handleApplyOffset = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const formatted = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyStartOfMonth = () => {
    const d = new Date();
    d.setDate(1);
    const formatted = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleApplyPresetYears = (yearsToAdd: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + yearsToAdd);
    const formatted = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const weekDayLabels = getLocalizedWeekDays(currentLang);
  const currentMonthName = getLocalizedMonthName(viewMonth, currentLang);

  // Labels for preset buttons
  const isLao = currentLang.toLowerCase().startsWith('la');
  const isThai = currentLang.toLowerCase().startsWith('th');

  const presetLabels = {
    today: isLao ? 'ມື້ນີ້' : isThai ? 'วันนี้' : 'Today',
    yesterday: isLao ? 'ມື້ວານ' : isThai ? 'เมื่อวาน' : 'Yesterday',
    minus7: isLao ? '-7 ມື້' : isThai ? '-7 วัน' : '-7 Days',
    monthStart: isLao ? 'ຕົ້ນເດືອນ' : isThai ? 'ต้นเดือน' : 'Month Start',
    clear: isLao ? 'ລ້າງ' : isThai ? 'ล้าง' : 'Clear',
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full select-none text-xs ${className}`}>
      {/* Trigger Input Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-10 px-3.5 rounded-xl border flex items-center justify-between transition-all duration-150 font-medium ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            : isOpen
            ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm text-emerald-700 dark:text-emerald-400 font-extrabold'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm text-slate-800 dark:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <CalendarIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          {value ? (
            <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
              {formatDisplay(value)}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        {value && !disabled ? (
          <div
            onClick={handleClear}
            className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </div>
        ) : null}
      </button>

      {/* Floating Solid Premium Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute z-[100] w-[20rem] p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-950/25 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150 ${
            placementY === 'up'
              ? 'bottom-[calc(100%+8px)] origin-bottom'
              : 'top-[calc(100%+8px)] origin-top'
          } ${placementX === 'right' ? 'right-0' : 'left-0'}`}
        >
          {/* Header: Month / Year Title & Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {currentMonthName}
              </span>
              <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={jumpToToday}
                title={presetLabels.today}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </button>
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Column Headers */}
          <div className="grid grid-cols-7 gap-1 pt-2.5 pb-1 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {weekDayLabels.map((wd, i) => (
              <div key={i} className={i >= 5 ? 'text-amber-500/80 font-bold' : ''}>
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              const isSelected = isDaySelected(cell.year, cell.month, cell.day);
              const isToday = isDayToday(cell.year, cell.month, cell.day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cell.year, cell.month, cell.day)}
                  className={`h-8 w-full rounded-xl flex items-center justify-center text-xs font-mono transition-all active:scale-90 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black shadow-md shadow-emerald-500/30 scale-105 ring-1 ring-emerald-500'
                      : isToday
                      ? 'border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black bg-emerald-500/10'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Contextual Quick Presets Bar */}
          {presets && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px] font-bold">
              {presets === 'future' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetYears(0)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetYears(1)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +1 Yr
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetYears(2)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +2 Yrs
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleApplyOffset(0)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500/15 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {presetLabels.today}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyOffset(-1)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500/15 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {presetLabels.yesterday}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyOffset(-7)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500/15 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {presetLabels.minus7}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyStartOfMonth}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500/15 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {presetLabels.monthStart}
                  </button>
                </>
              )}

              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2 py-1 rounded-lg text-rose-500 hover:bg-rose-500/10 font-bold transition-colors ml-auto flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{presetLabels.clear}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
