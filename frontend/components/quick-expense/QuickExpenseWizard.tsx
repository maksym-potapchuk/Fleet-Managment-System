'use client';

import { useReducer, useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ExpenseCategory, QuickExpenseEntry, QuickExpenseResult } from '@/types/expense';
import { Vehicle } from '@/types/vehicle';
import { expenseService } from '@/services/expense';
import { vehicleService } from '@/services/vehicle';
import { VehicleStep } from './VehicleStep';
import { CategoryGrid } from './CategoryGrid';
import { QuickEntryForm } from './QuickEntryForm';
import { ExpenseEntryList } from './ExpenseEntryList';
import { ReviewStep } from './ReviewStep';
import { SubmissionProgress } from './SubmissionProgress';
import { ExitDraftDialog } from './ExitDraftDialog';
import { useSidebar } from '@/app/[locale]/quick-expenses/SidebarContext';
import { useRouter } from '@/src/i18n/routing';
import { Menu, ChevronLeft, ArrowLeft, Zap, FileText } from 'lucide-react';

// ── Draft persistence (IndexedDB) ──

import { get, set, del } from 'idb-keyval';

const DRAFT_KEY = 'fleet:quick-expenses:draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftData {
  vehicleId: string;
  vehicleLabel: string;
  entries: QuickExpenseEntry[];
  savedAt: number;
  expiresAt: number;
}

async function saveDraftToIDB(state: WizardState): Promise<void> {
  if (!state.vehicleId || state.entries.length === 0) return;
  const now = Date.now();
  const draft: DraftData = {
    vehicleId: state.vehicleId,
    vehicleLabel: state.vehicleLabel,
    entries: state.entries,
    savedAt: now,
    expiresAt: now + DRAFT_TTL_MS,
  };
  try { await set(DRAFT_KEY, draft); } catch { /* quota */ }
}

