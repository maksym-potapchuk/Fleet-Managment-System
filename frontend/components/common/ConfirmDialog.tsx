'use client';

import { AlertTriangle, X } from 'lucide-react';

/**
 * Props for the ConfirmDialog component
 * A reusable confirmation dialog for dangerous actions
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Підтвердити',
  cancelLabel = 'Скасувати',
  onConfirm,
  onCancel,
  isLoading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // Color schemes for different variants
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with animation */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onCancel}
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all duration-300 scale-100">
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.icon}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
            {title}
          </h2>

          {/* Message */}
          <p className="text-slate-600 text-center mb-6">
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Cancel button */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="
                flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium
                transition-colors hover:bg-slate-50
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {cancelLabel}
            </button>

            {/* Confirm button */}
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`
                flex-1 px-4 py-2.5 text-white rounded-lg font-medium
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${styles.button}
              `}
            >
              {isLoading ? 'Обробка...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
