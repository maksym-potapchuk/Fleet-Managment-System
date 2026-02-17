'use client';

import { useTranslations } from 'next-intl';
import { Driver } from '@/types/driver';
import { Pencil, Trash2, Phone, Calendar, CheckCircle2, XCircle } from 'lucide-react';

/**
 * Props for the DriverTable component
 * @param drivers - Array of driver objects to display
 * @param onEdit - Function called when edit button is clicked
 * @param onDelete - Function called when delete button is clicked
 * @param isLoading - Optional: Show loading state
 */
interface DriverTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  isLoading?: boolean;
}

/**
 * Format date from ISO string to readable format
 * Example: "2024-01-15T10:30:00Z" -> "15.01.2024"
 */
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format phone number for display
 * Example: "48123456789" -> "+48 123 456 789"
 */
const formatPhoneNumber = (phone: string): string => {
  if (phone.startsWith('48')) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
  }
  return phone;
};

export function DriverTable({ drivers, onEdit, onDelete, isLoading = false }: DriverTableProps) {
  const t = useTranslations('drivers');
  const tCommon = useTranslations('common');

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">{tCommon('loading')}</div>
      </div>
    );
  }

  // Show empty state if no drivers
  if (drivers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-lg mb-2">{t('noDrivers')}</div>
        <p className="text-slate-500 text-sm">
          {t('noDriversDesc')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4 p-4">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Driver Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-teal-700 font-bold text-base">
                    {driver.first_name[0]}{driver.last_name[0]}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 text-base truncate">
                    {driver.first_name} {driver.last_name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    ID: {driver.id.slice(0, 8)}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              {driver.is_active_driver ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 flex-shrink-0 whitespace-nowrap">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="hidden sm:inline">{t('active')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 flex-shrink-0 whitespace-nowrap">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="hidden sm:inline">{t('inactive')}</span>
                </span>
              )}
            </div>

            {/* Driver Info Grid */}
            <div className="space-y-3 mb-4">
              {/* Phone */}
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {formatPhoneNumber(driver.phone_number)}
                </span>
              </div>

              {/* Vehicle Status */}
              <div className="flex items-center gap-2">
                {driver.has_vehicle ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700">{t('hasVehicleYes')}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-500">{t('hasVehicleNo')}</span>
                  </>
                )}
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  {t('lastActive')}: {formatDate(driver.last_active_at)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => onEdit(driver)}
                className="
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                  bg-teal-50 text-teal-700 rounded-lg font-medium
                  hover:bg-teal-100 active:bg-teal-200
                  transition-colors
                "
              >
                <Pencil className="w-4 h-4" />
                {t('editDriver')}
              </button>
              <button
                onClick={() => onDelete(driver)}
                className="
                  flex items-center justify-center gap-2 px-4 py-2.5
                  bg-red-50 text-red-700 rounded-lg font-medium
                  hover:bg-red-100 active:bg-red-200
                  transition-colors
                "
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tl-xl">
              {t('firstName')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t('phoneNumber')}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t('hasVehicle')}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t('isActive')}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {t('lastActive')}
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tr-xl">
              {tCommon('actions')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {drivers.map((driver, index) => {
            const isLastRow = index === drivers.length - 1;
            return (
            <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
              {/* Driver Name */}
              <td className={`px-4 py-4 ${isLastRow ? 'rounded-bl-xl' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <span className="text-teal-700 font-semibold text-sm">
                      {driver.first_name[0]}{driver.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">
                      {driver.first_name} {driver.last_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      ID: {driver.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </td>

              {/* Phone Number */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span className="font-mono text-sm">
                    {formatPhoneNumber(driver.phone_number)}
                  </span>
                </div>
              </td>

              {/* Has Vehicle */}
              <td className="px-4 py-4 text-center">
                {driver.has_vehicle ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('hasVehicleYes')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <XCircle className="w-3 h-3" />
                    {t('hasVehicleNo')}
                  </span>
                )}
              </td>

              {/* Active Status */}
              <td className="px-4 py-4 text-center">
                {driver.is_active_driver ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                    <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    {t('active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    {t('inactive')}
                  </span>
                )}
              </td>

              {/* Last Active */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {formatDate(driver.last_active_at)}
                </div>
              </td>

              {/* Actions */}
              <td className={`px-4 py-4 ${isLastRow ? 'rounded-br-xl' : ''}`}>
                <div className="flex items-center justify-center gap-2">
                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(driver)}
                    className="
                      p-2 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-600
                      transition-colors
                    "
                    title={t('editDriver')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(driver)}
                    className="
                      p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600
                      transition-colors
                    "
                    title={t('deleteDriver')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
        </div>
      </div>
    </>
  );
}
