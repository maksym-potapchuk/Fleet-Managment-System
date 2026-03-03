'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import { Archive, ArrowLeft, RotateCcw, Trash2, AlertTriangle, X } from 'lucide-react';
import { vehicleService } from '@/services/vehicle';
import { Vehicle, VehicleDeleteCheck } from '@/types/vehicle';

export default function VehicleArchivePage() {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    vehicle: Vehicle;
    check: VehicleDeleteCheck;
  } | null>(null);

  const loadArchived = useCallback(async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getArchivedVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load archived vehicles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchived();
  }, [loadArchived]);

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      await vehicleService.restoreVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to restore vehicle:', err);
      alert(t('restoreError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = async (vehicle: Vehicle) => {
    setActionLoading(vehicle.id);
    try {
      const check = await vehicleService.checkVehicleDelete(vehicle.id);
      setDeleteModal({ vehicle, check });
    } catch (err) {
      console.error('Failed to check vehicle:', err);
      alert(t('permanentDeleteError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteModal) return;
    const { vehicle } = deleteModal;
    setActionLoading(vehicle.id);
    setDeleteModal(null);
    try {
      await vehicleService.permanentlyDeleteVehicle(vehicle.id);
      setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
    } catch (err) {
      console.error('Failed to permanently delete vehicle:', err);
      alert(t('permanentDeleteError'));
    } finally {
      setActionLoading(null);
    }
  };

  const buildRelatedDetails = (check: VehicleDeleteCheck): string => {
    const parts: string[] = [];
    const c = check.related_counts;
    if (c.owner_history > 0) parts.push(t('relatedData.ownerHistory', { count: c.owner_history }));
    if (c.driver_history > 0) parts.push(t('relatedData.driverHistory', { count: c.driver_history }));
    if (c.photos > 0) parts.push(t('relatedData.photos', { count: c.photos }));
    if (c.inspections > 0) parts.push(t('relatedData.inspections', { count: c.inspections }));
    if (c.service_history > 0) parts.push(t('relatedData.serviceHistory', { count: c.service_history }));
    if (c.regulations > 0) parts.push(t('relatedData.regulations', { count: c.regulations }));
    if (c.service_plans > 0) parts.push(t('relatedData.servicePlans', { count: c.service_plans }));
    if (c.equipment > 0) parts.push(t('relatedData.equipment', { count: c.equipment }));
    return parts.join(', ');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4 md:px-6 md:py-5 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/vehicles')}
              className="flex items-center justify-center w-10 h-10 bg-white border-2 border-slate-200 rounded-xl hover:border-[#2D8B7E]/50 hover:bg-slate-50 transition-all shadow-sm flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl text-slate-900 font-black flex items-center gap-2 md:gap-3 tracking-tight">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Archive className="w-5 h-5 md:w-7 md:h-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="truncate">{t('archive')}</span>
              </h1>
              <p className="text-xs md:text-sm font-bold text-slate-600 mt-1 ml-0.5">
                {t('total')}: <span className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-lg">{vehicles.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400">
            <Archive className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-bold">{t('noArchivedVehicles')}</p>
            <p className="text-sm mt-1">{t('noArchivedVehiclesDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(vehicle => (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl border-2 border-slate-200/60 p-5 shadow-sm hover:shadow-md transition-all"
              >
                {/* Photo */}
                {vehicle.photos && vehicle.photos.length > 0 && (
                  <div className="relative -mx-5 -mt-5 mb-4 h-32 rounded-t-2xl overflow-hidden">
                    <img
                      src={vehicle.photos[0].image}
                      alt={vehicle.car_number}
                      className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}

                {/* Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{vehicle.car_number}</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    {vehicle.manufacturer} {vehicle.model} · {vehicle.year}
                  </p>
                  {vehicle.archived_at && (
                    <p className="text-xs text-amber-600 font-semibold mt-2">
                      {t('archivedAt')}: {new Date(vehicle.archived_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRestore(vehicle.id)}
                    disabled={actionLoading === vehicle.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2D8B7E] text-white rounded-xl hover:bg-[#246f65] transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('restoreVehicle')}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(vehicle)}
                    disabled={actionLoading === vehicle.id}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors text-sm font-semibold disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('permanentDelete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  {t('permanentDelete')}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {deleteModal.vehicle.car_number} — {deleteModal.vehicle.manufacturer} {deleteModal.vehicle.model}
                </p>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="mb-6">
              {deleteModal.check.has_related_data ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 font-medium">
                    {t('permanentDeleteWarning', {
                      details: buildRelatedDetails(deleteModal.check),
                    })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  {t('permanentDeleteConfirm')}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-semibold"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handlePermanentDelete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                {t('permanentDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
