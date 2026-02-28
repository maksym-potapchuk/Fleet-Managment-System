'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
} from '@dnd-kit/core';
import {
  Car,
  Plus,
  Search,
  GripVertical,
  User,
  Calendar,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Copy,
  Menu,
  X,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';

export type KanbanColumnConfig = {
  id: VehicleStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

interface VehicleKanbanProps {
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onAddVehicle: () => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  onDeleteVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
  onOpenSidebar?: () => void;
}

export function VehicleKanban({
  vehicles,
  onSelectVehicle,
  onEditVehicle,
  onAddVehicle,
  onUpdateStatus,
  onDeleteVehicle,
  onDuplicateVehicle,
  onOpenSidebar
}: VehicleKanbanProps) {
  const t = useTranslations('vehicles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<VehicleStatus[]>([]);
  const [driverFilter, setDriverFilter] = useState<'all' | 'with_driver' | 'without_driver'>('all');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [mobileActiveStatus, setMobileActiveStatus] = useState<VehicleStatus | 'ALL'>('ALL');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const activeDragVehicle = useMemo(
    () => vehicles.find(v => v.id === activeDragId) ?? null,
    [vehicles, activeDragId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const vehicleId = active.id as string;
    const newStatus = over.id as VehicleStatus;
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle && vehicle.status !== newStatus) {
      onUpdateStatus(vehicleId, newStatus);
    }
  };

  const KANBAN_COLUMNS = useMemo((): KanbanColumnConfig[] => [
    { id: 'CTO', title: t('statuses.CTO'), color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { id: 'FOCUS', title: t('statuses.FOCUS'), color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'CLEANING', title: t('statuses.CLEANING'), color: 'text-cyan-700', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200' },
    { id: 'PREPARATION', title: t('statuses.PREPARATION'), color: 'text-indigo-700', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
    { id: 'READY', title: t('statuses.READY'), color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    { id: 'LEASING', title: t('statuses.LEASING'), color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'RENT', title: t('statuses.RENT'), color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
    { id: 'SELLING', title: t('statuses.SELLING'), color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'SOLD', title: t('statuses.SOLD'), color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
  ], [t]);

  const uniqueManufacturers = useMemo(() => {
    const manufacturers = new Set(vehicles.map(v => v.manufacturer));
    return Array.from(manufacturers).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch = (
            v.car_number.toLowerCase().includes(searchLower) ||
            v.manufacturer.toLowerCase().includes(searchLower) ||
            v.model.toLowerCase().includes(searchLower) ||
            v.vin_number.toLowerCase().includes(searchLower)
          );
          if (!matchesSearch) return false;
        }
        if (selectedStatuses.length > 0 && !selectedStatuses.includes(v.status)) return false;
        if (driverFilter === 'with_driver' && !v.driver) return false;
        if (driverFilter === 'without_driver' && v.driver) return false;
        if (selectedManufacturers.length > 0 && !selectedManufacturers.includes(v.manufacturer)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [vehicles, searchTerm, selectedStatuses, driverFilter, selectedManufacturers]);

  const mobileDisplayedVehicles = useMemo(() => {
    if (mobileActiveStatus === 'ALL') return filteredVehicles;
    return filteredVehicles.filter(v => v.status === mobileActiveStatus);
  }, [filteredVehicles, mobileActiveStatus]);

  const visibleColumns = useMemo(() => {
    const hasActiveFilters = searchTerm || selectedStatuses.length > 0 || driverFilter !== 'all' || selectedManufacturers.length > 0;
    if (!hasActiveFilters) return KANBAN_COLUMNS;
    const statusesWithVehicles = new Set(filteredVehicles.map(v => v.status));
    return KANBAN_COLUMNS.filter(col => statusesWithVehicles.has(col.id));
  }, [KANBAN_COLUMNS, filteredVehicles, searchTerm, selectedStatuses, driverFilter, selectedManufacturers]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'LEASING' || v.status === 'RENT').length;

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

          <button
            onClick={onAddVehicle}
            className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-3 py-2.5 md:px-6 md:py-3 rounded-xl hover:shadow-2xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-1.5 text-sm font-bold whitespace-nowrap flex-shrink-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" strokeWidth={3} />
            <span className="hidden sm:inline">{t('addVehicle')}</span>
          </button>
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

      {/* ── Mobile Vehicle List ── */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/80">
        {mobileDisplayedVehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Car className="w-14 h-14 mb-3 opacity-20" />
            <p className="font-semibold text-sm">{t('empty')}</p>
          </div>
        ) : (
          mobileDisplayedVehicles.map(vehicle => (
            <MobileVehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              columns={KANBAN_COLUMNS}
              onSelect={() => onSelectVehicle(vehicle.id)}
              onEdit={onEditVehicle ? () => onEditVehicle(vehicle.id) : undefined}
              onDelete={onDeleteVehicle}
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </div>

      {/* ── Desktop Kanban Board ── */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="hidden md:block flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full min-w-max">
            {visibleColumns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                vehicles={filteredVehicles.filter(v => v.status === column.id)}
                activeDragId={activeDragId}
                onSelectVehicle={onSelectVehicle}
                onEditVehicle={onEditVehicle}
                onDeleteVehicle={onDeleteVehicle}
                onDuplicateVehicle={onDuplicateVehicle}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeDragVehicle ? (
            <div style={{ transform: 'rotate(-2deg)', opacity: 0.95 }}>
              <VehicleCardOverlay vehicle={activeDragVehicle} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  vehicles: Vehicle[];
  activeDragId: string | null;
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (id: string) => void;
  onDeleteVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
}

function KanbanColumn({ column, vehicles, activeDragId, onSelectVehicle, onEditVehicle, onDeleteVehicle, onDuplicateVehicle }: KanbanColumnProps) {
  const t = useTranslations('vehicles');
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 rounded-2xl transition-all duration-300 border-2 ${
        isOver
          ? 'bg-gradient-to-b from-teal-50 to-teal-100/50 border-[#2D8B7E] shadow-2xl scale-[1.02]'
          : 'bg-white/60 backdrop-blur-sm border-slate-200/50 shadow-sm'
      }`}
    >
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-slate-50/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${column.bgColor.replace('-50', '-500')}`} />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{column.title}</h3>
        </div>
        <span className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md">
          {vehicles.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {vehicles.length === 0 ? (
          <div className={`h-40 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
            isOver
              ? 'border-[#2D8B7E] bg-gradient-to-br from-[#2D8B7E]/10 to-[#2D8B7E]/5 scale-[1.02]'
              : 'border-slate-300/50 bg-slate-50/30'
          }`}>
            <p className="text-sm font-bold text-slate-400">{isOver ? t('dropHere') : t('empty')}</p>
          </div>
        ) : (
          vehicles.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onSelect={() => onSelectVehicle(vehicle.id)}
              onEdit={onEditVehicle ? () => onEditVehicle(vehicle.id) : undefined}
              onDelete={onDeleteVehicle}
              onDuplicate={onDuplicateVehicle}
              isBeingDragged={activeDragId === vehicle.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Desktop Vehicle Card ──────────────────────────────────────────────────────

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isBeingDragged?: boolean;
}

function VehicleCard({ vehicle, onSelect, onEdit, onDelete, onDuplicate, isBeingDragged }: VehicleCardProps) {
  const t = useTranslations('vehicles');
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: vehicle.id,
  });

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (onDelete && confirm(t('deleteConfirm', { number: vehicle.car_number }))) {
      onDelete(vehicle.id);
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

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      style={{ opacity: isDragging || isBeingDragged ? 0.35 : 1 }}
      className={`bg-white rounded-2xl border-2 border-slate-200/60 p-5 hover:shadow-2xl hover:shadow-[#2D8B7E]/10 hover:border-[#2D8B7E]/50 hover:-translate-y-1 transition-all duration-300 select-none group relative overflow-hidden ${isDragging ? 'cursor-move' : 'cursor-pointer'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D8B7E]/0 to-[#2D8B7E]/0 group-hover:from-[#2D8B7E]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

      {vehicle.photos && vehicle.photos.length > 0 && (
        <div className="relative -mx-5 -mt-5 mb-4 h-28 rounded-t-2xl overflow-hidden">
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number}
            className="w-full h-full object-cover"
          />
          {vehicle.photos.length > 1 && (
            <div className="absolute bottom-1.5 right-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              +{vehicle.photos.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">{vehicle.car_number}</h4>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              {vehicle.manufacturer} {vehicle.model}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
              <GripVertical className="w-5 h-5" />
            </div>

            <div className="relative">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleMenuClick}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700 hover:shadow-md"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                  />
                  <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-2xl border-2 border-slate-200/50 py-2 min-w-[180px] overflow-hidden">
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
                    {onDelete && (
                      <>
                        <div className="border-t border-slate-200/70 my-1.5" />
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={handleDelete}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('delete')}
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 mt-1">
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#2D8B7E]/10 transition-colors">
              <Calendar className="w-4 h-4 text-slate-500 group-hover:text-[#2D8B7E] transition-colors" />
            </div>
            <span className="font-semibold">{vehicle.year} {t('year')}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#2D8B7E]/10 transition-colors">
              <DollarSign className="w-4 h-4 text-slate-500 group-hover:text-[#2D8B7E] transition-colors" />
            </div>
            <span className="font-bold text-[#2D8B7E]">{parseFloat(vehicle.cost).toLocaleString()} PLN</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-[#2D8B7E]/10 transition-colors">
              <User className="w-4 h-4 text-slate-500 group-hover:text-[#2D8B7E] transition-colors" />
            </div>
            <span className={vehicle.driver ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
              {driverName}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">VIN</p>
          <p className="text-xs text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded-lg">{vehicle.vin_number}</p>
        </div>
      </div>
    </div>
  );
}

// ── Drag Overlay Card ─────────────────────────────────────────────────────────

function VehicleCardOverlay({ vehicle }: { vehicle: Vehicle }) {
  const t = useTranslations('vehicles');
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : t('noDriver');

  return (
    <div className="cursor-move bg-white rounded-2xl border-2 border-[#2D8B7E]/50 shadow-2xl shadow-[#2D8B7E]/20 w-80 select-none overflow-hidden">
      {vehicle.photos && vehicle.photos.length > 0 && (
        <div className="relative h-28">
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-slate-900 tracking-tight">{vehicle.car_number}</h4>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            {vehicle.manufacturer} {vehicle.model}
          </p>
        </div>
        <GripVertical className="w-5 h-5 text-slate-400" />
      </div>

      <div className="space-y-3 mt-1">
        <div className="flex items-center gap-2.5 text-sm text-slate-700">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-slate-500" />
          </div>
          <span className="font-semibold">{vehicle.year} {t('year')}</span>
        </div>

        <div className="flex items-center gap-2.5 text-sm text-slate-700">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <span className="font-bold text-[#2D8B7E]">{parseFloat(vehicle.cost).toLocaleString()} PLN</span>
        </div>

        <div className="flex items-center gap-2.5 text-sm">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <span className={vehicle.driver ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}>
            {driverName}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200/70">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">VIN</p>
        <p className="text-xs text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded-lg">{vehicle.vin_number}</p>
      </div>
      </div>
    </div>
  );
}

// ── Mobile Vehicle Card ───────────────────────────────────────────────────────

interface MobileVehicleCardProps {
  vehicle: Vehicle;
  columns: KanbanColumnConfig[];
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
}

function MobileVehicleCard({ vehicle, columns, onSelect, onEdit, onDelete, onUpdateStatus }: MobileVehicleCardProps) {
  const t = useTranslations('vehicles');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const currentColumn = columns.find(c => c.id === vehicle.status);
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">

      {/* Photo thumbnail */}
      {vehicle.photos && vehicle.photos.length > 0 && (
        <div
          onClick={onSelect}
          className="relative h-28 cursor-pointer select-none"
        >
          <img
            src={vehicle.photos[0].image}
            alt={vehicle.car_number}
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
            <h4 className="text-base font-black text-slate-900">{vehicle.car_number}</h4>
            <p className="text-sm text-slate-500 font-medium mt-0.5">
              {vehicle.manufacturer} {vehicle.model} · {vehicle.year}
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
        </div>
      </div>

      {/* Bottom bar — cost + quick status change */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100">
        <span className="text-sm font-black text-[#2D8B7E]">
          {parseFloat(vehicle.cost).toLocaleString()} PLN
        </span>
        <button
          onClick={() => setShowStatusPicker(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
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
            {onDelete && (
              <>
                <div className="border-t border-slate-100 mx-3" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    if (confirm(t('deleteConfirm', { number: vehicle.car_number }))) {
                      onDelete(vehicle.id);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('delete')}
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
                {vehicle.car_number}
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
    </div>
  );
}
