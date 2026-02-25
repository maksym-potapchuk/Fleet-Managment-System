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
  Gauge,
  History,
  Filter,
  Trash2,
  CheckCircle2,
  X,
  Pencil,
  Check,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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
  title_pl: string;
  title_uk: string;
  every_km: number;
  notify_before_km: number;
}

interface RegulationSchema {
  id: number;
  title: string;
  title_pl: string;
  title_uk: string;
  items: RegulationItem[];
  is_default: boolean;
  created_by: number;
}

interface RegulationPlanEntry {
  id: number;
  item: RegulationItem;
  last_done_km: number;
  next_due_km: number;
  updated_at: string;
}

interface RegulationPlan {
  assigned: true;
  id: number;
  schema: { id: number; title: string; title_pl: string; title_uk: string };
  assigned_at: string;
  entries: RegulationPlanEntry[];
}

interface ServicePlan {
  id: number;
  vehicle: string;
  title: string;
  description: string | null;
  planned_at: string;
  is_done: boolean;
  created_at: string;
}

interface EquipmentItem {
  id: number;
  vehicle: string;
  equipment: string;
  is_equipped: boolean;
  created_at: string;
}

interface RegulationHistoryEntry {
  id: number;
  item_title: string;
  item_title_pl: string;
  item_title_uk: string;
  event_type: 'performed' | 'km_updated' | 'notified';
  km_at_event: number;
  km_remaining: number;
  note: string;
  created_by: number | null;
  created_at: string;
}

