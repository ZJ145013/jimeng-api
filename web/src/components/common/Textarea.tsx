import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
        )}
        <textarea
          ref={ref}
          className={`w-full glass-input rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none transition-all duration-300 resize-none ${error ? 'border-red-500/50 focus:border-red-500/50' : ''} ${className}`}
          rows={4}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
