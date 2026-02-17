'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Driver, CreateDriverData } from '@/types/driver';
import { DriverForm } from '@/components/driver/DriverForm';
import { DriverTable } from '@/components/driver/DriverTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getAllDrivers, createDriver, updateDriver, deleteDriver } from '@/services/driver';
import { UserPlus, X } from 'lucide-react';

/**
 * Main Drivers Page
 * This page displays all drivers and allows creating, editing, and deleting them
 */
export default function DriversPage() {
  const t = useTranslations('drivers');
  const tCommon = useTranslations('common');

  // State for storing all drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // State for loading indicators
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for showing/hiding the form modal
  const [showForm, setShowForm] = useState(false);

  // State for editing - stores the driver being edited (null = creating new driver)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // State for delete confirmation
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for error messages
  const [error, setError] = useState<string | null>(null);

  /**
   * Load drivers when page first loads
   * This runs only once when component mounts (because of empty dependency array [])
   */
  useEffect(() => {
    loadDrivers();
  }, []);

  /**
   * Fetch all drivers from the API
   */
  const loadDrivers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAllDrivers();
      setDrivers(data);
    } catch (err: any) {
      setError(t('loadError') + ' ' + (err.message || ''));
      console.error('Error loading drivers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle creating a new driver
   */
  const handleCreate = async (data: CreateDriverData) => {
    try {
      setIsSubmitting(true);
      const newDriver = await createDriver(data);

      // Add new driver to the list
      setDrivers(prev => [newDriver, ...prev]);

      // Close the form
      setShowForm(false);
      setEditingDriver(null);
    } catch (err: any) {
      console.error('Error creating driver:', err);
      throw err; // Re-throw so form can handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle updating an existing driver
   */
  const handleUpdate = async (data: CreateDriverData) => {
    if (!editingDriver) return;

    try {
      setIsSubmitting(true);
      const updatedDriver = await updateDriver(editingDriver.id, data);

      // Update the driver in the list
      setDrivers(prev =>
        prev.map(driver =>
          driver.id === updatedDriver.id ? updatedDriver : driver
        )
      );

      // Close the form
      setShowForm(false);
      setEditingDriver(null);
    } catch (err: any) {
      console.error('Error updating driver:', err);
      throw err; // Re-throw so form can handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (data: CreateDriverData) => {
    if (editingDriver) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  /**
   * Open form for editing a driver
   */
  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setShowForm(true);
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDelete = (driver: Driver) => {
    setDriverToDelete(driver);
  };

  /**
   * Confirm and execute driver deletion
   */
  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;

    try {
      setIsDeleting(true);
      await deleteDriver(driverToDelete.id);

      // Remove driver from the list
      setDrivers(prev => prev.filter(d => d.id !== driverToDelete.id));

      // Close dialog
      setDriverToDelete(null);
    } catch (err: any) {
      setError(t('deleteError') + ': ' + (err.message || ''));
      console.error('Error deleting driver:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Cancel driver deletion
   */
  const handleCancelDelete = () => {
    setDriverToDelete(null);
  };

  /**
   * Open form for creating a new driver
   */
  const handleOpenCreateForm = () => {
    setEditingDriver(null);
    setShowForm(true);
  };

  /**
   * Close the form
   */
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDriver(null);
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

          {/* Add Driver Button */}
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
            <UserPlus className="w-5 h-5" />
            {t('addDriver')}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Drivers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <DriverTable
          drivers={drivers}
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
                  {editingDriver ? t('editDriver') : t('addDriver')}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <DriverForm
                onSubmit={handleSubmit}
                onCancel={handleCloseForm}
                initialData={editingDriver}
                isLoading={isSubmitting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!driverToDelete}
        title={t('deleteConfirmTitle')}
        message={
          driverToDelete
            ? t('deleteConfirmMessage', {
                name: `${driverToDelete.first_name} ${driverToDelete.last_name}`
              })
            : ''
        }
        confirmLabel={t('deleteDriver')}
        cancelLabel={tCommon('cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
