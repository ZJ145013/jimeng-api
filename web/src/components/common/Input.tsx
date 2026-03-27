import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full glass-input rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none transition-all duration-300 ${error ? 'border-red-500/50 focus:border-red-500/50' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
