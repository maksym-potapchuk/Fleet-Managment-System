import api from '@/lib/api';
import {
  Expense,
  ExpenseCategory,
  CreateExpenseData,
  ExpenseFilters,
  FuelSubEntry,
  InvoiceSearchResult,
  PaginatedExpenseResponse,
  QuickExpenseEntry,
  QuickExpenseResult,
} from '@/types/expense';

function buildFormData(data: Record<string, unknown>): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}

function buildQueryString(filters?: ExpenseFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.category_code) params.append('category_code', filters.category_code);
  if (filters.vehicle) params.append('vehicle', filters.vehicle);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.min_amount !== undefined) params.append('min_amount', String(filters.min_amount));
  if (filters.max_amount !== undefined) params.append('max_amount', String(filters.max_amount));
  if (filters.payment_method) params.append('payment_method', filters.payment_method);
  if (filters.payer_type) params.append('payer_type', filters.payer_type);
  if (filters.search) params.append('search', filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const expenseService = {
  async getCategories(): Promise<ExpenseCategory[]> {
    const response = await api.get('/expense/categories/');
    const data = response.data;
    return Array.isArray(data) ? data : (data as { results: ExpenseCategory[] }).results ?? [];
  },

  async getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
    const url = `/expense/${buildQueryString(filters)}`;
    const response = await api.get<PaginatedExpenseResponse>(url);
    return response.data.results;
  },

  async getVehicleExpenses(
    vehicleId: string,
    filters?: ExpenseFilters,
  ): Promise<Expense[]> {
    const url = `/vehicle/${vehicleId}/expenses/${buildQueryString(filters)}`;
    const response = await api.get<PaginatedExpenseResponse>(url);
    return response.data.results;
  },

  async searchInvoices(query: string): Promise<InvoiceSearchResult[]> {
    if (!query.trim()) return [];
    const response = await api.get<InvoiceSearchResult[]>(
      `/expense/invoices/?search=${encodeURIComponent(query)}`,
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const formData = buildFormData(data as unknown as Record<string, unknown>);
    const response = await api.post<Expense>('/expense/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async createVehicleExpense(
    vehicleId: string,
    data: CreateExpenseData,
  ): Promise<Expense> {
    const { vehicle: _v, ...rest } = data;
    const formData = buildFormData(rest as unknown as Record<string, unknown>);
    const response = await api.post<Expense>(
      `/vehicle/${vehicleId}/expenses/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async updateExpense(
    id: string,
    data: Partial<CreateExpenseData>,
  ): Promise<Expense> {
    const formData = buildFormData(data as unknown as Record<string, unknown>);
    const response = await api.patch<Expense>(`/expense/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteExpense(id: string): Promise<void> {
    await api.delete(`/expense/${id}/`);
  },

  async submitQuickExpenses(
    vehicleId: string,
    entries: QuickExpenseEntry[],
    onProgress: (result: QuickExpenseResult) => void,
  ): Promise<QuickExpenseResult[]> {
    const results: QuickExpenseResult[] = [];

    for (const entry of entries) {
      onProgress({ entryId: entry.id, status: 'submitting' });
      try {
        const code = entry.category_code;

        // FUEL: each sub-entry becomes a separate expense
        if (code === 'FUEL' && entry.fuel_entries?.length) {
          for (const fe of entry.fuel_entries) {
            const data: CreateExpenseData = {
              category: entry.category,
              expense_date: entry.expense_date,
              amount: fe.amount || '0',
              liters: fe.liters,
              fuel_type: fe.fuel_type,
            };
            if (entry.payment_method) data.payment_method = entry.payment_method;
            if (entry.payer_type) data.payer_type = entry.payer_type;
            if (fe.receipt) data.receipt = fe.receipt;
            // Cost splitting for FUEL sub-entries: compute per-entry from ratio
            if (entry.payer_type === 'CLIENT' && entry.company_amount && entry.client_amount) {
              const entryTotal = parseFloat(fe.amount) || 0;
              const overallTotal = parseFloat(entry.amount) || 1;
              const ratio = entryTotal / overallTotal;
              const clientAmt = Math.ceil(parseFloat(entry.client_amount) * ratio * 100) / 100;
              data.client_amount = clientAmt;
              data.company_amount = Math.round((entryTotal - clientAmt) * 100) / 100;
              if (entry.client_driver) data.client_driver = entry.client_driver;
            }
            await this.createVehicleExpense(vehicleId, data);
          }
        } else {
          const data: CreateExpenseData = {
            category: entry.category,
            expense_date: entry.expense_date,
            amount: entry.amount || '0',
          };

          if (entry.payment_method) data.payment_method = entry.payment_method;
          if (entry.payer_type) data.payer_type = entry.payer_type;

          // Cost splitting
          if (entry.payer_type === 'CLIENT') {
            if (entry.company_amount) data.company_amount = entry.company_amount;
            if (entry.client_amount) data.client_amount = entry.client_amount;
            if (entry.client_driver) data.client_driver = entry.client_driver;
          }

          if (code === 'INSPECTION') {
            data.official_cost = entry.official_cost;
            data.additional_cost = entry.additional_cost;
            data.inspection_date = entry.inspection_date || entry.expense_date;
            if (entry.next_inspection_date) data.next_inspection_date = entry.next_inspection_date;
          } else if (code === 'SERVICE') {
            if (entry.service) data.service = entry.service;
            if (entry.service_items?.length) {
              const valid = entry.service_items.filter(i => i.name.trim());
              if (valid.length) data.service_items_json = JSON.stringify(valid);
            }
            if (entry.invoice_number) data.invoice_number = entry.invoice_number;
            if (entry.invoice_file) data.invoice_file = entry.invoice_file;
          } else if (code === 'PARTS') {
            if (entry.source_name) data.source_name = entry.source_name;
            if (entry.supplier_type) data.supplier_type = entry.supplier_type;
            if (entry.parts?.length) {
              const valid = entry.parts.filter(p => p.name.trim());
              if (valid.length) data.parts_json = JSON.stringify(valid);
            }
            if (entry.invoice_number) data.invoice_number = entry.invoice_number;
            if (entry.invoice_file) data.invoice_file = entry.invoice_file;
          } else if (code === 'ACCESSORIES' || code === 'DOCUMENTS') {
            if (entry.parts?.length) {
              const valid = entry.parts.filter(p => p.name.trim());
              if (valid.length) data.parts_json = JSON.stringify(valid);
            }
            if (entry.invoice_number) data.invoice_number = entry.invoice_number;
            if (entry.invoice_file) data.invoice_file = entry.invoice_file;
          } else if (code === 'OTHER') {
            if (entry.expense_for) data.expense_for = entry.expense_for;
          } else if (code === 'WASHING') {
            data.wash_type = entry.wash_type;
          } else if (code === 'FINES') {
            data.violation_type = entry.violation_type;
            if (entry.fine_number) data.fine_number = entry.fine_number;
            if (entry.fine_date) data.fine_date = entry.fine_date;
          }

          await this.createVehicleExpense(vehicleId, data);
        }

        const result: QuickExpenseResult = { entryId: entry.id, status: 'success' };
        results.push(result);
        onProgress(result);
      } catch (err: unknown) {
        const responseData =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: Record<string, string | string[]> } }).response?.data
            : null;
        let errorMsg = 'Unknown error';
        if (responseData) {
          const firstKey = Object.keys(responseData)[0];
          if (firstKey) {
            const val = responseData[firstKey];
            errorMsg = Array.isArray(val) ? val[0] : String(val);
          }
        } else if (err instanceof Error) {
          errorMsg = err.message;
        }
        const result: QuickExpenseResult = { entryId: entry.id, status: 'error', error: errorMsg };
        results.push(result);
        onProgress(result);
      }
    }

    return results;
  },
};
