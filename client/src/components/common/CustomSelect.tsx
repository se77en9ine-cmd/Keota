import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  placement?: 'auto' | 'up' | 'down';
  dropdownWidth?: string;
  name?: string;
  id?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchable,
  disabled = false,
  className = '',
  error = false,
  size = 'md',
  align = 'left',
  placement = 'auto',
  dropdownWidth,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placementY, setPlacementY] = useState<'down' | 'up'>(placement === 'up' ? 'up' : 'down');
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Auto-flip when near bottom of viewport if placement === 'auto'
  useEffect(() => {
    if (placement === 'up') {
      setPlacementY('up');
      return;
    }
    if (placement === 'down') {
      setPlacementY('down');
      return;
    }
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        setPlacementY('up');
      } else {
        setPlacementY('down');
      }
    }
  }, [isOpen, placement]);

  // Determine if search should be enabled automatically for long lists
  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 8;

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  // Handle outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
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

  // Focus search input on open
  useEffect(() => {
    if (isOpen && isSearchEnabled && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, isSearchEnabled]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Size styling classes
  const sizeClasses = {
    sm: 'h-8 px-2.5 rounded-xl text-xs font-bold gap-1.5',
    md: 'h-9 px-3 rounded-xl text-xs font-semibold gap-2',
    lg: 'h-10 px-3.5 rounded-2xl text-sm font-semibold gap-2.5',
  }[size];

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative select-none text-xs ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full ${sizeClasses} neu-btn flex items-center justify-between transition-all duration-150 text-left cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed shadow-none'
            : isOpen
            ? 'neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-extrabold border-emerald-500/30'
            : error
            ? 'border-rose-500 text-rose-600 dark:text-rose-400'
            : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate pr-1">
          {selectedOption?.icon && (
            <span className="flex-shrink-0 text-slate-400">
              {selectedOption.icon}
            </span>
          )}
          {selectedOption ? (
            <span className="truncate text-slate-900 dark:text-white font-bold">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-500' : ''
          }`}
        />
      </button>

      {/* Floating Neumorphic Dropdown Menu with Auto-Flip */}
      {isOpen && (
        <div
          className={`absolute z-[80] neu-card-lg shadow-neu-raised-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            dropdownWidth ? dropdownWidth : 'min-w-[140px] w-full'
          } ${align === 'right' ? 'right-0' : 'left-0'} ${
            placementY === 'up'
              ? 'bottom-[calc(100%+6px)] origin-bottom'
              : 'top-[calc(100%+6px)] origin-top'
          }`}
        >
          {/* Search Filter Header */}
          {isSearchEnabled && (
            <div className="p-2 border-b border-black/5 dark:border-white/5 neu-surface">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-7 pl-7 pr-3 neu-input text-xs font-medium focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-400 font-medium text-[11px]">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-all duration-100 text-xs cursor-pointer ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-black border border-emerald-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:neu-card-sm font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {option.icon && (
                        <span className="flex-shrink-0 text-slate-400">
                          {option.icon}
                        </span>
                      )}
                      <div className="truncate">
                        <div className="truncate">{option.label}</div>
                        {option.subtitle && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {option.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
