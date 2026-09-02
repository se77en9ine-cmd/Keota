import React from 'react';
import { Check, Minus } from 'lucide-react';

export interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onClick?: (e: React.MouseEvent<HTMLLabelElement>) => void;
  indeterminate?: boolean;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  onClick,
  indeterminate = false,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
  ariaLabel,
}) => {
  const sizeConfig = {
    sm: {
      box: 'w-4 h-4 rounded-md',
      icon: 'w-3 h-3',
      stroke: 3,
      text: 'text-xs',
    },
    md: {
      box: 'w-5 h-5 rounded-lg',
      icon: 'w-3.5 h-3.5',
      stroke: 3,
      text: 'text-xs',
    },
    lg: {
      box: 'w-6 h-6 rounded-lg',
      icon: 'w-4 h-4',
      stroke: 3,
      text: 'text-sm',
    },
  }[size];

  const isChecked = checked || indeterminate;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer group'
      } ${className}`}
    >
      <div className="relative inline-flex items-center justify-center flex-shrink-0">
        {/* Hidden Accessible Checkbox */}
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel}
          className="sr-only"
        />

        {/* Visual Custom Box */}
        <div
          role="checkbox"
          aria-checked={indeterminate ? 'mixed' : checked}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          className={`${sizeConfig.box} flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
            isChecked
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white border border-emerald-500 shadow-sm shadow-emerald-500/30 ring-2 ring-emerald-500/20 scale-100'
              : 'border border-slate-300 dark:border-slate-600 bg-white/90 dark:bg-slate-800/90 shadow-2xs hover:border-emerald-500/80 hover:ring-2 hover:ring-emerald-500/20 group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-950/30'
          } ${!disabled && 'group-active:scale-95'}`}
        >
          {indeterminate ? (
            <Minus
              className={`${sizeConfig.icon} text-white animate-in zoom-in-75 duration-150`}
              strokeWidth={sizeConfig.stroke}
            />
          ) : isChecked ? (
            <Check
              className={`${sizeConfig.icon} text-white animate-in zoom-in-75 duration-150`}
              strokeWidth={sizeConfig.stroke}
            />
          ) : null}
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className={`font-bold text-slate-800 dark:text-slate-200 ${sizeConfig.text} ${
                disabled ? '' : 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{description}</span>
          )}
        </div>
      )}
    </label>
  );
};
export default CustomCheckbox;
