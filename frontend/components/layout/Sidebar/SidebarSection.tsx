// SidebarSection.tsx
import { SidebarItem } from './SidebarItem';
import { NavSection } from './types';

interface SidebarSectionProps {
  section: NavSection;
}

export function SidebarSection({ section }: SidebarSectionProps) {
  return (
    <div>
      {section.title && (
        <h3 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {section.title}
        </h3>
      )}
      
      <div className="space-y-1">
        {section.items.map((item) => (
          <div key={item.id}>
            {item.dividerBefore && (
              <div className="my-3 border-t border-slate-200" />
            )}
            <SidebarItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}