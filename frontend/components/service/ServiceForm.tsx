'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreateServiceData, Service } from '@/types/service';

interface ServiceFormProps {
  onSubmit: (data: CreateServiceData) => Promise<void>;
  onCancel: () => void;
  initialData?: Service | null;
  isLoading?: boolean;
}

export function ServiceForm({ onSubmit, onCancel, initialData, isLoading = false }: ServiceFormProps) {
  const t = useTranslations('serviceForm');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<CreateServiceData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateServiceData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateServiceData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('errors.nameRequired');
    } else if (formData.name.length > 100) {
      newErrors.name = t('errors.nameTooLong');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name as keyof CreateServiceData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error: any) {
      if (error.response?.data) {
        const backendErrors: any = {};
        Object.keys(error.response.data).forEach((key) => {
          backendErrors[key] = Array.isArray(error.response.data[key])
            ? error.response.data[key][0]
            : error.response.data[key];
        });
        setErrors(backendErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
          {t('name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:ring-2 focus:ring-teal-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${errors.name ? 'border-red-500' : 'border-slate-300'}
          `}
          placeholder={t('placeholders.name')}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
          {t('description')}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          rows={4}
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:ring-2 focus:ring-teal-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            resize-none
            ${errors.description ? 'border-red-500' : 'border-slate-300'}
          `}
          placeholder={t('placeholders.description')}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Form Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className={`
            flex-1 px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium
            transition-colors
            ${isLoading
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-teal-700 active:bg-teal-800'
            }
          `}
        >
          {isLoading ? t('saving') : initialData ? t('updateService') : t('addService')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="
            px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium
            transition-colors hover:bg-slate-50
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {tCommon('cancel')}
        </button>
      </div>
    </form>
  );
}
