import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'btn-neon text-white disabled:opacity-50',
    secondary: 'glass-card text-gray-200 hover:bg-white/10 focus:ring-2 focus:ring-purple-500/30',
    danger: 'bg-red-600/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30',
    ghost: 'bg-transparent hover:bg-white/5 text-gray-300 focus:ring-2 focus:ring-purple-500/20',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="loading-spinner w-4 h-4 mr-2" />
      )}
      {children}
    </button>
  );
}
