'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { TechnicalInspection } from '@/types/vehicle';
import {
  X,
  ShieldCheck,
  Calendar,
  FileText,
  Receipt,
  CreditCard,
  Banknote,
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';

interface InspectionDetailModalProps {
  inspection: TechnicalInspection | null;
  isLatest?: boolean;
  onClose: () => void;
  onUpdate: (
    inspectionId: number,
    data: { inspection_date?: string; next_inspection_date?: string; notes?: string; report?: File },
  ) => Promise<void>;
  onDelete: (inspectionId: number) => Promise<void>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

function FileLink({ href, icon: Icon, label }: { href: string; icon: typeof FileText; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-[#2D8B7E] hover:text-[#248B7B] transition-all"
    >
      <Icon className="w-4 h-4" />
      {label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  );
}

export default function InspectionDetailModal({
  inspection,
  isLatest = false,
  onClose,
  onUpdate,
  onDelete,
}: InspectionDetailModalProps) {
  const t = useTranslations('vehicleWorkspace.inspection');
  const td = useTranslations('vehicleWorkspace.inspection.detail');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editNextDate, setEditNextDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset edit state when inspection changes
  useEffect(() => {
    if (inspection) {
      setEditing(false);
      setEditDate(inspection.inspection_date);
      setEditNextDate(inspection.next_inspection_date || inspection.expiry_date);
      setEditNotes(inspection.notes || '');
      setEditFile(null);
    }
  }, [inspection]);

  // Auto-compute next date when editDate changes
  useEffect(() => {
    if (editing && editDate) {
      const d = new Date(editDate);
      d.setFullYear(d.getFullYear() + 1);
      setEditNextDate(d.toISOString().split('T')[0]);
    }
  }, [editDate, editing]);

  if (!inspection) return null;

  const daysLeft = Math.round(
    (new Date(inspection.next_inspection_date || inspection.expiry_date).getTime() - Date.now()) / 86400000
  );
  const isExpired = daysLeft < 0;
  const expense = inspection.linked_expense;

  const statusColor = isLatest
    ? (isExpired
        ? 'bg-red-100 text-red-600'
        : daysLeft <= 30
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-600')
    : 'bg-slate-100 text-slate-500';

  const badgeColor = isLatest
    ? (isExpired
        ? 'bg-red-100 text-red-600'
        : daysLeft <= 30
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700')
    : 'bg-slate-100 text-slate-500';

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();
  const formatAmount = (val: string) =>
    Number(val).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch: { inspection_date?: string; next_inspection_date?: string; notes?: string; report?: File } = {};
      if (editDate !== inspection.inspection_date) patch.inspection_date = editDate;
      const origNext = inspection.next_inspection_date || inspection.expiry_date;
      if (editNextDate && editNextDate !== origNext) patch.next_inspection_date = editNextDate;
      if (editNotes !== (inspection.notes || '')) patch.notes = editNotes;
      if (editFile) patch.report = editFile;
      await onUpdate(inspection.id, patch);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    try {
      await onDelete(inspection.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? td('editTitle') : td('detailTitle')}
                </h2>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${badgeColor}`}>
                  {isExpired
                    ? t('overdue', { days: Math.abs(daysLeft) })
                    : t('daysLeft', { days: daysLeft })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/10 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {!editing && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => { if (editing) setEditing(false); else onClose(); }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {editing ? (
            /* ── Edit Mode ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('inspectionDate')}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    {t('nextInspectionDate')}
                  </label>
                  <input
                    type="date"
                    value={editNextDate}
                    onChange={e => setEditNextDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t('report')}
                </label>
                {inspection.report && !editFile && (
                  <div className="flex items-center gap-2 mb-2">
                    <FileLink href={inspection.report} icon={FileText} label={t('downloadReport')} />
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors w-full text-left"
                >
                  <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {editFile ? editFile.name : (inspection.report ? td('changeReport') : t('noReport'))}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="hidden"
                  onChange={e => { setEditFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  {t('notes')}
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!editDate || saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#2D8B7E]/20 hover:shadow-xl disabled:opacity-50 transition-all"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {t('save')}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditDate(inspection.inspection_date);
                    setEditNextDate(inspection.next_inspection_date || inspection.expiry_date);
                    setEditNotes(inspection.notes || '');
                    setEditFile(null);
                  }}
                  className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            /* ── View Mode ── */
            <>
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium">{t('inspectionDate')}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-800">{formatDate(inspection.inspection_date)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium">{t('validUntil')}</p>
                  </div>
                  <p className={`text-sm font-bold ${isLatest && isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatDate(inspection.next_inspection_date || inspection.expiry_date)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {inspection.notes && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('notes')}</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{inspection.notes}</p>
                </div>
              )}

              {/* Report file */}
              {inspection.report && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('report')}</p>
                  <FileLink href={inspection.report} icon={FileText} label={t('downloadReport')} />
                </div>
              )}

              {/* ── Linked Expense Section ── */}
              {expense ? (
                <div className="border-t border-slate-200 pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{td('expenseSection')}</h3>
                  </div>

                  {/* Amount card */}
                  <div className="bg-gradient-to-r from-[#2D8B7E] to-[#246f65] rounded-xl p-4 mb-4">
                    <p className="text-white/70 text-xs font-medium mb-1">{td('totalAmount')}</p>
                    <p className="text-white text-2xl font-black tabular-nums">
                      {formatAmount(expense.amount)} <span className="text-base font-semibold text-white/70">PLN</span>
                    </p>
                  </div>

                  <div className="space-y-0">
                    <DetailRow label={td('officialCost')} value={`${formatAmount(expense.official_cost)} PLN`} />
                    {Number(expense.additional_cost) > 0 && (
                      <DetailRow label={td('additionalCost')} value={`${formatAmount(expense.additional_cost)} PLN`} />
                    )}
                    <DetailRow
                      label={td('paymentMethod')}
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          {expense.payment_method === 'CASH'
                            ? <><Banknote className="w-3.5 h-3.5 text-emerald-500" />{td('cash')}</>
                            : <><CreditCard className="w-3.5 h-3.5 text-blue-500" />{td('cashless')}</>}
                        </span>
                      }
                    />
                    <DetailRow label={td('expenseDate')} value={formatDate(expense.expense_date)} />
                    {expense.invoice_number && (
                      <DetailRow label={td('invoice')} value={expense.invoice_number} />
                    )}
                  </div>

                  {/* File links */}
                  {(expense.invoice_file || expense.receipt || expense.registration_certificate) && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {expense.invoice_file && (
                        <FileLink href={expense.invoice_file} icon={FileText} label={td('downloadInvoice')} />
                      )}
                      {expense.receipt && (
                        <FileLink href={expense.receipt} icon={Receipt} label={td('downloadReceipt')} />
                      )}
                      {expense.registration_certificate && (
                        <FileLink href={expense.registration_certificate} icon={FileText} label={td('downloadCertificate')} />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-sm text-slate-400 text-center py-3">{td('noExpense')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
