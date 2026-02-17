// Simple i18n configuration
export const locales = ['pl', 'uk'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'pl';

export const i18nConfig = {
  locales,
  defaultLocale,
  localePrefix: 'as-needed' as const
};
