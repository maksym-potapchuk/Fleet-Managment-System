/**
 * DriverTable tests
 *
 * WHY: DriverTable renders driver data in mobile cards and desktop table.
 * Must verify: loading state, empty state, driver info display, action callbacks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverTable } from '@/components/driver/DriverTable';
import { Driver } from '@/types/driver';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pl',
}));

const makeDriver = (overrides: Partial<Driver> = {}): Driver => ({
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  first_name: 'Jan',
  last_name: 'Kowalski',
  phone_number: '48123456789',
  has_vehicle: false,
  is_active_driver: true,
  last_active_at: '2025-01-15T10:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  ...overrides,
});

describe('DriverTable – states', () => {
  it('renders loading state when isLoading is true', () => {
    render(<DriverTable drivers={[]} onEdit={vi.fn()} onDelete={vi.fn()} isLoading />);

    expect(screen.getAllByText('loading').length).toBeGreaterThan(0);
  });

  it('renders empty state when drivers array is empty', () => {
    render(<DriverTable drivers={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('noDrivers').length).toBeGreaterThan(0);
  });
});

describe('DriverTable – driver display', () => {
  it('renders driver name and phone', () => {
    const driver = makeDriver();
    render(<DriverTable drivers={[driver]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('Jan Kowalski').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+48123456789').length).toBeGreaterThan(0);
  });

  it('renders active status badge for active driver', () => {
    const driver = makeDriver({ is_active_driver: true });
    render(<DriverTable drivers={[driver]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('active').length).toBeGreaterThan(0);
  });

  it('renders inactive status badge for inactive driver', () => {
    const driver = makeDriver({ is_active_driver: false });
    render(<DriverTable drivers={[driver]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('inactive').length).toBeGreaterThan(0);
  });

  it('renders hasVehicleYes when driver has vehicle', () => {
    const driver = makeDriver({ has_vehicle: true });
    render(<DriverTable drivers={[driver]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getAllByText('hasVehicleYes').length).toBeGreaterThan(0);
  });
});

describe('DriverTable – actions', () => {
  let onEdit: ReturnType<typeof vi.fn<(driver: Driver) => void>>;
  let onDelete: ReturnType<typeof vi.fn<(driver: Driver) => void>>;
  let driver: Driver;

  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
    driver = makeDriver();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<DriverTable drivers={[driver]} onEdit={onEdit} onDelete={onDelete} />);

    const editButtons = screen.getAllByTitle('editDriver');
    await user.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(driver);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<DriverTable drivers={[driver]} onEdit={onEdit} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByTitle('deleteDriver');
    await user.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(driver);
  });
});
