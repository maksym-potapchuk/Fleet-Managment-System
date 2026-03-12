'use client';

import { createElement } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Expense, ApprovalStatus } from '@/types/expense';
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

const APPROVAL_BADGE_STYLES: Record<ApprovalStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
};

function ModalContent({ expense, onClose, onEdit }: { expense: Expense; onClose: () => void; onEdit?: (expense: Expense) => void }) {
  const t = useTranslations('expenses');
  const locale = useLocale();
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
        <DetailRow label={t('detail.date')} value={formatDate(expense.expense_date, locale)} />
        {expense.vehicle_car_number && (
          <DetailRow label={t('detail.vehicle')} value={
            <span className="font-mono font-semibold tracking-wide">{expense.vehicle_car_number}</span>
          } />
        )}
        <DetailRow label={t('fields.paymentMethod')} value={t(`paymentMethods.${expense.payment_method}`)} />
        <DetailRow label={t('fields.payerType')} value={t(`payerTypes.${expense.payer_type}`)} />
        {expense.payer_type === 'CLIENT' && (
          <>
            {expense.client_driver_name && (
              <DetailRow label={t('fields.clientDriver')} value={expense.client_driver_name} />
            )}
            {expense.company_amount && (
              <DetailRow label={t('fields.companyAmount')} value={`${formatAmount(expense.company_amount)} PLN`} />
            )}
            {expense.client_amount && (
              <DetailRow label={t('fields.clientAmount')} value={`${formatAmount(expense.client_amount)} PLN`} />
            )}
            {expense.approval_status && (
              <DetailRow label={t('fields.approvalStatus')} value={
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${APPROVAL_BADGE_STYLES[expense.approval_status]}`}>
                  {t(`approvalStatuses.${expense.approval_status}`)}
                </span>
              } />
            )}
          </>
        )}
        {expense.expense_for && (
          <DetailRow label={t('detail.description')} value={expense.expense_for} />
        )}
      </div>

      {/* Category-specific details */}
      {code && (
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('detail.categoryDetails')}</h3>

          {code === 'FUEL' && expense.fuel_types?.length > 0 && (
            <DetailRow
              label={t('detail.fuelType')}
              value={expense.fuel_types.map(ft => t(`fuelTypes.${ft}`)).join(', ')}
            />
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
              <DetailRow label={t('detail.fineDate')} value={expense.fine_date ? formatDate(expense.fine_date, locale) : null} />
            </>
          )}

          {code === 'INSPECTION' && (
            <>
              <DetailRow label={t('detail.inspectionDate')} value={expense.inspection_date ? formatDate(expense.inspection_date, locale) : null} />
              <DetailRow label={t('detail.officialCost')} value={expense.official_cost ? `${formatAmount(expense.official_cost)} PLN` : null} />
              <DetailRow label={t('detail.additionalCost')} value={expense.additional_cost && parseFloat(expense.additional_cost) > 0 ? `${formatAmount(expense.additional_cost)} PLN` : null} />
            </>
          )}

          {(code === 'PARTS' || code === 'ACCESSORIES' || code === 'DOCUMENTS') && (
            <>
              <DetailRow label={t('detail.sourceName')} value={expense.source_name || null} />
              <DetailRow label={t('detail.supplierType')} value={expense.supplier_type ? t(`supplierTypes.${expense.supplier_type}`) : null} />
              {expense.parts && expense.parts.length > 0 && (
                <div className="mt-3">
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
            </>
          )}
        </div>
      )}

      {/* Attachments */}
      {(expense.receipt || expense.invoice_data) && (
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
            {expense.invoice_data && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2D8B7E]" />
                  <span className="text-sm font-semibold text-slate-800">{expense.invoice_data.number}</span>
                </div>
                {expense.invoice_data.vendor_name && (
                  <p className="text-xs text-slate-500">{t('invoice.vendor')}: {expense.invoice_data.vendor_name}</p>
                )}
                {expense.invoice_data.invoice_date && (
                  <p className="text-xs text-slate-500">{t('invoice.date')}: {formatDate(expense.invoice_data.invoice_date, locale)}</p>
                )}
                {expense.invoice_data.total_amount && (
                  <p className="text-xs text-slate-500">{t('invoice.total')}: {formatAmount(expense.invoice_data.total_amount)} PLN</p>
                )}
                {expense.invoice_data.expense_count > 1 && (
                  <p className="text-xs text-teal-600 font-medium">{expense.invoice_data.expense_count} {t('invoice.linkedExpenses')}</p>
                )}
                <a
                  href={expense.invoice_data.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#2D8B7E] hover:text-[#246f65] font-medium mt-1"
                >
                  {t('invoice.viewFile')} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="text-xs text-slate-400 space-y-1 pt-3 border-t border-slate-100">
        {expense.created_by && (
          <p>{t('detail.createdBy')}: <span className="text-slate-600 font-medium">{expense.created_by.username}</span></p>
        )}
        <p>{t('detail.createdAt')}: {formatDate(expense.created_at, locale)}</p>
        <p>{t('detail.updatedAt')}: {formatDate(expense.updated_at, locale)}</p>
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
