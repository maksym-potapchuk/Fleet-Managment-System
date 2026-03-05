import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '@/lib/api';
import { expenseService } from '@/services/expense';
import type { QuickExpenseEntry, QuickExpenseResult } from '@/types/expense';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

const makeEntry = (overrides: Partial<QuickExpenseEntry> = {}): QuickExpenseEntry => ({
  id: 'entry-1',
  category: 'cat-fuel',
  category_code: 'FUEL',
  category_name: 'Fuel',
  category_icon: 'fuel',
  category_color: '#F59E0B',
  amount: '100',
  expense_date: '2026-03-01',
  ...overrides,
});

describe('expenseService – getCategories', () => {
  it('returns array from direct array response', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ id: '1', code: 'FUEL' }] });
    const result = await expenseService.getCategories();
    expect(result).toEqual([{ id: '1', code: 'FUEL' }]);
    expect(mockedApi.get).toHaveBeenCalledWith('/expense/categories/');
  });

  it('returns array from paginated response', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { results: [{ id: '2', code: 'WASHING' }] } });
    const result = await expenseService.getCategories();
    expect(result).toEqual([{ id: '2', code: 'WASHING' }]);
  });
});

describe('expenseService – searchInvoices', () => {
  it('returns matching invoices from API', async () => {
    const invoices = [
      { id: 'inv-1', number: 'FAK-100', vendor_name: 'Auto Kraków', invoice_date: null, total_amount: null, expense_count: 1 },
    ];
    mockedApi.get.mockResolvedValueOnce({ data: invoices });
    const result = await expenseService.searchInvoices('FAK-100');
    expect(result).toEqual(invoices);
    expect(mockedApi.get).toHaveBeenCalledWith('/expense/invoices/?search=FAK-100');
  });

  it('returns empty array for blank query without API call', async () => {
    const result = await expenseService.searchInvoices('   ');
    expect(result).toEqual([]);
    expect(mockedApi.get).not.toHaveBeenCalled();
  });
});

describe('expenseService – createExpense', () => {
  it('returns expense with invoice_existing flag from API', async () => {
    const mockExpense = {
      id: 'exp-1',
      invoice_data: { id: 'inv-1', number: 'FAK-001' },
      invoice_existing: true,
    };
    mockedApi.post.mockResolvedValueOnce({ data: mockExpense });

    const result = await expenseService.createExpense({
      category: 'cat-parts',
      expense_date: '2026-03-01',
      amount: '100',
      invoice_number: 'FAK-001',
    });

    expect(result.invoice_existing).toBe(true);
    expect(result.invoice_data?.number).toBe('FAK-001');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/expense/',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
  });
});

describe('expenseService – submitQuickExpenses', () => {
  it('calls createVehicleExpense for each entry and reports progress', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entries = [
      makeEntry({ id: 'e1', amount: '100', liters: '40', fuel_type: 'DIESEL' }),
      makeEntry({ id: 'e2', category_code: 'OTHER', amount: '50' }),
    ];

    const progress: QuickExpenseResult[] = [];
    const results = await expenseService.submitQuickExpenses(
      'vehicle-1',
      entries,
      (r) => progress.push(r),
    );

    expect(results).toHaveLength(2);
    expect(results.every(r => r.status === 'success')).toBe(true);
    expect(mockedApi.post).toHaveBeenCalledTimes(2);
    // Each entry produces 2 progress callbacks: submitting + success
    expect(progress).toHaveLength(4);
    expect(progress[0]).toEqual({ entryId: 'e1', status: 'submitting' });
    expect(progress[1]).toEqual({ entryId: 'e1', status: 'success' });
  });

  it('reports error with message from API response', async () => {
    const apiError = {
      response: { data: { amount: ['This field is required.'] } },
    };
    mockedApi.post.mockRejectedValueOnce(apiError);

    const entries = [makeEntry({ id: 'e1' })];
    const progress: QuickExpenseResult[] = [];
    const results = await expenseService.submitQuickExpenses(
      'vehicle-1',
      entries,
      (r) => progress.push(r),
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('error');
    expect(results[0].error).toBe('This field is required.');
  });

  it('sends amount and next_inspection_date for INSPECTION category', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entry = makeEntry({
      id: 'e1',
      category_code: 'INSPECTION',
      amount: '149',
      official_cost: '99',
      additional_cost: '50',
      inspection_date: '2026-03-01',
      next_inspection_date: '2028-03-01',
    });

    await expenseService.submitQuickExpenses('v-1', [entry], () => {});

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('amount')).toBe('149');
    expect(formData.get('official_cost')).toBe('99');
    expect(formData.get('inspection_date')).toBe('2026-03-01');
    expect(formData.get('next_inspection_date')).toBe('2028-03-01');
  });

  it('sends fuel-specific fields in FormData via fuel_entries', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entry = makeEntry({
      id: 'e1',
      category_code: 'FUEL',
      amount: '200',
      fuel_entries: [{ amount: '200', liters: '80', fuel_type: 'GASOLINE' }],
    });

    await expenseService.submitQuickExpenses('v-1', [entry], () => {});

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('amount')).toBe('200');
    expect(formData.get('liters')).toBe('80');
    expect(formData.get('fuel_type')).toBe('GASOLINE');
  });

  it('sends service_items_json for SERVICE category', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entry = makeEntry({
      id: 'e1',
      category_code: 'SERVICE',
      amount: '100',
      service_items: [{ name: 'Oil change', price: '100' }],
    });

    await expenseService.submitQuickExpenses('v-1', [entry], () => {});

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    const json = formData.get('service_items_json') as string;
    expect(JSON.parse(json)).toEqual([{ name: 'Oil change', price: '100' }]);
  });

  it('sends invoice_number in FormData for PARTS entry', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entry = makeEntry({
      id: 'e1',
      category_code: 'PARTS',
      amount: '300',
      invoice_number: 'FAK-2026/001',
    });

    await expenseService.submitQuickExpenses('v-1', [entry], () => {});

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('invoice_number')).toBe('FAK-2026/001');
  });

  it('sends invoice_file as File in FormData for ACCESSORIES entry', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const file = new File(['pdf content'], 'faktura.pdf', { type: 'application/pdf' });
    const entry = makeEntry({
      id: 'e1',
      category_code: 'ACCESSORIES',
      amount: '500',
      invoice_number: 'FAK-ACC-001',
      invoice_file: file,
      parts: [{ name: 'GPS mount', quantity: 1, unit_price: '500' }],
    });

    await expenseService.submitQuickExpenses('v-1', [entry], () => {});

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('invoice_number')).toBe('FAK-ACC-001');
    expect(formData.get('invoice_file')).toBeInstanceOf(File);
  });

  it('continues submitting remaining entries after one fails', async () => {
    mockedApi.post
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ data: { id: 'exp-2' } });

    const entries = [
      makeEntry({ id: 'e1' }),
      makeEntry({ id: 'e2', category_code: 'OTHER', amount: '50' }),
    ];

    const results = await expenseService.submitQuickExpenses('v-1', entries, () => {});

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('error');
    expect(results[1].status).toBe('success');
  });
});
