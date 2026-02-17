'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useRouter } from '@/src/i18n/routing';
import { Languages } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchLanguage = (newLocale: string) => {
    // Get the current pathname without locale prefix
    let currentPath = pathname;

    // Remove /uk or /pl prefix if present
    currentPath = currentPath.replace(/^\/(uk|pl)/, '');

    // If empty, set to root
    if (!currentPath) {
      currentPath = '/';
    }

    // Navigate using next-intl router which handles locale automatically
    router.push(currentPath, { locale: newLocale });
    setIsOpen(false);
  };

  const languages = [
    { code: 'pl', name: t('polish'), flag: '🇵🇱', nativeName: 'Polski' },
    { code: 'uk', name: t('ukrainian'), flag: '🇺🇦', nativeName: 'Українська' },
  ];

  const currentLanguage = languages.find(lang => lang.code === locale);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg
          border border-slate-200 bg-white
          text-slate-700 hover:bg-slate-50 hover:border-slate-300
          transition-all shadow-sm hover:shadow
        "
        aria-label={t('switchLanguage')}
        title={t('switchLanguage')}
      >
        <Languages className="w-4 h-4" />
        <span className="text-xl leading-none">{currentLanguage?.flag}</span>
        <span className="text-sm font-semibold">
          {currentLanguage?.code.toUpperCase()}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-48 py-2
          bg-white rounded-xl shadow-lg border border-slate-200
          z-50 animate-in fade-in slide-in-from-top-2 duration-200
        ">
          {languages.map((language) => {
            const isActive = locale === language.code;

            return (
              <button
                key={language.code}
                onClick={() => switchLanguage(language.code)}
                className={`
                  w-full px-4 py-2.5 text-left flex items-center gap-3
                  transition-colors
                  ${isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-50'
                  }
                `}
              >
                <span className="text-2xl leading-none">{language.flag}</span>
                <div className="flex-1">
                  <div className={`font-semibold ${isActive ? 'text-teal-700' : 'text-slate-900'}`}>
                    {language.nativeName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {language.code.toUpperCase()}
                  </div>
                </div>
                {isActive && (
                  <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
