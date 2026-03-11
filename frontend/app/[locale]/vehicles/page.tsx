'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import { VehicleKanban } from '@/components/vehicle/VehicleKanban';
import { VehicleModal } from '@/components/vehicle/VehicleModal';
import { vehicleService } from '@/services/vehicle';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { useSidebar } from './SidebarContext';

export default function VehiclesPage() {
  const t = useTranslations('vehicles');
  const router = useRouter();
  const { openSidebar } = useSidebar();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load vehicles
  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleUpdateStatus = useCallback(async (vehicleId: string, newStatus: VehicleStatus) => {
    const previousVehicles = vehiclesRef.current;

    try {
      setVehicles(prev =>
        prev.map(v => (v.id === vehicleId ? { ...v, status: newStatus, updated_at: new Date().toISOString() } : v))
      );

      await vehicleService.updateVehicleStatus(vehicleId, newStatus);
    } catch (err: unknown) {
      console.error('❌ Failed to update vehicle status:', err);

      setVehicles(previousVehicles);

      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined;
      const errorMessage = data?.message ?? 'Не вдалося оновити статус';
      alert(`Помилка: ${errorMessage}`);
    }
  }, []);

  const handleSelectVehicle = useCallback((id: string) => {
    router.push(`/vehicles/${id}`);
  }, [router]);

  const handleEditVehicle = useCallback(async (id: string) => {
    try {
      const vehicle = await vehicleService.getVehicle(id);
      setSelectedVehicle(vehicle);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    }
  }, []);

  const handleAddVehicle = useCallback(() => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  }, []);

  const handleSaveVehicle = useCallback(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleReorderVehicles = useCallback(async (items: { id: string; status_position: number }[]) => {
    const previousVehicles = vehiclesRef.current;
    try {
      const posMap = new Map(items.map(i => [i.id, i.status_position]));
      setVehicles(prev =>
        prev.map(v => {
          const newPos = posMap.get(v.id);
          return newPos !== undefined ? { ...v, status_position: newPos } : v;
        })
      );
      await vehicleService.reorderVehicles(items);
    } catch (err) {
      console.error('Failed to reorder vehicles:', err);
      setVehicles(previousVehicles);
    }
  }, []);

  const handleArchiveVehicle = useCallback(async (id: string) => {
    try {
      await vehicleService.archiveVehicle(id);
      loadVehicles();
    } catch (err) {
      console.error('Failed to archive vehicle:', err);
      alert(t('archiveError'));
    }
  }, [loadVehicles, t]);

  const handleDuplicateVehicle = useCallback(async (id: string) => {
    try {
      const vehicle = await vehicleService.getVehicle(id);

      const duplicateData = {
        model: vehicle.model,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        cost: vehicle.cost,
        vin_number: (vehicle.vin_number.slice(0, 12) + '_COPY').slice(0, 17),
        car_number: vehicle.car_number ? (vehicle.car_number.slice(0, 5) + '-COPY').slice(0, 10) : undefined,
        is_temporary_plate: vehicle.is_temporary_plate,
        color: vehicle.color || '',
        fuel_type: vehicle.fuel_type,
        status: 'AUCTION' as const,
        initial_km: vehicle.initial_km,
      };

      await vehicleService.createVehicle(duplicateData);
      loadVehicles();
    } catch (err) {
      console.error('Failed to duplicate vehicle:', err);
      alert('Не вдалося дублювати автомобіль');
    }
  }, [loadVehicles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('error')}</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={loadVehicles}
            className="bg-[#2D8B7E] text-white px-6 py-2 rounded-lg hover:bg-[#246f65] transition-colors font-semibold"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <VehicleKanban
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        onEditVehicle={handleEditVehicle}
        onAddVehicle={handleAddVehicle}
        onUpdateStatus={handleUpdateStatus}
        onArchiveVehicle={handleArchiveVehicle}
        onDuplicateVehicle={handleDuplicateVehicle}
        onReorderVehicles={handleReorderVehicles}
        onOpenSidebar={openSidebar}
      />

      <VehicleModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveVehicle}
      />
    </>
  );
}
