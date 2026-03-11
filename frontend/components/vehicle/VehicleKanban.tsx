'use client';

import { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@/hooks/useDebounce';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCenter,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Car,
  Plus,
  Search,
  GripVertical,
  User,
  MoreVertical,
  Edit,
  Archive,
  Eye,
  Copy,
  Menu,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ShieldCheck,
  Package,
  AlertTriangle,
  ScrollText,
  Receipt,
  Zap,
  GripHorizontal,
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { matchesWithLayout } from '@/lib/keyboard-layout';
import { Link } from '@/src/i18n/routing';

export type KanbanColumnConfig = {
  id: VehicleStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

function PortalDropdown({ anchorRef, open, onClose, align = 'right', children }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;

    // Wait one frame so the dropdown is rendered and we can measure it
    requestAnimationFrame(() => {
      const rect = anchorRef.current!.getBoundingClientRect();
      const dropdownEl = dropdownRef.current;
      const dropdownHeight = dropdownEl?.offsetHeight ?? 300;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      const top = openUp
        ? Math.max(8, rect.top - dropdownHeight - 4)
        : rect.bottom + 4;

      const left = align === 'right'
        ? undefined
        : Math.min(rect.left, window.innerWidth - 200);
      const right = align === 'right'
        ? Math.max(0, window.innerWidth - rect.right)
        : undefined;

      setStyle({ top, left, right, opacity: 1 });
    });
  }, [open, anchorRef, align]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        ref={dropdownRef}
        className="fixed z-[9999] bg-white rounded-xl shadow-2xl border-2 border-slate-200/80 py-2 min-w-[180px] max-h-[min(320px,70vh)] overflow-y-auto"
        style={style}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

interface VehicleKanbanProps {
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onAddVehicle: () => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  onArchiveVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
  onReorderVehicles?: (items: { id: string; status_position: number }[]) => Promise<void>;
  onOpenSidebar?: () => void;
}

export function VehicleKanban({
  vehicles,
  onSelectVehicle,
  onEditVehicle,
  onAddVehicle,
  onUpdateStatus,
  onArchiveVehicle,
  onDuplicateVehicle,
  onReorderVehicles,
  onOpenSidebar,
}: VehicleKanbanProps) {
  const t = useTranslations('vehicles');
  const tNav = useTranslations('nav');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedStatuses, setSelectedStatuses] = useState<VehicleStatus[]>([]);
  const [driverFilter, setDriverFilter] = useState<'all' | 'with_driver' | 'without_driver'>('all');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'vehicle' | 'column' | null>(null);
  const [mobileActiveStatus, setMobileActiveStatus] = useState<VehicleStatus | 'ALL'>('ALL');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const COLUMN_PREFIX = 'column-';

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const { active } = args;
    const activeId = active.id as string;

    if (activeId.startsWith(COLUMN_PREFIX)) {
      // Column drag — only match other column sortable targets
      const filtered = {
        ...args,
        droppableContainers: args.droppableContainers.filter(
          c => (c.id as string).startsWith(COLUMN_PREFIX)
        ),
      };
      return closestCenter(filtered);
    }

    // Vehicle drag — only match column droppable targets (no prefix)
    const filtered = {
      ...args,
      droppableContainers: args.droppableContainers.filter(
        c => !(c.id as string).startsWith(COLUMN_PREFIX)
      ),
    };
    return rectIntersection(filtered);
  }, []);

  const ALL_COLUMNS = useMemo((): KanbanColumnConfig[] => [
    { id: 'AUCTION', title: t('statuses.AUCTION'), color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { id: 'FOCUS', title: t('statuses.FOCUS'), color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'GAS_INSTALL', title: t('statuses.GAS_INSTALL'), color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { id: 'SERVICE', title: t('statuses.SERVICE'), color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { id: 'CLEANING', title: t('statuses.CLEANING'), color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
    { id: 'PRE_DELIVERY', title: t('statuses.PRE_DELIVERY'), color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    { id: 'READY', title: t('statuses.READY'), color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    { id: 'RENT', title: t('statuses.RENT'), color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
    { id: 'LEASING', title: t('statuses.LEASING'), color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'SELLING', title: t('statuses.SELLING'), color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'SOLD', title: t('statuses.SOLD'), color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  ], [t]);

  const COLUMN_ORDER_KEY = 'kanban-column-order';

  const [columnOrder, setColumnOrder] = useState<VehicleStatus[]>(() => {
    if (typeof window === 'undefined') return ALL_COLUMNS.map(c => c.id);
    try {
      const saved = localStorage.getItem(COLUMN_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as VehicleStatus[];
        const allIds = new Set(ALL_COLUMNS.map(c => c.id));
        const validSaved = parsed.filter(id => allIds.has(id));
        const missing = ALL_COLUMNS.map(c => c.id).filter(id => !validSaved.includes(id));
        return [...validSaved, ...missing];
      }
    } catch { /* ignore */ }
    return ALL_COLUMNS.map(c => c.id);
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
    } catch { /* ignore */ }
  }, [columnOrder]);

  const KANBAN_COLUMNS = useMemo(() => {
    const columnMap = new Map(ALL_COLUMNS.map(c => [c.id, c]));
    return columnOrder.map(id => columnMap.get(id)!).filter(Boolean);
  }, [ALL_COLUMNS, columnOrder]);

  const activeDragVehicle = useMemo(
    () => activeDragType === 'vehicle' ? vehicles.find(v => v.id === activeDragId) ?? null : null,
    [vehicles, activeDragId, activeDragType]
  );

  const activeDragColumn = useMemo(
    () => activeDragType === 'column' && activeDragId
      ? KANBAN_COLUMNS.find(c => c.id === activeDragId.replace(COLUMN_PREFIX, '')) ?? null
      : null,
    [KANBAN_COLUMNS, activeDragId, activeDragType]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    if (id.startsWith(COLUMN_PREFIX)) {
      setActiveDragId(id);
      setActiveDragType('column');
    } else {
      setActiveDragId(id);
      setActiveDragType('vehicle');
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragType(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith(COLUMN_PREFIX)) {
      const fromStatus = activeId.replace(COLUMN_PREFIX, '') as VehicleStatus;
      const toStatus = overId.replace(COLUMN_PREFIX, '') as VehicleStatus;
      if (fromStatus !== toStatus) {
        setColumnOrder(prev => {
          const oldIndex = prev.indexOf(fromStatus);
          const newIndex = prev.indexOf(toStatus);
          if (oldIndex === -1 || newIndex === -1) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
      return;
    }

    const vehicleId = activeId;
    const newStatus = overId.startsWith(COLUMN_PREFIX)
      ? overId.replace(COLUMN_PREFIX, '') as VehicleStatus
      : overId as VehicleStatus;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle && vehicle.status !== newStatus) {
      onUpdateStatus(vehicleId, newStatus);
    }
  }, [vehicles, onUpdateStatus]);

  const uniqueManufacturers = useMemo(() => {
    const manufacturers = new Set(vehicles.map(v => v.manufacturer));
    return Array.from(manufacturers).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        const trimmed = debouncedSearch.trim();
        if (trimmed) {
          const matchesSearch = (
            (v.car_number && matchesWithLayout(v.car_number, trimmed)) ||
            matchesWithLayout(v.manufacturer, trimmed) ||
            matchesWithLayout(v.model, trimmed) ||
            matchesWithLayout(v.vin_number, trimmed)
          );
          if (!matchesSearch) return false;
        }
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(v.status)) return false;
        if (driverFilter === 'with_driver' && !v.driver) return false;
        if (driverFilter === 'without_driver' && v.driver) return false;
        if (selectedManufacturers.length > 0 && !selectedManufacturers.includes(v.manufacturer)) return false;
        return true;
      })
      .sort((a, b) => a.status_position - b.status_position);
  }, [vehicles, debouncedSearch, selectedStatuses, driverFilter, selectedManufacturers]);

  // Pre-group vehicles by status to avoid .filter() on every column render
  const vehiclesByStatus = useMemo(() => {
    const map: Record<string, Vehicle[]> = {};
    for (const v of filteredVehicles) {
      (map[v.status] ??= []).push(v);
    }
    return map;
  }, [filteredVehicles]);

  const handleMoveVehicle = useCallback(async (vehicleId: string, direction: 'up' | 'down') => {
    if (!onReorderVehicles) return;

    const vehicleToMove = vehicles.find(v => v.id === vehicleId);
    if (!vehicleToMove) return;

    const columnVehicles = filteredVehicles.filter(v => v.status === vehicleToMove.status);
    const currentIndex = columnVehicles.findIndex(v => v.id === vehicleId);
    if (currentIndex === -1) return;

    const neighborIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (neighborIndex < 0 || neighborIndex >= columnVehicles.length) return;

    const neighbor = columnVehicles[neighborIndex];

    let myNewPos = neighbor.status_position;
    const neighborNewPos = vehicleToMove.status_position;

    // Edge case: equal positions — offset to break tie
    if (myNewPos === neighborNewPos) {
      myNewPos = direction === 'up' ? neighborNewPos - 1 : neighborNewPos + 1;
    }

    await onReorderVehicles([
      { id: vehicleId, status_position: myNewPos },
      { id: neighbor.id, status_position: neighborNewPos },
    ]);
  }, [vehicles, filteredVehicles, onReorderVehicles]);

  const handleMoveToPosition = useCallback(async (vehicleId: string, targetIndex: number) => {
    if (!onReorderVehicles) return;

    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    const columnVehicles = filteredVehicles.filter(v => v.status === vehicle.status);
    const currentIndex = columnVehicles.findIndex(v => v.id === vehicleId);
    if (currentIndex === -1 || currentIndex === targetIndex) return;

    // Remove from current position, insert at target
    const reordered = columnVehicles.filter(v => v.id !== vehicleId);
    reordered.splice(targetIndex, 0, vehicle);

    // Reassign positions for all affected vehicles
    const items = reordered.map((v, i) => ({
      id: v.id,
      status_position: (i + 1) * 1000,
    }));

    await onReorderVehicles(items);
  }, [vehicles, filteredVehicles, onReorderVehicles]);

  const mobileDisplayedVehicles = useMemo(() => {
    if (mobileActiveStatus === 'ALL') return filteredVehicles;
    return filteredVehicles.filter(v => v.status === mobileActiveStatus);
  }, [filteredVehicles, mobileActiveStatus]);

  const visibleColumns = useMemo(() => {
    const hasActiveFilters = debouncedSearch || selectedStatuses.length > 0 || driverFilter !== 'all' || selectedManufacturers.length > 0;
    if (!hasActiveFilters) return KANBAN_COLUMNS;
    const statusesWithVehicles = new Set(filteredVehicles.map(v => v.status));
    return KANBAN_COLUMNS.filter(col => statusesWithVehicles.has(col.id));
  }, [KANBAN_COLUMNS, filteredVehicles, debouncedSearch, selectedStatuses, driverFilter, selectedManufacturers]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'RENT' || v.status === 'LEASING').length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">

      {/* ── Header ── */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4 md:px-6 md:py-5 shadow-sm flex-shrink-0">

        {/* Title row — always horizontal */}
        <div className="flex items-center justify-between gap-2 md:gap-4 mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="flex items-center justify-center w-10 h-10 bg-white border-2 border-slate-200 rounded-xl hover:border-[#2D8B7E]/50 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95 flex-shrink-0"
                title="Відкрити меню"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl text-slate-900 font-black flex items-center gap-2 md:gap-3 tracking-tight">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-[#2D8B7E] to-[#248B7B] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <Car className="w-5 h-5 md:w-7 md:h-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="truncate">{t('title')}</span>
              </h1>
              <p className="text-xs md:text-sm font-bold text-slate-600 mt-1 ml-0.5">
                {t('total')}: <span className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-lg">{totalVehicles}</span>
                <span className="mx-1.5 text-slate-300">•</span>
                {t('active')}: <span className="text-white bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] px-1.5 py-0.5 rounded-lg shadow-sm">{activeVehicles}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/quick-expenses"
              className="flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-3 bg-white border-2 border-slate-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all shadow-sm text-amber-600"
              title={tNav('quickExpenses')}
            >
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden md:inline ml-1.5 text-sm font-bold">{tNav('quickExpenses')}</span>
            </Link>
            <button
              onClick={onAddVehicle}
              className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-3 py-2.5 md:px-6 md:py-3 rounded-xl hover:shadow-2xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-1.5 text-sm font-bold whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />
              <span className="hidden sm:inline">{t('addVehicle')}</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal bg-slate-50/80 border-2 border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/50 focus:border-[#2D8B7E]/50 focus:bg-white transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              title="Очистити пошук"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Desktop Filters — hidden on mobile */}
        <div className="mt-3 hidden md:flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {KANBAN_COLUMNS.map(column => {
                const isSelected = selectedStatuses.includes(column.id);
                const count = vehicles.filter(v => v.status === column.id).length;
                return (
                  <button
                    key={column.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStatuses(prev => prev.filter(s => s !== column.id));
                      } else {
                        setSelectedStatuses(prev => [...prev, column.id]);
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                      isSelected
                        ? `${column.bgColor} ${column.color} border ${column.borderColor}`
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {column.title} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-6 w-px bg-slate-300" />

          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex gap-1.5">
              {(['all', 'with_driver', 'without_driver'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setDriverFilter(f)}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                    driverFilter === f
                      ? f === 'all'
                        ? 'bg-[#2D8B7E] text-white border border-[#2D8B7E]'
                        : f === 'with_driver'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-amber-50 text-amber-700 border border-amber-300'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {f === 'all'
                    ? `${t('filters.allDrivers')} (${vehicles.length})`
                    : f === 'with_driver'
                    ? `${t('filters.withDriver')} (${vehicles.filter(v => v.driver).length})`
                    : `${t('filters.withoutDriver')} (${vehicles.filter(v => !v.driver).length})`}
                </button>
              ))}
            </div>
          </div>

          {uniqueManufacturers.length > 1 && (
            <>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {uniqueManufacturers.map(manufacturer => {
                    const isSelected = selectedManufacturers.includes(manufacturer);
                    const count = vehicles.filter(v => v.manufacturer === manufacturer).length;
                    return (
                      <button
                        key={manufacturer}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedManufacturers(prev => prev.filter(m => m !== manufacturer));
                          } else {
                            setSelectedManufacturers(prev => [...prev, manufacturer]);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 border border-blue-300'
                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {manufacturer} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {(selectedStatuses.length > 0 || driverFilter !== 'all' || selectedManufacturers.length > 0) && (
            <>
              <div className="h-6 w-px bg-slate-300" />
              <button
                onClick={() => {
                  setSelectedStatuses([]);
                  setDriverFilter('all');
                  setSelectedManufacturers([]);
                  setSearchTerm('');
                }}
                className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 transition-colors"
              >
                <X className="w-3 h-3" />
                {t('filters.clearAll')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile Status Tabs ── */}
      <div className="md:hidden overflow-x-auto flex-shrink-0 bg-white/90 border-b border-slate-200/50 shadow-sm">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          <button
            onClick={() => setMobileActiveStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              mobileActiveStatus === 'ALL'
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 active:bg-slate-200'
            }`}
          >
            {t('filters.allDrivers')} · {filteredVehicles.length}
          </button>
          {KANBAN_COLUMNS.map(col => {
            const count = filteredVehicles.filter(v => v.status === col.id).length;
            if (count === 0) return null;
            return (
              <button
                key={col.id}
                onClick={() => setMobileActiveStatus(col.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  mobileActiveStatus === col.id
                    ? `${col.bgColor} ${col.color} ${col.borderColor} shadow-md`
                    : 'bg-slate-100 text-slate-600 border-transparent active:bg-slate-200'
                }`}
              >
                {col.title} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Mobile Vehicle List (virtualized) ── */}
      <MobileVehicleList
        vehicles={mobileDisplayedVehicles}
        columns={KANBAN_COLUMNS}
        onSelectVehicle={onSelectVehicle}
        onEditVehicle={onEditVehicle}
        onArchiveVehicle={onArchiveVehicle}
        onUpdateStatus={onUpdateStatus}
        onReorderVehicles={onReorderVehicles}
        handleMoveVehicle={handleMoveVehicle}
        handleMoveToPosition={handleMoveToPosition}
        emptyLabel={t('empty')}
      />

      {/* ── Desktop Kanban Board ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={collisionDetection}>
        <div className="hidden md:flex flex-1 overflow-x-auto overflow-y-hidden p-6">
          <SortableContext items={visibleColumns.map(c => `${COLUMN_PREFIX}${c.id}`)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 h-full min-w-max">
              {visibleColumns.map(column => (
                <SortableKanbanColumn
                  key={column.id}
                  column={column}
                  columnPrefix={COLUMN_PREFIX}
                  vehicles={vehiclesByStatus[column.id] ?? []}
                  activeDragId={activeDragType === 'vehicle' ? activeDragId : null}
                  isDraggingColumn={activeDragType === 'column'}
                  onSelectVehicle={onSelectVehicle}
                  onEditVehicle={onEditVehicle}
                  onArchiveVehicle={onArchiveVehicle}
                  onDuplicateVehicle={onDuplicateVehicle}
                  onMoveVehicle={onReorderVehicles ? handleMoveVehicle : undefined}
                  onMoveToPosition={onReorderVehicles ? handleMoveToPosition : undefined}
                  onUpdateStatus={onUpdateStatus}
                  allColumns={KANBAN_COLUMNS}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeDragVehicle ? (
            <div style={{ transform: 'rotate(-2deg)', opacity: 0.95 }}>
              <VehicleCardOverlay vehicle={activeDragVehicle} />
            </div>
          ) : activeDragColumn ? (
            <div className="w-80 rounded-2xl border-2 border-[#2D8B7E] bg-white/90 backdrop-blur-sm shadow-2xl opacity-90" style={{ transform: 'rotate(-1deg)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-slate-50/80 to-transparent rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${activeDragColumn.bgColor.replace('-50', '-500')}`} />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{activeDragColumn.title}</h3>
                </div>
                <span className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md">
                  {filteredVehicles.filter(v => v.status === activeDragColumn.id).length}
                </span>
              </div>
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm font-medium">
                ···
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Sortable Kanban Column (wrapper) ─────────────────────────────────────────

interface SortableKanbanColumnProps {
  column: KanbanColumnConfig;
  columnPrefix: string;
  vehicles: Vehicle[];
  activeDragId: string | null;
  isDraggingColumn: boolean;
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onArchiveVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
  onMoveVehicle?: (vehicleId: string, direction: 'up' | 'down') => void;
  onMoveToPosition?: (vehicleId: string, targetIndex: number) => void;
  onUpdateStatus?: (vehicleId: string, newStatus: VehicleStatus) => void;
  allColumns?: KanbanColumnConfig[];
}

function SortableKanbanColumn(props: SortableKanbanColumnProps) {
  const { column, columnPrefix } = props;
  const sortableId = `${columnPrefix}${column.id}`;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const dragHandleProps = useMemo(
    () => ({ ...attributes, ...listeners }),
    [attributes, listeners]
  );

  return (
    <div ref={setSortableRef} style={style} className="h-full">
      <KanbanColumn
        {...props}
        dragHandleProps={dragHandleProps}
      />
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  columnPrefix: string;
  vehicles: Vehicle[];
  activeDragId: string | null;
  isDraggingColumn: boolean;
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onArchiveVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
  onMoveVehicle?: (vehicleId: string, direction: 'up' | 'down') => void;
  onMoveToPosition?: (vehicleId: string, targetIndex: number) => void;
  onUpdateStatus?: (vehicleId: string, newStatus: VehicleStatus) => void;
  allColumns?: KanbanColumnConfig[];
  dragHandleProps?: Record<string, unknown>;
}

const KanbanColumn = memo(function KanbanColumn({ column, vehicles, activeDragId, isDraggingColumn, onSelectVehicle, onEditVehicle, onArchiveVehicle, onDuplicateVehicle, onMoveVehicle, onMoveToPosition, onUpdateStatus, allColumns, dragHandleProps }: KanbanColumnProps) {
  const t = useTranslations('vehicles');
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 220,
    overscan: 5,
    gap: 16,
  });

  const isCardOver = isOver && !isDraggingColumn;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 h-full min-h-0 rounded-2xl transition-all duration-300 border-2 ${
        isCardOver
          ? 'bg-gradient-to-b from-teal-50 to-teal-100/50 border-[#2D8B7E] shadow-2xl scale-[1.02]'
          : 'bg-white/60 backdrop-blur-sm border-slate-200/50 shadow-sm'
      }`}
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-slate-50/80 to-transparent rounded-t-2xl">
        <div className="flex items-center gap-3">
          {dragHandleProps && (
            <button
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-slate-200/60 transition-colors touch-none"
              title={t('dragColumn')}
            >
              <GripHorizontal className="w-4 h-4 text-slate-400" />
            </button>
          )}
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${column.bgColor.replace('-50', '-500')}`} />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{column.title}</h3>
        </div>
        <span className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md">
          {vehicles.length}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {vehicles.length === 0 ? (
          <div className={`h-40 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
            isCardOver
              ? 'border-[#2D8B7E] bg-gradient-to-br from-[#2D8B7E]/10 to-[#2D8B7E]/5 scale-[1.02]'
              : 'border-slate-300/50 bg-slate-50/30'
          }`}>
            <p className="text-sm font-bold text-slate-400">{isCardOver ? t('dropHere') : t('empty')}</p>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const index = virtualRow.index;
              const vehicle = vehicles[index];
              return (
                <div
                  key={vehicle.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  data-index={index}
                  ref={virtualizer.measureElement}
                >
                  <VehicleCard
                    vehicle={vehicle}
                    onSelect={() => onSelectVehicle(vehicle.id)}
                    onEdit={onEditVehicle ? () => onEditVehicle(vehicle.id) : undefined}
                    onArchive={onArchiveVehicle}
                    onDuplicate={onDuplicateVehicle}
                    isBeingDragged={activeDragId === vehicle.id}
                    isFirst={index === 0}
                    isLast={index === vehicles.length - 1}
                    onMoveUp={onMoveVehicle ? () => onMoveVehicle(vehicle.id, 'up') : undefined}
                    onMoveDown={onMoveVehicle ? () => onMoveVehicle(vehicle.id, 'down') : undefined}
                    columnVehicles={onMoveToPosition ? vehicles : undefined}
                    currentIndex={index}
                    onMoveToPosition={onMoveToPosition ? (targetIdx: number) => onMoveToPosition(vehicle.id, targetIdx) : undefined}
                    onUpdateStatus={onUpdateStatus}
                    allColumns={allColumns}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// ── Inspection Badge Helper ──────────────────────────────────────────────────

function getInspectionDisplay(days: number | null, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  if (days === null) return { bg: 'bg-slate-100', icon: 'text-slate-400', text: 'text-slate-400', label: t('inspection.noData') };
  if (days < 0)     return { bg: 'bg-red-100',   icon: 'text-red-500',   text: 'text-red-600 font-bold', label: t('inspection.overdue', { days: Math.abs(days) }) };
  if (days <= 7)    return { bg: 'bg-red-100',   icon: 'text-red-500',   text: 'text-red-600', label: t('inspection.days', { days }) };
  if (days <= 30)   return { bg: 'bg-amber-100', icon: 'text-amber-500', text: 'text-amber-600', label: t('inspection.days', { days }) };
  return             { bg: 'bg-emerald-100', icon: 'text-emerald-500', text: 'text-emerald-600', label: t('inspection.days', { days }) };
}

// ── Desktop Vehicle Card ──────────────────────────────────────────────────────

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: () => void;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isBeingDragged?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  columnVehicles?: Vehicle[];
  currentIndex?: number;
  onMoveToPosition?: (targetIndex: number) => void;
  onUpdateStatus?: (vehicleId: string, newStatus: VehicleStatus) => void;
  allColumns?: KanbanColumnConfig[];
}

const VehicleCard = memo(function VehicleCard({ vehicle, onSelect, onEdit, onArchive, onDuplicate, isBeingDragged, isFirst, isLast, onMoveUp, onMoveDown, columnVehicles, currentIndex, onMoveToPosition, onUpdateStatus, allColumns }: VehicleCardProps) {
  const t = useTranslations('vehicles');
  const [menuOpen, setMenuOpen] = useState(false);
  const [positionPickerOpen, setPositionPickerOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const statusBtnRef = useRef<HTMLButtonElement>(null);
  const positionBtnRef = useRef<HTMLButtonElement>(null);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vehicle.id,
  });

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onArchive && confirm(t('archiveConfirm', { number: vehicle.car_number || t('noPlate') }))) {
      onArchive(vehicle.id);
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onDuplicate) onDuplicate(vehicle.id);
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onSelect();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onEdit) onEdit();
  };

  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : t('noDriver');

  const showArrows = onMoveUp || onMoveDown;

  return (
    <div
      ref={setNodeRef}
      data-vehicle-id={vehicle.id}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      style={{ opacity: isDragging || isBeingDragged ? 0.35 : 1 }}
      className={`bg-white rounded-2xl border-2 border-slate-200/60 ${showArrows ? 'p-5 pr-10' : 'p-5'} hover:shadow-2xl hover:shadow-[#2D8B7E]/10 hover:border-[#2D8B7E]/50 hover:-translate-y-1 transition-all duration-300 select-none group relative ${isDragging ? 'cursor-move' : 'cursor-pointer'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D8B7E]/0 to-[#2D8B7E]/0 group-hover:from-[#2D8B7E]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

      {/* Position arrows — right side, vertical strip, below photo area */}
      {showArrows && (
        <div className="absolute right-2 top-[60%] -translate-y-1/2 flex flex-col items-center gap-1 z-20">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
            disabled={isFirst}
            className={`p-1 rounded-lg transition-all ${
              isFirst
                ? 'text-slate-200 cursor-default'
                : 'text-slate-400 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/10 active:scale-90'
            }`}
            title={t('moveUp')}
          >
            <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
          </button>
          {onMoveToPosition && columnVehicles && columnVehicles.length > 2 && (
            <button
              ref={positionBtnRef}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setPositionPickerOpen(true); }}
              className="p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/10 hover:border-[#2D8B7E]/30 active:scale-90 transition-all"
              title={t('moveToPosition')}
            >
              <ChevronsDown className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
            disabled={isLast}
            className={`p-1 rounded-lg transition-all ${
              isLast
                ? 'text-slate-200 cursor-default'
                : 'text-slate-400 hover:text-[#2D8B7E] hover:bg-[#2D8B7E]/10 active:scale-90'
            }`}
            title={t('moveDown')}
          >
            <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Position picker popup */}
      {columnVehicles && onMoveToPosition && (
        <PortalDropdown anchorRef={positionBtnRef} open={positionPickerOpen} onClose={() => setPositionPickerOpen(false)}>
          <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('moveToPosition')}</div>
          {columnVehicles.map((v, idx) => (
            <button
              key={v.id}
              onClick={(e) => {
                e.stopPropagation();
                setPositionPickerOpen(false);
                if (idx !== currentIndex) onMoveToPosition(idx);
              }}
              disabled={v.id === vehicle.id}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                v.id === vehicle.id
                  ? 'bg-[#2D8B7E]/10 border-l-2 border-[#2D8B7E]'
                  : 'hover:bg-slate-50 border-l-2 border-transparent'
              }`}
            >
              <span className={`text-xs font-bold w-5 text-center tabular-nums ${v.id === vehicle.id ? 'text-[#2D8B7E]' : 'text-slate-400'}`}>
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <span className={`text-sm font-bold truncate block ${v.id === vehicle.id ? 'text-[#2D8B7E]' : 'text-slate-700'}`}>
                  {v.car_number || t('noPlate')}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {v.manufacturer} {v.model}
                </span>
              </div>
            </button>
          ))}
        </PortalDropdown>
      )}

      {vehicle.photos && vehicle.photos.length > 0 && (
        <div className={`relative ${showArrows ? '-ml-5 -mr-10' : '-mx-5'} -mt-5 mb-3 h-36 rounded-t-2xl overflow-hidden`}>
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number || ''}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {vehicle.photos.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{vehicle.photos.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">
        {/* Title + menu */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">
              {vehicle.car_number || <span className="text-slate-400 italic">{t('noPlate')}</span>}
              {vehicle.is_temporary_plate && vehicle.car_number && (
                <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md align-middle">{t('temporaryPlate')}</span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide truncate">{vehicle.vin_number}</p>
            <p className="text-sm text-slate-500 mt-0.5 font-medium truncate">
              {vehicle.manufacturer} {vehicle.model} {vehicle.year && <><span className="text-slate-400">&middot;</span> {vehicle.year}</>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
              <GripVertical className="w-5 h-5" />
            </div>

            <div className="relative">
              <button
                ref={menuBtnRef}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleMenuClick}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700 hover:shadow-md"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              <PortalDropdown anchorRef={menuBtnRef} open={menuOpen} onClose={() => setMenuOpen(false)}>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={handleView}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="w-4 h-4 text-[#2D8B7E]" />
                  {t('view')}
                </button>
                {onEdit && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleEdit}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                    {t('edit')}
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={handleDuplicate}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-purple-600" />
                    {t('duplicate')}
                  </button>
                )}
                {onArchive && (
                  <>
                    <div className="border-t border-slate-200/70 my-1.5" />
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={handleArchive}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      {t('archiveVehicle')}
                    </button>
                  </>
                )}
              </PortalDropdown>
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="flex items-center gap-2 text-sm mb-3">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={vehicle.driver ? 'text-slate-700 font-semibold truncate' : 'text-slate-400 italic text-xs'}>
            {driverName}
          </span>
        </div>

        {/* Compact info row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Total cost */}
          {vehicle.total_cost && (
            <div className="flex items-center gap-1.5 bg-[#2D8B7E]/5 border border-[#2D8B7E]/20 rounded-lg px-2.5 py-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#2D8B7E]" />
              <span className="text-xs font-bold text-[#2D8B7E] tabular-nums">
                {parseFloat(vehicle.total_cost).toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {/* Equipment */}
          {vehicle.equipment_total > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className={`text-xs font-bold ${
                vehicle.equipment_equipped === vehicle.equipment_total
                  ? 'text-emerald-600'
                  : vehicle.equipment_equipped > 0
                  ? 'text-amber-600'
                  : 'text-slate-500'
              }`}>
                {vehicle.equipment_equipped}/{vehicle.equipment_total}
              </span>
            </div>
          )}

          {/* Regulation */}
          {vehicle.has_regulation ? (
            vehicle.regulation_overdue > 0 ? (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200/70 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-600">{vehicle.regulation_overdue}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/70 rounded-lg px-2.5 py-1.5">
                <ScrollText className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600">{t('regulation.ok')}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
              <ScrollText className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-xs font-semibold text-slate-400">{t('regulation.none')}</span>
            </div>
          )}

          {/* Inspection */}
          {(() => {
            const ins = getInspectionDisplay(vehicle.days_until_inspection, t);
            return (
              <div className={`flex items-center gap-1.5 ${ins.bg} border border-slate-200/70 rounded-lg px-2.5 py-1.5`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${ins.icon}`} />
                <span className={`text-xs font-semibold ${ins.text}`}>{ins.label}</span>
              </div>
            );
          })()}
        </div>

        {/* Status change button */}
        {onUpdateStatus && allColumns && (
          <div className="mt-3">
            <button
              ref={statusBtnRef}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setStatusPickerOpen(!statusPickerOpen); }}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all hover:shadow-md ${
                allColumns.find(c => c.id === vehicle.status)?.bgColor ?? 'bg-slate-50'
              } ${allColumns.find(c => c.id === vehicle.status)?.color ?? 'text-slate-700'} ${
                allColumns.find(c => c.id === vehicle.status)?.borderColor ?? 'border-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${(allColumns.find(c => c.id === vehicle.status)?.bgColor ?? 'bg-slate-500').replace('-50', '-500')}`} />
              {allColumns.find(c => c.id === vehicle.status)?.title ?? vehicle.status}
              <ChevronDown className="w-3 h-3" />
            </button>

            <PortalDropdown anchorRef={statusBtnRef} open={statusPickerOpen} onClose={() => setStatusPickerOpen(false)} align="left">
              {allColumns.filter(col => col.id !== vehicle.status).map(col => (
                <button
                  key={col.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(vehicle.id, col.id);
                    setStatusPickerOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.bgColor.replace('-50', '-500')}`} />
                  <span className="truncate">{col.title}</span>
                </button>
              ))}
            </PortalDropdown>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Drag Overlay Card ─────────────────────────────────────────────────────────

function VehicleCardOverlay({ vehicle }: { vehicle: Vehicle }) {
  const t = useTranslations('vehicles');
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : t('noDriver');

  return (
    <div className="cursor-move bg-white rounded-2xl border-2 border-[#2D8B7E]/50 shadow-2xl shadow-[#2D8B7E]/20 w-80 select-none overflow-hidden">
      {vehicle.photos && vehicle.photos.length > 0 && (
        <div className="relative h-36">
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number || ''}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">{vehicle.car_number || t('noPlate')}</h4>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide truncate">{vehicle.vin_number}</p>
            <p className="text-sm text-slate-500 mt-0.5 font-medium truncate">
              {vehicle.manufacturer} {vehicle.model} {vehicle.year && <><span className="text-slate-400">&middot;</span> {vehicle.year}</>}
            </p>
          </div>
          <GripVertical className="w-5 h-5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 text-sm mb-3">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={vehicle.driver ? 'text-slate-700 font-semibold truncate' : 'text-slate-400 italic text-xs'}>
            {driverName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {vehicle.total_cost && (
            <div className="flex items-center gap-1.5 bg-[#2D8B7E]/5 border border-[#2D8B7E]/20 rounded-lg px-2.5 py-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#2D8B7E]" />
              <span className="text-xs font-bold text-[#2D8B7E] tabular-nums">
                {parseFloat(vehicle.total_cost).toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}

          {vehicle.equipment_total > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className={`text-xs font-bold ${
                vehicle.equipment_equipped === vehicle.equipment_total
                  ? 'text-emerald-600'
                  : vehicle.equipment_equipped > 0
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}>
                {vehicle.equipment_equipped}/{vehicle.equipment_total}
              </span>
            </div>
          )}

          {vehicle.has_regulation ? (
            vehicle.regulation_overdue > 0 ? (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200/70 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-600">{vehicle.regulation_overdue}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/70 rounded-lg px-2.5 py-1.5">
                <ScrollText className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600">{t('regulation.ok')}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 rounded-lg px-2.5 py-1.5">
              <ScrollText className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-xs font-semibold text-slate-400">{t('regulation.none')}</span>
            </div>
          )}

          {(() => {
            const ins = getInspectionDisplay(vehicle.days_until_inspection, t);
            return (
              <div className={`flex items-center gap-1.5 ${ins.bg} border border-slate-200/70 rounded-lg px-2.5 py-1.5`}>
                <ShieldCheck className={`w-3.5 h-3.5 ${ins.icon}`} />
                <span className={`text-xs font-semibold ${ins.text}`}>{ins.label}</span>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Vehicle List (virtualized) ─────────────────────────────────────────

interface MobileVehicleListProps {
  vehicles: Vehicle[];
  columns: KanbanColumnConfig[];
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onArchiveVehicle?: (id: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  onReorderVehicles?: (items: { id: string; status_position: number }[]) => Promise<void>;
  handleMoveVehicle: (vehicleId: string, direction: 'up' | 'down') => void;
  handleMoveToPosition: (vehicleId: string, targetIndex: number) => void;
  emptyLabel: string;
}

const MobileVehicleList = memo(function MobileVehicleList({ vehicles, columns, onSelectVehicle, onEditVehicle, onArchiveVehicle, onUpdateStatus, onReorderVehicles, handleMoveVehicle, handleMoveToPosition, emptyLabel }: MobileVehicleListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: vehicles.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 5,
    gap: 12,
  });

  return (
    <div ref={scrollRef} className="md:hidden flex-1 overflow-y-auto p-4 bg-slate-50/80">
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Car className="w-14 h-14 mb-3 opacity-20" />
          <p className="font-semibold text-sm">{emptyLabel}</p>
        </div>
      ) : (
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const index = virtualRow.index;
            const vehicle = vehicles[index];
            return (
              <div
                key={vehicle.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                data-index={index}
                ref={virtualizer.measureElement}
              >
                <MobileVehicleCard
                  vehicle={vehicle}
                  columns={columns}
                  onSelect={() => onSelectVehicle(vehicle.id)}
                  onEdit={onEditVehicle ? () => onEditVehicle(vehicle.id) : undefined}
                  onArchive={onArchiveVehicle}
                  onUpdateStatus={onUpdateStatus}
                  isFirst={index === 0}
                  isLast={index === vehicles.length - 1}
                  onMoveUp={onReorderVehicles ? () => handleMoveVehicle(vehicle.id, 'up') : undefined}
                  onMoveDown={onReorderVehicles ? () => handleMoveVehicle(vehicle.id, 'down') : undefined}
                  columnVehicles={onReorderVehicles ? vehicles : undefined}
                  currentIndex={index}
                  onMoveToPosition={onReorderVehicles ? (targetIdx: number) => handleMoveToPosition(vehicle.id, targetIdx) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ── Mobile Vehicle Card ───────────────────────────────────────────────────────

interface MobileVehicleCardProps {
  vehicle: Vehicle;
  columns: KanbanColumnConfig[];
  onSelect: () => void;
  onEdit?: () => void;
  onArchive?: (id: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  columnVehicles?: Vehicle[];
  currentIndex?: number;
  onMoveToPosition?: (targetIndex: number) => void;
}

const MobileVehicleCard = memo(function MobileVehicleCard({ vehicle, columns, onSelect, onEdit, onArchive, onUpdateStatus, isFirst, isLast, onMoveUp, onMoveDown, columnVehicles, currentIndex, onMoveToPosition }: MobileVehicleCardProps) {
  const t = useTranslations('vehicles');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const currentColumn = columns.find(c => c.id === vehicle.status);
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : null;

  return (
    <div data-vehicle-id={vehicle.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">

      {/* Photo thumbnail */}
      {vehicle.photos && vehicle.photos.length > 0 && (
        <div
          onClick={onSelect}
          className="relative h-28 cursor-pointer select-none"
        >
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number || ''}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {vehicle.photos.length > 1 && (
            <div className="absolute bottom-1.5 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{vehicle.photos.length - 1}
            </div>
          )}
        </div>
      )}

      {/* Main card body — tap anywhere to view vehicle details */}
      <div
        onClick={onSelect}
        className="p-4 pb-3 active:bg-slate-50 cursor-pointer transition-colors select-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-black text-slate-900">
              {vehicle.car_number || <span className="text-slate-400 italic font-bold">{t('noPlate')}</span>}
              {vehicle.is_temporary_plate && vehicle.car_number && (
                <span className="ml-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md align-middle">{t('temporaryPlate')}</span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide truncate">{vehicle.vin_number}</p>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {vehicle.manufacturer} {vehicle.model} {vehicle.year && <>· {vehicle.year}</>}
            </p>
          </div>
          {/* Kebab menu — stopPropagation so card tap doesn't fire */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="p-1.5 -mt-1 -mr-1.5 rounded-xl active:bg-slate-100 transition-colors shrink-0"
            aria-label="Дії"
          >
            <MoreVertical className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          {/* Status badge */}
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
            currentColumn?.bgColor ?? 'bg-slate-50'
          } ${currentColumn?.color ?? 'text-slate-600'} ${
            currentColumn?.borderColor ?? 'border-slate-200'
          }`}>
            {currentColumn?.title ?? vehicle.status}
          </span>
          {driverName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-600 font-medium truncate">{driverName}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">{t('noDriver')}</span>
          )}
          {(() => {
            const ins = getInspectionDisplay(vehicle.days_until_inspection, t);
            return (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className={`w-3.5 h-3.5 ${ins.icon} shrink-0`} />
                <span className={`text-xs ${ins.text}`}>{ins.label}</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom bar — total cost, equipment, regulation alert, quick status change */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 gap-2">
        {/* Position arrows */}
        {(onMoveUp || onMoveDown) && (
          <div className="flex items-center gap-0.5 shrink-0 bg-slate-50 rounded-xl border border-slate-200/80 p-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
              disabled={isFirst}
              className={`p-1.5 rounded-lg transition-all ${
                isFirst
                  ? 'text-slate-200 cursor-default'
                  : 'text-slate-500 active:bg-[#2D8B7E]/15 active:text-[#2D8B7E]'
              }`}
              title={t('moveUp')}
            >
              <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
            {onMoveToPosition && columnVehicles && columnVehicles.length > 2 && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowPositionPicker(true); }}
                className="p-1.5 rounded-lg text-slate-400 active:bg-[#2D8B7E]/15 active:text-[#2D8B7E] transition-all"
                title={t('moveToPosition')}
              >
                <ChevronsDown className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
              disabled={isLast}
              className={`p-1.5 rounded-lg transition-all ${
                isLast
                  ? 'text-slate-200 cursor-default'
                  : 'text-slate-500 active:bg-[#2D8B7E]/15 active:text-[#2D8B7E]'
              }`}
              title={t('moveDown')}
            >
              <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {vehicle.total_cost && (
            <div className="flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-[#2D8B7E] shrink-0" />
              <span className="text-xs font-bold text-[#2D8B7E] tabular-nums">
                {parseFloat(vehicle.total_cost).toLocaleString('pl-PL', { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
          {vehicle.equipment_total > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className={`text-xs font-bold ${
                vehicle.equipment_equipped === vehicle.equipment_total
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}>
                {vehicle.equipment_equipped}/{vehicle.equipment_total}
              </span>
            </div>
          )}
          {vehicle.has_regulation ? (
            vehicle.regulation_overdue > 0 ? (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-xs font-bold text-red-600">
                  {t('regulation.overdue', { count: vehicle.regulation_overdue })}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <ScrollText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-600">{t('regulation.ok')}</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-1">
              <ScrollText className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="text-xs font-semibold text-slate-400">{t('regulation.none')}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowStatusPicker(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="max-w-[120px] truncate">{currentColumn?.title ?? vehicle.status}</span>
        </button>
      </div>

      {/* Kebab dropdown — View / Edit / Delete */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-2 top-10 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2 min-w-[160px]">
            <button
              onClick={() => { setShowMenu(false); onSelect(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Eye className="w-4 h-4 text-[#2D8B7E]" />
              {t('view')}
            </button>
            {onEdit && (
              <>
                <div className="border-t border-slate-100 mx-3" />
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <Edit className="w-4 h-4 text-blue-500" />
                  {t('edit')}
                </button>
              </>
            )}
            {onArchive && (
              <>
                <div className="border-t border-slate-100 mx-3" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm(t('archiveConfirm', { number: vehicle.car_number || t('noPlate') }))) {
                      onArchive(vehicle.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-amber-600 hover:bg-amber-50 active:bg-amber-100 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  {t('archiveVehicle')}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Status picker — bottom sheet (most mobile-native pattern) */}
      {showStatusPicker && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setShowStatusPicker(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-slate-300" />
            </div>
            {/* Sheet header */}
            <div className="px-5 pt-2 pb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {vehicle.car_number || t('noPlate')}
              </p>
              <p className="text-sm font-bold text-slate-700">Оберіть новий статус</p>
            </div>
            {/* Status grid 2-column */}
            <div className="grid grid-cols-2 gap-2.5 px-4 pb-8">
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={() => { onUpdateStatus(vehicle.id, col.id); setShowStatusPicker(false); }}
                  className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-sm font-bold border transition-all active:scale-95 ${
                    vehicle.status === col.id
                      ? `${col.bgColor} ${col.color} ${col.borderColor} ring-2 ring-offset-1 ring-current/20`
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.bgColor.replace('-50', '-500')}`} />
                  <span className="truncate">{col.title}</span>
                  {vehicle.status === col.id && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Position picker — bottom sheet */}
      {showPositionPicker && columnVehicles && onMoveToPosition && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setShowPositionPicker(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slide-up max-h-[70vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-1 rounded-full bg-slate-300" />
            </div>
            <div className="px-5 pt-2 pb-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                {vehicle.car_number || t('noPlate')}
              </p>
              <p className="text-sm font-bold text-slate-700">{t('moveToPosition')}</p>
            </div>
            <div className="overflow-y-auto px-4 pb-8">
              {columnVehicles.map((v, idx) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setShowPositionPicker(false);
                    if (idx !== currentIndex) onMoveToPosition(idx);
                  }}
                  disabled={v.id === vehicle.id}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors rounded-xl ${
                    v.id === vehicle.id
                      ? 'bg-[#2D8B7E]/10 border-l-2 border-[#2D8B7E]'
                      : 'hover:bg-slate-50 active:bg-slate-100 border-l-2 border-transparent'
                  }`}
                >
                  <span className={`text-sm font-bold w-6 text-center tabular-nums ${v.id === vehicle.id ? 'text-[#2D8B7E]' : 'text-slate-400'}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-bold truncate block ${v.id === vehicle.id ? 'text-[#2D8B7E]' : 'text-slate-700'}`}>
                      {v.car_number || t('noPlate')}
                    </span>
                    <span className="text-xs text-slate-400 truncate block">
                      {v.manufacturer} {v.model}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
