'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Service, CreateServiceData } from '@/types/service';
import { ServiceForm } from '@/components/service/ServiceForm';
import { ServiceTable } from '@/components/service/ServiceTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getAllServices, createService, updateService, deleteService } from '@/services/service';
import { Plus, X } from 'lucide-react';

export default function ServicesPage() {
  const t = useTranslations('services');
  const tCommon = useTranslations('common');

  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllServices();
      setServices(data);
    } catch (err: any) {
      setError(t('loadError') + ' ' + (err.message || ''));
      console.error('Error loading services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (data: CreateServiceData) => {
    try {
      setIsSubmitting(true);
      const newService = await createService(data);
      setServices(prev => [newService, ...prev]);
      setShowForm(false);
      setEditingService(null);
    } catch (err: any) {
      console.error('Error creating service:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateServiceData) => {
    if (!editingService) return;

    try {
      setIsSubmitting(true);
      const updatedService = await updateService(editingService.id, data);
      setServices(prev =>
        prev.map(service =>
          service.id === updatedService.id ? updatedService : service
        )
      );
      setShowForm(false);
      setEditingService(null);
    } catch (err: any) {
      console.error('Error updating service:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreateServiceData) => {
    if (editingService) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = (service: Service) => {
    setServiceToDelete(service);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeleting(true);
      await deleteService(serviceToDelete.id);
      setServices(prev => prev.filter(s => s.id !== serviceToDelete.id));
      setServiceToDelete(null);
    } catch (err: any) {
      setError(t('deleteError') + ': ' + (err.message || ''));
      console.error('Error deleting service:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setServiceToDelete(null);
  };

  const handleOpenCreateForm = () => {
    setEditingService(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingService(null);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t('title')}</h1>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              {t('subtitle')}
            </p>
          </div>

          {/* Add Service Button */}
          <button
            onClick={handleOpenCreateForm}
            className="
              flex items-center justify-center gap-2 px-4 py-2.5
              bg-teal-600 text-white rounded-lg font-medium
              hover:bg-teal-700 transition-colors
              shadow-sm hover:shadow-md
              sm:shrink-0
            "
          >
            <Plus className="w-5 h-5" />
            {t('addService')}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <ServiceTable
          services={services}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={handleCloseForm}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingService ? t('editService') : t('addService')}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <ServiceForm
                onSubmit={handleSubmit}
                onCancel={handleCloseForm}
                initialData={editingService}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!serviceToDelete}
        title={t('deleteConfirmTitle')}
        message={
          serviceToDelete
            ? t('deleteConfirmMessage', { name: serviceToDelete.name })
            : ''
        }
        confirmLabel={t('deleteService')}
        cancelLabel={tCommon('cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
