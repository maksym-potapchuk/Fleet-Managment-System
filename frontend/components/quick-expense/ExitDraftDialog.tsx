'use client';

import { AlertTriangle, X, Save, LogOut, ArrowLeft, Clock } from 'lucide-react';

interface ExitDraftDialogProps {
  isOpen: boolean;
  onContinue: () => void;
  onExit: () => void;
  onSaveDraft: () => void;
  t: (key: string) => string;
}

export function ExitDraftDialog({ isOpen, onContinue, onExit, onSaveDraft, t }: ExitDraftDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onContinue} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <button
            onClick={onContinue}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
            {t('draft.exitTitle')}
          </h2>

          <p className="text-slate-600 text-center mb-4">
            {t('draft.exitMessage')}
          </p>

          <div className="flex items-center justify-center gap-1.5 mb-5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-xs text-slate-400">{t('draft.ttlNote')}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Save draft & exit */}
            <button
              onClick={onSaveDraft}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium text-white bg-gradient-to-r from-[#2D8B7E] to-[#246f65] transition hover:brightness-105 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              {t('draft.saveDraftAndExit')}
            </button>

            {/* Exit without saving */}
            <button
              onClick={onExit}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium text-red-600 border border-red-200 bg-red-50 transition hover:bg-red-100 active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              {t('draft.exitWithout')}
            </button>

            {/* Continue editing */}
            <button
              onClick={onContinue}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-medium text-slate-700 border border-slate-200 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('draft.continue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
