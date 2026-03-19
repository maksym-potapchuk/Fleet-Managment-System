'use client';

import { ExpenseCategory } from '@/types/expense';
import {
  Fuel, Wrench, Package, Shield, Droplets, AlertTriangle, MoreHorizontal,
  FileText, ShoppingBag, CircleParking,
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

const QUICK_CATEGORY_ORDER: Record<string, number> = {
  FUEL: 1,
  DOCUMENTS: 2,
  OTHER: 3,
  PARTS: 4,
  WASHING: 5,
  INSPECTION: 6,
  ACCESSORIES: 7,
  FINES: 8,
  SERVICE: 9,
  PARKING: 10,
};

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; activeBorder: string }> = {
  '#F59E0B': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', activeBorder: 'border-amber-500' },
  '#3B82F6': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', activeBorder: 'border-blue-500' },
  '#8B5CF6': { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', activeBorder: 'border-purple-500' },
  '#10B981': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', activeBorder: 'border-emerald-500' },
  '#06B6D4': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', activeBorder: 'border-cyan-500' },
  '#EF4444': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', activeBorder: 'border-red-500' },
  '#64748B': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', activeBorder: 'border-slate-500' },
  '#EC4899': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', activeBorder: 'border-pink-500' },
  '#6366F1': { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', activeBorder: 'border-indigo-500' },
  '#14B8A6': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', activeBorder: 'border-teal-500' },
};

function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || MoreHorizontal;
}

function getStyle(color: string) {
  return COLOR_STYLES[color] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', activeBorder: 'border-slate-500' };
}

interface CategoryGridProps {
  categories: ExpenseCategory[];
  activeCategoryId?: string | null;
  onSelect: (categoryId: string) => void;
  tExpenses: (key: string) => string;
}

export function CategoryGrid({ categories, activeCategoryId, onSelect, tExpenses }: CategoryGridProps) {
  const sorted = [...categories].sort((a, b) => {
    const orderA = a.code ? (QUICK_CATEGORY_ORDER[a.code] ?? 99) : 99;
    const orderB = b.code ? (QUICK_CATEGORY_ORDER[b.code] ?? 99) : 99;
    return orderA - orderB;
  });

  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-slate-500 mb-3">
        {tExpenses('fields.category')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-2">
        {sorted.map((cat) => {
          const Icon = getIcon(cat.icon);
          const style = getStyle(cat.color);
          const label = cat.code ? tExpenses(`types.${cat.code}`) : cat.name;
          const isActive = activeCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`
                group flex flex-col items-center justify-center gap-2 sm:gap-2.5 lg:gap-1.5
                p-3 sm:p-4 lg:p-3 rounded-2xl lg:rounded-xl border-2 select-none
                transition-all duration-150
                ${isActive ? `${style.bg} ${style.activeBorder} shadow-md ring-1 ring-black/5` : `${style.bg} ${style.border}`}
                hover:shadow-lg hover:-translate-y-0.5 hover:border-opacity-80
                active:scale-[0.97] active:shadow-sm active:translate-y-0
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 focus-visible:ring-offset-2
                min-h-[88px] sm:min-h-[100px] lg:min-h-[72px]
              `}
            >
              <div className={`flex h-10 w-10 sm:h-11 sm:w-11 lg:h-9 lg:w-9 items-center justify-center rounded-xl lg:rounded-lg ${style.bg} transition-transform duration-150 group-hover:scale-110`}>
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 lg:h-4.5 lg:w-4.5 ${style.text}`} />
              </div>
              <span className={`text-[11px] sm:text-xs font-bold text-center leading-tight ${style.text}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
