'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreateDriverData, Driver } from '@/types/driver';

/**
 * Props for the DriverForm component
 * @param onSubmit - Function called when form is submitted
 * @param onCancel - Function called when cancel button is clicked
 * @param initialData - Optional: Pre-fill form with existing driver data (for editing)
 * @param isLoading - Optional: Show loading state during submission
 */
interface DriverFormProps {
  onSubmit: (data: CreateDriverData) => Promise<void>;
  onCancel: () => void;
  initialData?: Driver | null;
  isLoading?: boolean;
}

export function DriverForm({ onSubmit, onCancel, initialData, isLoading = false }: DriverFormProps) {
  const t = useTranslations('driverForm');
  const tCommon = useTranslations('common');

  // Form state - holds the current values of all form fields
  const [formData, setFormData] = useState<CreateDriverData>({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    phone_number: initialData?.phone_number || '',
  });

  // Error state - stores validation errors for each field
  const [errors, setErrors] = useState<Partial<Record<keyof CreateDriverData, string>>>({});

  /**
   * Validate phone number according to backend rules:
   * - Only digits
   * - Must start with 48
   * - Length between 10-15 characters
   */
  const validatePhoneNumber = (phone: string): string | null => {
    if (!phone) return t('errors.phoneRequired');
    if (!/^\d+$/.test(phone)) return t('errors.phoneDigitsOnly');
    if (!phone.startsWith('48')) return t('errors.phoneStartWith48');
    if (phone.length < 10 || phone.length > 15) return t('errors.phoneLength');
    return null;
  };

  /**
   * Validate all form fields
   * Returns true if form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateDriverData, string>> = {};

    // Validate first name
    if (!formData.first_name.trim()) {
      newErrors.first_name = t('errors.firstNameRequired');
    } else if (formData.first_name.length > 50) {
      newErrors.first_name = t('errors.firstNameTooLong');
    }

    // Validate last name
    if (!formData.last_name.trim()) {
      newErrors.last_name = t('errors.lastNameRequired');
    } else if (formData.last_name.length > 50) {
      newErrors.last_name = t('errors.lastNameTooLong');
    }

    // Validate phone number
    const phoneError = validatePhoneNumber(formData.phone_number);
    if (phoneError) {
      newErrors.phone_number = phoneError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle input changes
   * Updates form state when user types in any field
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field when user starts typing
    if (errors[name as keyof CreateDriverData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser form submission

    // Validate form before submitting
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error: any) {
      // Handle backend validation errors
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
      {/* First Name Field */}
      <div>
        <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-2">
          {t('firstName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="first_name"
          name="first_name"
          value={formData.first_name}
          onChange={handleChange}
          disabled={isLoading}
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:ring-2 focus:ring-teal-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${errors.first_name ? 'border-red-500' : 'border-slate-300'}
          `}
          placeholder={t('placeholders.firstName')}
        />
        {errors.first_name && (
          <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
        )}
      </div>

      {/* Last Name Field */}
      <div>
        <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-2">
          {t('lastName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="last_name"
          name="last_name"
          value={formData.last_name}
          onChange={handleChange}
          disabled={isLoading}
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:ring-2 focus:ring-teal-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${errors.last_name ? 'border-red-500' : 'border-slate-300'}
          `}
          placeholder={t('placeholders.lastName')}
        />
        {errors.last_name && (
          <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
        )}
      </div>

      {/* Phone Number Field */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 mb-2">
          {t('phoneNumber')} <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          disabled={isLoading}
          className={`
            w-full px-4 py-2 border rounded-lg transition-colors
            text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-normal
            focus:outline-none focus:ring-2 focus:ring-teal-500
            disabled:bg-slate-100 disabled:cursor-not-allowed
            ${errors.phone_number ? 'border-red-500' : 'border-slate-300'}
          `}
          placeholder={t('placeholders.phoneNumber')}
        />
        {errors.phone_number && (
          <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {t('phoneFormat')}
        </p>
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
          {isLoading ? t('saving') : initialData ? t('updateDriver') : t('addDriver')}
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
