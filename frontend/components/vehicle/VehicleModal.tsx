'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X, Save, Archive, Car, Upload, Plus, UserPlus, ChevronDown } from 'lucide-react';
import { Vehicle, CreateVehicleData, ManufacturerChoice, VehicleStatus, FuelType, VehiclePhoto } from '@/types/vehicle';
import { toDisplayUnit, toKm, type DistanceUnit } from '@/lib/distance';
import { Driver } from '@/types/driver';
import { vehicleService } from '@/services/vehicle';
import { getAllDrivers, createDriver } from '@/services/driver';

interface VehicleModalProps {
  vehicle?: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onArchive?: () => void;
}

const MANUFACTURERS: ManufacturerChoice[] = ['Toyota', 'Ford', 'Honda', 'Chevrolet', 'BMW', 'Lexus', 'Audi', 'Tesla'];

const STATUS_VALUES: VehicleStatus[] = [
  'AUCTION', 'FOCUS', 'GAS_INSTALL', 'SERVICE', 'CLEANING',
  'PRE_DELIVERY', 'READY', 'RENT', 'LEASING', 'SELLING', 'SOLD',
];

const COLORS: { value: string; key: string; hex: string }[] = [
  { value: 'Білий', key: 'white', hex: '#FFFFFF' },
  { value: 'Чорний', key: 'black', hex: '#1a1a1a' },
  { value: 'Сірий', key: 'gray', hex: '#9CA3AF' },
  { value: 'Сріблястий', key: 'silver', hex: '#C0C0C0' },
  { value: 'Червоний', key: 'red', hex: '#EF4444' },
  { value: 'Синій', key: 'blue', hex: '#3B82F6' },
  { value: 'Зелений', key: 'green', hex: '#22C55E' },
  { value: 'Жовтий', key: 'yellow', hex: '#EAB308' },
  { value: 'Коричневий', key: 'brown', hex: '#92400E' },
  { value: 'Бежевий', key: 'beige', hex: '#D4A574' },
  { value: 'Помаранчевий', key: 'orange', hex: '#F97316' },
  { value: 'Бордовий', key: 'burgundy', hex: '#881337' },
];

const FUEL_VALUES: FuelType[] = ['GASOLINE', 'DIESEL', 'LPG', 'LPG_GASOLINE', 'ELECTRIC', 'HYBRID', 'GAS_GASOLINE_HYBRID'];

const inputBase = 'w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] transition-all text-sm';
const inputEmpty = `${inputBase} bg-slate-50 border-slate-200 text-slate-400`;
const inputFilled = `${inputBase} bg-white border-slate-300 text-slate-800`;

type FormData = Omit<CreateVehicleData, 'initial_km' | 'driver'> & { is_temporary_plate: boolean };

