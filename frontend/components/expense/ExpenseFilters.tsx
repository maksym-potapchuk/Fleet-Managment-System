'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ExpenseFilters as ExpenseFiltersType, ExpenseCategory } from '@/types/expense';
import { Vehicle } from '@/types/vehicle';
import { X, ChevronDown, Search } from 'lucide-react';

interface ExpenseFiltersProps {
  filters: ExpenseFiltersType;
  onChange: (filters: ExpenseFiltersType) => void;
  showVehicleFilter?: boolean;
  showSearch?: boolean;
  vehicles?: Vehicle[];
  categories: ExpenseCategory[];
}

const selectClass = 'w-full appearance-none pl-2.5 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] transition-all cursor-pointer';
const dateClass = 'px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] transition-all';

export function ExpenseFilters({ filters, onChange, showVehicleFilter = false, showSearch = true, vehicles, categories }: ExpenseFiltersProps) {
  const t = useTranslations('expenses');
  const [searchLocal, setSearchLocal] = useState(filters.search || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!filters.search && searchLocal) setSearchLocal('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchLocal(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value || undefined });
    }, 400);
  };

  const hasActiveFilters = filters.category_code || filters.vehicle || filters.date_from || filters.date_to || filters.payment_method || filters.payer_type || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      {showSearch && (
        <div className="relative w-full sm:w-auto sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchLocal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] transition-all"
          />
        </div>
      )}

      {/* Category */}
      <div className="relative">
        <select
          value={filters.category_code || ''}
          onChange={(e) => onChange({ ...filters, category_code: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t('filters.allTypes')}</option>
          {(categories ?? []).map(cat => (
            <option key={cat.id} value={cat.code || cat.id}>
              {cat.code ? t(`types.${cat.code}`) : cat.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Vehicle */}
      {showVehicleFilter && vehicles && (
        <div className="relative">
          <select
            value={filters.vehicle || ''}
            onChange={(e) => onChange({ ...filters, vehicle: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">{t('filters.allVehicles')}</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.car_number || '—'} · {v.manufacturer} {v.model}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
      )}

      {/* Payment method */}
      <div className="relative">
        <select
          value={filters.payment_method || ''}
          onChange={(e) => onChange({ ...filters, payment_method: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t('filters.allPaymentMethods')}</option>
          <option value="CASH">{t('paymentMethods.CASH')}</option>
          <option value="CASHLESS">{t('paymentMethods.CASHLESS')}</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Payer type */}
      <div className="relative">
        <select
          value={filters.payer_type || ''}
          onChange={(e) => onChange({ ...filters, payer_type: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t('filters.allPayerTypes')}</option>
          <option value="COMPANY">{t('payerTypes.COMPANY')}</option>
          <option value="CLIENT">{t('payerTypes.CLIENT')}</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>

      {/* Date from */}
      <input
        type="date"
        value={filters.date_from || ''}
        onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
        className={dateClass}
      />

      {/* Date to */}
      <input
        type="date"
        value={filters.date_to || ''}
        onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
        className={dateClass}
      />

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={() => { setSearchLocal(''); onChange({}); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X className="w-3 h-3" />
          {t('filters.clearAll')}
        </button>
      )}
    </div>
  );
}
