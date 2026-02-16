'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from './types';

interface SidebarItemProps {
    item: NavItem;
}

export function SidebarItem({ item }: SidebarItemProps) {
    const pathname = usePathname();
    const isActive = pathname === item.href;

    const Icon = item.icon;

    return (
        <Link
          href={item.href}
          className={`
            group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm
            transition-all duration-200
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
            ${isActive 
              ? 'border-teal-100 bg-teal-50 text-teal-700 shadow-sm' 
              : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }
          `}
        >
          <Icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
          <span className="truncate font-medium">{item.label}</span>
          
          
          {item.badge && item.badge > 0 && (
            <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {item.badge}
            </span>
          )}
        </Link>
      );
}