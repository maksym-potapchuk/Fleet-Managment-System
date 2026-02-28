'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Car, Upload } from 'lucide-react';
import { Vehicle, CreateVehicleData, ManufacturerChoice, VehicleStatus, VehiclePhoto } from '@/types/vehicle';
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

type FormData = Omit<CreateVehicleData, 'initial_km'>;

export function VehicleModal({ vehicle, isOpen, onClose, onSave }: VehicleModalProps) {
  const [formData, setFormData] = useState<FormData>({
    model: '',
    manufacturer: 'Toyota',
    year: new Date().getFullYear(),
    cost: '',
    vin_number: '',
    car_number: '',
    status: 'PREPARATION',
  });
  // initial_km tracked as string to properly enforce required (empty string = invalid)
  const [kmStr, setKmStr] = useState('');

  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<VehiclePhoto[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setKmStr(String(vehicle.initial_km));
      setExistingPhotos(vehicle.photos || []);
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
      setKmStr('');
      setExistingPhotos([]);
    }
    // reset staged photos on open/close
    setStagedFiles([]);
    setStagedPreviews(prev => {
      prev.forEach(u => URL.revokeObjectURL(u));
      return [];
    });
    setError(null);
  }, [vehicle, isOpen]);

  // cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      stagedPreviews.forEach(u => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPhotos = existingPhotos.length + stagedFiles.length;
  const canAddMore = totalPhotos < 10;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = 10 - totalPhotos;
    const toAdd = files.slice(0, slots);
    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    setStagedFiles(prev => [...prev, ...toAdd]);
    setStagedPreviews(prev => [...prev, ...newUrls]);
    e.target.value = '';
  };

  const removeStagedFile = (idx: number) => {
    URL.revokeObjectURL(stagedPreviews[idx]);
    setStagedFiles(prev => prev.filter((_, i) => i !== idx));
    setStagedPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteExistingPhoto = async (photoId: number) => {
    if (!vehicle) return;
    setDeletingPhotoId(photoId);
    try {
      await vehicleService.deleteVehiclePhoto(vehicle.id, photoId);
      setExistingPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch {
      setError('Не вдалося видалити фото');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const kmNum = parseInt(kmStr);
    if (isNaN(kmNum) || kmNum < 0) {
      setError('Введіть коректний пробіг');
      setLoading(false);
      return;
    }

    try {
      let vehicleId: string;
      const vehicleData: CreateVehicleData = { ...formData, initial_km: kmNum };

      if (vehicle) {
        await vehicleService.updateVehicle(vehicle.id, vehicleData);
        vehicleId = vehicle.id;
      } else {
        const created = await vehicleService.createVehicle(vehicleData);
        vehicleId = created.id;
      }

      // upload staged photos sequentially
      for (const file of stagedFiles) {
        await vehicleService.uploadVehiclePhoto(vehicleId, file);
      }

      onSave();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save vehicle:', err);
      let message = 'Не вдалося зберегти автомобіль';
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
      ) {
        const data = (err.response as { data?: { message?: string } }).data;
        if (data?.message) message = data.message;
      }
      setError(message);
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

          {/* Initial KM — required */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Поточний пробіг (км) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={kmStr}
              onChange={(e) => setKmStr(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent"
              placeholder="0"
            />
            <p className="text-xs text-slate-500 mt-1">Використовується для розрахунку регламенту</p>
          </div>

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                Фото
              </label>
              <span className="text-xs text-slate-400 font-medium">{totalPhotos}/10</span>
            </div>

            {totalPhotos > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-3">
                {existingPhotos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                    <img
                      src={photo.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingPhoto(photo.id)}
                      disabled={deletingPhotoId === photo.id}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center"
                    >
                      {deletingPhotoId === photo.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                      )}
                    </button>
                  </div>
                ))}

                {stagedPreviews.map((url, idx) => (
                  <div key={`staged-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-blue-300">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeStagedFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-blue-500/80 text-white text-[9px] font-bold text-center py-0.5">
                      НОВЕ
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canAddMore ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-[#2D8B7E] hover:bg-[#2D8B7E]/5 rounded-xl text-sm font-semibold text-slate-500 hover:text-[#2D8B7E] transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Додати фото
                  {totalPhotos > 0 && (
                    <span className="text-xs font-normal text-slate-400">(ще {10 - totalPhotos})</span>
                  )}
                </button>
              </>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Досягнуто ліміт 10 фото</p>
            )}
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
