import {
  Fuel, Wrench, Package, Shield,
  Droplets, AlertTriangle, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { Expense } from '@/types/expense';

export const ICON_MAP: Record<string, LucideIcon> = {
  fuel: Fuel,
  wrench: Wrench,
  package: Package,
  shield: Shield,
  droplets: Droplets,
  'alert-triangle': AlertTriangle,
  'more-horizontal': MoreHorizontal,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || MoreHorizontal;
}

export const COLOR_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  '#F59E0B': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '#8B5CF6': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  '#10B981': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  '#06B6D4': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  '#EF4444': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  '#64748B': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export function getCategoryStyle(color: string) {
  return COLOR_STYLES[color] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
}

export function getCategoryLabel(expense: Expense, t: (key: string) => string): string {
  if (expense.category_code) {
    return t(`types.${expense.category_code}`);
  }
  return expense.category_name;
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatAmount = (amount: string): string => {
  return parseFloat(amount).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
