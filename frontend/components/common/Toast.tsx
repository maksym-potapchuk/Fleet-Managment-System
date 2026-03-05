'use client';

import { useEffect, useState } from 'react';
import { Check, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const ICONS = { success: Check, error: AlertCircle, info: Info };
const STYLES = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
const ICON_STYLES = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const Icon = ICONS[toast.type];

  return (
    <div
      className={`
        flex items-center gap-2.5 px-4 py-3 border rounded-xl shadow-lg
        transition-all duration-200
        ${STYLES[toast.type]}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${ICON_STYLES[toast.type]}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 200); }}
        className="p-0.5 rounded hover:bg-black/5 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
