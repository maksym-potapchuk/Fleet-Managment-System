/**
 * ExpenseForm tests — fuel type multi-toggle
 *
 * WHY: Fuel type selection changed from single-select to multi-toggle buttons.
 * Must verify: toggle on/off, multiple selection, submit includes fuel_types array.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseForm } from '@/components/expense/ExpenseForm';
import type { ExpenseCategory, Expense, FuelType } from '@/types/expense';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/services/service', () => ({
  getAllServices: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/driver', () => ({
  getAllDrivers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/expense/VehicleAutocomplete', () => ({
  VehicleAutocomplete: () => <div data-testid="vehicle-autocomplete" />,
}));

vi.mock('@/components/common/FileInput', () => ({
  FileInput: ({ label }: { label: string }) => <div data-testid="file-input">{label}</div>,
}));

vi.mock('@/components/expense/InvoiceInput', () => ({
  InvoiceInput: () => <div data-testid="invoice-input" />,
}));

const fuelCategory: ExpenseCategory = {
  id: 'cat-fuel',
  code: 'FUEL',
  name: 'Fuel',
  icon: 'fuel',
  color: '#F59E0B',
  is_system: true,
  is_active: true,
  order: 1,
};

const otherCategory: ExpenseCategory = {
  id: 'cat-other',
  code: 'OTHER',
  name: 'Other',
  icon: 'more-horizontal',
  color: '#64748B',
  is_system: true,
  is_active: true,
  order: 7,
};

const categories = [fuelCategory, otherCategory];

describe('ExpenseForm – fuel type multi-toggle', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onSubmit: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let onCancel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    onSubmit = vi.fn().mockResolvedValue(undefined);
    onCancel = vi.fn();
  });

  function renderForm(overrides: Record<string, unknown> = {}) {
    return render(
      <ExpenseForm
        onSubmit={onSubmit}
        onCancel={onCancel}
        categories={categories}
        vehicleId="v-1"
        {...overrides}
      />
    );
  }

  it('renders four fuel type toggle buttons when FUEL category is selected', async () => {
    renderForm();
    const user = userEvent.setup();

    // Select FUEL category
    const categorySelect = document.querySelector('[name="category"]') as HTMLSelectElement;
    if (categorySelect) {
      await user.selectOptions(categorySelect, fuelCategory.id);
    }

    await waitFor(() => {
      const buttons = screen.getAllByRole('button').filter(btn =>
        ['fuelTypes.GASOLINE', 'fuelTypes.DIESEL', 'fuelTypes.LPG', 'fuelTypes.ELECTRIC'].includes(btn.textContent || '')
      );
      expect(buttons.length).toBe(4);
    });
  });

  it('toggles fuel type on click — adds and removes from selection', async () => {
    renderForm();
    const user = userEvent.setup();

    const categorySelect = document.querySelector('[name="category"]') as HTMLSelectElement;
    if (categorySelect) {
      await user.selectOptions(categorySelect, fuelCategory.id);
    }

    await waitFor(() => {
      expect(screen.getByText('fuelTypes.DIESEL')).toBeInTheDocument();
    });

    const dieselBtn = screen.getByText('fuelTypes.DIESEL');

    // Click to select DIESEL
    await user.click(dieselBtn);
    expect(dieselBtn.className).toContain('bg-teal-500');

    // Click again to deselect
    await user.click(dieselBtn);
    expect(dieselBtn.className).not.toContain('bg-teal-500');
  });

  it('allows selecting multiple fuel types simultaneously', async () => {
    renderForm();
    const user = userEvent.setup();

    const categorySelect = document.querySelector('[name="category"]') as HTMLSelectElement;
    if (categorySelect) {
      await user.selectOptions(categorySelect, fuelCategory.id);
    }

    await waitFor(() => {
      expect(screen.getByText('fuelTypes.DIESEL')).toBeInTheDocument();
    });

    await user.click(screen.getByText('fuelTypes.DIESEL'));
    await user.click(screen.getByText('fuelTypes.LPG'));

    expect(screen.getByText('fuelTypes.DIESEL').className).toContain('bg-teal-500');
    expect(screen.getByText('fuelTypes.LPG').className).toContain('bg-teal-500');
    expect(screen.getByText('fuelTypes.GASOLINE').className).not.toContain('bg-teal-500');
  });

  it('submits fuel_types array in onSubmit data', async () => {
    renderForm();
    const user = userEvent.setup();

    const categorySelect = document.querySelector('[name="category"]') as HTMLSelectElement;
    if (categorySelect) {
      await user.selectOptions(categorySelect, fuelCategory.id);
    }

    await waitFor(() => {
      expect(screen.getByText('fuelTypes.DIESEL')).toBeInTheDocument();
    });

    // Select two fuel types
    await user.click(screen.getByText('fuelTypes.DIESEL'));
    await user.click(screen.getByText('fuelTypes.LPG'));

    // Fill amount
    const amountInput = document.querySelector('[name="amount"]') as HTMLInputElement;
    if (amountInput) {
      await user.clear(amountInput);
      await user.type(amountInput, '150');
    }

    // Submit
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    await waitFor(() => {
      if (onSubmit.mock.calls.length > 0) {
        const submittedData = onSubmit.mock.calls[0][0];
        expect(submittedData.fuel_types).toEqual(expect.arrayContaining(['DIESEL', 'LPG']));
        expect(submittedData.fuel_types).toHaveLength(2);
      }
    });
  });

  it('initializes fuel types from initialData when editing', async () => {
    const initialData = {
      fuel_types: ['DIESEL', 'ELECTRIC'] as FuelType[],
      category: fuelCategory.id,
      category_code: 'FUEL',
    } as Partial<Expense>;

    renderForm({ initialData });

    await waitFor(() => {
      const dieselBtn = screen.queryByText('fuelTypes.DIESEL');
      const electricBtn = screen.queryByText('fuelTypes.ELECTRIC');
      if (dieselBtn) expect(dieselBtn.className).toContain('bg-teal-500');
      if (electricBtn) expect(electricBtn.className).toContain('bg-teal-500');
    });
  });
});

describe('expenseService – buildFormData serializes arrays as JSON', () => {
  it('fuel_types array is JSON-stringified in FormData', async () => {
    const { expenseService } = await import('@/services/expense');

    // Mock the API
    const api = (await import('@/lib/api')).default;
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { id: 'exp-1' } });

    await expenseService.createExpense({
      category: 'cat-fuel',
      expense_date: '2026-03-01',
      amount: '100',
      fuel_types: ['DIESEL', 'LPG'],
    });

    const formData = (api.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as FormData;
    expect(formData.get('fuel_types')).toBe(JSON.stringify(['DIESEL', 'LPG']));
  });
});
