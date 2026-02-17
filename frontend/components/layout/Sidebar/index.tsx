// Sidebar/index.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SidebarItem } from './SidebarItem';
import { SidebarSection } from './SidebarSection';
import { NavSection } from './types';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import {
  Car, Calendar, FileText, Wrench, Users, LayoutDashboard,
  Zap, Bell, Menu, X
} from 'lucide-react';

export function Sidebar() {
  const t = useTranslations('nav');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationConfig: NavSection[] = [
    {
      id: 'main',
      items: [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, href: '/dashboard' },
        { id: 'fleet', label: t('fleet'), icon: Car, href: '/vehicles' },
        { id: 'calendar', label: t('calendar'), icon: Calendar, href: '/calendar' },
        { id: 'expenses', label: t('expenses'), icon: FileText, href: '/expenses' },
        { id: 'services', label: t('services'), icon: Wrench, href: '/services' },
        { id: 'drivers', label: t('drivers'), icon: Users, href: '/drivers' },
      ]
    },
    {
      id: 'quick-access',
      title: t('quickExpenses').toUpperCase(),
      items: [
        { id: 'quick-expenses', label: t('quickExpenses'), icon: Zap, href: '/quick-expenses' },
        {
          id: 'notifications',
          label: t('notifications'),
          icon: Bell,
          href: '/notifications',
          badge: 2
        },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50
        w-[84vw] max-w-xs border-r border-slate-200 bg-white
        transform shadow-xl transition-transform duration-300 ease-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:h-screen lg:w-72 lg:max-w-none lg:translate-x-0 lg:shadow-none
        xl:w-80
      `}>
        {/* Logo Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 lg:px-6 lg:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">FLEET</h2>
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">MANAGER</p>
            </div>
          </div>

          {/* Language Switcher & Close button */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="h-[calc(100vh-74px)] space-y-7 overflow-y-auto px-4 py-5 lg:h-[calc(100vh-84px)] lg:px-5">
          {navigationConfig.map((section) => (
            <SidebarSection key={section.id} section={section} />
          ))}
        </nav>
      </aside>

      {/* Mobile Toggle Button */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed left-4 top-4 z-30 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 shadow-md hover:shadow-lg transition-all hover:bg-slate-50 active:scale-95 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
          <span className="text-sm font-semibold">Menu</span>
        </button>
      )}
    </>
  );
}
