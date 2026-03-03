'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Expense, CreateExpenseData, ExpenseCategory, ExpenseFilters as ExpenseFiltersType } from '@/types/expense';
import { Vehicle } from '@/types/vehicle';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import { ExpenseFilters } from '@/components/expense/ExpenseFilters';
import { ExpenseDetailModal } from '@/components/expense/ExpenseDetailModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { expenseService } from '@/services/expense';
import { vehicleService } from '@/services/vehicle';
import { Plus, X, Menu } from 'lucide-react';
import { useSidebar } from './SidebarContext';

export default function ExpensesPage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const { openSidebar } = useSidebar();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExpenseFiltersType>({});

  const loadExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await expenseService.getExpenses(filters);
      setExpenses(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t('loadError') + ' ' + msg);
    } finally {
      setIsLoading(false);
    }
  }, [filters, t]);

  const loadVehicles = useCallback(async () => {
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch {
      // Vehicles are optional for the select dropdown
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch {
      // Categories will be empty — form still renders
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    loadVehicles();
    loadCategories();
  }, [loadVehicles, loadCategories]);

  const handleCreate = async (data: CreateExpenseData) => {
    try {
      setIsSubmitting(true);
      const newExpense = await expenseService.createExpense(data);
      setExpenses(prev => [newExpense, ...prev]);
      setShowForm(false);
      setEditingExpense(null);
    } catch (err: unknown) {
      console.error('Error creating expense:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateExpenseData) => {
    if (!editingExpense) return;
    try {
      setIsSubmitting(true);
      const updated = await expenseService.updateExpense(editingExpense.id, data);
      setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
      setShowForm(false);
      setEditingExpense(null);
    } catch (err: unknown) {
      console.error('Error updating expense:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreateExpenseData) => {
    if (editingExpense) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      await expenseService.deleteExpense(expenseToDelete.id);
      setExpenses(prev => prev.filter(e => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(t('deleteError') + ': ' + msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={openSidebar}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex-shrink-0"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingExpense(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[#2D8B7E]/20 transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('addExpense')}</span>
            </button>
          </div>

        </div>

        {/* Filters */}
        <div className="px-4 pb-3 sm:px-6 sm:pb-4">
          <ExpenseFilters
            filters={filters}
            onChange={setFilters}
            showVehicleFilter
            vehicles={vehicles}
            categories={categories}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 sm:mx-6 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Table ── */}
      <ExpenseTable
        expenses={expenses}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={setViewingExpense}
        isLoading={isLoading}
        showVehicle
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
        onEdit={(expense) => { setViewingExpense(null); handleEdit(expense); }}
      />

      {/* Form Modal — bottom sheet on mobile, centered on desktop */}
      {showForm && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => { setShowForm(false); setEditingExpense(null); }} />

          {/* Mobile: bottom sheet */}
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-white rounded-t-2xl shadow-2xl max-h-[92vh] flex flex-col">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingExpense ? t('editExpense') : t('addExpense')}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingExpense(null); }} className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4 flex-1">
                <ExpenseForm
                  onSubmit={handleSubmit}
                  onCancel={() => { setShowForm(false); setEditingExpense(null); }}
                  categories={categories}
                  initialData={editingExpense}
                  isLoading={isSubmitting}
                  vehicles={vehicles}
                />
              </div>
            </div>
          </div>

          {/* Desktop: centered modal */}
          <div className="hidden sm:flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingExpense ? t('editExpense') : t('addExpense')}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingExpense(null); }} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ExpenseForm
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingExpense(null); }}
                categories={categories}
                initialData={editingExpense}
                isLoading={isSubmitting}
                vehicles={vehicles}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setExpenseToDelete(null)}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