async function loadDraftFromIDB(): Promise<DraftData | null> {
  try {
    const draft = await get<DraftData>(DRAFT_KEY);
    if (!draft?.vehicleId || !draft.entries?.length) return null;
    if (Date.now() > draft.expiresAt) {
      await del(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch { return null; }
}

async function clearDraftFromIDB(): Promise<void> {
  try { await del(DRAFT_KEY); } catch { /* noop */ }
}

function formatDraftTimeLeft(expiresAt: number, t: (key: string) => string): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return '';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return t('draft.ttlHours').replace('__hours__', String(hours));
  return t('draft.ttlMinutes').replace('__minutes__', String(minutes));
}

// ── State ──

type WizardStep = 'vehicle' | 'add' | 'review' | 'submitting' | 'done';

interface WizardState {
  step: WizardStep;
  vehicleId: string | null;
  vehicleLabel: string;
  entries: QuickExpenseEntry[];
  editingIndex: number | null;
  activeCategoryId: string | null;
  results: QuickExpenseResult[];
}

type WizardAction =
  | { type: 'SET_VEHICLE'; vehicleId: string; label: string }
  | { type: 'SELECT_CATEGORY'; categoryId: string | null }
  | { type: 'ADD_ENTRY'; entry: QuickExpenseEntry }
  | { type: 'REMOVE_ENTRY'; index: number }
  | { type: 'START_EDIT'; index: number }
  | { type: 'UPDATE_ENTRY'; index: number; entry: QuickExpenseEntry }
  | { type: 'CANCEL_EDIT' }
  | { type: 'GO_TO_REVIEW' }
  | { type: 'BACK_TO_ADD' }
  | { type: 'BACK_TO_VEHICLE' }
  | { type: 'EDIT_FROM_REVIEW'; index: number }
  | { type: 'START_SUBMISSION' }
  | { type: 'UPDATE_RESULT'; result: QuickExpenseResult }
  | { type: 'SUBMISSION_DONE' }
  | { type: 'RETRY_FAILED' }
  | { type: 'RESET' }
  | { type: 'RESTORE_DRAFT'; vehicleId: string; vehicleLabel: string; entries: QuickExpenseEntry[] };

const initialState: WizardState = {
  step: 'vehicle',
  vehicleId: null,
  vehicleLabel: '',
  entries: [],
  editingIndex: null,
  activeCategoryId: null,
  results: [],
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_VEHICLE':
      return { ...state, step: 'add', vehicleId: action.vehicleId, vehicleLabel: action.label };
    case 'SELECT_CATEGORY':
      return { ...state, activeCategoryId: action.categoryId, editingIndex: null };
    case 'ADD_ENTRY':
      return { ...state, entries: [...state.entries, action.entry], activeCategoryId: null };
    case 'REMOVE_ENTRY':
      return { ...state, entries: state.entries.filter((_, i) => i !== action.index) };
    case 'START_EDIT':
      return { ...state, editingIndex: action.index, activeCategoryId: state.entries[action.index].category };
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((e, i) => (i === action.index ? action.entry : e)),
        editingIndex: null,
        activeCategoryId: null,
      };
    case 'CANCEL_EDIT':
      return { ...state, editingIndex: null, activeCategoryId: null };
    case 'GO_TO_REVIEW':
      return { ...state, step: 'review', activeCategoryId: null, editingIndex: null };
    case 'BACK_TO_ADD':
      return { ...state, step: 'add', results: [] };
    case 'EDIT_FROM_REVIEW':
      return { ...state, step: 'add', editingIndex: action.index, activeCategoryId: state.entries[action.index].category, results: [] };
    case 'BACK_TO_VEHICLE':
      return { ...state, step: 'vehicle', vehicleId: null, vehicleLabel: '', entries: [], activeCategoryId: null, editingIndex: null };
    case 'START_SUBMISSION':
      return { ...state, step: 'submitting', results: state.entries.map(e => ({ entryId: e.id, status: 'pending' as const })) };
    case 'UPDATE_RESULT':
      return {
        ...state,
        results: state.results.map(r => (r.entryId === action.result.entryId ? action.result : r)),
      };
    case 'SUBMISSION_DONE':
      return { ...state, step: 'done' };
    case 'RETRY_FAILED': {
      const failedIds = new Set(state.results.filter(r => r.status === 'error').map(r => r.entryId));
      return {
        ...state,
        step: 'submitting',
        entries: state.entries.filter(e => failedIds.has(e.id)),
        results: state.entries.filter(e => failedIds.has(e.id)).map(e => ({ entryId: e.id, status: 'pending' as const })),
      };
    }
    case 'RESET':
      return initialState;
    case 'RESTORE_DRAFT':
      return { ...initialState, step: 'review', vehicleId: action.vehicleId, vehicleLabel: action.vehicleLabel, entries: action.entries };
    default:
      return state;
  }
}

// ── Step indicator ──

const STEPS: ('vehicle' | 'add' | 'review')[] = ['vehicle', 'add', 'review'];
const STEP_KEYS: Record<'vehicle' | 'add' | 'review', string> = { vehicle: 'vehicle', add: 'add', review: 'review' };

