'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  ExternalLink,
  CalendarClock,
  Check,
  Menu,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/routing';
import api from '@/lib/api';

export interface CalendarServicePlan {
  id: number;
  vehicle: string;
  vehicle_car_number: string;
  title: string;
  description: string | null;
  planned_at: string;
  is_done: boolean;
  created_at: string;
}

interface CalendarViewProps {
  plans?: CalendarServicePlan[];
  loading?: boolean;
  onPlanUpdate: (updated: CalendarServicePlan) => void;
  onOpenSidebar?: () => void;
}

const TODAY = new Date();
const TODAY_STR = TODAY.toDateString();

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatLabel(dateStr: string) {
  const [yr, mo, da] = dateStr.split('-').map(Number);
  return `${String(da).padStart(2, '0')}.${String(mo).padStart(2, '0')}.${yr}`;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function CalendarView({ plans = [], loading, onPlanUpdate, onOpenSidebar }: CalendarViewProps) {
  const t = useTranslations('calendar');
  const [currentDate, setCurrentDate] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(toDateStr(TODAY));

  const activeDate = selectedDate ?? hoveredDate;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec'),
  ];

  const weekDays = [
    t('days.mon'), t('days.tue'), t('days.wed'),
    t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun'),
  ];

  const plansByDate = useMemo(() => {
    const map: Record<string, CalendarServicePlan[]> = {};
    plans.forEach((plan) => {
      const key = plan.planned_at.split('T')[0];
      (map[key] ??= []).push(plan);
    });
    return map;
  }, [plans]);

  const days = useMemo(() => {
    const firstDay = getFirstDayOfMonth(year, month);
    const total = getDaysInMonth(year, month);
    const grid: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= total; d++) grid.push(new Date(year, month, d));
    return grid;
  }, [year, month]);

  const selectedPlans = activeDate ? (plansByDate[activeDate] ?? []) : [];

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-slate-50">

        {/* ── CALENDAR COLUMN ── */}
        <div className="flex flex-col flex-1 min-w-0 p-3 md:p-6 overflow-hidden">

          {/* ── Header ── */}
          <div className="grid grid-cols-3 items-center gap-2 md:gap-3 mb-4 md:mb-5 shrink-0">

            {/* col 1 — menu + title */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onOpenSidebar}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:shadow-md transition-all hover:bg-slate-50 active:scale-95"
                aria-label="Відкрити меню"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1.5 min-w-0 hidden sm:flex">
                <div className="shrink-0 p-1.5 rounded-lg bg-[#2D8B7E]/10">
                  <CalendarIcon className="w-4 h-4 text-[#2D8B7E]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800 leading-none truncate">{t('title')}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {/* col 2 — month navigation */}
            <div className="flex items-center justify-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[90px] md:min-w-[140px] text-center font-black text-slate-800 text-sm md:text-base capitalize truncate px-1">
                {monthNames[month]} {year}
              </span>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-1.5 md:p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* col 3 — today */}
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  setCurrentDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
                  setSelectedDate(toDateStr(TODAY));
                }}
                className="px-2.5 py-2 md:px-3 bg-[#2D8B7E]/10 text-[#2D8B7E] rounded-xl font-bold text-xs md:text-sm hover:bg-[#2D8B7E]/20 transition-colors whitespace-nowrap"
              >
                {t('today')}
              </button>
            </div>
          </div>

          {/* ── Calendar grid card ── */}
          <div className="bg-white rounded-t-3xl border border-b-0 border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">

            {/* Week-day header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 shrink-0">
              {weekDays.map((day) => (
                <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">
                  {day.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Days grid */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-semibold">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#2D8B7E] border-t-transparent rounded-full animate-spin" />
                  {t('loading')}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px overflow-hidden">
                {days.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="bg-white" />;

                  const dateStr = toDateStr(date);
                  const dayPlans = plansByDate[dateStr] ?? [];
                  const isToday = date.toDateString() === TODAY_STR;
                  const isSelected = dateStr === selectedDate;
                  const isHovered = dateStr === hoveredDate;
                  const isActive = isSelected || isHovered;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      onMouseEnter={() => setHoveredDate(dateStr)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`
                        p-1 md:p-2 flex flex-col gap-0.5 cursor-pointer transition-colors group overflow-hidden
                        ${isSelected
                          ? 'bg-teal-50 ring-2 ring-inset ring-[#2D8B7E]'
                          : isActive
                          ? 'bg-slate-50'
                          : isToday
                          ? 'bg-teal-50/30'
                          : 'bg-white'}
                      `}
                    >
                      {/* Day number */}
                      <div className="flex justify-between items-start">
                        <span className={`
                          w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold
                          ${isToday
                            ? 'bg-[#2D8B7E] text-white shadow-lg shadow-[#2D8B7E]/20'
                            : isSelected
                            ? 'text-[#2D8B7E] font-black'
                            : isActive
                            ? 'bg-slate-100 text-slate-700'
                            : 'text-slate-700'}
                        `}>
                          {date.getDate()}
                        </span>
                        {dayPlans.length > 0 && (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1 py-0.5 rounded-md hidden sm:block">
                            {dayPlans.length}
                          </span>
                        )}
                      </div>

                      {/* Mobile: colored dots */}
                      {dayPlans.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap mt-0.5 sm:hidden">
                          {dayPlans.slice(0, 5).map(plan => {
                            const isOverdue = !plan.is_done && new Date(plan.planned_at) < TODAY && !isToday;
                            const color = plan.is_done ? 'bg-emerald-400' : isOverdue ? 'bg-red-400' : 'bg-blue-400';
                            return <div key={plan.id} className={`w-1.5 h-1.5 rounded-full ${color}`} />;
                          })}
                          {dayPlans.length > 5 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        </div>
                      )}

                      {/* Desktop: plan chips */}
                      <div className="hidden sm:flex flex-1 flex-col gap-1 overflow-hidden mt-1">
                        {dayPlans.map((plan) => {
                          const overdue = !plan.is_done && new Date(plan.planned_at) < TODAY && !isToday;
                          return <PlanChip key={plan.id} plan={plan} overdue={overdue} />;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Legend bar ── */}
          <div className="shrink-0 flex items-center justify-center gap-4 md:gap-6 px-4 md:px-5 py-2 md:py-2.5 bg-white border border-t-0 border-slate-200 rounded-b-3xl shadow-sm">
            <LegendDot color="bg-blue-400"    label={t('legend.planned')} />
            <div className="w-px h-3 bg-slate-200" />
            <LegendDot color="bg-red-400"     label={t('legend.overdue')} />
            <div className="w-px h-3 bg-slate-200" />
            <LegendDot color="bg-emerald-400" label={t('legend.done')} />
          </div>
        </div>

        {/* ── Desktop Day Panel — always visible on md+ ── */}
        <DayPanel
          dateStr={activeDate}
          plans={selectedPlans}
          pinned={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          onPlanUpdate={onPlanUpdate}
        />
      </div>

      {/* ── Mobile Day Sheet — bottom sheet when a date is selected ── */}
      {selectedDate && (
        <MobileDaySheet
          dateStr={selectedDate}
          plans={plansByDate[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
          onPlanUpdate={onPlanUpdate}
        />
      )}
    </>
  );
}

// ── Desktop Day Panel ─────────────────────────────────────────────────────────

function DayPanel({
  dateStr,
  plans,
  pinned,
  onClose,
  onPlanUpdate,
}: {
  dateStr: string | null;
  plans: CalendarServicePlan[];
  pinned: boolean;
  onClose: () => void;
  onPlanUpdate: (updated: CalendarServicePlan) => void;
}) {
  const t = useTranslations('calendar');
  const label = dateStr ? formatLabel(dateStr) : null;

  return (
    <aside className="hidden md:flex w-72 xl:w-80 shrink-0 flex-col bg-white border-l border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('panel.title')}</p>
          <p className="text-xl font-black text-slate-800 leading-tight">
            {label ?? <span className="text-slate-300">—</span>}
          </p>
        </div>
        {pinned && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-colors text-slate-400 hover:text-slate-600"
            title="Закрити"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!dateStr ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 text-sm text-center gap-3 py-16">
            <CalendarIcon className="w-10 h-10 opacity-40" />
            <p className="font-semibold">{t('panel.hint')}</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm font-medium text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 opacity-40" />
            </div>
            <p className="font-semibold text-slate-400">{t('panel.noPlans')}</p>
          </div>
        ) : (
          plans.map((plan) => {
            const overdue = !plan.is_done && new Date(plan.planned_at) < TODAY;
            return (
              <PlanCard key={plan.id} plan={plan} overdue={overdue} onPlanUpdate={onPlanUpdate} />
            );
          })
        )}
      </div>
    </aside>
  );
}

// ── Mobile Day Sheet ──────────────────────────────────────────────────────────

function MobileDaySheet({
  dateStr,
  plans,
  onClose,
  onPlanUpdate,
}: {
  dateStr: string;
  plans: CalendarServicePlan[];
  onClose: () => void;
  onPlanUpdate: (updated: CalendarServicePlan) => void;
}) {
  const t = useTranslations('calendar');
  const label = formatLabel(dateStr);

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[72vh] animate-slide-up">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('panel.title')}</p>
            <p className="text-xl font-black text-slate-800">{label}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 opacity-40" />
              </div>
              <p className="font-semibold">{t('panel.noPlans')}</p>
            </div>
          ) : (
            plans.map((plan) => {
              const overdue = !plan.is_done && new Date(plan.planned_at) < TODAY;
              return (
                <PlanCard key={plan.id} plan={plan} overdue={overdue} onPlanUpdate={onPlanUpdate} />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  overdue,
  onPlanUpdate,
}: {
  plan: CalendarServicePlan;
  overdue: boolean;
  onPlanUpdate: (updated: CalendarServicePlan) => void;
}) {
  const t = useTranslations('calendar');
  const router = useRouter();
  const [rescheduling, setRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(plan.planned_at.split('T')[0]);
  const [saving, setSaving] = useState(false);

  const color = plan.is_done
    ? { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: t('legend.done') }
    : overdue
    ? { border: 'border-red-200',     bg: 'bg-red-50',     badge: 'bg-red-100 text-red-700',         label: t('legend.overdue') }
    : { border: 'border-blue-200',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',        label: t('legend.planned') };

  const handleMarkDone = useCallback(async () => {
    setSaving(true);
    try {
      const res = await api.patch<CalendarServicePlan>(
        `/fleet/vehicles/${plan.vehicle}/service-plans/${plan.id}/done/`,
      );
      onPlanUpdate(res.data);
    } finally {
      setSaving(false);
    }
  }, [plan.vehicle, plan.id, onPlanUpdate]);

  const handleReschedule = useCallback(async () => {
    if (!newDate || newDate === plan.planned_at.split('T')[0]) { setRescheduling(false); return; }
    setSaving(true);
    try {
      const res = await api.patch<CalendarServicePlan>(
        `/fleet/vehicles/${plan.vehicle}/service-plans/${plan.id}/`,
        { planned_at: newDate },
      );
      onPlanUpdate(res.data);
      setRescheduling(false);
    } finally {
      setSaving(false);
    }
  }, [newDate, plan.vehicle, plan.id, plan.planned_at, onPlanUpdate]);

  return (
    <div className={`rounded-2xl border ${color.border} ${color.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-sm font-black text-slate-800 tracking-wide">{plan.vehicle_car_number}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color.badge}`}>{color.label}</span>
      </div>

      <div className="px-3 pb-3">
        <p className="text-sm font-bold text-slate-800 leading-snug">{plan.title}</p>
        {plan.description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
        )}
      </div>

      {rescheduling && (
        <div className="mx-3 mb-3 flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 text-xs font-medium text-slate-700 bg-transparent outline-none"
          />
          <button onClick={handleReschedule} disabled={saving}
            className="p-1.5 rounded-lg bg-[#2D8B7E] text-white hover:bg-[#2D8B7E]/90 disabled:opacity-50 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setRescheduling(false); setNewDate(plan.planned_at.split('T')[0]); }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 active:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
            Скасувати
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 flex-wrap border-t border-white/40">
        <button
          onClick={() => router.push(`/vehicles/${plan.vehicle}`)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-3 py-2 rounded-xl bg-white/80 border border-slate-200 hover:bg-white hover:border-slate-300 active:scale-95 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t('panel.goToVehicle')}
        </button>

        {!plan.is_done && (
          <button
            onClick={handleMarkDone} disabled={saving}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 px-3 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:scale-95 disabled:opacity-50 transition-all"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('panel.markDone')}
          </button>
        )}

        {!plan.is_done && !rescheduling && (
          <button
            onClick={() => setRescheduling(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 px-3 py-2 rounded-xl bg-white/80 border border-slate-200 hover:bg-white hover:border-slate-300 active:scale-95 transition-all"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            {t('panel.reschedule')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function PlanChip({ plan, overdue }: { plan: CalendarServicePlan; overdue: boolean }) {
  const color = plan.is_done
    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
    : overdue
    ? 'bg-red-50 border-red-100 text-red-800'
    : 'bg-blue-50 border-blue-100 text-blue-800';

  const Icon = plan.is_done ? CheckCircle2 : overdue ? AlertCircle : Clock;
  const iconColor = plan.is_done ? 'text-emerald-600' : overdue ? 'text-red-600' : 'text-blue-600';

  return (
    <div className={`p-1.5 rounded-lg border text-[10px] flex flex-col gap-0.5 cursor-pointer hover:scale-[1.02] transition-transform ${color}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold truncate">{plan.vehicle_car_number}</span>
        <Icon className={`w-3 h-3 shrink-0 ${iconColor}`} />
      </div>
      <span className="truncate opacity-80 font-medium">{plan.title}</span>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