export default function VehicleWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { openSidebar } = useSidebar();
  const t = useTranslations('vehicleWorkspace');
  const tVehicles = useTranslations('vehicles');

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
          <p className="text-slate-600 font-semibold">{t('loadingVehicle')}</p>
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
          <h2 className="text-xl font-bold text-slate-800 mb-2">{t('vehicleNotFound')}</h2>
          <button
            onClick={() => router.push('/vehicles')}
            className="mt-2 text-[#2D8B7E] font-bold hover:underline flex items-center gap-1.5 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToVehicles')}
          </button>
        </div>
      </div>
    );
  }

  const statusColors = STATUS_COLORS[vehicle.status];
  const driverName = vehicle.driver
    ? `${vehicle.driver.first_name} ${vehicle.driver.last_name}`
    : tVehicles('noDriver');

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Wrench }[] = [
    { id: 'service',    label: t('tabs.service'),    icon: Wrench },
    { id: 'equipment',  label: t('tabs.equipment'),  icon: Package },
    { id: 'regulation', label: t('tabs.regulation'), icon: ScrollText },
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
            {t('backToVehicles')}
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
              <Gauge className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700">
                {vehicle.initial_km.toLocaleString()} км
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
              {t('edit')}
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
        {activeTab === 'regulation' && <RegulationTab vehicleId={vehicle.id} initialKm={vehicle.initial_km} />}
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
type ServiceFilter = 'all' | 'pending' | 'done';

function ServiceTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleWorkspace.service');

  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => { loadPlans(); }, [vehicleId, filter]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ordering: 'planned_at' });
      if (filter === 'pending') params.set('is_done', 'false');
      if (filter === 'done') params.set('is_done', 'true');
      const res = await api.get<ServicePlan[] | { results: ServicePlan[] }>(
        `/fleet/vehicles/${vehicleId}/service-plans/?${params}`,
      );
      setPlans(Array.isArray(res.data) ? res.data : (res.data as { results: ServicePlan[] }).results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addPlan = async () => {
    if (!newTitle.trim() || !newDate) return;
    setAddLoading(true);
    try {
      const res = await api.post<ServicePlan>(`/fleet/vehicles/${vehicleId}/service-plans/`, {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        planned_at: newDate,
      });
      if (filter !== 'done') {
        setPlans(prev => [...prev, res.data].sort((a, b) => a.planned_at.localeCompare(b.planned_at)));
      }
      setNewTitle(''); setNewDesc(''); setNewDate(''); setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const toggleDone = async (plan: ServicePlan) => {
    setTogglingId(plan.id);
    try {
      const res = await api.patch<ServicePlan>(
        `/fleet/vehicles/${vehicleId}/service-plans/${plan.id}/`,
        { is_done: !plan.is_done },
      );
      if (filter === 'all') {
        setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p));
      } else {
        setPlans(prev => prev.filter(p => p.id !== plan.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  const deletePlan = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/fleet/vehicles/${vehicleId}/service-plans/${id}/`);
      setPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (plan: ServicePlan) => {
    setEditingPlan(plan);
    setEditTitle(plan.title);
    setEditDesc(plan.description ?? '');
    setEditDate(plan.planned_at);
  };

  const saveEdit = async () => {
    if (!editingPlan || !editTitle.trim() || !editDate) return;
    setEditLoading(true);
    try {
      const res = await api.patch<ServicePlan>(
        `/fleet/vehicles/${vehicleId}/service-plans/${editingPlan.id}/`,
        { title: editTitle.trim(), description: editDesc.trim() || null, planned_at: editDate },
      );
      setPlans(prev => prev.map(p => p.id === editingPlan.id ? res.data : p));
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const getDateStatus = (plan: ServicePlan): 'overdue' | 'due_soon' | 'ok' | 'done' => {
    if (plan.is_done) return 'done';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(plan.planned_at); d.setHours(0, 0, 0, 0);
    if (d < today) return 'overdue';
    const soon = new Date(today); soon.setDate(soon.getDate() + 3);
    if (d <= soon) return 'due_soon';
    return 'ok';
  };

  const DATE_STYLES = {
    overdue:  { badge: 'bg-red-50 border-red-200 text-red-600',    label: t('overdue') },
    due_soon: { badge: 'bg-amber-50 border-amber-200 text-amber-700', label: t('dueSoon') },
    ok:       { badge: 'bg-slate-50 border-slate-200 text-slate-500', label: t('planned') },
    done:     { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: t('done') },
  };

  const FILTERS: { key: ServiceFilter; label: string }[] = [
    { key: 'all', label: t('filter.all') },
    { key: 'pending', label: t('filter.pending') },
    { key: 'done', label: t('filter.done') },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewTitle(''); setNewDesc(''); setNewDate(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold flex-shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          {t('add')}
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1 mb-4 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Inline add form ── */}
      {showAdd && (
        <div className="mb-4 p-4 bg-white border border-[#2D8B7E]/30 rounded-2xl shadow-sm space-y-3">
          <input
            autoFocus
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPlan(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder={t('titlePlaceholder')}
            className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder={t('descPlaceholder')}
            className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] resize-none"
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs font-semibold text-slate-500 flex-shrink-0">{t('plannedLabel')}</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
              />
            </div>
            <button
              onClick={addPlan}
              disabled={addLoading || !newTitle.trim() || !newDate}
              className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#246f65] transition-colors disabled:opacity-50"
            >
              {addLoading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Plus className="w-4 h-4" strokeWidth={3} />}
              {t('add')}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
            <Wrench className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">{filter === 'all' ? t('empty') : t('emptyFiltered')}</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{filter === 'all' ? t('emptyDesc') : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map(plan => {
            const isEditing = editingPlan?.id === plan.id;
            const ds = getDateStatus(plan);
            const style = DATE_STYLES[ds];
            const isToggling = togglingId === plan.id;
            const isDeleting = deletingId === plan.id;

            if (isEditing) {
              return (
                <div key={plan.id} className="p-4 bg-white border border-[#2D8B7E]/30 rounded-2xl shadow-sm space-y-3">
                  <input
                    autoFocus
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingPlan(null); }}
                    placeholder={t('titlePlaceholder')}
                    className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                  />
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder={t('descPlaceholder')}
                    className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <label className="text-xs font-semibold text-slate-500 flex-shrink-0">{t('plannedLabel')}</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
                      />
                    </div>
                    <button
                      onClick={saveEdit}
                      disabled={editLoading || !editTitle.trim() || !editDate}
                      className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#246f65] transition-colors disabled:opacity-50"
                    >
                      {editLoading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Check className="w-4 h-4" strokeWidth={3} />}
                      {t('save')}
                    </button>
                    <button
                      onClick={() => setEditingPlan(null)}
                      className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={plan.id}
                className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm group hover:border-slate-300 transition-colors"
              >
                {/* Done toggle */}
                <button
                  onClick={() => toggleDone(plan)}
                  disabled={isToggling || isDeleting}
                  className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all disabled:opacity-50 ${
                    plan.is_done
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-white border-slate-300 hover:border-[#2D8B7E]'
                  }`}
                >
                  {isToggling ? (
                    <div className={`w-2.5 h-2.5 border border-t-transparent rounded-full animate-spin ${plan.is_done ? 'border-white' : 'border-slate-400'}`} />
                  ) : plan.is_done ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${plan.is_done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {plan.title}
                  </p>
                  {plan.description && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{plan.description}</p>
                  )}
                </div>

                {/* Date badge */}
                <div className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${style.badge}`}>
                  <span>{style.label}</span>
                  <span>·</span>
                  <span>{new Date(plan.planned_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' })}</span>
                </div>

                {/* Edit */}
                <button
                  onClick={() => startEdit(plan)}
                  disabled={isDeleting || isToggling}
                  className="mt-0.5 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-[#2D8B7E] transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deletePlan(plan.id)}
                  disabled={isDeleting || isToggling}
                  className="mt-0.5 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  {isDeleting
                    ? <div className="w-3 h-3 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Equipment Tab
// ─────────────────────────────────────────────
function EquipmentTab({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations('vehicleWorkspace.equipment');

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => { loadEquipment(); }, [vehicleId]);

  const loadEquipment = async () => {
    setLoading(true);
    try {
      const res = await api.get<EquipmentItem[]>(`/fleet/vehicles/${vehicleId}/equipment/`);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addEquipment = async () => {
    if (!newName.trim()) return;
    setAddLoading(true);
    try {
      const res = await api.post<EquipmentItem>(`/fleet/vehicles/${vehicleId}/equipment/`, {
        equipment: newName.trim(),
      });
      setItems(prev => [...prev, res.data].sort((a, b) => a.equipment.localeCompare(b.equipment)));
      setNewName('');
      setShowAdd(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const deleteEquipment = async (id: number) => {
    setDeletingId(id);
    try {
      await api.delete(`/fleet/vehicles/${vehicleId}/equipment/${id}/`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleEquipment = async (id: number) => {
    setTogglingId(id);
    try {
      const res = await api.patch<EquipmentItem>(`/fleet/vehicles/${vehicleId}/equipment/${id}/toggle/`);
      setItems(prev => prev.map(i => i.id === id ? res.data : i));
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {items.length > 0 ? t('total', { count: items.length }) : t('subtitle')}
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setNewName(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-md text-sm font-bold flex-shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={3} />
          {t('addEquipment')}
        </button>
      </div>

      {/* ── Inline add form ── */}
      {showAdd && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-white border border-[#2D8B7E]/30 rounded-xl shadow-sm">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addEquipment(); if (e.key === 'Escape') setShowAdd(false); }}
            placeholder={t('newItemPlaceholder')}
            className="flex-1 text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          />
          <button
            onClick={addEquipment}
            disabled={addLoading || !newName.trim()}
            className="flex items-center gap-1.5 bg-[#2D8B7E] text-white text-sm font-bold px-3 py-2 rounded-lg hover:bg-[#248B7B] transition-colors disabled:opacity-50 flex-shrink-0"
          >
            {addLoading
              ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus className="w-3.5 h-3.5" strokeWidth={3} />}
            {t('add')}
          </button>
          <button
            onClick={() => setShowAdd(false)}
            className="text-sm font-medium text-slate-400 hover:text-slate-600 px-2 py-2 transition-colors flex-shrink-0"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
            <Package className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">{t('empty')}</h3>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{t('emptyDesc')}</p>
        </div>
      ) : (
        /* ── Equipment list ── */
        <div className="space-y-2">
          {items.map(item => {
            const isDeleting = deletingId === item.id;
            const isToggling = togglingId === item.id;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm group hover:border-slate-300 transition-colors"
              >
                {/* Toggle circle */}
                <button
                  onClick={() => toggleEquipment(item.id)}
                  disabled={isToggling || isDeleting}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-all disabled:opacity-50 ${
                    item.is_equipped
                      ? 'bg-[#2D8B7E] hover:bg-[#246f65]'
                      : 'bg-white border-2 border-slate-300 hover:border-[#2D8B7E]'
                  }`}
                >
                  {isToggling ? (
                    <div className={`w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin ${item.is_equipped ? 'border-white' : 'border-slate-400'}`} />
                  ) : item.is_equipped ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </button>

                {/* Name */}
                <span className={`flex-1 text-sm font-semibold transition-colors ${
                  item.is_equipped
                    ? 'text-slate-400 line-through decoration-slate-300'
                    : 'text-slate-800'
                }`}>
                  {item.equipment}
                </span>

                {/* Delete button */}
                <button
                  onClick={() => deleteEquipment(item.id)}
                  disabled={isDeleting || isToggling}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 transition-all disabled:opacity-40 opacity-0 group-hover:opacity-100 flex-shrink-0"
                >
                  {isDeleting
                    ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper: pick the right locale title or fall back to default
// ─────────────────────────────────────────────
function localTitle(
  item: { title: string; title_pl: string; title_uk: string },
  locale: string,
): string {
  if (locale === 'pl' && item.title_pl) return item.title_pl;
  if (locale === 'uk' && item.title_uk) return item.title_uk;
  return item.title;
}

// ─────────────────────────────────────────────
// Regulation Tab
// ─────────────────────────────────────────────
function RegulationTab({ vehicleId, initialKm }: { vehicleId: string; initialKm: number }) {
  const t = useTranslations('vehicleWorkspace.regulation');
  const locale = useLocale();
  const [status, setStatus] = useState<'loading' | 'unassigned' | 'assigned'>('loading');
  const [plan, setPlan] = useState<RegulationPlan | null>(null);
  const [defaultSchema, setDefaultSchema] = useState<RegulationSchema | null>(null);
  const [kmInputs, setKmInputs] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'plan' | 'history'>('plan');
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markKm, setMarkKm] = useState('');
  const [markLoading, setMarkLoading] = useState(false);

  useEffect(() => { loadRegulation(); }, [vehicleId]);

  const loadRegulation = async () => {
    setStatus('loading');
    try {
      const res = await api.get<RegulationPlan | { assigned: false }>(
        `/fleet/vehicles/${vehicleId}/regulation/`
      );
      if (res.data.assigned) {
        setPlan(res.data as RegulationPlan);
        setStatus('assigned');
      } else {
        const schemaRes = await api.get<{ results: RegulationSchema[] } | RegulationSchema[]>(
          '/fleet/regulation/schemas/?is_default=true'
        );
        const schemas = Array.isArray(schemaRes.data)
          ? schemaRes.data
          : schemaRes.data.results ?? [];
        setDefaultSchema(schemas[0] ?? null);
        setStatus('unassigned');
      }
    } catch (err) {
      console.error('Failed to load regulation:', err);
      setStatus('unassigned');
    }
  };

  const handleAssign = async () => {
    if (!defaultSchema) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/fleet/regulation/${vehicleId}/assign/`, {
        schema_id: defaultSchema.id,
        entries: defaultSchema.items.map(item => ({
          item_id: item.id,
          last_done_km: parseInt(kmInputs[item.id] ?? '0', 10),
        })),
      });
      await loadRegulation();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (entryId: number) => {
    const km = parseInt(markKm, 10);
    if (isNaN(km) || km < 0) return;
    setMarkLoading(true);
    try {
      const res = await api.patch<RegulationPlanEntry>(
        `/fleet/vehicles/${vehicleId}/regulation/entries/${entryId}/`,
        { last_done_km: km },
      );
      setPlan(prev => prev ? {
        ...prev,
        entries: prev.entries.map(e => e.id === entryId ? res.data : e),
      } : prev);
      setMarkingId(null);
      setMarkKm('');
    } catch (err) {
      console.error(err);
    } finally {
      setMarkLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Assigned: show plan or history ──
  if (status === 'assigned' && plan) {
    return (
      <div>
        {/* Header + view toggle */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">{t('title')}</h2>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              {localTitle(plan.schema, locale)} · {t('assignedOn')} {new Date(plan.assigned_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveView('plan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'plan'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              {t('planView')}
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'history'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              {t('historyView')}
            </button>
          </div>
        </div>

        {activeView === 'plan' ? (
          <div className="space-y-2">
            {plan.entries.map(entry => {
              const isOverdue = initialKm >= entry.next_due_km;
              const isDueSoon = !isOverdue && initialKm >= entry.next_due_km - entry.item.notify_before_km;
              const isMarking = markingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`bg-white border rounded-2xl px-5 py-4 shadow-sm transition-colors ${
                    isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isOverdue ? 'bg-red-500' : isDueSoon ? 'bg-amber-400' : 'bg-emerald-500'
                    }`} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{localTitle(entry.item, locale)}</p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {t('everyKm', { km: entry.item.every_km.toLocaleString() })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 text-right">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('done')}</p>
                        <p className="text-sm font-bold text-slate-700">{entry.last_done_km.toLocaleString()} {t('km')}</p>
                      </div>
                      <div className={`rounded-xl px-3 py-2 border ${
                        isOverdue
                          ? 'bg-red-50 border-red-200'
                          : isDueSoon
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-[#2D8B7E]/5 border-[#2D8B7E]/20'
                      }`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${
                          isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-[#2D8B7E]/70'
                        }`}>{t('next')}</p>
                        <p className={`text-sm font-bold ${
                          isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-700' : 'text-[#2D8B7E]'
                        }`}>{entry.next_due_km.toLocaleString()} {t('km')}</p>
                      </div>

                      {/* Mark done button */}
                      <button
                        onClick={() => { setMarkingId(entry.id); setMarkKm(String(initialKm)); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2D8B7E] bg-slate-50 hover:bg-[#2D8B7E]/5 border border-slate-200 hover:border-[#2D8B7E]/30 rounded-xl px-3 py-2 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {t('markDone')}
                      </button>
                    </div>
                  </div>

                  {/* Inline mark-done form */}
                  {isMarking && (
                    <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100">
                      <Gauge className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500 font-medium flex-shrink-0">Виконано при:</span>
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={markKm}
                        onChange={e => setMarkKm(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') markDone(entry.id); if (e.key === 'Escape') { setMarkingId(null); setMarkKm(''); } }}
                        className="w-32 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400 font-medium">{t('km')}</span>
                      <button
                        onClick={() => markDone(entry.id)}
                        disabled={markLoading}
                        className="flex items-center gap-1 text-xs font-bold text-white bg-[#2D8B7E] hover:bg-[#246f65] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {markLoading
                          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Зберегти
                      </button>
                      <button
                        onClick={() => { setMarkingId(null); setMarkKm(''); }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <RegulationHistoryPanel vehicleId={vehicleId} />
        )}
      </div>
    );
  }

  // ── Unassigned: show default schema + km inputs ──
  if (!defaultSchema) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mb-5 border-2 border-dashed border-slate-300 shadow-inner">
          <ScrollText className="w-10 h-10 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-2">{t('noDefault')}</h3>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{t('noDefaultDesc')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-900">{t('assignTitle')}</h2>
        <p className="text-sm text-slate-500 mt-0.5 font-medium">
          {t('assignSubtitle', { schema: localTitle(defaultSchema, locale) })}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="divide-y divide-slate-100">
          {defaultSchema.items.map((item, idx) => {
            const lastDone = parseInt(kmInputs[item.id] ?? '0', 10) || 0;
            const nextDue = lastDone + item.every_km;
            return (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{localTitle(item, locale)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('everyKm', { km: item.every_km.toLocaleString() })}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      Останній раз
                    </p>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={kmInputs[item.id] ?? ''}
                      onChange={e => setKmInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                      className="w-28 text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="w-4 h-px bg-slate-200 flex-shrink-0" />
                  <div className="bg-[#2D8B7E]/5 border border-[#2D8B7E]/20 rounded-xl px-3 py-2 text-right min-w-[90px]">
                    <p className="text-[10px] font-bold text-[#2D8B7E]/70 uppercase tracking-widest mb-0.5">
                      {t('next')}
                    </p>
                    <p className="text-sm font-bold text-[#2D8B7E]">
                      {nextDue.toLocaleString()} {t('km')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
      )}

      <button
        onClick={handleAssign}
        disabled={saving}
        className="bg-gradient-to-r from-[#2D8B7E] to-[#248B7B] text-white px-6 py-2.5 rounded-xl hover:shadow-xl hover:shadow-[#2D8B7E]/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 shadow-lg flex items-center gap-2 text-sm font-bold disabled:opacity-60 disabled:pointer-events-none"
      >
        {saving ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus className="w-4 h-4" strokeWidth={3} />
        )}
        {t('saveRegulation')}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Regulation History Panel (timeline)
// ─────────────────────────────────────────────
const EVENT_CONFIG = {
  performed: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  km_updated: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  notified: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
} as const;

function RegulationHistoryPanel({ vehicleId }: { vehicleId: string }) {
  const locale = useLocale();
  const t = useTranslations('vehicleWorkspace.regulation');

  const [entries, setEntries] = useState<RegulationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [eventType, setEventType] = useState('');
  const [ordering, setOrdering] = useState('created_at');

  useEffect(() => { loadHistory(); }, [dateFrom, dateTo, eventType, ordering]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ordering });
      if (dateFrom) params.set('created_after', `${dateFrom}T00:00:00`);
      if (dateTo)   params.set('created_before', `${dateTo}T23:59:59`);
      if (eventType) params.set('event_type', eventType);
      const res = await api.get(`/fleet/vehicles/${vehicleId}/regulation/history/?${params}`);
      const data = res.data;
      setEntries(Array.isArray(data) ? data : (data as { results: RegulationHistoryEntry[] }).results ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const itemTitle = (entry: RegulationHistoryEntry) => {
    if (locale === 'pl' && entry.item_title_pl) return entry.item_title_pl;
    if (locale === 'uk' && entry.item_title_uk) return entry.item_title_uk;
    return entry.item_title;
  };

  // Group by month-year key for section dividers
  const grouped = entries.reduce<Record<string, { label: string; entries: RegulationHistoryEntry[] }>>(
    (acc, entry) => {
      const d = new Date(entry.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) {
        acc[key] = {
          label: d.toLocaleString(locale === 'uk' ? 'uk-UA' : 'pl-PL', { month: 'long', year: 'numeric' }),
          entries: [],
        };
      }
      acc[key].entries.push(entry);
      return acc;
    },
    {},
  );

  return (
    <div>
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            {t('history.filters')}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{t('history.from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 font-medium">{t('history.to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
            />
          </div>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D8B7E]/30 focus:border-[#2D8B7E]"
          >
            <option value="">{t('history.allEvents')}</option>
            <option value="performed">{t('history.performed')}</option>
            <option value="km_updated">{t('history.km_updated')}</option>
            <option value="notified">{t('history.notified')}</option>
          </select>
          <button
            onClick={() => setOrdering(o => o === 'created_at' ? '-created_at' : 'created_at')}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-100 transition-colors"
          >
            {ordering === 'created_at' ? '↑' : '↓'}
            {ordering === 'created_at' ? t('history.oldestFirst') : t('history.newestFirst')}
          </button>
          {(dateFrom || dateTo || eventType) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setEventType(''); }}
              className="text-xs font-medium text-slate-400 hover:text-red-500 px-2 py-1.5 transition-colors"
            >
              {t('history.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-4 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">{t('history.empty')}</p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([key, group]) => (
            <div key={key} className="mb-8">
              {/* Month divider */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 capitalize">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] font-bold text-slate-300">{group.entries.length}</span>
              </div>

              {/* Entries with vertical line */}
              <div className="relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />
                <div className="space-y-3">
                  {group.entries.map(entry => {
                    const cfg = EVENT_CONFIG[entry.event_type];
                    return (
                      <div key={entry.id} className="relative flex items-start gap-4 pl-11">
                        {/* Timeline dot */}
                        <div
                          className={`absolute left-3.5 top-4 w-3 h-3 rounded-full ${cfg.dot} border-2 border-white shadow-sm z-10`}
                        />
                        {/* Card */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {itemTitle(entry)}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge} flex-shrink-0`}>
                                {t(`history.${entry.event_type}`)}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                              {new Date(entry.created_at).toLocaleString(
                                locale === 'uk' ? 'uk-UA' : 'pl-PL',
                                { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' },
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Gauge className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                              <span className="text-xs font-semibold text-slate-700">
                                {entry.km_at_event.toLocaleString()} {t('km')}
                              </span>
                            </div>
                            <span className="text-slate-200 text-xs">·</span>
                            <span className={`text-xs font-semibold ${entry.km_remaining > 0 ? 'text-slate-400' : 'text-red-500'}`}>
                              {entry.km_remaining > 0 ? `+${entry.km_remaining.toLocaleString()}` : entry.km_remaining.toLocaleString()} {t('km')} {t('history.remaining')}
                            </span>
                            {entry.note ? (
                              <>
                                <span className="text-slate-200 text-xs">·</span>
                                <span className="text-xs text-slate-400 italic">{entry.note}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
