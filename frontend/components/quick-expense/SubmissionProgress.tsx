'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { QuickExpenseEntry, QuickExpenseResult } from '@/types/expense';
import { CheckCircle2, XCircle, Loader2, RefreshCw, ArrowRight, PartyPopper } from 'lucide-react';

interface SubmissionProgressProps {
  entries: QuickExpenseEntry[];
  results: QuickExpenseResult[];
  isDone: boolean;
  onRetry: () => void;
  onDone: () => void;
  tExpenses: (key: string) => string;
  t: (key: string) => string;
}

export function SubmissionProgress({
  entries,
  results,
  isDone,
  onRetry,
  onDone,
  t,
}: SubmissionProgressProps) {
  const router = useRouter();

  const stats = useMemo(() => {
    const success = results.filter(r => r.status === 'success').length;
    const error = results.filter(r => r.status === 'error').length;
    const done = success + error;
    return { success, error, done, total: results.length };
  }, [results]);

  const allSuccess = isDone && stats.error === 0;
  const hasErrors = isDone && stats.error > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {/* Status icon */}
      <div className="mb-6">
        {!isDone && (
          <div className="relative">
            <Loader2 className="h-16 w-16 text-teal-500 animate-spin" />
          </div>
        )}
        {allSuccess && (
          <div className="animate-in zoom-in duration-300">
            <PartyPopper className="h-16 w-16 text-teal-500" />
          </div>
        )}
        {hasErrors && (
          <div className="animate-in zoom-in duration-300">
            <XCircle className="h-16 w-16 text-amber-500" />
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-slate-900 mb-1 text-center">
        {!isDone && t('submission.submitting')}
        {allSuccess && t('submission.success')}
        {hasErrors && t('submission.partialSuccess').replace('__success__', String(stats.success)).replace('__total__', String(stats.total))}
      </h2>

      {/* Progress text */}
      {!isDone && (
        <p className="text-sm text-slate-500 mb-6">
          {t('submission.progress').replace('__done__', String(stats.done)).replace('__total__', String(stats.total))}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-8">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Per-item status */}
      <div className="w-full max-w-sm space-y-2 mb-8">
        {entries.map((entry) => {
          const result = results.find(r => r.entryId === entry.id);
          const status = result?.status || 'pending';

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex-shrink-0">
                {status === 'pending' && <div className="h-5 w-5 rounded-full bg-slate-200" />}
                {status === 'submitting' && <Loader2 className="h-5 w-5 text-teal-500 animate-spin" />}
                {status === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {entry.category_name}
                </div>
                {status === 'error' && result?.error && (
                  <div className="text-xs text-red-500 truncate">{result.error}</div>
                )}
              </div>
              <span className="text-sm font-bold text-slate-700 flex-shrink-0">
                {parseFloat(entry.amount).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {isDone && (
        <div className="w-full max-w-sm space-y-3">
          {hasErrors && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-sm transition hover:bg-amber-100 active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" />
              {t('submission.retryFailed')}
            </button>
          )}
          <button
            onClick={() => router.push('/expenses')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowRight className="h-4 w-4" />
            {t('submission.goToExpenses')}
          </button>
          <button
            onClick={onDone}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white font-bold text-base shadow-lg shadow-teal-600/20 transition active:scale-[0.98]"
          >
            {t('submission.done')}
          </button>
        </div>
      )}
    </div>
  );
}
