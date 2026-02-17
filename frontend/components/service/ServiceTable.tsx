'use client';

import { useTranslations } from 'next-intl';
import { Service } from '@/types/service';
import { Pencil, Trash2, Calendar, FileText } from 'lucide-react';

interface ServiceTableProps {
  services: Service[];
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export function ServiceTable({ services, onEdit, onDelete, isLoading = false }: ServiceTableProps) {
  const t = useTranslations('services');
  const tCommon = useTranslations('common');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">{tCommon('loading')}</div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-lg mb-2">{t('noServices')}</div>
        <p className="text-slate-500 text-sm">
          {t('noServicesDesc')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block lg:hidden space-y-4 p-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Service Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-teal-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-base mb-1 break-words">
                  {service.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  ID: {service.id}
                </div>
              </div>
            </div>

            {/* Service Description */}
            {service.description ? (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-700 leading-relaxed break-words">
                  {service.description}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-400 italic">
                  {t('noDescription')}
                </div>
              </div>
            )}

            {/* Service Info */}
            <div className="flex items-center gap-2 mb-4 text-sm text-slate-600 min-w-0">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{t('createdAt')}: {formatDate(service.created_at)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => onEdit(service)}
                className="
                  flex-1 flex items-center justify-center gap-2 px-4 py-2.5
                  bg-teal-50 text-teal-700 rounded-lg font-medium
                  hover:bg-teal-100 active:bg-teal-200
                  transition-colors
                "
              >
                <Pencil className="w-4 h-4" />
                {t('editService')}
              </button>
              <button
                onClick={() => onDelete(service)}
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
                {t('name')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('description')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {t('createdAt')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider rounded-tr-xl">
                {tCommon('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {services.map((service, index) => {
              const isLastRow = index === services.length - 1;
              return (
              <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                {/* Service Name */}
                <td className={`px-4 py-4 ${isLastRow ? 'rounded-bl-xl' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">
                        {service.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        ID: {service.id}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Description */}
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-600 max-w-md">
                    {service.description || <span className="text-slate-400 italic">{t('noDescription')}</span>}
                  </div>
                </td>

                {/* Created At */}
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(service.created_at)}
                  </div>
                </td>

                {/* Actions */}
                <td className={`px-4 py-4 ${isLastRow ? 'rounded-br-xl' : ''}`}>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(service)}
                      className="
                        p-2 rounded-lg text-slate-600 hover:bg-teal-50 hover:text-teal-600
                        transition-colors
                      "
                      title={t('editService')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDelete(service)}
                      className="
                        p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600
                        transition-colors
                      "
                      title={t('deleteService')}
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
