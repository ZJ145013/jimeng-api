import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 现代流行的 TailwindCSS className 合并工具
 * 用于组件层面优雅地合并默认样式与外界传入的覆盖样式
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
