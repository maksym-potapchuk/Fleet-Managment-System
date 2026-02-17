'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { VehicleKanban } from '@/components/vehicle/VehicleKanban';
import { VehicleModal } from '@/components/vehicle/VehicleModal';
import { vehicleService } from '@/services/vehicle';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { useSidebar } from './SidebarContext';

export default function VehiclesPage() {
  const t = useTranslations('vehicles');
  const { openSidebar } = useSidebar();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load vehicles
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
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
  };

  const handleUpdateStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    // Store previous state for rollback
    const previousVehicles = [...vehicles];

    try {
      // Optimistic update
      setVehicles(prev =>
        prev.map(v => (v.id === vehicleId ? { ...v, status: newStatus } : v))
      );

      // API call
      await vehicleService.updateVehicleStatus(vehicleId, newStatus);
      console.log('✅ Status updated successfully');
    } catch (err: any) {
      console.error('❌ Failed to update vehicle status:', err);

      // Revert on error
      setVehicles(previousVehicles);

      // Show user-friendly error
      const errorMessage = err.response?.data?.message || 'Не вдалося оновити статус';
      alert(`Помилка: ${errorMessage}`);
    }
  };

  const handleSelectVehicle = async (id: string) => {
    try {
      const vehicle = await vehicleService.getVehicle(id);
      setSelectedVehicle(vehicle);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    }
  };

  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleSaveVehicle = () => {
    loadVehicles();
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await vehicleService.deleteVehicle(id);
      loadVehicles();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      alert('Не вдалося видалити автомобіль');
    }
  };

  const handleDuplicateVehicle = async (id: string) => {
    try {
      const vehicle = await vehicleService.getVehicle(id);

      // Create a copy with modified car_number and vin_number
      const duplicateData = {
        model: vehicle.model,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        cost: vehicle.cost,
        vin_number: vehicle.vin_number + '_COPY', // Temporary, user should change
        car_number: vehicle.car_number + '-COPY',
        status: 'PREPARATION' as const,
      };

      await vehicleService.createVehicle(duplicateData);
      loadVehicles();
    } catch (err) {
      console.error('Failed to duplicate vehicle:', err);
      alert('Не вдалося дублювати автомобіль');
    }
  };

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
        onAddVehicle={handleAddVehicle}
        onUpdateStatus={handleUpdateStatus}
        onDeleteVehicle={handleDeleteVehicle}
        onDuplicateVehicle={handleDuplicateVehicle}
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
