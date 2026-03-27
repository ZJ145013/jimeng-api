import { SelectHTMLAttributes } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
}

export function Select({ label, options, value, onChange, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      )}
      <div className="relative">
        <select
          className={`w-full glass-input rounded-xl px-4 py-3 text-gray-100 focus:outline-none transition-all duration-300 appearance-none cursor-pointer pr-10 ${className}`}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">{opt.label}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