export function VehicleModal({ vehicle, isOpen, onClose, onSave, onArchive }: VehicleModalProps) {
  const t = useTranslations('vehicleModal');
  const tStatuses = useTranslations('vehicles.statuses');
  const tFuelTypes = useTranslations('vehicles.fuelTypes');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<FormData>({
    model: '',
    manufacturer: 'Toyota',
    year: new Date().getFullYear(),
    cost: '',
    vin_number: '',
    car_number: '',
    is_temporary_plate: false,
    color: '',
    fuel_type: null,
    status: 'AUCTION',
  });
  const [kmStr, setKmStr] = useState('');
  const [distUnit, setDistUnit] = useState<DistanceUnit>('km');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Driver state
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [showDriverCreate, setShowDriverCreate] = useState(false);
  const [newDriver, setNewDriver] = useState({ first_name: '', last_name: '', phone_number: '' });
  const [creatingDriver, setCreatingDriver] = useState(false);

  // Photo state
  const [existingPhotos, setExistingPhotos] = useState<VehiclePhoto[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step navigation
  const [step, setStep] = useState<1 | 2>(1);
  const [colorOpen, setColorOpen] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const selectedColor = useMemo(
    () => COLORS.find(c => c.value === formData.color),
    [formData.color],
  );

  // Close color dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    if (vehicle) {
      setFormData({
        model: vehicle.model,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        cost: vehicle.cost,
        vin_number: vehicle.vin_number,
        car_number: vehicle.car_number || '',
        is_temporary_plate: vehicle.is_temporary_plate,
        color: vehicle.color || '',
        fuel_type: vehicle.fuel_type,
        status: vehicle.status,
      });
      const unit = vehicle.distance_unit ?? 'km';
      setDistUnit(unit);
      setKmStr(String(toDisplayUnit(vehicle.initial_km, unit)));
      setSelectedDriverId(vehicle.driver?.id || null);
      setExistingPhotos(vehicle.photos || []);
    } else {
      setFormData({
        model: '',
        manufacturer: 'Toyota',
        year: new Date().getFullYear(),
        cost: '',
        vin_number: '',
        car_number: '',
        is_temporary_plate: false,
        color: '',
        fuel_type: null,
        status: 'AUCTION',
      });
      setDistUnit('km');
      setKmStr('');
      setSelectedDriverId(null);
      setExistingPhotos([]);
    }
    setStagedFiles([]);
    setStagedPreviews(prev => {
      prev.forEach(u => URL.revokeObjectURL(u));
      return [];
    });
    setError(null);
    setShowDriverCreate(false);
    setNewDriver({ first_name: '', last_name: '', phone_number: '' });
  }, [vehicle, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setDriversLoading(true);
      getAllDrivers()
        .then(setDrivers)
        .catch(() => {})
        .finally(() => setDriversLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stagedPreviews.forEach(u => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPhotos = existingPhotos.length + stagedFiles.length;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const toAdd = files;
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
      setError(t('errorDeletePhoto'));
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleCreateDriver = async () => {
    if (!newDriver.first_name.trim() || !newDriver.last_name.trim() || !newDriver.phone_number.trim()) return;
    setCreatingDriver(true);
    try {
      const created = await createDriver(newDriver);
      setDrivers(prev => [...prev, created]);
      setSelectedDriverId(created.id);
      setShowDriverCreate(false);
      setNewDriver({ first_name: '', last_name: '', phone_number: '' });
    } catch {
      setError(t('errorCreateDriver'));
    } finally {
      setCreatingDriver(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const kmNum = parseInt(kmStr);
    if (isNaN(kmNum) || kmNum < 0) {
      setError(t('errorInvalidMileage'));
      setLoading(false);
      return;
    }

    try {
      let vehicleId: string;
      const { is_temporary_plate, ...rest } = formData;
      const vehicleData: CreateVehicleData = {
        ...rest,
        year: rest.year || null,
        car_number: rest.car_number?.trim() || undefined,
        is_temporary_plate,
        initial_km: toKm(kmNum, distUnit),
        distance_unit: distUnit,
      };

      if (vehicle) {
        await vehicleService.updateVehicle(vehicle.id, vehicleData);
        vehicleId = vehicle.id;

        const currentDriverId = vehicle.driver?.id || null;
        if (selectedDriverId !== currentDriverId) {
          if (selectedDriverId) {
            await vehicleService.assignOwner(vehicleId, { driver: selectedDriverId });
          } else {
            await vehicleService.unassignOwner(vehicleId);
          }
        }
      } else {
        const created = await vehicleService.createVehicle(vehicleData);
        vehicleId = created.id;

        if (selectedDriverId) {
          await vehicleService.assignOwner(vehicleId, { driver: selectedDriverId });
        }
      }

      for (const file of stagedFiles) {
        await vehicleService.uploadVehiclePhoto(vehicleId, file);
      }

      onSave();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save vehicle:', err);
      let message = t('errorSaveVehicle');
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

  const handleArchive = async () => {
    if (!vehicle || !confirm(t('archiveConfirm'))) return;

    setLoading(true);
    try {
      await vehicleService.archiveVehicle(vehicle.id);
      onClose();
      if (onArchive) {
        onArchive();
      } else {
        onSave();
      }
    } catch (err) {
      console.error('Failed to archive vehicle:', err);
      setError(t('errorArchiveVehicle'));
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    formData.model.trim() !== '' &&
    formData.vin_number.trim() !== '' &&
    formData.color.trim() !== '' &&
    formData.cost !== '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2D8B7E] to-[#246f65] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {vehicle ? t('editVehicle') : t('addVehicle')}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 1 ? t('step1Subtitle') : t('step2Subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-2">
            <div className="flex-1 h-1 rounded-full bg-[#2D8B7E] transition-all" />
            <div className={`flex-1 h-1 rounded-full transition-all ${step === 2 ? 'bg-[#2D8B7E]' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mt-2">
              {error}
            </div>
          )}

          <form id="vehicle-form" onSubmit={(e) => e.preventDefault()}>
            {/* STEP 1: Main info */}
            {step === 1 && (
              <div className="space-y-5 py-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('carNumber')}
                    </label>
                    <input
                      type="text"
                      value={formData.car_number}
                      onChange={(e) => setFormData({ ...formData, car_number: e.target.value.toUpperCase() })}
                      className={`${formData.car_number ? inputFilled : inputEmpty} font-mono tracking-wider`}
                      placeholder="AA1234BB"
                    />
                    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_temporary_plate}
                        onChange={(e) => setFormData({ ...formData, is_temporary_plate: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-[#2D8B7E] focus:ring-[#2D8B7E]/30 cursor-pointer"
                      />
                      <span className="text-xs text-slate-500">{t('isTemporaryPlate')}</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('vinNumber')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={17}
                      value={formData.vin_number}
                      onChange={(e) => setFormData({ ...formData, vin_number: e.target.value.toUpperCase() })}
                      className={`${formData.vin_number ? inputFilled : inputEmpty} font-mono tracking-wider`}
                      placeholder="1HGBH41JXMN109186"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">{t('vinHint')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('manufacturer')} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value as ManufacturerChoice })}
                        className={`${inputFilled} appearance-none cursor-pointer pr-10`}
                      >
                        {MANUFACTURERS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('model')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className={formData.model ? inputFilled : inputEmpty}
                      placeholder="Corolla"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('year')}
                    </label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.year ?? ''}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : null })}
                      className={inputFilled}
                    />
                  </div>
                </div>

                {/* Color dropdown */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    {t('color')} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative" ref={colorRef}>
                    <button
                      type="button"
                      onClick={() => setColorOpen(prev => !prev)}
                      className={`${selectedColor ? inputFilled : inputEmpty} flex items-center justify-between cursor-pointer text-left`}
                    >
                      <span className="flex items-center gap-2.5">
                        {selectedColor ? (
                          <>
                            <span
                              className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-slate-200"
                              style={{ backgroundColor: selectedColor.hex }}
                            />
                            <span>{t(`colors.${selectedColor.key}`)}</span>
                          </>
                        ) : (
                          <span>{t('selectColor')}</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${colorOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {colorOpen && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto">
                        {COLORS.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, color: c.value });
                              setColorOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                              formData.color === c.value ? 'bg-[#2D8B7E]/5 font-medium' : ''
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-slate-200"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span className="text-slate-700">{t(`colors.${c.key}`)}</span>
                            {formData.color === c.value && (
                              <span className="ml-auto text-[#2D8B7E] text-xs font-bold">&#10003;</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('fuelType')}
                    </label>
                    <div className="relative">
                      <select
                        value={formData.fuel_type || ''}
                        onChange={(e) => setFormData({ ...formData, fuel_type: (e.target.value || null) as FuelType | null })}
                        className={`${inputFilled} appearance-none cursor-pointer pr-10`}
                      >
                        <option value="">—</option>
                        {FUEL_VALUES.map(f => (
                          <option key={f} value={f}>{tFuelTypes(f)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('cost')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      className={formData.cost ? inputFilled : inputEmpty}
                      placeholder="50 000.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                      {t('status')} <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                        className={`${inputFilled} appearance-none cursor-pointer pr-10`}
                      >
                        {STATUS_VALUES.map(s => (
                          <option key={s} value={s}>{tStatuses(s)}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    {t('mileage')} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="0"
                      value={kmStr}
                      onChange={(e) => setKmStr(e.target.value)}
                      className={`flex-1 ${kmStr ? inputFilled : inputEmpty}`}
                      placeholder="0"
                    />
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (distUnit === 'mi') {
                            const val = parseInt(kmStr, 10);
                            if (!isNaN(val) && val > 0) setKmStr(String(toKm(val, 'mi')));
                            setDistUnit('km');
                          }
                        }}
                        className={`px-3 py-2 text-sm font-bold transition-colors ${
                          distUnit === 'km'
                            ? 'bg-[#2D8B7E] text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        km
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (distUnit === 'km') {
                            const val = parseInt(kmStr, 10);
                            if (!isNaN(val) && val > 0) setKmStr(String(toDisplayUnit(val, 'mi')));
                            setDistUnit('mi');
                          }
                        }}
                        className={`px-3 py-2 text-sm font-bold transition-colors ${
                          distUnit === 'mi'
                            ? 'bg-[#2D8B7E] text-white'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        mi
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t('mileageHint')}</p>
                </div>
              </div>
            )}

            {/* STEP 2: Driver & Photos */}
            {step === 2 && (
              <div className="space-y-5 py-3">
                {/* Driver selection */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2D8B7E]/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-[#2D8B7E]" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        {t('assignDriver')}
                      </label>
                      <p className="text-[11px] text-slate-400">{t('assignDriverHint')}</p>
                    </div>
                  </div>

                  {!showDriverCreate ? (
                    <>
                      <div className="relative">
                        <select
                          value={selectedDriverId || ''}
                          onChange={(e) => setSelectedDriverId(e.target.value || null)}
                          disabled={driversLoading}
                          className={`${selectedDriverId ? inputFilled : inputEmpty} appearance-none cursor-pointer pr-10 disabled:opacity-50`}
                        >
                          <option value="">
                            {driversLoading ? t('loadingDrivers') : t('noDriver')}
                          </option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.first_name} {d.last_name} {d.phone_number ? `(${d.phone_number})` : ''}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDriverCreate(true)}
                        className="mt-2 flex items-center gap-1.5 text-sm text-[#2D8B7E] hover:text-[#246f65] font-medium transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t('createNewDriver')}
                      </button>
                    </>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-[#2D8B7E]" />
                          {t('newDriver')}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowDriverCreate(false)}
                          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {tCommon('cancel')}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder={t('firstName')}
                          value={newDriver.first_name}
                          onChange={(e) => setNewDriver({ ...newDriver, first_name: e.target.value })}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] text-sm text-slate-800 placeholder:text-slate-400"
                        />
                        <input
                          type="text"
                          placeholder={t('lastName')}
                          value={newDriver.last_name}
                          onChange={(e) => setNewDriver({ ...newDriver, last_name: e.target.value })}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] text-sm text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder={t('phone')}
                        value={newDriver.phone_number}
                        onChange={(e) => setNewDriver({ ...newDriver, phone_number: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleCreateDriver}
                        disabled={creatingDriver || !newDriver.first_name.trim() || !newDriver.last_name.trim() || !newDriver.phone_number.trim()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#2D8B7E] text-white text-sm rounded-lg hover:bg-[#246f65] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingDriver ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {t('creating')}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            {t('createAndAssign')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Photos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2D8B7E]/10 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-[#2D8B7E]" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-700">
                        {t('vehiclePhotos')}
                      </label>
                      <p className="text-[11px] text-slate-400">{t('photosHint')}</p>
                    </div>
                    {totalPhotos > 0 && (
                      <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                        {totalPhotos}
                      </span>
                    )}
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
                        <div key={`staged-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#2D8B7E]/30">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeStagedFile(idx)}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-[#2D8B7E]/80 text-white text-[9px] font-bold text-center py-0.5">
                            {t('new')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
                    className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-[#2D8B7E] hover:bg-[#2D8B7E]/5 rounded-xl text-sm font-medium text-slate-400 hover:text-[#2D8B7E] transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {t('addPhoto')}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            {vehicle && step === 1 ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                {t('archive')}
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-sm font-medium"
                >
                  {t('back')}
                </button>
              )}
              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2D8B7E] text-white rounded-xl hover:bg-[#246f65] transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('next')}
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#2D8B7E] text-white rounded-xl hover:bg-[#246f65] transition-colors text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t('save')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
