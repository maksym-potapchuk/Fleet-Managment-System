'use client';

import { createElement } from 'react';
import { useTranslations } from 'next-intl';
import { Expense } from '@/types/expense';
import { X, Pencil, ExternalLink, FileText, Paperclip } from 'lucide-react';
import { getCategoryIcon, getCategoryStyle, getCategoryLabel, formatDate, formatAmount } from './expense-utils';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

function ModalContent({ expense, onClose, onEdit }: { expense: Expense; onClose: () => void; onEdit?: (expense: Expense) => void }) {
  const t = useTranslations('expenses');
  const style = getCategoryStyle(expense.category_color);
  const code = expense.category_code;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0`}>
            {createElement(getCategoryIcon(expense.category_icon), { className: `w-5 h-5 ${style.text}` })}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{t('detail.title')}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
              {getCategoryLabel(expense, t)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              onClick={() => { onClose(); onEdit(expense); }}
              className="p-2 rounded-xl text-slate-400 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/10 transition-colors"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-gradient-to-r from-[#2D8B7E] to-[#246f65] rounded-xl p-4 mb-5">
        <p className="text-white/70 text-xs font-medium mb-1">{t('detail.amount')}</p>
        <p className="text-white text-2xl font-black tabular-nums">
          {formatAmount(expense.amount)} <span className="text-base font-semibold text-white/70">PLN</span>
        </p>
      </div>

      {/* Base info */}
      <div className="mb-5">
        <DetailRow label={t('detail.date')} value={formatDate(expense.expense_date)} />
        {expense.vehicle_car_number && (
          <DetailRow label={t('detail.vehicle')} value={
            <span className="font-mono font-semibold tracking-wide">{expense.vehicle_car_number}</span>
          } />
        )}
      </div>

      {/* Category-specific details */}
      {code && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('detail.categoryDetails')}</h3>

          {code === 'FUEL' && (
            <>
              <DetailRow label={t('detail.liters')} value={expense.liters ? `${expense.liters} L` : null} />
              <DetailRow label={t('detail.fuelType')} value={expense.fuel_type ? t(`fuelTypes.${expense.fuel_type}`) : null} />
            </>
          )}

          {code === 'SERVICE' && (
            <>
              {expense.service_name && (
                <DetailRow label={t('detail.serviceName')} value={expense.service_name} />
              )}
              {expense.service_items && expense.service_items.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-2">{t('detail.serviceItems')}</p>
                  <div className="space-y-1.5">
                    {expense.service_items.map((item, i) => (
                      <div key={item.id || i} className="flex justify-between items-center bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-700">{item.name}</span>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">{formatAmount(item.price)} PLN</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {code === 'WASHING' && (
            <DetailRow label={t('detail.washType')} value={expense.wash_type ? t(`washTypes.${expense.wash_type}`) : null} />
          )}

          {code === 'FINES' && (
            <>
              <DetailRow label={t('detail.violationType')} value={expense.violation_type || null} />
              <DetailRow label={t('detail.fineNumber')} value={expense.fine_number || null} />
              <DetailRow label={t('detail.fineDate')} value={expense.fine_date ? formatDate(expense.fine_date) : null} />
            </>
          )}

          {code === 'INSPECTION' && (
            <>
              <DetailRow label={t('detail.inspectionDate')} value={expense.inspection_date ? formatDate(expense.inspection_date) : null} />
              <DetailRow label={t('detail.officialCost')} value={expense.official_cost ? `${formatAmount(expense.official_cost)} PLN` : null} />
              <DetailRow label={t('detail.additionalCost')} value={expense.additional_cost && parseFloat(expense.additional_cost) > 0 ? `${formatAmount(expense.additional_cost)} PLN` : null} />
            </>
          )}

          {code === 'PARTS' && expense.parts && expense.parts.length > 0 && (
            <div className="mt-1">
              <p className="text-xs font-semibold text-slate-500 mb-2">{t('detail.parts')}</p>
              <div className="space-y-1.5">
                {expense.parts.map((part, i) => (
                  <div key={part.id || i} className="bg-slate-50 rounded-lg px-3 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-700">{part.name}</span>
                      <span className="text-sm font-bold text-slate-900 tabular-nums">
                        {formatAmount(String(parseFloat(part.unit_price) * part.quantity))} PLN
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {part.quantity} x {formatAmount(part.unit_price)} PLN
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attachments */}
      {(expense.receipt || (expense.invoices && expense.invoices.length > 0)) && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('detail.attachments')}</h3>
          <div className="space-y-1.5">
            {expense.receipt && (
              <a
                href={expense.receipt}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2.5 transition-colors group"
              >
                <Paperclip className="w-4 h-4 text-slate-400 group-hover:text-[#2D8B7E]" />
                <span className="text-sm text-slate-700 group-hover:text-[#2D8B7E]">{t('detail.receipt')}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </a>
            )}
            {expense.invoices?.map((invoice, i) => (
              <a
                key={invoice.id || i}
                href={invoice.file}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2.5 transition-colors group"
              >
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-[#2D8B7E]" />
                <span className="text-sm text-slate-700 group-hover:text-[#2D8B7E] truncate">
                  {invoice.name || t('detail.invoices')}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 ml-auto shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-slate-400 space-y-1 pt-3 border-t border-slate-100">
        <p>{t('detail.createdAt')}: {formatDate(expense.created_at)}</p>
        <p>{t('detail.updatedAt')}: {formatDate(expense.updated_at)}</p>
      </div>
    </>
  );
}

export function ExpenseDetailModal({ expense, onClose, onEdit }: ExpenseDetailModalProps) {
  if (!expense) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Mobile: bottom sheet */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
          <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1" />
          <div className="overflow-y-auto px-5 py-4 flex-1">
            <ModalContent expense={expense} onClose={onClose} onEdit={onEdit} />
          </div>
        </div>
      </div>

      {/* Desktop: centered modal */}
      <div className="hidden sm:flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <ModalContent expense={expense} onClose={onClose} onEdit={onEdit} />
        </div>
      </div>
    </div>
  );
}
