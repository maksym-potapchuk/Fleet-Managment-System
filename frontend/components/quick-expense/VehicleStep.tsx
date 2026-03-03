'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Vehicle } from '@/types/vehicle';
import { Car, Search, Clock } from 'lucide-react';

const RECENT_KEY = 'fleet:quick-expenses:recent-vehicles';
const MAX_RECENT = 5;

function getRecentVehicleIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecentVehicleId(vehicleId: string) {
  try {
    const ids = getRecentVehicleIds().filter(id => id !== vehicleId);
    ids.unshift(vehicleId);
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
  } catch { /* noop */ }
}

interface VehicleStepProps {
  vehicles: Vehicle[];
  onSelect: (vehicleId: string, label: string) => void;
}

export function VehicleStep({ vehicles, onSelect }: VehicleStepProps) {
  const t = useTranslations('quickExpenses');
  const [query, setQuery] = useState('');
  const [recentIds] = useState<string[]>(() => getRecentVehicleIds());

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return vehicles.filter(
      v =>
        v.car_number.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q),
    );
  }, [vehicles, query]);

  const recentVehicles = useMemo(
    () => recentIds.map(id => vehicles.find(v => v.id === id)).filter(Boolean) as Vehicle[],
    [recentIds, vehicles],
  );

  const handleSelect = (vehicle: Vehicle) => {
    saveRecentVehicleId(vehicle.id);
    onSelect(vehicle.id, `${vehicle.car_number} · ${vehicle.manufacturer} ${vehicle.model}`);
  };

  const displayList = query.trim() ? filtered : recentVehicles;
  const showRecentLabel = !query.trim() && recentVehicles.length > 0;

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-slate-900 mb-1">{t('vehicleStep.title')}</h2>
      <p className="text-sm text-slate-500 mb-4">{t('subtitle')}</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('vehicleStep.searchPlaceholder')}
          autoFocus
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-colors"
        />
      </div>

      {/* Recent label */}
      {showRecentLabel && (
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('vehicleStep.recent')}</span>
        </div>
      )}

      {/* Vehicle list */}
      <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {displayList.map((vehicle) => (
          <button
            key={vehicle.id}
            onClick={() => handleSelect(vehicle)}
            className="w-full flex items-center gap-3 p-3 lg:p-4 rounded-xl border border-slate-200 bg-white text-left transition hover:border-teal-300 hover:bg-teal-50/50 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 flex-shrink-0">
              <Car className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono font-bold text-sm text-slate-900 tracking-wide">{vehicle.car_number}</div>
              <div className="text-xs text-slate-500 truncate">{vehicle.manufacturer} {vehicle.model} · {vehicle.year}</div>
            </div>
          </button>
        ))}

        {query.trim() && filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            <Car className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>No results</p>
          </div>
        )}

        {!query.trim() && recentVehicles.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            <Search className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            <p>{t('vehicleStep.searchPlaceholder')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
