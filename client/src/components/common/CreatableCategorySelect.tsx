import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, Tag } from 'lucide-react';

export interface CategoryOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface CreatableCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CategoryOption[];
  placeholder?: string;
  className?: string;
  error?: boolean;
  required?: boolean;
}

export const CreatableCategorySelect: React.FC<CreatableCategorySelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Type or select a category...',
  className = '',
  error = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes to local input
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter options based on typed input
  const filteredOptions = options.filter((opt) => {
    if (!inputValue.trim()) return true;
    const q = inputValue.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  });

  // Check if current input exactly matches an existing option (case-insensitive)
  const exactMatch = options.some(
    (opt) =>
      opt.value.toLowerCase() === inputValue.trim().toLowerCase() ||
      opt.label.toLowerCase() === inputValue.trim().toLowerCase()
  );

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOption = (opt: CategoryOption) => {
    setInputValue(opt.label);
    onChange(opt.value || opt.label);
    setIsOpen(false);
  };

  const handleSelectCustom = () => {
    onChange(inputValue.trim());
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      if (isOpen && filteredOptions.length === 1) {
        e.preventDefault();
        handleSelectOption(filteredOptions[0]);
      } else if (isOpen && !exactMatch && inputValue.trim()) {
        e.preventDefault();
        handleSelectCustom();
      }
    } else if (e.key === 'ArrowDown') {
      if (!isOpen) setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={`relative text-xs ${className}`}>
      {/* Input Box with Integrated Dropdown Trigger */}
      <div
        className={`w-full h-10 neu-input flex items-center justify-between px-3 rounded-2xl transition-all duration-150 ${
          isOpen ? 'ring-2 ring-emerald-500/40 border-emerald-500/50' : ''
        } ${error ? 'border-rose-500 ring-1 ring-rose-500/30' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            required={required}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform cursor-pointer"
          title="Toggle preset categories"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-emerald-500' : ''
            }`}
          />
        </button>
      </div>

      {/* Floating Suggestions & Presets Dropdown */}
      {isOpen && (
        <div className="absolute z-[90] top-[calc(100%+6px)] left-0 right-0 neu-card-lg shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200/60 dark:border-slate-800">
          <div className="p-1.5 max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
            {/* Custom Category Creation Item */}
            {inputValue.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleSelectCustom}
                className="w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">
                  Use custom category: <strong className="underline">"{inputValue.trim()}"</strong>
                </span>
              </button>
            )}

            {/* Matching Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  value.toLowerCase() === opt.value.toLowerCase() ||
                  value.toLowerCase() === opt.label.toLowerCase() ||
                  inputValue.toLowerCase().trim() === opt.label.toLowerCase();

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between text-left transition-all duration-100 cursor-pointer ${
                      isSelected
                        ? 'neu-sunken-sm text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30'
                        : 'text-slate-700 dark:text-slate-300 hover:neu-card-sm font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {opt.icon && (
                        <span className="text-slate-400 flex-shrink-0">{opt.icon}</span>
                      )}
                      <div className="truncate">
                        <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {opt.label}
                        </div>
                        {opt.subtitle && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            ) : !inputValue.trim() ? (
              <div className="p-3 text-center text-slate-400 text-xs font-medium">
                No categories available
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatableCategorySelect;
