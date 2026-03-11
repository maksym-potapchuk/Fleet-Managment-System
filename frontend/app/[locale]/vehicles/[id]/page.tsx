'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/routing';
import {
  ArrowLeft,
  Car,
  User,
  DollarSign,
  Wrench,
  Package,
  Plus,
  Menu,
  Edit,
  ScrollText,
  Gauge,
  History,
  Filter,
  Trash2,
  CheckCircle2,
  X,
  Pencil,
  Check,
  Upload,
  Users,
  ShieldCheck,
  FileText,
  Calendar,
  Fuel,
  Search,
  ChevronDown,
  Archive,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import api from '@/lib/api';
import { vehicleService } from '@/services/vehicle';
import { expenseService } from '@/services/expense';
import { Vehicle, VehicleOwner, OwnerHistoryRecord, VehicleStatus, FuelType, TechnicalInspection, MileageLog } from '@/types/vehicle';
import { Expense, CreateExpenseData, ExpenseCategory, ExpenseFilters as ExpenseFiltersType } from '@/types/expense';
import { VehicleModal } from '@/components/vehicle/VehicleModal';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ExpenseFilters } from '@/components/expense/ExpenseFilters';
import { ExpenseDetailModal } from '@/components/expense/ExpenseDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ToastContainer, ToastData } from '@/components/common/Toast';
import { useSidebar } from '../SidebarContext';