function StepIndicator({ currentStep, t }: { currentStep: WizardStep; t: (key: string) => string }) {
  const displayStep = currentStep === 'submitting' || currentStep === 'done' ? 'review' : currentStep;
  const activeIdx = STEPS.indexOf(displayStep as 'vehicle' | 'add' | 'review');

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {STEPS.map((step, idx) => {
        const isActive = idx === activeIdx;
        const isDone = idx < activeIdx;
        return (
          <div key={step} className="flex items-center gap-2">
            {idx > 0 && <div className={`h-px w-6 sm:w-10 ${isDone ? 'bg-teal-500' : 'bg-slate-200'}`} />}
            <div className="flex items-center gap-1.5">
              <div className={`
                flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors
                ${isActive ? 'bg-teal-600 text-white' : isDone ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}
              `}>
                {idx + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-teal-700' : isDone ? 'text-teal-600' : 'text-slate-400'}`}>
                {t(`steps.${STEP_KEYS[step]}`)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main wizard ──

export function QuickExpenseWizard() {
  const t = useTranslations('quickExpenses');
  const tExpenses = useTranslations('expenses');
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Draft state
  const [draftBanner, setDraftBanner] = useState<DraftData | null>(null);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([vehicleService.getVehicles(), expenseService.getCategories()])
      .then(([v, c]) => {
        if (!ignore) {
          setVehicles(v);
          setCategories(c);
        }
      })
      .catch(() => {})
      .finally(() => { if (!ignore) setIsLoadingData(false); });
    return () => { ignore = true; };
  }, []);

  // Load draft on mount
  useEffect(() => {
    loadDraftFromIDB().then(draft => { if (draft) setDraftBanner(draft); });
  }, []);

  // Clear draft after successful submission
  useEffect(() => {
    if (state.step === 'done') { clearDraftFromIDB(); }
  }, [state.step]);

  const handleSubmit = useCallback(async () => {
    if (!state.vehicleId) return;
    dispatch({ type: 'START_SUBMISSION' });

    const results = await expenseService.submitQuickExpenses(
      state.vehicleId,
      state.entries,
      (result) => dispatch({ type: 'UPDATE_RESULT', result }),
    );

    dispatch({ type: 'SUBMISSION_DONE' });
    return results;
  }, [state.vehicleId, state.entries]);

  const canGoBack = state.step === 'add' || state.step === 'review';

  const hasUnsavedEntries = state.entries.length > 0 && state.step !== 'done' && state.step !== 'submitting';

  const tryExit = useCallback((exitAction: () => void) => {
    if (hasUnsavedEntries) {
      setPendingExitAction(() => exitAction);
      setExitDialogOpen(true);
    } else {
      exitAction();
    }
  }, [hasUnsavedEntries]);

  const handleExitConfirm = useCallback(async () => {
    await clearDraftFromIDB();
    setExitDialogOpen(false);
    pendingExitAction?.();
    setPendingExitAction(null);
  }, [pendingExitAction]);

  const handleSaveDraftAndExit = useCallback(async () => {
    await saveDraftToIDB(state);
    setExitDialogOpen(false);
    pendingExitAction?.();
    setPendingExitAction(null);
  }, [state, pendingExitAction]);

  const handleExitCancel = useCallback(() => {
    setExitDialogOpen(false);
    setPendingExitAction(null);
  }, []);

  const handleRestoreDraft = useCallback(async () => {
    if (!draftBanner) return;
    dispatch({ type: 'RESTORE_DRAFT', vehicleId: draftBanner.vehicleId, vehicleLabel: draftBanner.vehicleLabel, entries: draftBanner.entries });
    setDraftBanner(null);
    await clearDraftFromIDB();
  }, [draftBanner]);

  const handleDismissDraft = useCallback(async () => {
    setDraftBanner(null);
    await clearDraftFromIDB();
  }, []);

  const handleBack = () => {
    if (state.step === 'review') {
      dispatch({ type: 'BACK_TO_ADD' });
    } else if (state.step === 'add') {
      tryExit(() => dispatch({ type: 'BACK_TO_VEHICLE' }));
    }
  };

  const showForm = state.activeCategoryId || state.editingIndex !== null;
  const showCategoryPicker = state.editingIndex === null && !state.activeCategoryId;

  // Resolve driver from selected vehicle
  const selectedVehicle = vehicles.find(v => v.id === state.vehicleId);
  const vehicleDriver = selectedVehicle?.driver ?? null;

  // Draft info for VehicleStep card
  const draftInfo = draftBanner ? {
    vehicleLabel: draftBanner.vehicleLabel,
    entryCount: draftBanner.entries.length,
    timeLeft: formatDraftTimeLeft(draftBanner.expiresAt, t),
  } : null;

  return (
    <div className="flex h-screen flex-col bg-slate-50 overflow-x-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 lg:px-8 py-3">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <div className="flex items-center">
            <button onClick={openSidebar} className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95">
              <Menu className="h-5 w-5" />
            </button>
            {canGoBack ? (
              <button onClick={handleBack} className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95">
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <button onClick={() => tryExit(() => router.push('/dashboard'))} className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:scale-95">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-600 flex-shrink-0" />
              <h1 className="text-lg font-bold text-slate-900 truncate">{t('title')}</h1>
            </div>
          </div>
          {/* Draft button in header */}
          {state.step === 'vehicle' && draftBanner && (
            <button
              onClick={handleRestoreDraft}
              className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl border border-amber-200 bg-amber-50 text-sm font-medium text-amber-700 transition hover:bg-amber-100 active:scale-95"
            >
              <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="hidden sm:inline">{t('draft.cardTitle')}</span>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-amber-200 text-xs font-bold text-amber-800">
                {draftBanner.entries.length}
              </span>
            </button>
          )}
          {/* Desktop: vehicle pill in header */}
          {state.step === 'add' && state.vehicleLabel && (
            <button
              onClick={() => tryExit(() => dispatch({ type: 'BACK_TO_VEHICLE' }))}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-sm font-medium text-teal-700 transition hover:bg-teal-100 active:scale-95"
            >
              <span className="font-mono font-semibold text-xs">{state.vehicleLabel}</span>
              <span className="text-teal-400 text-xs">{t('addStep.changeVehicle')}</span>
            </button>
          )}
        </div>
        <div className="max-w-7xl mx-auto">
          <StepIndicator currentStep={state.step} t={t} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingData ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
          </div>
        ) : (
          <>
            {state.step === 'vehicle' && (
              <div className="max-w-lg mx-auto lg:flex lg:items-start lg:justify-center lg:min-h-full lg:pt-16">
                <VehicleStep
                  vehicles={vehicles}
                  onSelect={(vehicleId, label) => dispatch({ type: 'SET_VEHICLE', vehicleId, label })}
                  draft={draftInfo}
                  onRestoreDraft={handleRestoreDraft}
                  onDismissDraft={handleDismissDraft}
                />
              </div>
            )}

            {state.step === 'add' && (
              <div className="flex flex-col h-full">
                {/* Mobile-only vehicle pill */}
                <div className="flex-shrink-0 px-4 pt-4 pb-2 max-w-lg mx-auto w-full lg:hidden">
                  <button
                    onClick={() => tryExit(() => dispatch({ type: 'BACK_TO_VEHICLE' }))}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-sm font-medium text-teal-700 transition hover:bg-teal-100 active:scale-95"
                  >
                    <span className="font-mono font-semibold text-xs">{state.vehicleLabel}</span>
                    <span className="text-teal-400 text-xs">{t('addStep.changeVehicle')}</span>
                  </button>
                </div>

                {/* ═══ MOBILE: stacked layout ═══ */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 max-w-lg mx-auto w-full lg:hidden">
                  {showCategoryPicker && (
                    <CategoryGrid
                      categories={categories}
                      onSelect={(categoryId) => dispatch({ type: 'SELECT_CATEGORY', categoryId })}
                      tExpenses={tExpenses}
                    />
                  )}

                  {showForm && (
                    <QuickEntryForm
                      categories={categories}
                      activeCategoryId={state.activeCategoryId!}
                      editingEntry={state.editingIndex !== null ? state.entries[state.editingIndex] : undefined}
                      onAdd={(entry) => {
                        if (state.editingIndex !== null) {
                          dispatch({ type: 'UPDATE_ENTRY', index: state.editingIndex, entry });
                        } else {
                          dispatch({ type: 'ADD_ENTRY', entry });
                        }
                      }}
                      onCancel={() => dispatch({ type: 'CANCEL_EDIT' })}
                      tExpenses={tExpenses}
                      t={t}
                      vehicleDriver={vehicleDriver}
                    />
                  )}

                  {state.entries.length > 0 && (
                    <ExpenseEntryList
                      entries={state.entries}
                      onEdit={(index) => dispatch({ type: 'START_EDIT', index })}
                      onRemove={(index) => dispatch({ type: 'REMOVE_ENTRY', index })}
                      tExpenses={tExpenses}
                    />
                  )}
                </div>

                {/* ═══ DESKTOP: 3-column panel layout ═══ */}
                <div className="hidden lg:flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
                  {/* Left panel: category grid (always visible) */}
                  <div className="w-[300px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto p-5">
                    <CategoryGrid
                      categories={categories}
                      activeCategoryId={state.activeCategoryId}
                      onSelect={(categoryId) => dispatch({ type: 'SELECT_CATEGORY', categoryId })}
                      tExpenses={tExpenses}
                    />
                  </div>

                  {/* Center: form area */}
                  <div className="flex-1 overflow-y-auto p-6 pb-24 flex flex-col items-center">
                    {showForm ? (
                      <div className="w-full max-w-lg">
                        <QuickEntryForm
                          categories={categories}
                          activeCategoryId={state.activeCategoryId!}
                          editingEntry={state.editingIndex !== null ? state.entries[state.editingIndex] : undefined}
                          onAdd={(entry) => {
                            if (state.editingIndex !== null) {
                              dispatch({ type: 'UPDATE_ENTRY', index: state.editingIndex, entry });
                            } else {
                              dispatch({ type: 'ADD_ENTRY', entry });
                            }
                          }}
                          onCancel={() => dispatch({ type: 'CANCEL_EDIT' })}
                          tExpenses={tExpenses}
                          t={t}
                          vehicleDriver={vehicleDriver}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-400">
                        <div className="text-center">
                          <Zap className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                          <p className="text-sm font-medium">{t('addStep.selectCategory')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right panel: entry list + review button */}
                  <div className="w-[320px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4">
                      {state.entries.length > 0 ? (
                        <ExpenseEntryList
                          entries={state.entries}
                          onEdit={(index) => dispatch({ type: 'START_EDIT', index })}
                          onRemove={(index) => dispatch({ type: 'REMOVE_ENTRY', index })}
                          tExpenses={tExpenses}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                          <p className="text-xs font-medium">{t('reviewStep.entries').replace('__count__', '0')}</p>
                        </div>
                      )}
                    </div>
                    {state.entries.length > 0 && (
                      <div className="flex-shrink-0 p-4 border-t border-slate-200">
                        <button
                          onClick={() => dispatch({ type: 'GO_TO_REVIEW' })}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white font-bold text-sm shadow-lg shadow-teal-600/20 transition hover:shadow-xl hover:brightness-105 active:scale-[0.98]"
                        >
                          {t('addStep.goToReview').replace('__count__', String(state.entries.length))}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile floating review button */}
                {state.entries.length > 0 && showCategoryPicker && (
                  <div className="lg:hidden fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none">
                    <div className="max-w-lg mx-auto">
                      <button
                        onClick={() => dispatch({ type: 'GO_TO_REVIEW' })}
                        className="pointer-events-auto w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white font-bold text-base shadow-lg shadow-teal-600/20 transition active:scale-[0.98]"
                      >
                        {t('addStep.goToReview').replace('__count__', String(state.entries.length))}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.step === 'review' && (
              <div className="max-w-lg lg:max-w-3xl mx-auto w-full px-4 lg:px-6 lg:pt-8">
                <ReviewStep
                  vehicleLabel={state.vehicleLabel}
                  entries={state.entries}
                  onEdit={(index) => dispatch({ type: 'EDIT_FROM_REVIEW', index })}
                  onRemove={(index) => dispatch({ type: 'REMOVE_ENTRY', index })}
                  onSubmit={handleSubmit}
                  onAddMore={() => dispatch({ type: 'BACK_TO_ADD' })}
                  tExpenses={tExpenses}
                  t={t}
                />
              </div>
            )}

            {(state.step === 'submitting' || state.step === 'done') && (
              <div className="max-w-lg lg:max-w-3xl mx-auto w-full px-4 lg:px-6 lg:pt-8">
                <SubmissionProgress
                  entries={state.entries}
                  results={state.results}
                  isDone={state.step === 'done'}
                  onRetry={() => dispatch({ type: 'RETRY_FAILED' })}
                  onDone={() => dispatch({ type: 'RESET' })}
                  tExpenses={tExpenses}
                  t={t}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ExitDraftDialog
        isOpen={exitDialogOpen}
        onContinue={handleExitCancel}
        onExit={handleExitConfirm}
        onSaveDraft={handleSaveDraftAndExit}
        t={t}
      />
    </div>
  );
}
