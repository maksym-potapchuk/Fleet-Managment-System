import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['pl', 'uk'],
  defaultLocale: 'pl',
  localePrefix: 'as-needed',
  localeDetection: false
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
