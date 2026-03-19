'use client';

import { QuickExpenseEntry } from '@/types/expense';
import {
  Fuel, Wrench, Package, Shield, Droplets, AlertTriangle, MoreHorizontal,
  FileText, ShoppingBag, CircleParking,
  Pencil, Trash2,
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
  'file-text': FileText,
  'shopping-bag': ShoppingBag,
  'circle-parking': CircleParking,
};

const COLOR_STYLES: Record<string, { bg: string; text: string }> = {
  '#F59E0B': { bg: 'bg-amber-50', text: 'text-amber-600' },
  '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '#8B5CF6': { bg: 'bg-purple-50', text: 'text-purple-600' },
  '#10B981': { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  '#06B6D4': { bg: 'bg-cyan-50', text: 'text-cyan-600' },
  '#EF4444': { bg: 'bg-red-50', text: 'text-red-600' },
  '#64748B': { bg: 'bg-slate-100', text: 'text-slate-600' },
  '#EC4899': { bg: 'bg-pink-50', text: 'text-pink-600' },
  '#6366F1': { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  '#14B8A6': { bg: 'bg-teal-50', text: 'text-teal-600' },
};

function getDetail(entry: QuickExpenseEntry, tExpenses: (key: string) => string): string {
  const parts: string[] = [];
  if (entry.category_code === 'FUEL') {
    const fuelCount = entry.fuel_entries?.length || 0;
    if (fuelCount > 1) parts.push(`${fuelCount}x`);
    if (entry.fuel_types?.length) {
      parts.push(entry.fuel_types.map(ft => tExpenses(`fuelTypes.${ft}`)).join(', '));
    }
    if (entry.receipt) parts.push('+receipt');
  } else if (entry.category_code === 'WASHING' && entry.wash_type) {
    parts.push(tExpenses(`washTypes.${entry.wash_type}`));
  } else if (entry.category_code === 'FINES') {
    if (entry.violation_type) parts.push(entry.violation_type);
    if (entry.fine_number) parts.push(`#${entry.fine_number}`);
  } else if (entry.category_code === 'INSPECTION') {
    if (entry.official_cost) parts.push(`${entry.official_cost} PLN`);
    if (entry.additional_cost && parseFloat(entry.additional_cost) > 0) parts.push(`+${entry.additional_cost}`);
  } else if (entry.category_code === 'SERVICE') {
    const count = entry.service_items?.filter(i => i.name.trim()).length || 0;
    if (count > 0) parts.push(`${count} items`);
    if (entry.invoice_number || entry.invoice_file) parts.push('+invoice');
  } else if (entry.category_code === 'PARTS') {
    if (entry.source_name) parts.push(entry.source_name);
    const count = entry.parts?.filter(p => p.name.trim()).length || 0;
    if (count > 0) parts.push(`${count} parts`);
    if (entry.invoice_number || entry.invoice_file) parts.push('+invoice');
  }
  return parts.join(' · ');
}

interface ExpenseEntryListProps {
  entries: QuickExpenseEntry[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  tExpenses: (key: string) => string;
}

export function ExpenseEntryList({ entries, onEdit, onRemove, tExpenses }: ExpenseEntryListProps) {
  const total = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {entries.length} {entries.length === 1 ? 'item' : 'items'}
        </span>
        <span className="text-sm font-bold text-slate-700">
          {total.toFixed(2)} PLN
        </span>
      </div>

      {entries.map((entry, index) => {
        const Icon = ICON_MAP[entry.category_icon] || MoreHorizontal;
        const style = COLOR_STYLES[entry.category_color] || { bg: 'bg-slate-100', text: 'text-slate-600' };
        const detail = getDetail(entry, tExpenses);

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${style.bg}`}>
              <Icon className={`h-4 w-4 ${style.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">{entry.category_name}</span>
                <span className="text-sm font-bold text-slate-900">{parseFloat(entry.amount).toFixed(2)}</span>
              </div>
              {detail && (
                <span className="text-xs text-slate-500">{detail}</span>
              )}
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
  );
}
