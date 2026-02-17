'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Car } from 'lucide-react';
import { Vehicle, CreateVehicleData, ManufacturerChoice, VehicleStatus } from '@/types/vehicle';
import { vehicleService } from '@/services/vehicle';

interface VehicleModalProps {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const MANUFACTURERS: ManufacturerChoice[] = ['Toyota', 'Ford', 'Honda', 'Chevrolet', 'BMW', 'Lexus', 'Audi'];

const STATUSES: { value: VehicleStatus; label: string }[] = [
  { value: 'CTO', label: 'СТО' },
  { value: 'FOCUS', label: 'Фокус' },
  { value: 'CLEANING', label: 'Хімчистка' },
  { value: 'PREPARATION', label: 'Підготовка' },
  { value: 'READY', label: 'Готове' },
  { value: 'LEASING', label: 'Лізинг' },
  { value: 'RENT', label: 'Оренда' },
  { value: 'SELLING', label: 'Продаж' },
  { value: 'SOLD', label: 'Продано' },
];

export function VehicleModal({ vehicle, isOpen, onClose, onSave }: VehicleModalProps) {
  const [formData, setFormData] = useState<CreateVehicleData>({
    model: '',
    manufacturer: 'Toyota',
    year: new Date().getFullYear(),
    cost: '',
    vin_number: '',
    car_number: '',
    status: 'PREPARATION',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        model: vehicle.model,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        cost: vehicle.cost,
        vin_number: vehicle.vin_number,
        car_number: vehicle.car_number,
        status: vehicle.status,
      });
    } else {
      setFormData({
        model: '',
        manufacturer: 'Toyota',
        year: new Date().getFullYear(),
        cost: '',
        vin_number: '',
        car_number: '',
        status: 'PREPARATION',
      });
    }
  }, [vehicle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (vehicle) {
        await vehicleService.updateVehicle(vehicle.id, formData);
      } else {
        await vehicleService.createVehicle(formData);
      }
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Failed to save vehicle:', err);
      setError(err.response?.data?.message || 'Не вдалося зберегти автомобіль');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle || !confirm('Ви впевнені, що хочете видалити цей автомобіль?')) return;

    setLoading(true);
    try {
      await vehicleService.deleteVehicle(vehicle.id);
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      setError('Не вдалося видалити автомобіль');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Car className="w-6 h-6 text-[#2D8B7E]" />
            {vehicle ? 'Редагувати автомобіль' : 'Додати автомобіль'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Car Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Номер авто <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.car_number}
                onChange={(e) => setFormData({ ...formData, car_number: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
                placeholder="AA1234BB"
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Виробник <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value as ManufacturerChoice })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
              >
                {MANUFACTURERS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Модель <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
                placeholder="Corolla"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Рік <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
              />
            </div>

            {/* Cost */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Вартість (PLN) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
                placeholder="50000.00"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Статус <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* VIN Number */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              VIN номер <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={17}
              value={formData.vin_number}
              onChange={(e) => setFormData({ ...formData, vin_number: e.target.value.toUpperCase() })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent font-mono"
              placeholder="1HGBH41JXMN109186"
            />
            <p className="text-xs text-slate-500 mt-1">17 символів</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            {vehicle && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Видалити
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#2D8B7E] text-white rounded-lg hover:bg-[#246f65] transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Збереження...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Зберегти
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
