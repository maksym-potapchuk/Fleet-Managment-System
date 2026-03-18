'use client';

import { createElement } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Expense } from '@/types/expense';
import { Pencil, Trash2, Eye, Receipt } from 'lucide-react';
import { getCategoryIcon, getCategoryStyle, getCategoryLabel, formatDate, formatAmount } from './expense-utils';

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onView?: (expense: Expense) => void;
  isLoading?: boolean;
  showVehicle?: boolean;
}

function SkeletonRow({ showVehicle }: { showVehicle: boolean }) {
  return (
    <tr className="animate-pulse">
      {showVehicle && <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>}
      <td className="px-5 py-4"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-slate-200" /><div className="h-5 w-20 bg-slate-200 rounded-md" /></div></td>
      <td className="px-5 py-4"><div className="h-4 w-20 bg-slate-200 rounded-md ml-auto" /></td>
      <td className="px-5 py-4"><div className="h-4 w-16 bg-slate-200 rounded-md" /></td>
      <td className="px-5 py-4"><div className="h-4 w-14 bg-slate-200 rounded-md" /></td>
      <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-200 rounded-md" /></td>
      <td className="px-5 py-4"><div className="flex justify-center gap-1"><div className="w-8 h-8 bg-slate-200 rounded-lg" /><div className="w-8 h-8 bg-slate-200 rounded-lg" /></div></td>
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-slate-200" /><div className="h-5 w-16 bg-slate-200 rounded-md" /></div>
        <div className="h-5 w-20 bg-slate-200 rounded-md" />
      </div>
      <div className="flex items-center gap-3 mb-2"><div className="h-4 w-24 bg-slate-200 rounded-md" /><div className="h-4 w-20 bg-slate-200 rounded-md" /></div>
      <div className="h-4 w-full bg-slate-200 rounded-md" />
    </div>
  );
}

export function ExpenseTable({ expenses, onEdit, onDelete, onView, isLoading = false, showVehicle = false }: ExpenseTableProps) {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  // Loading
  if (isLoading) {
    return (
      <>
        <div className="hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {showVehicle && <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.vehicle')}</th>}
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.category')}</th>
                <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.amount')}</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.paymentMethod')}</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.payerType')}</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.expenseDate')}</th>
                <th className="px-5 py-3.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} showVehicle={showVehicle} />)}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </>
    );
  }

  // Empty
  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Receipt className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-base font-semibold text-slate-700 mb-1">{t('noExpenses')}</p>
        <p className="text-sm text-slate-400">{t('noExpensesDesc')}</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile cards ── */}
      <div className="lg:hidden divide-y divide-slate-100">
        {expenses.map((expense) => {
          const style = getCategoryStyle(expense.category_color);
          return (
            <div
              key={expense.id}
              className={`px-4 py-3.5 hover:bg-slate-50/50 transition-colors ${onView ? 'cursor-pointer active:bg-slate-100' : ''}`}
              onClick={() => onView?.(expense)}
            >
              {/* Row 1: vehicle + amount */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  {showVehicle && (
                    <span className="text-sm font-mono font-bold text-slate-900 tracking-wide">{expense.vehicle_car_number}</span>
                  )}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${style.bg} ${style.text} truncate`}>
                    {getCategoryLabel(expense, t)}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                  {formatAmount(expense.amount)} <span className="text-slate-400 font-medium">PLN</span>
                </span>
              </div>

              {/* Row 2: vin + date + payment/payer */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap">
                {showVehicle && expense.vehicle_vin_number && (
                  <>
                    <span className="font-mono font-semibold text-slate-500 tracking-wider">{expense.vehicle_vin_number}</span>
                    <span className="text-slate-300">·</span>
                  </>
                )}
                <span>{formatDate(expense.expense_date, locale)}</span>
                <span className="text-slate-300">·</span>
                <span>{t(`paymentMethods.${expense.payment_method}`)}</span>
                <span className="text-slate-300">·</span>
                <span>{t(`payerTypes.${expense.payer_type}`)}</span>
                {expense.edited_by && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold" style={{ color: expense.edited_by.color || '#9097A0' }}>
                      {expense.edited_by.username}
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onEdit(expense)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2D8B7E] bg-[#2D8B7E]/5 hover:bg-[#2D8B7E]/10 rounded-lg transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  {tCommon('edit')}
                </button>
                <button
                  onClick={() => onDelete(expense)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {showVehicle && (
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.vehicle')}</th>
              )}
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.category')}</th>
              <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.amount')}</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.paymentMethod')}</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.payerType')}</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('fields.expenseDate')}</th>
              <th className="px-5 py-3.5 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const style = getCategoryStyle(expense.category_color);
              return (
                <tr
                  key={expense.id}
                  className={`group hover:bg-slate-50/60 transition-colors ${onView ? 'cursor-pointer' : ''}`}
                  onClick={() => onView?.(expense)}
                >
                  {showVehicle && (
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-mono font-semibold text-slate-800 tracking-wide">
                        {expense.vehicle_car_number}
                      </div>
                      {expense.vehicle_vin_number && (
                        <div className="text-xs font-mono font-semibold text-slate-500 tracking-widest mt-0.5">{expense.vehicle_vin_number}</div>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                        {createElement(getCategoryIcon(expense.category_icon), { className: `w-4 h-4 ${style.text}` })}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
                        {getCategoryLabel(expense, t)}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatAmount(expense.amount)}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">PLN</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-slate-600">{t(`paymentMethods.${expense.payment_method}`)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-slate-600">{t(`payerTypes.${expense.payer_type}`)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-600">{formatDate(expense.expense_date, locale)}</span>
                    {expense.edited_by && (
                      <div className="text-[10px] font-semibold mt-0.5" style={{ color: expense.edited_by.color || '#9097A0' }}>
                        {expense.edited_by.username}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onView && (
                        <button
                          onClick={() => onView(expense)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          title={t('detail.title')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(expense)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-[#2D8B7E]/10 hover:text-[#2D8B7E] transition-colors"
                        title={tCommon('edit')}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(expense)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title={tCommon('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
