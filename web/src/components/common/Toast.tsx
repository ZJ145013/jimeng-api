import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastId;
    setMessages(prev => [...prev, { id, text, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {messages.map(msg => (
          <ToastItem key={msg.id} message={msg} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ message, onRemove }: { message: ToastMessage; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(message.id), 3000);
    return () => clearTimeout(timer);
  }, [message.id, onRemove]);

  const config = {
    success: {
      gradient: 'from-green-500 to-emerald-500',
      icon: 'M5 13l4 4L19 7',
      shadow: 'shadow-green-500/30',
    },
    error: {
      gradient: 'from-red-500 to-pink-500',
      icon: 'M6 18L18 6M6 6l12 12',
      shadow: 'shadow-red-500/30',
    },
    info: {
      gradient: 'from-purple-500 to-blue-500',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      shadow: 'shadow-purple-500/30',
    },
  }[message.type];

  return (
    <div className={`glass-card rounded-xl px-4 py-3 shadow-lg ${config.shadow} max-w-sm animate-slide-in flex items-center gap-3`}>
      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
        </svg>
      </div>
      <span className="text-sm text-gray-200">{message.text}</span>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
