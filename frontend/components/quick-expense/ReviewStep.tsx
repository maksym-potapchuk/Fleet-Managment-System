'use client';

import { useMemo } from 'react';
import { QuickExpenseEntry } from '@/types/expense';
import {
  Fuel, Wrench, Package, Shield, Droplets, AlertTriangle, MoreHorizontal,
  Pencil, Trash2, Plus, Car,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  fuel: Fuel,
  wrench: Wrench,
  package: Package,
  shield: Shield,
  droplets: Droplets,
  'alert-triangle': AlertTriangle,
  'more-horizontal': MoreHorizontal,
};

const COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  '#F59E0B': { bg: 'bg-amber-50', text: 'text-amber-600' },
  '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '#8B5CF6': { bg: 'bg-purple-50', text: 'text-purple-600' },
  '#10B981': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '#06B6D4': { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  '#EF4444': { bg: 'bg-red-50', text: 'text-red-600' },
  '#64748B': { bg: 'bg-slate-100', text: 'text-slate-600' },
};

function getDetail(entry: QuickExpenseEntry, tExpenses: (key: string) => string): string {
  const parts: string[] = [];
  if (entry.category_code === 'FUEL') {
    if (entry.liters) parts.push(`${entry.liters}L`);
    if (entry.fuel_type) parts.push(tExpenses(`fuelTypes.${entry.fuel_type}`));
    if (entry.receipt) parts.push('+receipt');
  } else if (entry.category_code === 'WASHING' && entry.wash_type) {
    parts.push(tExpenses(`washTypes.${entry.wash_type}`));
  } else if (entry.category_code === 'FINES') {
    if (entry.violation_type) parts.push(entry.violation_type);
    if (entry.fine_number) parts.push(`#${entry.fine_number}`);
    if (entry.fine_date) parts.push(entry.fine_date);
  } else if (entry.category_code === 'INSPECTION') {
    const costs: string[] = [];
    if (entry.official_cost) costs.push(entry.official_cost);
    if (entry.additional_cost && parseFloat(entry.additional_cost) > 0) costs.push(`+${entry.additional_cost}`);
    if (costs.length) parts.push(costs.join(' '));
    if (entry.inspection_date) parts.push(entry.inspection_date);
  } else if (entry.category_code === 'SERVICE') {
    const count = entry.service_items?.filter(i => i.name.trim()).length || 0;
    if (count > 0) parts.push(`${count} items`);
    if (entry.invoice_files?.length) parts.push('+invoice');
  } else if (entry.category_code === 'PARTS') {
    const count = entry.parts?.filter(p => p.name.trim()).length || 0;
    if (count > 0) parts.push(`${count} parts`);
    if (entry.invoice_files?.length) parts.push('+invoice');
  }
  return parts.join(' · ');
}

interface ReviewStepProps {
  vehicleLabel: string;
  entries: QuickExpenseEntry[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onSubmit: () => void;
  onAddMore: () => void;
  tExpenses: (key: string) => string;
  t: (key: string) => string;
}

export function ReviewStep({
  vehicleLabel,
  entries,
  onEdit,
  onRemove,
  onSubmit,
  onAddMore,
  tExpenses,
  t,
}: ReviewStepProps) {
  const total = useMemo(
    () => entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
    [entries],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t('reviewStep.title')}</h2>

        {/* Vehicle card */}
        <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 flex-shrink-0">
            <Car className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-teal-500 uppercase tracking-wider">{t('reviewStep.vehicle')}</span>
            <div className="text-sm font-bold text-teal-800 truncate">{vehicleLabel}</div>
          </div>
        </div>

        {/* Entries count */}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t('reviewStep.entries').replace('__count__', String(entries.length))}
        </div>

        {/* Entry list */}
        <div className="space-y-2">
          {entries.map((entry, index) => {
            const Icon = ICON_MAP[entry.category_icon] || MoreHorizontal;
            const style = COLOR_STYLES[entry.category_color] || { bg: 'bg-slate-100', text: 'text-slate-600' };
            const detail = getDetail(entry, tExpenses);

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${style.bg}`}>
                  <Icon className={`h-4 w-4 ${style.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">{entry.category_name}</span>
                    <span className="text-sm font-bold text-slate-900">{parseFloat(entry.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {detail && <span className="text-xs text-slate-500">{detail}</span>}
                    <span className="text-xs text-slate-400">{entry.expense_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onEdit(index)}
                    className="p-2 text-slate-400 hover:text-teal-600 transition-colors rounded-lg hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRemove(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between p-4 bg-teal-600 rounded-2xl">
          <span className="text-sm font-medium text-teal-100">{t('reviewStep.total')}</span>
          <span className="text-xl font-bold text-white">{total.toFixed(2)} PLN</span>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="max-w-lg lg:max-w-2xl mx-auto flex flex-col-reverse sm:flex-row gap-3">
          <button
            onClick={onAddMore}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-xl font-medium transition hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {t('reviewStep.addMore')}
          </button>
          <button
            onClick={onSubmit}
            disabled={entries.length === 0}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white font-bold text-base shadow-lg shadow-teal-600/20 transition hover:shadow-xl hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('reviewStep.submitAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