const STATUS_COLORS: Record<VehicleStatus, { bg: string; text: string; border: string }> = {
  AUCTION:      { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  FOCUS:        { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  GAS_INSTALL:  { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  SERVICE:      { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  CLEANING:     { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  PRE_DELIVERY: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  READY:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  RENT:         { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  LEASING:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  SELLING:      { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
  SOLD:         { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200' },
};

type WorkspaceTab = 'service' | 'equipment' | 'regulation' | 'history' | 'inspection' | 'expenses';

interface RegulationItem {
  id: number;
  title: string;
  title_pl: string;
  title_uk: string;
  every_km: number;
  notify_before_km: number;
}

interface RegulationSchema {
  id: number;
  title: string;
  title_pl: string;
  title_uk: string;
  items: RegulationItem[];
  is_default: boolean;
  created_by: number;
}

interface RegulationPlanEntry {
  id: number;
  item: RegulationItem;
  last_done_km: number;
  every_km: number | null;
  notify_before_km: number | null;
  effective_every_km: number;
  effective_notify_before_km: number;
  next_due_km: number;
  updated_at: string;
}

interface RegulationPlan {
  assigned: true;
  id: number;
  schema: { id: number; title: string; title_pl: string; title_uk: string };
  assigned_at: string;
  entries: RegulationPlanEntry[];
}

interface DriverOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface ServicePlan {
  id: number;
  vehicle: string;
  title: string;
  description: string | null;
  planned_at: string;
  is_done: boolean;
  created_at: string;
}

interface EquipmentItem {
  id: number;
  vehicle: string;
  equipment: string;
  is_equipped: boolean;
  created_at: string;
}

interface RegulationHistoryEntry {
  id: number;
  item_title: string;
  item_title_pl: string;
  item_title_uk: string;
  event_type: 'performed' | 'km_updated' | 'notified';
  km_at_event: number;
  km_remaining: number;
  note: string;
  created_by: number | null;
  created_at: string;
}

export default function VehicleWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { openSidebar } = useSidebar();
  const t = useTranslations('vehicleWorkspace');
  const tVehicles = useTranslations('vehicles');

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('service');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Inline photo management
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Quick mileage update
  const [showMileageInput, setShowMileageInput] = useState(false);
  const [mileageKm, setMileageKm] = useState('');
  const [savingMileage, setSavingMileage] = useState(false);
  const mileageInputRef = useRef<HTMLInputElement>(null);

  // Inline driver assignment
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [driversList, setDriversList] = useState<DriverOption[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);
  const driverPickerRef = useRef<HTMLDivElement>(null);
  const driverSearchRef = useRef<HTMLInputElement>(null);

  // Inline fuel type picker
  const [showFuelPicker, setShowFuelPicker] = useState(false);
  const [savingFuel, setSavingFuel] = useState(false);
  const fuelPickerRef = useRef<HTMLDivElement>(null);

  const loadVehicle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getVehicle(id);
      setVehicle(data);
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const [mileageError, setMileageError] = useState('');

  const handleQuickMileage = async () => {
    const kmVal = parseInt(mileageKm, 10);
    if (!kmVal || kmVal <= 0 || !vehicle) return;
    if (kmVal <= vehicle.initial_km) {
      setMileageError(t('mileage.minError', { km: vehicle.initial_km.toLocaleString() }));
      return;
    }
    setMileageError('');
    setSavingMileage(true);
    try {
      await api.post(`/vehicle/${vehicle.id}/mileage/`, {
        km: kmVal,
        recorded_at: new Date().toISOString().split('T')[0],
      });
      setShowMileageInput(false);
      setMileageKm('');
      await loadVehicle();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMileage(false);
    }
  };

  useEffect(() => {
    if (id) loadVehicle();
  }, [id, loadVehicle]);

  // Load drivers when picker opens
  useEffect(() => {
    if (!showDriverPicker) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/driver/');
        const data = res.data;
        if (!cancelled) setDriversList(Array.isArray(data) ? data : (data as { results: DriverOption[] }).results ?? []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [showDriverPicker]);

  // Close driver picker on outside click
  useEffect(() => {
    if (!showDriverPicker) return;
    const handler = (e: MouseEvent) => {
      if (driverPickerRef.current && !driverPickerRef.current.contains(e.target as Node)) {
        setShowDriverPicker(false);
        setDriverSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDriverPicker]);

  // Close fuel picker on outside click
  useEffect(() => {
    if (!showFuelPicker) return;
    const handler = (e: MouseEvent) => {
      if (fuelPickerRef.current && !fuelPickerRef.current.contains(e.target as Node)) {
        setShowFuelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFuelPicker]);

  const handleDriverAssign = async (driverId: string | null) => {
    if (!vehicle) return;
    setSavingDriver(true);
    try {
      if (driverId) {
        await vehicleService.assignOwner(vehicle.id, { driver: driverId });
      } else {
        await vehicleService.unassignOwner(vehicle.id);
      }
      await loadVehicle();
      setShowDriverPicker(false);
      setDriverSearch('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDriver(false);
    }
  };

  const handleFuelChange = async (fuelType: FuelType | null) => {
    if (!vehicle || vehicle.fuel_type === fuelType) {
      setShowFuelPicker(false);
      return;
    }
    setSavingFuel(true);
    try {
      await vehicleService.updateVehicle(vehicle.id, { fuel_type: fuelType });
      await loadVehicle();
      setShowFuelPicker(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFuel(false);
    }
  };

  const handleArchive = async () => {
    if (!vehicle) return;
    setArchiving(true);
    try {
      await vehicleService.archiveVehicle(vehicle.id);
      router.push('/vehicles');
    } catch (err) {
      console.error('Failed to archive vehicle:', err);
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !vehicle) return;
    e.target.value = '';
    setUploadingPhoto(true);
    try {
      await vehicleService.uploadVehiclePhoto(vehicle.id, file);
      await loadVehicle();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDelete = async (photoId: number) => {
    if (!vehicle) return;
    setDeletingPhotoId(photoId);
    try {
      await vehicleService.deleteVehiclePhoto(vehicle.id, photoId);
      if (lightboxIdx !== null) setLightboxIdx(null);
      await loadVehicle();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">{t('loadingVehicle')}</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('vehicleNotFound')}</h2>
          <button
            onClick={() => router.push('/vehicles')}
            className="mt-2 text-[#2D8B7E] font-bold hover:underline flex items-center gap-1.5 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToVehicles')}
          </button>
        </div>
      </div>
    );
  }

  const statusColors = STATUS_COLORS[vehicle.status];
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : tVehicles('noDriver');

  const fuelLabel = (type: FuelType | null) => type ? tVehicles(`fuelTypes.${type}`) : '—';

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Wrench; secondary?: boolean }[] = [
    { id: 'service',    label: t('tabs.service'),    icon: Wrench },
    { id: 'equipment',  label: t('tabs.equipment'),  icon: Package },
    { id: 'regulation', label: t('tabs.regulation'), icon: ScrollText },
    { id: 'inspection', label: t('tabs.inspection'), icon: ShieldCheck },
    { id: 'expenses',   label: t('tabs.expenses'),   icon: DollarSign },
    { id: 'history',    label: t('tabs.history'),    icon: History, secondary: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-y-auto overflow-x-hidden">

      {/* ── Header ── */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-3 sm:px-4 py-3 sm:py-4 md:px-6 shadow-sm flex-shrink-0">

        {/* Top bar: menu + back */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
          <button
            onClick={openSidebar}
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-slate-200 rounded-xl hover:border-[#2D8B7E]/50 hover:bg-slate-50 transition-all shadow-sm"
            title="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={() => router.push('/vehicles')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToVehicles')}
          </button>
        </div>

        {/* ── Photos (compact strip) ── */}
        {(() => {
          const photos = vehicle.photos ?? [];
          const safeIdx = photos.length > 0 ? Math.min(activePhotoIdx, photos.length - 1) : 0;
          return (
            <>
              {photos.length > 0 && (
                <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                  {photos.map((photo, idx) => (
                    <div key={photo.id} className="relative group/thumb flex-shrink-0">
                      <button
                        onClick={() => { setActivePhotoIdx(idx); setLightboxIdx(idx); }}
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                          idx === safeIdx ? 'border-[#2D8B7E] shadow-md' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={photo.image} alt="" className="w-full h-full object-cover" />
                      </button>
                      <button
                        onClick={() => handlePhotoDelete(photo.id)}
                        disabled={deletingPhotoId === photo.id}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-all disabled:opacity-60 shadow-sm"
                      >
                        {deletingPhotoId === photo.id
                          ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                          : <X className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                  {(
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#2D8B7E] hover:bg-[#2D8B7E]/5 flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-50"
                    >
                      {uploadingPhoto
                        ? <div className="w-4 h-4 border-2 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
                        : <Plus className="w-5 h-5 text-slate-400" />}
                    </button>
                  )}
                </div>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </>
          );
        })()}

        {/* ── Title row ── */}
        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-wrap mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                {vehicle.car_number || <span className="text-slate-400 italic">{tVehicles('noPlate')}</span>}
                {vehicle.is_temporary_plate && vehicle.car_number && (
                  <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md align-middle">{tVehicles('temporaryPlate')}</span>
                )}
              </h1>
              <span className="hidden sm:inline text-slate-400 font-medium">&middot;</span>
              <span className="text-sm sm:text-base md:text-lg font-semibold text-slate-600">
                {vehicle.manufacturer} {vehicle.model}
              </span>
              {vehicle.year && (
                <>
                  <span className="hidden sm:inline text-slate-400 font-medium">&middot;</span>
                  <span className="text-sm sm:text-base md:text-lg font-bold text-slate-800">{vehicle.year}</span>
                </>
              )}
              <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                {vehicle.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-wide mt-0.5">{vehicle.vin_number}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {(vehicle.photos ?? []).length === 0 && (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 font-bold text-sm px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {uploadingPhoto
                  ? <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  : <Upload className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{t('addPhoto')}</span>
              </button>
            )}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('edit')}</span>
            </button>
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-sm px-2.5 sm:px-3 py-1.5 rounded-xl transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('archiveVehicle')}</span>
            </button>
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 sm:gap-2 mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 min-w-0">
            <DollarSign className="w-4 h-4 text-[#2D8B7E] flex-shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-[#2D8B7E] truncate">
              {parseFloat(vehicle.cost).toLocaleString()} PLN
            </span>
          </div>
          <div className="relative" ref={fuelPickerRef}>
            <button
              onClick={() => setShowFuelPicker(v => !v)}
              disabled={savingFuel}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 hover:border-amber-400/50 hover:bg-amber-50/50 transition-all group cursor-pointer text-left w-full disabled:opacity-60 min-w-0"
            >
              {savingFuel ? (
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <Fuel className="w-4 h-4 text-amber-500 group-hover:text-amber-600 transition-colors flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-bold truncate ${vehicle.fuel_type ? 'text-slate-700 group-hover:text-amber-600' : 'text-slate-400 italic'} transition-colors`}>
                {fuelLabel(vehicle.fuel_type)}
              </span>
              <Pencil className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-colors ml-auto" />
            </button>
            {showFuelPicker && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden sm:min-w-[180px]">
                <div className="max-h-48 overflow-y-auto">
                  {([null, 'GASOLINE', 'DIESEL', 'LPG', 'LPG_GASOLINE', 'ELECTRIC', 'HYBRID'] as (FuelType | null)[]).map(ft => (
                    <button
                      key={ft ?? 'none'}
                      onClick={() => handleFuelChange(ft)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        vehicle.fuel_type === ft ? 'bg-amber-50 text-amber-600 font-semibold' : ft === null ? 'text-slate-400 italic' : 'text-slate-700'
                      }`}
                    >
                      {ft === null ? `— ${t('fuel.none')} —` : tVehicles(`fuelTypes.${ft}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={driverPickerRef}>
            <button
              onClick={() => { setShowDriverPicker(v => !v); setDriverSearch(''); }}
              disabled={savingDriver}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 hover:border-[#2D8B7E]/50 hover:bg-[#2D8B7E]/5 transition-all group cursor-pointer text-left w-full disabled:opacity-60 min-w-0"
            >
              {savingDriver ? (
                <div className="w-4 h-4 border-2 border-[#2D8B7E] border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-slate-400 group-hover:text-[#2D8B7E] transition-colors flex-shrink-0" />
              )}
              <span className={`text-xs sm:text-sm font-semibold truncate ${vehicle.driver ? 'text-slate-800 group-hover:text-[#2D8B7E]' : 'text-slate-400 italic'} transition-colors`}>
                {driverName}
              </span>
              <Pencil className="w-3 h-3 text-slate-300 group-hover:text-[#2D8B7E] transition-colors ml-auto" />
            </button>
            {showDriverPicker && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden sm:min-w-[220px]">
                <div className="p-2 border-b border-slate-100">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg">
                    <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      ref={driverSearchRef}
                      autoFocus
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      placeholder={t('driver.searchPlaceholder')}
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button
                    onClick={() => handleDriverAssign(null)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      !vehicle.driver ? 'bg-[#2D8B7E]/5 text-[#2D8B7E] font-semibold' : 'text-slate-400 italic'
                    }`}
                  >
                    — {tVehicles('noDriver')} —
                  </button>
                  {driversList
                    .filter(d => {
                      if (!driverSearch) return true;
                      const q = driverSearch.toLowerCase();
                      return `${d.first_name} ${d.last_name}`.toLowerCase().includes(q);
                    })
                    .map(d => (
                      <button
                        key={d.id}
                        onClick={() => handleDriverAssign(d.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                          vehicle.driver?.id === d.id ? 'bg-[#2D8B7E]/5 text-[#2D8B7E] font-semibold' : 'text-slate-700'
                        }`}
                      >
                        {d.first_name} {d.last_name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
          {showMileageInput ? (
            <div className="col-span-2 md:col-span-1">
              <div className={`flex items-center gap-1.5 bg-white border-2 rounded-xl px-2 py-1 ${mileageError ? 'border-red-400' : 'border-[#2D8B7E]'}`}>
                <Gauge className={`w-4 h-4 flex-shrink-0 ${mileageError ? 'text-red-400' : 'text-[#2D8B7E]'}`} />
                <input
                  ref={mileageInputRef}
                  type="number"
                  min={vehicle.initial_km + 1}
                  value={mileageKm}
                  onChange={(e) => { setMileageKm(e.target.value); setMileageError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickMileage();
                    if (e.key === 'Escape') { setShowMileageInput(false); setMileageKm(''); setMileageError(''); }
                  }}
                  placeholder={t('mileage.newKm')}
                  className="flex-1 min-w-0 text-sm font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                  autoFocus
                />
                <button
                  onClick={handleQuickMileage}
                  disabled={savingMileage || !mileageKm || parseInt(mileageKm, 10) <= 0}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#2D8B7E] hover:bg-[#248B7B] text-white transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {savingMileage
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setShowMileageInput(false); setMileageKm(''); setMileageError(''); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {mileageError && (
                <p className="text-[11px] text-red-500 font-medium mt-1 px-1">{mileageError}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setShowMileageInput(true); setMileageKm(''); setMileageError(''); }}
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 hover:border-[#2D8B7E]/50 hover:bg-[#2D8B7E]/5 transition-all group cursor-pointer text-left min-w-0"
              title={t('mileage.updateMileage')}
            >
              <Gauge className="w-4 h-4 text-slate-400 group-hover:text-[#2D8B7E] transition-colors flex-shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-700 group-hover:text-[#2D8B7E] transition-colors truncate">
                {vehicle.initial_km.toLocaleString()} км
              </span>
              <Pencil className="w-3 h-3 text-slate-300 group-hover:text-[#2D8B7E] transition-colors ml-auto flex-shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-3 py-2 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0">VIN</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-700 truncate">{vehicle.vin_number}</span>
          </div>
          {(() => {
            const d = vehicle.days_until_inspection;
            let chipBg = 'bg-slate-50'; let chipBorder = 'border-slate-200'; let chipIcon = 'text-slate-400'; let chipText = 'text-slate-400';
            let chipLabel = t('inspection.noData');
            if (d !== null) {
              if (d < 0) { chipBg = 'bg-red-50'; chipBorder = 'border-red-200'; chipIcon = 'text-red-500'; chipText = 'text-red-600 font-bold'; chipLabel = t('inspection.overdue', { days: Math.abs(d) }); }
              else if (d <= 7)  { chipBg = 'bg-red-50'; chipBorder = 'border-red-200'; chipIcon = 'text-red-500'; chipText = 'text-red-600'; chipLabel = t('inspection.daysLeft', { days: d }); }
              else if (d <= 30) { chipBg = 'bg-amber-50'; chipBorder = 'border-amber-200'; chipIcon = 'text-amber-500'; chipText = 'text-amber-600'; chipLabel = t('inspection.daysLeft', { days: d }); }
              else { chipBg = 'bg-emerald-50'; chipBorder = 'border-emerald-200'; chipIcon = 'text-emerald-500'; chipText = 'text-emerald-600'; chipLabel = t('inspection.daysLeft', { days: d }); }
            }
            return (
              <div className={`flex items-center gap-1.5 sm:gap-2 ${chipBg} border ${chipBorder} rounded-xl px-2 sm:px-3 py-2 min-w-0`}>
                <ShieldCheck className={`w-4 h-4 ${chipIcon} flex-shrink-0`} />
                <span className={`text-xs sm:text-sm font-bold ${chipText} truncate`}>{chipLabel}</span>
              </div>
            );
          })()}
        </div>

        {/* ── Tab navigation ── */}
        <div className="flex gap-1 items-center overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            if (tab.secondary) {
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`ml-auto flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-200 text-slate-800'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            }
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white shadow-lg shadow-[#2D8B7E]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 p-3 sm:p-4 md:p-6">
        {activeTab === 'service'    && <ServiceTab    vehicleId={vehicle.id} />}
        {activeTab === 'equipment'  && <EquipmentTab  vehicleId={vehicle.id} />}
        {activeTab === 'regulation' && <RegulationTab vehicleId={vehicle.id} initialKm={vehicle.initial_km} />}
        {activeTab === 'history'    && <HistoryTab    vehicleId={vehicle.id} onMileageChange={loadVehicle} />}
        {activeTab === 'inspection' && <InspectionTab vehicleId={vehicle.id} onInspectionChange={loadVehicle} />}
        {activeTab === 'expenses'   && <ExpensesTab  vehicleId={vehicle.id} />}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && vehicle && (vehicle.photos ?? []).length > 0 && (
        <div
          className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {(vehicle.photos ?? []).length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + (vehicle.photos ?? []).length) % (vehicle.photos ?? []).length); }}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors rotate-180"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % (vehicle.photos ?? []).length); }}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </>
          )}
          <img
            src={(vehicle.photos ?? [])[lightboxIdx].image}
            alt={`Photo ${lightboxIdx + 1}`}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {(vehicle.photos ?? []).length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {(vehicle.photos ?? []).map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`rounded-full transition-all ${i === lightboxIdx ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      <VehicleModal
        vehicle={vehicle}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={loadVehicle}
        onArchive={() => router.push('/vehicles')}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        title={t('archiveTitle')}
        message={t('archiveMessage', { number: vehicle.car_number || tVehicles('noPlate') })}
        confirmLabel={t('archiveVehicle')}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveConfirm(false)}
        isLoading={archiving}
        variant="warning"
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Service Tab
// ─────────────────────────────────────────────
type ServiceFilter = 'all' | 'pending' | 'done';

function ServiceTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleWorkspace.service');

  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ordering: 'planned_at' });
      if (filter === 'pending') params.set('is_done', 'false');
      if (filter === 'done') params.set('is_done', 'true');
      const res = await api.get<ServicePlan[] | { results: ServicePlan[] }>(
        `/fleet/vehicles/${vehicleId}/service-plans/?${params}`,
      );
      setPlans(Array.isArray(res.data) ? res.data : (res.data as { results: ServicePlan[] }).results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, filter]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const addPlan = async () => {
    if (!newTitle.trim() || !newDate) return;
    setAddLoading(true);
    try {
      const res = await api.post<ServicePlan>(`/fleet/vehicles/${vehicleId}/service-plans/`, {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        planned_at: newDate,
      });
      if (filter !== 'done') {
        setPlans(prev => [...prev, res.data].sort((a, b) => a.planned_at.localeCompare(b.planned_at)));
      }
      setNewTitle(''); setNewDesc(''); setNewDate(''); setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const toggleDone = async (plan: ServicePlan) => {
    setTogglingId(plan.id);
    try {
      const res = await api.patch<ServicePlan>(
        `/fleet/vehicles/${vehicleId}/service-plans/${plan.id}/`,
        { is_done: !plan.is_done },
      );
      if (filter === 'all') {
        setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p));
      } else {
        setPlans(prev => prev.filter(p => p.id !== plan.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const deletePlan = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/fleet/vehicles/${vehicleId}/service-plans/${id}/`);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    setEditTitle(plan.title);
    setEditDesc(plan.description ?? '');
    setEditDate(plan.planned_at);
  };

  const saveEdit = async () => {
    if (!editingPlan || !editTitle.trim() || !editDate) return;
    setEditLoading(true);
    try {
      const res = await api.patch<ServicePlan>(
        `/fleet/vehicles/${vehicleId}/service-plans/${editingPlan.id}/`,
        { title: editTitle.trim(), description: editDesc.trim() || null, planned_at: editDate },
      );
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? res.data : p));
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const getDateStatus = (plan: ServicePlan): 'overdue' | 'due_soon' | 'ok' | 'done' => {
    if (plan.is_done) return 'done';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(plan.planned_at); d.setHours(0, 0, 0, 0);
    if (d < today) return 'overdue';
    const soon = new Date(today); soon.setDate(soon.getDate() + 3);
    if (d <= soon) return 'due_soon';
    return 'ok';
  };

  const DATE_STYLES = {
    overdue:  { badge: 'bg-red-50 border-red-200 text-red-600',    label: t('overdue') },
    due_soon: { badge: 'bg-amber-50 border-amber-200 text-amber-700', label: t('dueSoon') },
    ok:       { badge: 'bg-slate-50 border-slate-200 text-slate-500', label: t('planned') },
    done:     { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: t('done') },
  };

  const FILTERS: { key: ServiceFilter; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'pending', label: t('filter.pending') },
    { key: 'done', label: t('filter.done') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewTitle(''); setNewDesc(''); setNewDate(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-3 sm:px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold flex-shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          <span className="hidden sm:inline">{t('add')}</span>
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Inline add form ── */}
      {showAdd && (
        <div className="mb-4 p-3 sm:p-4 bg-white border border-[#2D8B7E]/30 rounded-2xl shadow-sm space-y-3">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPlan(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder={t('titlePlaceholder')}
            className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder={t('descPlaceholder')}
            className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] resize-none"
          />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
              <label className="text-xs font-semibold text-slate-500 flex-shrink-0">{t('plannedLabel')}</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="flex-1 sm:flex-initial text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
              />
            </div>
            <button
              onClick={addPlan}
              disabled={addLoading || !newTitle.trim() || !newDate}
              className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#246f65] transition-colors disabled:opacity-50"
            >
              {addLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Plus className="w-4 h-4" strokeWidth={3} />}
              {t('add')}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
            <Wrench className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">{filter === 'all' ? t('empty') : t('emptyFiltered')}</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{filter === 'all' ? t('emptyDesc') : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const isEditing = editingPlan?.id === plan.id;
            const ds = getDateStatus(plan);
            const style = DATE_STYLES[ds];
            const isToggling = togglingId === plan.id;
            const isDeleting = deletingId === plan.id;

            if (isEditing) {
              return (
                <div key={plan.id} className="p-4 bg-white border border-[#2D8B7E]/30 rounded-2xl shadow-sm space-y-3">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingPlan(null); }}
                    placeholder={t('titlePlaceholder')}
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                  />
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder={t('descPlaceholder')}
                    className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-xs font-semibold text-slate-500 flex-shrink-0">{t('plannedLabel')}</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                      />
                    </div>
                    <button
                      onClick={saveEdit}
                      disabled={editLoading || !editTitle.trim() || !editDate}
                      className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#246f65] transition-colors disabled:opacity-50"
                    >
                      {editLoading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-4 h-4" strokeWidth={3} />}
                      {t('save')}
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={plan.id}
                className="flex flex-wrap sm:flex-nowrap items-start gap-3 sm:gap-4 bg-white border border-slate-200 rounded-2xl px-3 sm:px-5 py-3 sm:py-4 shadow-sm group hover:border-slate-300 transition-colors"
              >
                {/* Done toggle */}
                <button
                  onClick={() => toggleDone(plan)}
                  disabled={isToggling || isDeleting}
                  className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all disabled:opacity-50 ${
                    plan.is_done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-white border-slate-300 hover:border-[#2D8B7E]'
                  }`}
                >
                  {isToggling ? (
                    <div className={`w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin ${plan.is_done ? 'border-white' : 'border-slate-400'}`} />
                  ) : plan.is_done ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${plan.is_done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {plan.title}
                  </p>
                  {plan.description && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{plan.description}</p>
                  )}
                </div>

                {/* Date badge */}
                <div className={`flex-shrink-0 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border ${style.badge}`}>
                  <span>{style.label}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{new Date(plan.planned_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })}</span>
                </div>

                {/* Edit + Delete */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => startEdit(plan)}
                    disabled={isDeleting || isToggling}
                    className="mt-0.5 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#2D8B7E] transition-all disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    disabled={isDeleting || isToggling}
                    className="mt-0.5 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 transition-all disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                  >
                    {isDeleting
                      ? <div className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Equipment Tab
// ─────────────────────────────────────────────
function EquipmentTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleWorkspace.equipment');

  const equipmentNames: Record<string, string> = {
    'Вогнегасник': t('items.Вогнегасник'),
    'Аптечка': t('items.Аптечка'),
    'Трикутник': t('items.Трикутник'),
    'Жилет': t('items.Жилет'),
    'Буксирувальний трос': t('items.Буксирувальний трос'),
    'Запасне колесо': t('items.Запасне колесо'),
    'Домкрат': t('items.Домкрат'),
  };

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<EquipmentItem[]>(`/fleet/vehicles/${vehicleId}/equipment/`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const addEquipment = async () => {
    if (!newName.trim()) return;
    setAddLoading(true);
    try {
      const res = await api.post<EquipmentItem>(`/fleet/vehicles/${vehicleId}/equipment/`, {
        equipment: newName.trim(),
      });
      setItems(prev => [...prev, res.data].sort((a, b) => a.equipment.localeCompare(b.equipment)));
      setNewName('');
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const deleteEquipment = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/fleet/vehicles/${vehicleId}/equipment/${id}/`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEquipment = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await api.patch<EquipmentItem>(`/fleet/vehicles/${vehicleId}/equipment/${id}/toggle/`);
      setItems(prev => prev.map(i => i.id === id ? res.data : i));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {items.length > 0 ? t('total', { count: items.length }) : t('subtitle')}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewName(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold flex-shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          {t('addEquipment')}
        </button>
      </div>

      {/* ── Inline add form ── */}
      {showAdd && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-white border border-[#2D8B7E]/30 rounded-xl shadow-sm">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addEquipment(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder={t('newItemPlaceholder')}
            className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          />
          <button
            onClick={addEquipment}
            disabled={addLoading || !newName.trim()}
            className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-[#248B7B] transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {addLoading
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
            {t('add')}
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors flex-shrink-0"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">{t('empty')}</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{t('emptyDesc')}</p>
        </div>
      ) : (
        /* ── Equipment list ── */
        <div className="space-y-2">
          {items.map(item => {
            const isDeleting = deletingId === item.id;
            const isToggling = togglingId === item.id;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm group hover:border-slate-300 transition-colors"
              >
                {/* Toggle circle */}
                <button
                  onClick={() => toggleEquipment(item.id)}
                  disabled={isToggling || isDeleting}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all disabled:opacity-50 ${
                    item.is_equipped
                      ? 'bg-[#2D8B7E] hover:bg-[#246f65]'
                      : 'bg-white border-2 border-slate-300 hover:border-[#2D8B7E]'
                  }`}
                >
                  {isToggling ? (
                    <div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${item.is_equipped ? 'border-white' : 'border-slate-400'}`} />
                  ) : item.is_equipped ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>

                {/* Name */}
                <span className={`flex-1 text-sm font-semibold transition-colors ${
                  item.is_equipped
                    ? 'text-slate-400 line-through decoration-slate-300'
                    : 'text-slate-800'
                }`}>
                  {equipmentNames[item.equipment] || item.equipment}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => deleteEquipment(item.id)}
                  disabled={isDeleting || isToggling}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  {isDeleting
                    ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper: pick the right locale title or fall back to default
// ─────────────────────────────────────────────
function localTitle(
  item: { title: string; title_pl: string; title_uk: string },
  locale: string,
): string {
  if (locale === 'pl' && item.title_pl) return item.title_pl;
  if (locale === 'uk' && item.title_uk) return item.title_uk;
  return item.title;
}

// ─────────────────────────────────────────────
// Regulation Tab
// ─────────────────────────────────────────────
function RegulationTab({ vehicleId, initialKm }: { vehicleId: string; initialKm: number }) {
  const t = useTranslations('vehicleWorkspace.regulation');
  const locale = useLocale();
  const [status, setStatus] = useState<'loading' | 'unassigned' | 'assigned'>('loading');
  const [plan, setPlan] = useState<RegulationPlan | null>(null);
  const [defaultSchema, setDefaultSchema] = useState<RegulationSchema | null>(null);
  const [kmInputs, setKmInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'plan' | 'history'>('plan');
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markKm, setMarkKm] = useState('');
  const [markLoading, setMarkLoading] = useState(false);

  // Add entry form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' });
  const [addLoading, setAddLoading] = useState(false);

  // Delete entry state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Excluded items for unassigned view
  const [excludedItemIds, setExcludedItemIds] = useState<Set<number>>(new Set());

  // Custom items added during initial assignment
  interface CustomEntry { id: number; title: string; title_pl: string; every_km: string; notify_before_km: string; last_done_km: string }
  const [customEntries, setCustomEntries] = useState<CustomEntry[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' });
  const customIdRef = useRef(0);

  const loadRegulation = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.get<RegulationPlan | { assigned: false }>(
        `/fleet/vehicles/${vehicleId}/regulation/`
      );
      if (res.data.assigned) {
        setPlan(res.data as RegulationPlan);
        setStatus('assigned');
      } else {
        const schemaRes = await api.get<{ results: RegulationSchema[] } | RegulationSchema[]>(
          '/fleet/regulation/schemas/?is_default=true'
        );
        const schemas = Array.isArray(schemaRes.data)
          ? schemaRes.data
          : schemaRes.data.results ?? [];
        setDefaultSchema(schemas[0] ?? null);
        setExcludedItemIds(new Set());
        setStatus('unassigned');
      }
    } catch (err) {
      console.error('Failed to load regulation:', err);
      setStatus('unassigned');
    }
  }, [vehicleId]);

  useEffect(() => {
    loadRegulation();
  }, [loadRegulation]);

  const handleAssign = async () => {
    if (!defaultSchema) return;
    setSaving(true);
    setError(null);
    try {
      const filteredItems = defaultSchema.items.filter(item => !excludedItemIds.has(item.id));
      await api.post(`/fleet/regulation/${vehicleId}/assign/`, {
        schema_id: defaultSchema.id,
        entries: filteredItems.map(item => ({
          item_id: item.id,
          last_done_km: parseInt(kmInputs[item.id] ?? '0', 10),
        })),
      });
      // Create custom entries after assignment
      for (const ce of customEntries) {
        await api.post(`/fleet/vehicles/${vehicleId}/regulation/entries/`, {
          title: ce.title,
          title_pl: ce.title_pl,
          title_uk: ce.title,
          every_km: parseInt(ce.every_km, 10),
          notify_before_km: parseInt(ce.notify_before_km || '500', 10),
          last_done_km: parseInt(ce.last_done_km || '0', 10),
        });
      }
      await loadRegulation();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (entryId: number) => {
    const km = parseInt(markKm, 10);
    if (isNaN(km) || km < 0) return;
    setMarkLoading(true);
    try {
      const res = await api.patch<RegulationPlanEntry>(
        `/fleet/vehicles/${vehicleId}/regulation/entries/${entryId}/`,
        { last_done_km: km },
      );
      setPlan(prev => prev ? {
        ...prev,
        entries: prev.entries.map(e => e.id === entryId ? res.data : e),
      } : prev);
      setMarkingId(null);
      setMarkKm('');
    } catch (err) {
      console.error(err);
    } finally {
      setMarkLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!addForm.title || !addForm.every_km) return;
    setAddLoading(true);
    try {
      const res = await api.post<RegulationPlanEntry>(
        `/fleet/vehicles/${vehicleId}/regulation/entries/`,
        {
          title: addForm.title,
          title_pl: addForm.title_pl,
          title_uk: addForm.title,
          every_km: parseInt(addForm.every_km, 10),
          notify_before_km: parseInt(addForm.notify_before_km || '500', 10),
          last_done_km: parseInt(addForm.last_done_km || '0', 10),
        },
      );
      setPlan(prev => prev ? { ...prev, entries: [...prev.entries, res.data] } : prev);
      setShowAddForm(false);
      setAddForm({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' });
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    setDeleteLoading(true);
    try {
      await api.delete(`/fleet/vehicles/${vehicleId}/regulation/entries/${entryId}/delete/`);
      setPlan(prev => prev ? { ...prev, entries: prev.entries.filter(e => e.id !== entryId) } : prev);
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Assigned: show plan or history ──
  if (status === 'assigned' && plan) {
    return (
      <div>
        {/* Header + view toggle */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">{t('title')}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {localTitle(plan.schema, locale)} · {t('assignedOn')} {new Date(plan.assigned_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
              <button
                onClick={() => setActiveView('plan')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'plan'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                {t('planView')}
              </button>
              <button
                onClick={() => setActiveView('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                {t('historyView')}
              </button>
            </div>
            {activeView === 'plan' && (
              <button
                onClick={() => setShowAddForm(prev => !prev)}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#2D8B7E] hover:bg-[#246f65] rounded-xl px-3 py-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                <span className="hidden sm:inline">{t('addEntry')}</span>
              </button>
            )}
          </div>
        </div>

        {activeView === 'plan' ? (
          <div className="space-y-2">
            {/* Add entry form */}
            {showAddForm && (
              <div className="bg-white border-2 border-dashed border-[#2D8B7E]/30 rounded-2xl px-3 sm:px-5 py-4 shadow-sm">
                <p className="text-sm font-bold text-slate-800 mb-3">{t('addEntryTitle')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryName')}</label>
                    <input
                      autoFocus
                      type="text"
                      value={addForm.title}
                      onChange={e => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Escape') setShowAddForm(false); }}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryNamePl')}</label>
                    <input
                      type="text"
                      value={addForm.title_pl}
                      onChange={e => setAddForm(prev => ({ ...prev, title_pl: e.target.value }))}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryInterval')}</label>
                    <input
                      type="number"
                      min="1"
                      value={addForm.every_km}
                      onChange={e => setAddForm(prev => ({ ...prev, every_km: e.target.value }))}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryNotifyBefore')}</label>
                    <input
                      type="number"
                      min="0"
                      value={addForm.notify_before_km}
                      onChange={e => setAddForm(prev => ({ ...prev, notify_before_km: e.target.value }))}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryLastDone')}</label>
                    <input
                      type="number"
                      min="0"
                      value={addForm.last_done_km}
                      onChange={e => setAddForm(prev => ({ ...prev, last_done_km: e.target.value }))}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddEntry}
                    disabled={addLoading || !addForm.title || !addForm.every_km}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#2D8B7E] hover:bg-[#246f65] rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                  >
                    {addLoading
                      ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
                    {t('save')}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setAddForm({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' }); }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}

            {plan.entries.map(entry => {
              const isOverdue = initialKm >= entry.next_due_km;
              const isDueSoon = !isOverdue && initialKm >= entry.next_due_km - entry.effective_notify_before_km;
              const isMarking = markingId === entry.id;
              const isDeleting = deletingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`bg-white border rounded-2xl px-3 sm:px-5 py-3 sm:py-4 shadow-sm transition-colors ${
                    isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-400' : 'bg-emerald-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{localTitle(entry.item, locale)}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {t('everyKm', { km: entry.effective_every_km.toLocaleString() })}
                      </p>
                    </div>

                    {/* Desktop: km blocks + mark done + delete inline */}
                    <div className="hidden md:flex items-center gap-2 flex-shrink-0 text-right">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('done')}</p>
                        <p className="text-sm font-bold text-slate-700">{entry.last_done_km.toLocaleString()} {t('km')}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 border ${
                        isOverdue
                          ? 'bg-red-50 border-red-200'
                          : isDueSoon
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-[#2D8B7E]/5 border-[#2D8B7E]/20'
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${
                          isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-[#2D8B7E]/70'
                        }`}>{t('next')}</p>
                        <p className={`text-sm font-bold ${
                          isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-700' : 'text-[#2D8B7E]'
                        }`}>{entry.next_due_km.toLocaleString()} {t('km')}</p>
                      </div>
                      <button
                        onClick={() => { setMarkingId(entry.id); setMarkKm(String(initialKm)); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2D8B7E] bg-slate-50 hover:bg-[#2D8B7E]/5 border border-slate-200 hover:border-[#2D8B7E]/30 rounded-xl px-3 py-2 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('markDone')}
                      </button>
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Mobile: action buttons */}
                    <div className="flex md:hidden items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setMarkingId(entry.id); setMarkKm(String(initialKm)); }}
                        className="items-center text-xs font-bold text-slate-500 hover:text-[#2D8B7E] bg-slate-50 hover:bg-[#2D8B7E]/5 border border-slate-200 hover:border-[#2D8B7E]/30 rounded-xl p-2 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(entry.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile: km blocks below title */}
                  <div className="flex md:hidden items-center gap-2 mt-2.5 ml-[22px] sm:ml-[26px]">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('done')}</p>
                      <p className="text-xs font-bold text-slate-700">{entry.last_done_km.toLocaleString()} {t('km')}</p>
                    </div>
                    <div className={`rounded-xl px-2.5 py-1.5 border ${
                      isOverdue
                        ? 'bg-red-50 border-red-200'
                        : isDueSoon
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-[#2D8B7E]/5 border-[#2D8B7E]/20'
                    }`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-[#2D8B7E]/70'
                      }`}>{t('next')}</p>
                      <p className={`text-xs font-bold ${
                        isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-700' : 'text-[#2D8B7E]'
                      }`}>{entry.next_due_km.toLocaleString()} {t('km')}</p>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  {isDeleting && (
                    <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <span className="text-xs text-red-600 font-medium">{t('deleteConfirm')}</span>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deleteLoading}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {deleteLoading
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Inline mark-done form */}
                  {isMarking && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                      <Gauge className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 font-medium flex-shrink-0">Виконано при:</span>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={markKm}
                        onChange={e => setMarkKm(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') markDone(entry.id); if (e.key === 'Escape') { setMarkingId(null); setMarkKm(''); } }}
                        className="w-24 sm:w-32 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400 font-medium">{t('km')}</span>
                      <button
                        onClick={() => markDone(entry.id)}
                        disabled={markLoading}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-[#2D8B7E] hover:bg-[#246f65] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {markLoading
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t('save')}
                      </button>
                      <button
                        onClick={() => { setMarkingId(null); setMarkKm(''); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <RegulationHistoryPanel vehicleId={vehicleId} />
        )}
      </div>
    );
  }

  // ── Unassigned: show default schema + km inputs ──
  if (!defaultSchema) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
          <ScrollText className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">{t('noDefault')}</h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{t('noDefaultDesc')}</p>
      </div>
    );
  }

  const visibleItems = defaultSchema.items.filter(item => !excludedItemIds.has(item.id));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-900">{t('assignTitle')}</h2>
        <p className="text-sm text-slate-500 mt-0.5 font-medium">
          {t('assignSubtitle', { schema: localTitle(defaultSchema, locale) })}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="divide-y divide-slate-100">
          {visibleItems.map((item, idx) => {
            const lastDone = parseInt(kmInputs[item.id] ?? '0', 10) || 0;
            const nextDue = lastDone + item.every_km;
            return (
              <div key={item.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{localTitle(item, locale)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('everyKm', { km: item.every_km.toLocaleString() })}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full md:w-auto ml-9 md:ml-0">
                  <div className="text-right flex-1 md:flex-initial">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      {t('entryLastDone')}
                    </p>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={kmInputs[item.id] ?? ''}
                      onChange={e => setKmInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-full md:w-28 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="w-4 h-px bg-slate-200 flex-shrink-0 hidden sm:block" />
                  <div className="bg-[#2D8B7E]/5 border border-[#2D8B7E]/20 rounded-xl px-3 py-2 text-right min-w-[90px]">
                    <p className="text-[10px] font-bold text-[#2D8B7E]/70 uppercase tracking-widest mb-0.5">
                      {t('next')}
                    </p>
                    <p className="text-sm font-bold text-[#2D8B7E]">
                      {nextDue.toLocaleString()} {t('km')}
                    </p>
                  </div>
                  <button
                    onClick={() => setExcludedItemIds(prev => new Set([...prev, item.id]))}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all flex-shrink-0"
                    title={t('removeFromList')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom entries added by user */}
      {customEntries.length > 0 && (
        <div className="bg-white border border-dashed border-[#2D8B7E]/30 rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="divide-y divide-slate-100">
            {customEntries.map((ce, idx) => {
              const lastDone = parseInt(ce.last_done_km || '0', 10) || 0;
              const nextDue = lastDone + (parseInt(ce.every_km || '0', 10) || 0);
              return (
                <div key={ce.id} className="flex flex-wrap md:flex-nowrap items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4">
                  <span className="w-6 h-6 rounded-full bg-[#2D8B7E]/10 text-[#2D8B7E] text-xs font-bold flex items-center justify-center flex-shrink-0">
                    +{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{ce.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('everyKm', { km: parseInt(ce.every_km || '0', 10).toLocaleString() })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full md:w-auto ml-9 md:ml-0">
                    <div className="text-right flex-1 md:flex-initial">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('entryLastDone')}</p>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={ce.last_done_km}
                        onChange={e => setCustomEntries(prev => prev.map(c => c.id === ce.id ? { ...c, last_done_km: e.target.value } : c))}
                        className="w-full md:w-28 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div className="w-4 h-px bg-slate-200 flex-shrink-0 hidden sm:block" />
                    <div className="bg-[#2D8B7E]/5 border border-[#2D8B7E]/20 rounded-xl px-3 py-2 text-right min-w-[90px]">
                      <p className="text-[10px] font-bold text-[#2D8B7E]/70 uppercase tracking-widest mb-0.5">{t('next')}</p>
                      <p className="text-sm font-bold text-[#2D8B7E]">{nextDue.toLocaleString()} {t('km')}</p>
                    </div>
                    <button
                      onClick={() => setCustomEntries(prev => prev.filter(c => c.id !== ce.id))}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add custom entry form */}
      {showCustomForm ? (
        <div className="bg-white border-2 border-dashed border-[#2D8B7E]/30 rounded-2xl px-3 sm:px-5 py-4 shadow-sm mb-4">
          <p className="text-sm font-bold text-slate-800 mb-3">{t('addEntryTitle')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryName')}</label>
              <input
                autoFocus
                type="text"
                value={customForm.title}
                onChange={e => setCustomForm(prev => ({ ...prev, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') setShowCustomForm(false); }}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryNamePl')}</label>
              <input
                type="text"
                value={customForm.title_pl}
                onChange={e => setCustomForm(prev => ({ ...prev, title_pl: e.target.value }))}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryInterval')}</label>
              <input
                type="number"
                min="1"
                value={customForm.every_km}
                onChange={e => setCustomForm(prev => ({ ...prev, every_km: e.target.value }))}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{t('entryNotifyBefore')}</label>
              <input
                type="number"
                min="0"
                value={customForm.notify_before_km}
                onChange={e => setCustomForm(prev => ({ ...prev, notify_before_km: e.target.value }))}
                className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!customForm.title || !customForm.every_km) return;
                customIdRef.current -= 1;
                setCustomEntries(prev => [...prev, { id: customIdRef.current, ...customForm }]);
                setShowCustomForm(false);
                setCustomForm({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' });
              }}
              disabled={!customForm.title || !customForm.every_km}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#2D8B7E] hover:bg-[#246f65] rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
              {t('save')}
            </button>
            <button
              onClick={() => { setShowCustomForm(false); setCustomForm({ title: '', title_pl: '', every_km: '', notify_before_km: '500', last_done_km: '0' }); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCustomForm(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#2D8B7E] hover:text-[#246f65] bg-[#2D8B7E]/5 hover:bg-[#2D8B7E]/10 border border-dashed border-[#2D8B7E]/30 hover:border-[#2D8B7E]/50 rounded-xl px-4 py-2.5 transition-all mb-4"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          {t('addEntry')}
        </button>
      )}

      {excludedItemIds.size > 0 && (
        <button
          onClick={() => setExcludedItemIds(new Set())}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 mb-4 underline underline-offset-2 transition-colors"
        >
          {t('history.clearFilters')} ({excludedItemIds.size})
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
      )}

      <button
        onClick={handleAssign}
        disabled={saving || visibleItems.length === 0}
        className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-6 py-2.5 rounded-xl hover:shadow-xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold disabled:opacity-60 disabled:pointer-events-none"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus className="w-4 h-4" strokeWidth={3} />
        )}
        {t('saveRegulation')}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Regulation History Panel (timeline)
// ─────────────────────────────────────────────
const EVENT_CONFIG = {
  performed: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  km_updated: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  notified: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
} as const;

function RegulationHistoryPanel({ vehicleId }: { vehicleId: string }) {
  const locale = useLocale();
  const t = useTranslations('vehicleWorkspace.regulation');

  const [entries, setEntries] = useState<RegulationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventType, setEventType] = useState('');
  const [ordering, setOrdering] = useState('created_at');

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ordering });
      if (dateFrom) params.set('created_after', `${dateFrom}T00:00:00`);
      if (dateTo)   params.set('created_before', `${dateTo}T23:59:59`);
      if (eventType) params.set('event_type', eventType);
      const res = await api.get(`/fleet/vehicles/${vehicleId}/regulation/history/?${params}`);
      const data = res.data;
      setEntries(Array.isArray(data) ? data : (data as { results: RegulationHistoryEntry[] }).results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, dateFrom, dateTo, eventType, ordering]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const itemTitle = (entry: RegulationHistoryEntry) => {
    if (locale === 'pl' && entry.item_title_pl) return entry.item_title_pl;
    if (locale === 'uk' && entry.item_title_uk) return entry.item_title_uk;
    return entry.item_title;
  };

  // Group by month-year key for section dividers
  const grouped = entries.reduce<Record<string, { label: string; entries: RegulationHistoryEntry[] }>>(
    (acc, entry) => {
      const d = new Date(entry.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = {
          label: d.toLocaleString(locale === 'uk' ? 'uk-UA' : 'pl-PL', { month: 'long', year: 'numeric' }),
          entries: [],
        };
      }
      acc[key].entries.push(entry);
      return acc;
    },
    {},
  );

  return (
    <div>
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {t('history.filters')}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{t('history.from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{t('history.to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
            />
          </div>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          >
            <option value="">{t('history.allEvents')}</option>
            <option value="performed">{t('history.performed')}</option>
            <option value="km_updated">{t('history.km_updated')}</option>
            <option value="notified">{t('history.notified')}</option>
          </select>
          <button
            onClick={() => setOrdering(o => o === 'created_at' ? '-created_at' : 'created_at')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
          >
            {ordering === 'created_at' ? '↑' : '↓'}
            {ordering === 'created_at' ? t('history.oldestFirst') : t('history.newestFirst')}
          </button>
          {(dateFrom || dateTo || eventType) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setEventType(''); }}
              className="text-xs font-medium text-slate-400 hover:text-red-500 px-2 py-1.5 transition-colors"
            >
              {t('history.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">{t('history.empty')}</p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([key, group]) => (
            <div key={key} className="mb-8">
              {/* Month divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 capitalize">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] font-bold text-slate-300">{group.entries.length}</span>
              </div>

              {/* Entries with vertical line */}
              <div className="relative">
                <div className="absolute left-[15px] sm:left-[19px] top-4 bottom-4 w-px bg-slate-200" />
                <div className="space-y-3">
                  {group.entries.map(entry => {
                    const cfg = EVENT_CONFIG[entry.event_type];
                    return (
                      <div key={entry.id} className="relative flex items-start gap-3 sm:gap-4 pl-9 sm:pl-11">
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-2.5 sm:left-3.5 top-3.5 sm:top-4 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full ${cfg.dot} border-2 border-white shadow-sm z-10`}
                        />
                        {/* Card */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-sm hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-2 sm:gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {itemTitle(entry)}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border ${cfg.badge} flex-shrink-0`}>
                                {t(`history.${entry.event_type}`)}
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                              {new Date(entry.created_at).toLocaleString(
                                locale === 'uk' ? 'uk-UA' : 'pl-PL',
                                { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Gauge className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                              <span className="text-xs font-semibold text-slate-700">
                                {entry.km_at_event.toLocaleString()} {t('km')}
                              </span>
                            </div>
                            <span className="text-slate-200 text-xs">·</span>
                            <span className={`text-xs font-semibold ${entry.km_remaining > 0 ? 'text-slate-400' : 'text-red-500'}`}>
                              {entry.km_remaining > 0 ? `+${entry.km_remaining.toLocaleString()}` : entry.km_remaining.toLocaleString()} {t('km')} {t('history.remaining')}
                            </span>
                            {entry.note ? (
                              <>
                                <span className="text-slate-200 text-xs">·</span>
                                <span className="text-xs text-slate-400 italic">{entry.note}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Owners Tab
// ─────────────────────────────────────────────

function DriverSearchSelect({ drivers, value, onChange, placeholder }: {
  drivers: DriverOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${d.first_name} ${d.last_name}`.toLowerCase().includes(q);
  });

  const selected = drivers.find(d => d.id === value);

  return (
    <div ref={ref} className="relative">
      <div
        className="flex items-center w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-white cursor-pointer focus-within:ring-2 focus-within:ring-[#2D8B7E] focus-within:border-[#2D8B7E] transition-all"
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
        {open ? (
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="flex-1 outline-none bg-transparent text-sm placeholder:text-slate-400"
            onFocus={() => setOpen(true)}
          />
        ) : (
          <span className={`flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
            {selected ? `${selected.first_name} ${selected.last_name}` : placeholder}
          </span>
        )}
        {value && !open && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }}
            className="ml-1 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-slate-400 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400 text-center">{placeholder}</div>
          ) : (
            filtered.map(d => (
              <button
                key={d.id}
                onClick={() => { onChange(d.id); setSearch(''); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                  d.id === value ? 'bg-[#2D8B7E]/5 text-[#2D8B7E] font-semibold' : 'text-slate-700'
                }`}
              >
                {d.first_name} {d.last_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OwnersTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleWorkspace.owners');
  const [currentOwner, setCurrentOwner] = useState<VehicleOwner | null>(null);
  const [history, setHistory] = useState<OwnerHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [unassigning, setUnassigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ownerData, historyData, driversRes] = await Promise.all([
        vehicleService.getCurrentOwner(vehicleId),
        vehicleService.getOwnershipHistory(vehicleId),
        api.get('/driver/'),
      ]);
      setCurrentOwner(ownerData);
      setHistory(historyData);
      const driverData = driversRes.data;
      setDrivers(Array.isArray(driverData) ? driverData : (driverData as { results: DriverOption[] }).results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssign = async () => {
    if (!selectedDriver) return;
    setSaving(true);
    try {
      await vehicleService.assignOwner(vehicleId, {
        driver: selectedDriver,
        agreement_number: agreementNumber.trim(),
      });
      setShowAdd(false);
      setSelectedDriver('');
      setAgreementNumber('');
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async () => {
    setUnassigning(true);
    try {
      await vehicleService.unassignOwner(vehicleId);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setUnassigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setSelectedDriver(''); setAgreementNumber(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          {t('add')}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <DriverSearchSelect
            drivers={drivers}
            value={selectedDriver}
            onChange={setSelectedDriver}
            placeholder={t('selectDriver')}
          />
          <input
            type="text"
            placeholder={t('agreementPlaceholder')}
            value={agreementNumber}
            onChange={(e) => setAgreementNumber(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedDriver || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[#2D8B7E] text-white rounded-xl hover:bg-[#246f65] disabled:opacity-50 transition-colors"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* Current owner */}
      {currentOwner && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">{t('current')}</h3>
          <div className="flex items-center justify-between p-4 rounded-2xl border bg-emerald-50 border-emerald-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {currentOwner.driver.first_name} {currentOwner.driver.last_name}
                </p>
                {currentOwner.agreement_number && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {t('agreement')}: {currentOwner.agreement_number}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(currentOwner.assigned_at).toLocaleDateString()} — <span className="text-emerald-600 font-semibold">{t('current')}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleUnassign}
              disabled={unassigning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all flex-shrink-0 ml-3"
            >
              {unassigning && (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {t('close')}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length === 0 && !currentOwner ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold text-sm">{t('empty')}</p>
          <p className="text-xs mt-1">{t('emptyDesc')}</p>
        </div>
      ) : history.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">{t('title')}</h3>
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 rounded-2xl border bg-white border-slate-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {record.driver.first_name} {record.driver.last_name}
                    </p>
                    {record.agreement_number && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {t('agreement')}: {record.agreement_number}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(record.assigned_at).toLocaleDateString()} — {new Date(record.unassigned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// History Tab (wrapper with sub-tabs: Owners / Mileage)
// ══════════════════════════════════════════════════════════════════════════════

type HistorySubTab = 'owners' | 'mileage';

function HistoryTab({ vehicleId, onMileageChange }: { vehicleId: string; onMileageChange: () => void }) {
  const t = useTranslations('vehicleWorkspace');
  const [subTab, setSubTab] = useState<HistorySubTab>('owners');

  const subTabs: { id: HistorySubTab; label: string; icon: typeof Users }[] = [
    { id: 'owners',  label: t('tabs.owners'),  icon: Users },
    { id: 'mileage', label: t('tabs.mileage'), icon: Gauge },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-5">
        {subTabs.map(st => {
          const Icon = st.icon;
          const isActive = subTab === st.id;
          return (
            <button
              key={st.id}
              onClick={() => setSubTab(st.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
              {st.label}
            </button>
          );
        })}
      </div>
      {subTab === 'owners'  && <OwnersTab  vehicleId={vehicleId} />}
      {subTab === 'mileage' && <MileageTab vehicleId={vehicleId} onMileageChange={onMileageChange} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Mileage Tab
// ══════════════════════════════════════════════════════════════════════════════

function MileageTab({ vehicleId, onMileageChange }: { vehicleId: string; onMileageChange: () => void }) {
  const t = useTranslations('vehicleWorkspace.mileage');
  const [logs, setLogs] = useState<MileageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [km, setKm] = useState('');
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<MileageLog[] | { results: MileageLog[] }>(`/vehicle/${vehicleId}/mileage/`);
      setLogs(Array.isArray(res.data) ? res.data : res.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const currentKm = logs.length > 0 ? logs[0].km : 0;

  const addLog = async () => {
    const kmVal = parseInt(km, 10);
    if (!kmVal || kmVal <= 0 || !recordedAt) return;
    if (kmVal <= currentKm) {
      setAddError(t('minError', { km: currentKm.toLocaleString() }));
      return;
    }
    setAddError('');
    setSaving(true);
    try {
      const res = await api.post<MileageLog>(`/vehicle/${vehicleId}/mileage/`, {
        km: kmVal,
        recorded_at: recordedAt,
      });
      setLogs(prev => [res.data, ...prev]);
      setShowAdd(false);
      setKm('');
      setRecordedAt(new Date().toISOString().split('T')[0]);
      onMileageChange();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          {t('add')}
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              min={currentKm + 1}
              value={km}
              onChange={(e) => { setKm(e.target.value); setAddError(''); }}
              placeholder={t('kmPlaceholder')}
              className={`px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-white ${addError ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 focus:ring-[#2D8B7E]'}`}
            />
            <input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D8B7E] bg-white"
            />
          </div>
          {addError && <p className="text-xs text-red-500 font-medium">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={addLog}
              disabled={saving || !km || parseInt(km, 10) <= 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2D8B7E] hover:bg-[#248B7B] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {t('save')}
            </button>
            <button
              onClick={() => { setShowAdd(false); setKm(''); setAddError(''); }}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gauge className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 mb-1">{t('empty')}</h3>
          <p className="text-sm text-slate-400">{t('emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, idx) => {
            const prev = logs[idx + 1];
            const diff = prev ? log.km - prev.km : null;
            return (
              <div key={log.id} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gauge className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{log.km.toLocaleString()} км</span>
                    {diff !== null && diff > 0 && (
                      <span className="text-xs font-bold text-[#2D8B7E]">+{diff.toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(log.recorded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Inspection Tab
// ══════════════════════════════════════════════════════════════════════════════

function InspectionTab({ vehicleId, onInspectionChange }: { vehicleId: string; onInspectionChange: () => void }) {
  const t = useTranslations('vehicleWorkspace.inspection');
  const [inspections, setInspections] = useState<TechnicalInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNextDate, setFormNextDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-compute next inspection date (+1 year) when formDate changes
  useEffect(() => {
    if (formDate) {
      const d = new Date(formDate);
      d.setFullYear(d.getFullYear() + 1);
      setFormNextDate(d.toISOString().split('T')[0]);
    }
  }, [formDate]);

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getInspections(vehicleId);
      setInspections(data);
    } catch (err) {
      console.error('Failed to load inspections:', err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { loadInspections(); }, [loadInspections]);

  const handleSubmit = async () => {
    if (!formDate) return;
    setSaving(true);
    try {
      await vehicleService.createInspection(vehicleId, {
        inspection_date: formDate,
        next_inspection_date: formNextDate || undefined,
        notes: formNotes || undefined,
        report: formFile || undefined,
      });
      setShowForm(false);
      setFormDate(new Date().toISOString().split('T')[0]);
      setFormNextDate('');
      setFormNotes('');
      setFormFile(null);
      await loadInspections();
      onInspectionChange();
    } catch (err) {
      console.error('Failed to create inspection:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inspectionId: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    setDeletingId(inspectionId);
    try {
      await vehicleService.deleteInspection(vehicleId, inspectionId);
      await loadInspections();
      onInspectionChange();
    } catch (err) {
      console.error('Failed to delete inspection:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const latest = inspections[0] ?? null;

  const getStatusColor = (days: number) => {
    if (days < 0)  return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' };
    if (days <= 7) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100 text-red-600' };
    if (days <= 30) return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' };
    return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Current status card ── */}
      {latest ? (() => {
        const daysLeft = Math.round((new Date(latest.next_inspection_date || latest.expiry_date).getTime() - Date.now()) / 86400000);
        const sc = getStatusColor(daysLeft);
        return (
          <div className={`${sc.bg} border ${sc.border} rounded-2xl p-3 sm:p-5`}>
            <div className="flex items-start sm:items-center gap-3 mb-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.badge}`}>
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{t('current')}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{t('subtitle')}</p>
              </div>
              <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold flex-shrink-0 ${sc.badge}`}>
                {daysLeft < 0
                  ? t('overdue', { days: Math.abs(daysLeft) })
                  : t('daysLeft', { days: daysLeft })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">{t('inspectionDate')}</p>
                <p className="text-sm font-bold text-slate-800">
                  {new Date(latest.inspection_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">{t('validUntil')}</p>
                <p className={`text-sm font-bold ${sc.text}`}>
                  {new Date(latest.next_inspection_date || latest.expiry_date).toLocaleDateString()}
                </p>
              </div>
            </div>
            {latest.report && (
              <a
                href={latest.report}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#2D8B7E] hover:text-[#248B7B] transition-colors"
              >
                <FileText className="w-4 h-4" />
                {t('downloadReport')}
              </a>
            )}
          </div>
        );
      })() : (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">{t('empty')}</p>
          <p className="text-sm text-slate-400 mt-1">{t('emptyDesc')}</p>
        </div>
      )}

      {/* ── Add button / Form ── */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 hover:border-[#2D8B7E] rounded-2xl text-sm font-bold text-slate-500 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/5 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('add')}
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('inspectionDate')}</label>
              <input
                type="date"
                value={formDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setFormDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('nextInspectionDate')}</label>
              <input
                type="date"
                value={formNextDate}
                onChange={e => setFormNextDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('report')}</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{formFile ? formFile.name : t('noReport')}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => { setFormFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('notes')}</label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-[#2D8B7E] focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!formDate || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#2D8B7E]/20 hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {t('save')}
            </button>
            <button
              onClick={() => { setShowForm(false); setFormFile(null); setFormNotes(''); }}
              className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── History list ── */}
      {inspections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('subtitle')}</h3>
          {inspections.map(ins => {
            const daysLeft = Math.round((new Date(ins.next_inspection_date || ins.expiry_date).getTime() - Date.now()) / 86400000);
            const isExpired = daysLeft < 0;
            return (
              <div key={ins.id} className={`flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all ${
                isExpired ? 'bg-red-50/50 border-red-200/60' : 'bg-white border-slate-200/60 hover:border-slate-300'
              }`}>
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isExpired ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'
                }`}>
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {new Date(ins.inspection_date).toLocaleDateString()}
                    </span>
                    <span className="text-slate-300">&rarr;</span>
                    <span className={`text-xs sm:text-sm font-semibold ${isExpired ? 'text-red-600' : 'text-slate-600'}`}>
                      {new Date(ins.next_inspection_date || ins.expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                  {ins.created_at && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {t('registeredAt')}: {new Date(ins.created_at).toLocaleDateString()}
                    </p>
                  )}
                  {ins.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{ins.notes}</p>}
                  {ins.report && (
                    <a
                      href={ins.report}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#2D8B7E] hover:underline flex items-center gap-1 mt-1"
                    >
                      <FileText className="w-3 h-3" />
                      PDF
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ins.id)}
                  disabled={deletingId === ins.id}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 shrink-0"
                >
                  {deletingId === ins.id
                    ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Expenses Tab ──

function ExpensesTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFiltersType>({});
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'success') => {
    setToasts(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await expenseService.getVehicleExpenses(vehicleId, filters);
      setExpenses(data);
    } catch {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [vehicleId, filters, t]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleSubmit = async (data: CreateExpenseData) => {
    try {
      setIsSubmitting(true);
      if (editingExpense) {
        const updated = await expenseService.updateExpense(editingExpense.id, data);
        setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await expenseService.createVehicleExpense(vehicleId, data);
        setExpenses(prev => [created, ...prev]);
        if (created.invoice_data) {
          const msg = created.invoice_existing
            ? t('invoice.attachedExisting', { invoiceNumber: created.invoice_data.number })
            : t('invoice.createdNew', { invoiceNumber: created.invoice_data.number });
          addToast(msg, 'success');
        }
      }
      setShowForm(false);
      setEditingExpense(null);
    } catch (err) {
      console.error('Expense submit error:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      await expenseService.deleteExpense(expenseToDelete.id);
      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
    } catch {
      setError(t('deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-900">{t('title')}</h3>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('addExpense')}</span>
        </button>
      </div>

      <ExpenseFilters filters={filters} onChange={setFilters} categories={categories} showSearch={false} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ExpenseTable expenses={expenses} onEdit={handleEdit} onDelete={(expense) => setExpenseToDelete(expense)} onView={setViewingExpense} isLoading={loading} />

      <ExpenseDetailModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
        onEdit={(expense) => { setViewingExpense(null); handleEdit(expense); }}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setShowForm(false); setEditingExpense(null); }} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingExpense ? t('editExpense') : t('addExpense')}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingExpense(null); }} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ExpenseForm
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingExpense(null); }}
                categories={categories}
                initialData={editingExpense}
                isLoading={isSubmitting}
                vehicleId={vehicleId}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setExpenseToDelete(null)}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
