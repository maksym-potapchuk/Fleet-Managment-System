'use client';

import { useState, useRef, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Car, X, ChevronDown } from 'lucide-react';
import { matchesWithLayout } from '@/lib/keyboard-layout';

interface VehicleAutocompleteProps {
  vehicles: Vehicle[];
  value: string;
  onChange: (vehicleId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export function VehicleAutocomplete({
  vehicles,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  hasError = false,
}: VehicleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedVehicle = vehicles.find(v => v.id === value);

  const filtered = query.trim()
    ? vehicles.filter(v => {
        return (
          (v.car_number && matchesWithLayout(v.car_number, query)) ||
          matchesWithLayout(v.manufacturer, query) ||
          matchesWithLayout(v.model, query) ||
          (v.vin_number && matchesWithLayout(v.vin_number, query))
        );
      })
    : vehicles;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (vehicle: Vehicle) => {
    onChange(vehicle.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Display selected or input */}
      {selectedVehicle && !isOpen ? (
        <div
          onClick={() => { if (!disabled) { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 0); } }}
          className={`
            flex items-center gap-2.5 w-full px-3 py-2.5 border rounded-xl text-sm cursor-pointer transition-colors
            ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-slate-400'}
            ${hasError ? 'border-red-500' : 'border-slate-300'}
          `}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 flex-shrink-0">
            <Car className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-mono font-semibold text-slate-800 tracking-wide">{selectedVehicle.car_number || '—'}</span>
            <span className="text-slate-400 mx-1.5">·</span>
            <span className="text-slate-600">{selectedVehicle.manufacturer} {selectedVehicle.model}</span>
          </div>
          {!disabled && (
            <button type="button" onClick={handleClear} className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full pl-10 pr-9 py-2.5 border rounded-xl text-sm transition-colors
              text-slate-900 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
              disabled:bg-slate-100 disabled:cursor-not-allowed
              ${hasError ? 'border-red-500' : 'border-slate-300'}
            `}
          />
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              Не знайдено
            </div>
          ) : (
            filtered.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelect(v)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors
                  hover:bg-teal-50/60
                  ${v.id === value ? 'bg-teal-50 text-teal-700' : 'text-slate-700'}
                `}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 ${v.id === value ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <Car className={`w-3.5 h-3.5 ${v.id === value ? 'text-teal-600' : 'text-slate-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="font-mono font-semibold tracking-wide">{v.car_number || '—'}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-500">{v.manufacturer} {v.model}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-400 text-xs">{v.year}</span>
                  </div>
                  {v.vin_number && (
                    <p className="text-xs text-slate-500 font-mono font-semibold tracking-widest truncate select-all">{v.vin_number}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
