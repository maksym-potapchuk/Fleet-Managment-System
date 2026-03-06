/**
 * ExpenseTable tests
 *
 * WHY: ExpenseTable displays expenses with categories, amounts, and actions.
 * Must verify: loading skeleton, empty state, expense rendering, action callbacks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseTable } from '@/components/expense/ExpenseTable';
import { Expense } from '@/types/expense';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}));

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'exp-1',
  vehicle: 'v1',
  vehicle_car_number: 'AA1234BB',
  vehicle_vin_number: '1HGBH41JXMN109186',
  category: 'cat-1',
  category_code: 'FUEL',
  category_name: 'Fuel',
  category_icon: 'fuel',
  category_color: '#F59E0B',
  amount: '250.00',
  expense_date: '2025-03-01',
  receipt: null,
  payment_method: 'CASH',
  payer_type: 'COMPANY',
  expense_for: '',
  liters: '45.5',
  fuel_type: 'GASOLINE',
  service: null,
  service_name: '',
  service_items: [],
  wash_type: '',
  fine_number: '',
  violation_type: '',
  inspection_date: '',
  next_inspection_date: '',
  linked_inspection_id: null,
  parts: [],
  supplier_type: '' as Expense['supplier_type'],
  description: '',
  invoice: null,
  invoice_number: '',
  created_by: null,
  created_at: '2025-03-01T10:00:00Z',
  ...overrides,
});

describe('ExpenseTable – states', () => {
  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <ExpenseTable expenses={[]} onEdit={vi.fn()} onDelete={vi.fn()} isLoading />
    );

    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when expenses array is empty', () => {
    render(<ExpenseTable expenses={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('noExpenses').length).toBeGreaterThan(0);
  });
});

describe('ExpenseTable – expense display', () => {
  it('renders expense amount with PLN', () => {
    render(<ExpenseTable expenses={[makeExpense()]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('PLN').length).toBeGreaterThan(0);
  });

  it('renders vehicle car number when showVehicle is true', () => {
    render(
      <ExpenseTable expenses={[makeExpense()]} onEdit={vi.fn()} onDelete={vi.fn()} showVehicle />
    );

    expect(screen.getAllByText('AA1234BB').length).toBeGreaterThan(0);
  });
});

describe('ExpenseTable – actions', () => {
  let onEdit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;
  let expense: Expense;

  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
    expense = makeExpense();
  });

  it('calls onEdit when mobile edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<ExpenseTable expenses={[expense]} onEdit={onEdit} onDelete={onDelete} />);

    // Mobile view has text "edit" button
    const editButtons = screen.getAllByText('edit');
    await user.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(expense);
  });

  it('calls onView when onView is provided and row is clicked', async () => {
    const onView = vi.fn();
    const user = userEvent.setup();
    render(
      <ExpenseTable expenses={[expense]} onEdit={onEdit} onDelete={onDelete} onView={onView} />
    );

    // Click on the expense card/row — mobile card is clickable
    const cards = screen.getAllByText('types.FUEL');
    await user.click(cards[0]);

    expect(onView).toHaveBeenCalledWith(expense);
  });
});
