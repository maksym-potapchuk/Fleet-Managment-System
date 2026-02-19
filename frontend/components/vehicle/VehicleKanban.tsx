'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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
  Filter
} from 'lucide-react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';

interface VehicleKanbanProps {
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  onDeleteVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
  onOpenSidebar?: () => void;
}

export function VehicleKanban({
  vehicles,
  onSelectVehicle,
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

  // Auto-scroll during drag
  const boardRef = useRef<HTMLDivElement>(null);

  const handleBoardDragOver = useCallback((e: React.DragEvent) => {
    const container = boardRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeZone = 150; // px from edge to start scrolling
    const maxSpeed = 20;

    const mouseX = e.clientX;

    if (mouseX < rect.left + edgeZone) {
      // Scroll left
      const intensity = 1 - (mouseX - rect.left) / edgeZone;
      container.scrollLeft -= maxSpeed * Math.max(0, intensity);
    } else if (mouseX > rect.right - edgeZone) {
      // Scroll right
      const intensity = 1 - (rect.right - mouseX) / edgeZone;
      container.scrollLeft += maxSpeed * Math.max(0, intensity);
    }
  }, []);

  // Status column configuration with translations
  const KANBAN_COLUMNS: {
    id: VehicleStatus;
    title: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }[] = [
    {
      id: 'CTO',
      title: t('statuses.CTO'),
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'FOCUS',
      title: t('statuses.FOCUS'),
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'CLEANING',
      title: t('statuses.CLEANING'),
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200'
    },
    {
      id: 'PREPARATION',
      title: t('statuses.PREPARATION'),
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      id: 'READY',
      title: t('statuses.READY'),
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      id: 'LEASING',
      title: t('statuses.LEASING'),
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'RENT',
      title: t('statuses.RENT'),
      color: 'text-sky-700',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200'
    },
    {
      id: 'SELLING',
      title: t('statuses.SELLING'),
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      id: 'SOLD',
      title: t('statuses.SOLD'),
      color: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200'
    },
  ];

  // Get unique manufacturers for quick filter
  const uniqueManufacturers = useMemo(() => {
    const manufacturers = new Set(vehicles.map(v => v.manufacturer));
    return Array.from(manufacturers).sort();
  }, [vehicles]);

  // Filter vehicles - apply all filters
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // Search filter
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

      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(v.status)) {
        return false;
      }

      // Driver filter
      if (driverFilter === 'with_driver' && !v.driver) {
        return false;
      }
      if (driverFilter === 'without_driver' && v.driver) {
        return false;
      }

      // Manufacturer filter
      if (selectedManufacturers.length > 0 && !selectedManufacturers.includes(v.manufacturer)) {
        return false;
      }

      return true;
    });
  }, [vehicles, searchTerm, selectedStatuses, driverFilter, selectedManufacturers]);

  // Show only columns that have filtered vehicles (when any filter is active)
  const visibleColumns = useMemo(() => {
    const hasActiveFilters = searchTerm || selectedStatuses.length > 0 || driverFilter !== 'all' || selectedManufacturers.length > 0;

    if (!hasActiveFilters) return KANBAN_COLUMNS;

    const statusesWithVehicles = new Set(
      filteredVehicles.map(v => v.status)
    );

    return KANBAN_COLUMNS.filter(col => statusesWithVehicles.has(col.id));
  }, [KANBAN_COLUMNS, filteredVehicles, searchTerm, selectedStatuses, driverFilter, selectedManufacturers]);

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'LEASING' || v.status === 'RENT').length;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-5 md:px-6 shadow-sm flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            {/* Sidebar Menu Button */}
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="flex items-center justify-center w-11 h-11 md:w-12 md:h-12 bg-white border-2 border-slate-200 rounded-xl hover:border-[#2D8B7E]/50 hover:bg-slate-50 transition-all shadow-sm hover:shadow-md active:scale-95 flex-shrink-0 mt-0.5"
                title="Відкрити меню"
              >
                <Menu className="w-5 h-5 md:w-6 md:h-6 text-slate-700" />
              </button>
            )}

            <div>
              <h1 className="text-2xl md:text-3xl text-slate-900 font-black flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#2D8B7E] to-[#248B7B] rounded-xl flex items-center justify-center shadow-lg">
                  <Car className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={2.5} />
                </div>
                {t('title')}
              </h1>
              <p className="text-sm font-bold text-slate-600 mt-2 ml-1">
                {t('total')}: <span className="text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">{totalVehicles}</span>
                <span className="mx-2 text-slate-300">•</span>
                {t('active')}: <span className="text-white bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] px-2.5 py-1 rounded-lg shadow-sm">{activeVehicles}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onAddVehicle}
            className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-6 py-3 rounded-xl hover:shadow-2xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold whitespace-nowrap"
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            <span>{t('addVehicle')}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-4xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 text-sm text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal bg-slate-50/80 border-2 border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/50 focus:border-[#2D8B7E]/50 focus:bg-white transition-all shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-lg transition-colors"
              title="Очистити пошук"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Compact Filters - Single Line */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {/* Status Filter - Inline */}
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

          {/* Divider */}
          <div className="h-6 w-px bg-slate-300"></div>

          {/* Driver Filter - Inline */}
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <div className="flex gap-1.5">
              <button
                onClick={() => setDriverFilter('all')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  driverFilter === 'all'
                    ? 'bg-[#2D8B7E] text-white border border-[#2D8B7E]'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('filters.allDrivers')} ({vehicles.length})
              </button>
              <button
                onClick={() => setDriverFilter('with_driver')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  driverFilter === 'with_driver'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('filters.withDriver')} ({vehicles.filter(v => v.driver).length})
              </button>
              <button
                onClick={() => setDriverFilter('without_driver')}
                className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                  driverFilter === 'without_driver'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              >
                {t('filters.withoutDriver')} ({vehicles.filter(v => !v.driver).length})
              </button>
            </div>
          </div>

          {/* Manufacturer Filter - Inline */}
          {uniqueManufacturers.length > 1 && (
            <>
              <div className="h-6 w-px bg-slate-300"></div>
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

          {/* Clear All Filters - Inline */}
          {(selectedStatuses.length > 0 || driverFilter !== 'all' || selectedManufacturers.length > 0) && (
            <>
              <div className="h-6 w-px bg-slate-300"></div>
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

      {/* Kanban Board */}
      <div
        ref={boardRef}
        onDragOver={handleBoardDragOver}
        className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-6">
        <div className="flex gap-4 h-full min-w-max">
          {visibleColumns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              vehicles={filteredVehicles.filter(v => v.status === column.id)}
              onSelectVehicle={onSelectVehicle}
              onUpdateStatus={onUpdateStatus}
              onDeleteVehicle={onDeleteVehicle}
              onDuplicateVehicle={onDuplicateVehicle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[0];
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onUpdateStatus: (vehicleId: string, newStatus: VehicleStatus) => void;
  onDeleteVehicle?: (id: string) => void;
  onDuplicateVehicle?: (id: string) => void;
}

function KanbanColumn({ column, vehicles, onSelectVehicle, onUpdateStatus, onDeleteVehicle, onDuplicateVehicle }: KanbanColumnProps) {
  const t = useTranslations('vehicles');
  const [isOver, setIsOver] = useState(false);
  const [draggedVehicleId, setDraggedVehicleId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only show drop zone if we're dragging a vehicle
    const dragType = e.dataTransfer.types.includes('application/json') ||
                     e.dataTransfer.types.includes('text/plain');
    if (dragType) {
      setIsOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're leaving the column completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    setDraggedVehicleId(null);

    try {
      const data = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (!data) return;

      const { vehicleId, currentStatus } = JSON.parse(data);

      if (vehicleId && currentStatus !== column.id) {
        onUpdateStatus(vehicleId, column.id);
      }
    } catch (error) {
      console.error('Invalid drag data:', error);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      className={`flex flex-col w-80 rounded-2xl transition-all duration-300 border-2 ${
        isOver
          ? 'bg-gradient-to-b from-teal-50 to-teal-100/50 border-[#2D8B7E] shadow-2xl scale-[1.02]'
          : 'bg-white/60 backdrop-blur-sm border-slate-200/50 shadow-sm'
      }`}
    >
      {/* Column Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200/70 bg-gradient-to-r from-slate-50/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${column.bgColor.replace('bg-', 'bg-').split('-')[0]}-500`}></div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">{column.title}</h3>
        </div>
        <span className="bg-gradient-to-br from-slate-800 to-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-md">
          {vehicles.length}
        </span>
      </div>

      {/* Cards Container */}
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
              onDelete={onDeleteVehicle}
              onDuplicate={onDuplicateVehicle}
              isDimmed={draggedVehicleId === vehicle.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Vehicle Card Component
interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  isDimmed?: boolean;
}

function VehicleCard({ vehicle, onSelect, onDelete, onDuplicate, isDimmed }: VehicleCardProps) {
  const t = useTranslations('vehicles');
  const [isDragging, setIsDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    setMenuOpen(false);
    e.dataTransfer.effectAllowed = 'move';

    const dragData = {
      vehicleId: vehicle.id,
      currentStatus: vehicle.status
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));

    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(-2deg)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

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
    if (onDuplicate) {
      onDuplicate(vehicle.id);
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    onSelect();
  };

  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : t('noDriver');

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
      style={{ opacity: isDragging || isDimmed ? 0.4 : 1 }}
      className="bg-white rounded-2xl border-2 border-slate-200/60 p-5 hover:shadow-2xl hover:shadow-[#2D8B7E]/10 hover:border-[#2D8B7E]/50 hover:-translate-y-1 transition-all duration-300 cursor-move group relative overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D8B7E]/0 to-[#2D8B7E]/0 group-hover:from-[#2D8B7E]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Drag Handle & Menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-bold text-slate-900 tracking-tight">{vehicle.car_number}</h4>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              {vehicle.manufacturer} {vehicle.model}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
              <GripVertical className="w-5 h-5" />
            </div>

          {/* Context Menu Button */}
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700 hover:shadow-md"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-2xl border-2 border-slate-200/50 py-2 min-w-[180px] overflow-hidden">
                  <button
                    onClick={handleView}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-[#2D8B7E]" />
                    {t('view')}
                  </button>
                  <button
                    onClick={handleView}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit className="w-4 h-4 text-blue-600" />
                    {t('edit')}
                  </button>
                  {onDuplicate && (
                    <button
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

        {/* Vehicle Info */}
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

        {/* VIN Number */}
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5">VIN</p>
          <p className="text-xs text-slate-700 font-mono bg-slate-50 px-3 py-2 rounded-lg">{vehicle.vin_number}</p>
        </div>
      </div>
    </div>
  );
}
