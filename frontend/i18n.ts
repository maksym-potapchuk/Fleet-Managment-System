import { notFound } from 'next/navigation';

// Supported locales
export const locales = ['pl', 'uk'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'pl';

// Simple getRequestConfig for compatibility
export default async function getRequestConfig({ locale }: { locale: string }) {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
}
