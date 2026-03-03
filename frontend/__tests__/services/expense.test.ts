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

const mockedApi = vi.mocked(api);

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

  it('sends fuel-specific fields in FormData', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 'exp-1' } });

    const entry = makeEntry({
      id: 'e1',
      category_code: 'FUEL',
      amount: '200',
      liters: '80',
      fuel_type: 'GASOLINE',
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
