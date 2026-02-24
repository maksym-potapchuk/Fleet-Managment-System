'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/routing';
import {
  ArrowLeft,
  Car,
  User,
  DollarSign,
  Wrench,
  Package,
  Plus,
  Menu,
  Edit,
  ScrollText,
  Circle,
  Gauge,
} from 'lucide-react';
import api from '@/lib/api';
import { vehicleService } from '@/services/vehicle';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { VehicleModal } from '@/components/vehicle/VehicleModal';
import { useSidebar } from '../SidebarContext';

const STATUS_COLORS: Record<VehicleStatus, { bg: string; text: string; border: string }> = {
  CTO:         { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  FOCUS:       { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
  CLEANING:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200' },
  PREPARATION: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  READY:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  LEASING:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  RENT:        { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200' },
  SELLING:     { bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
  SOLD:        { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200' },
};

type WorkspaceTab = 'service' | 'equipment' | 'regulation';

interface RegulationItem {
  id: number;
  title: string;
  every_km: number;
  notify_before_km: number;
}

interface RegulationSchema {
  id: number;
  title: string;
  items: RegulationItem[];
  is_default: boolean;
  created_by: number;
}

export default function VehicleWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { openSidebar } = useSidebar();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('service');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (id) loadVehicle();
  }, [id]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const data = await vehicleService.getVehicle(id);
      setVehicle(data);
    } catch (err) {
      console.error('Failed to load vehicle:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-semibold">Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Vehicle not found</h2>
          <button
            onClick={() => router.push('/vehicles')}
            className="mt-2 text-[#2D8B7E] font-bold hover:underline flex items-center gap-1.5 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to vehicles
          </button>
        </div>
      </div>
    );
  }

  const statusColors = STATUS_COLORS[vehicle.status];
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : 'No Driver';

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Wrench }[] = [
    { id: 'service',    label: 'Service',    icon: Wrench },
    { id: 'equipment',  label: 'Equipment',  icon: Package },
    { id: 'regulation', label: 'Регламент',  icon: ScrollText },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-y-auto">

      {/* ── Header ── */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4 md:px-6 shadow-sm flex-shrink-0">

        {/* Top bar: menu + back */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={openSidebar}
            className="flex items-center justify-center w-10 h-10 bg-white border-2 border-slate-200 rounded-xl hover:border-[#2D8B7E]/50 hover:bg-slate-50 transition-all shadow-sm"
            title="Open menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
          <button
            onClick={() => router.push('/vehicles')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Vehicles
          </button>
        </div>

        {/* Vehicle identity */}
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 bg-gradient-to-br from-[#2D8B7E] to-[#248B7B] rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Car className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {vehicle.car_number}
                </h1>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                  {vehicle.status}
                </span>
              </div>
              <p className="text-slate-500 font-medium mt-0.5 text-sm">
                {vehicle.manufacturer} {vehicle.model} &bull; {vehicle.year}
              </p>
            </div>
          </div>

          {/* Quick info chips + edit button */}
          <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <DollarSign className="w-4 h-4 text-[#2D8B7E]" />
              <span className="text-sm font-bold text-[#2D8B7E]">
                {parseFloat(vehicle.cost).toLocaleString()} PLN
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className={`text-sm font-semibold ${vehicle.driver ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                {driverName}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">VIN</span>
              <span className="text-xs font-mono text-slate-600">{vehicle.vin_number}</span>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm px-3 py-2 rounded-xl transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* ── Tab navigation ── */}
        <div className="mt-5 flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white shadow-lg shadow-[#2D8B7E]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 p-4 md:p-6">
        {activeTab === 'service'    && <ServiceTab    vehicleId={vehicle.id} />}
        {activeTab === 'equipment'  && <EquipmentTab  vehicleId={vehicle.id} />}
        {activeTab === 'regulation' && <RegulationTab vehicleId={vehicle.id} />}
      </div>

      {/* Edit modal */}
      <VehicleModal
        vehicle={vehicle}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={loadVehicle}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Service Tab
// ─────────────────────────────────────────────
function ServiceTab({ vehicleId }: { vehicleId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Service Records</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Maintenance and service history for this vehicle
          </p>
        </div>
        <button className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-5 py-2.5 rounded-xl hover:shadow-xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold">
          <Plus className="w-4 h-4" strokeWidth={3} />
          Add Service
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
          <Wrench className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">No service records yet</h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Add the first service record to start tracking maintenance history for this vehicle.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Equipment Tab
// ─────────────────────────────────────────────
function EquipmentTab({ vehicleId }: { vehicleId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Equipment</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Equipment and accessories assigned to this vehicle
          </p>
        </div>
        <button className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-5 py-2.5 rounded-xl hover:shadow-xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold">
          <Plus className="w-4 h-4" strokeWidth={3} />
          Add Equipment
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
          <Package className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">No equipment assigned</h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Assign equipment and accessories to keep track of what&apos;s in this vehicle.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Regulation Tab
// ─────────────────────────────────────────────
function RegulationTab({ vehicleId }: { vehicleId: string }) {
  const [schemas, setSchemas] = useState<RegulationSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ results: RegulationSchema[] } | RegulationSchema[]>('/fleet/regulation/schemas/')
      .then(res => {
        const data = res.data;
        setSchemas(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch(err => console.error('Failed to load regulation schemas:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">Регламент</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            Схеми технічного обслуговування за пробігом
          </p>
        </div>
        <button className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-5 py-2.5 rounded-xl hover:shadow-xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold">
          <Plus className="w-4 h-4" strokeWidth={3} />
          Додати схему
        </button>
      </div>

      {/* Empty state */}
      {schemas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
            <ScrollText className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">Немає схем регламенту</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
            Додайте схему технічного обслуговування для відстеження регламентних робіт.
          </p>
        </div>
      )}

      {/* Schema cards */}
      {schemas.length > 0 && (
        <div className="space-y-3">
          {schemas.map(schema => {
            const isExpanded = expandedId === schema.id;
            return (
              <div
                key={schema.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all"
              >
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : schema.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#2D8B7E]/10 to-[#2D8B7E]/5 rounded-xl flex items-center justify-center flex-shrink-0">
                      <ScrollText className="w-4 h-4 text-[#2D8B7E]" strokeWidth={2} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{schema.title}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {schema.items.length} пункт{schema.items.length === 1 ? '' : schema.items.length < 5 ? 'и' : 'ів'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {schema.is_default && (
                      <span className="px-2.5 py-1 bg-[#2D8B7E]/10 text-[#2D8B7E] text-xs font-bold rounded-lg border border-[#2D8B7E]/20">
                        За замовч.
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded items */}
                {isExpanded && schema.items.length > 0 && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {schema.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 bg-slate-50/50">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                            <Gauge className="w-3.5 h-3.5 text-[#2D8B7E]" />
                            <span className="text-xs font-bold text-slate-700">
                              {item.every_km.toLocaleString()} км
                            </span>
                          </div>
                          {item.notify_before_km > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                              <Circle className="w-3 h-3 text-amber-500" />
                              <span className="text-xs font-bold text-amber-700">
                                −{item.notify_before_km.toLocaleString()} км
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && schema.items.length === 0 && (
                  <div className="border-t border-slate-100 px-5 py-6 text-center">
                    <p className="text-sm text-slate-400">Немає пунктів у цій схемі</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
