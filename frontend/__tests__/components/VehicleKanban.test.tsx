/**
 * VehicleKanban tests
 *
 * WHY: filteredVehicles is a 4-part AND-filter (search, status, driver,
 * manufacturer). Any condition flip or typo silently shows wrong data in
 * every Kanban column. visibleColumns derives from filteredVehicles — a
 * broken filter also hides/shows wrong columns.
 *
 * handleDragEnd has a guard: skip onUpdateStatus if status didn't change.
 * Without this guard, every drag fires an unnecessary PATCH request even when
 * the card is dropped back on its own column.
 *
 * NOTE: The component renders BOTH a mobile list and a desktop Kanban.
 * In JSDOM (which doesn't apply CSS), both sections are visible simultaneously.
 * Therefore:
 *   - use getAllByText() for positive text assertions (vehicle cards appear twice)
 *   - use /statuses\.READY \(/ regex (with paren) to target desktop filter chips,
 *     not mobile status tabs which use "· count" format
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleKanban } from '@/components/vehicle/VehicleKanban';
import { Vehicle, VehicleStatus } from '@/types/vehicle';

// ─── next-intl mock ───────────────────────────────────────────────────────────
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ─── @dnd-kit/core mock ───────────────────────────────────────────────────────
// We capture onDragEnd from DndContext so we can fire drag events programmatically.
const dndHandlers = vi.hoisted(() => ({
  onDragEnd: null as ((e: { active: { id: string }; over: { id: string } | null }) => void) | null,
  onDragStart: null as ((e: { active: { id: string } }) => void) | null,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd, onDragStart }: {
    children: React.ReactNode;
    onDragEnd: (e: unknown) => void;
    onDragStart: (e: unknown) => void;
  }) => {
    dndHandlers.onDragEnd = onDragEnd as typeof dndHandlers.onDragEnd;
    dndHandlers.onDragStart = onDragStart as typeof dndHandlers.onDragStart;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: () => null,
  PointerSensor: class {},
  useSensor: () => null,
  useSensors: (...args: unknown[]) => args,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false,
  }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const makeVehicle = (overrides: Partial<Vehicle>): Vehicle => ({
  id: 'v-default',
  car_number: 'ZZ0000ZZ',
  manufacturer: 'Toyota',
  model: 'Corolla',
  year: 2020,
  cost: '25000.00',
  vin_number: '1HGBH41JXMN109186',
  color: 'Білий',
  fuel_type: 'GASOLINE',
  initial_km: 0,
  is_selected: false,
  status: 'READY',
  driver: null,
  photos: [],
  last_inspection_date: null,
  next_inspection_date: null,
  days_until_inspection: null,
  equipment_total: 0,
  equipment_equipped: 0,
  regulation_overdue: 0,
  has_regulation: false,
  expenses_total: '0',
  total_cost: '25000.00',
  is_archived: false,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const vehicles: Vehicle[] = [
  makeVehicle({ id: 'v1', car_number: 'AA1234BB', manufacturer: 'Toyota', model: 'Corolla', status: 'READY', driver: { id: 'd1', first_name: 'Jan', last_name: 'Kowalski' } }),
  makeVehicle({ id: 'v2', car_number: 'CC5678DD', manufacturer: 'BMW', model: 'X5', status: 'LEASING', driver: null }),
  makeVehicle({ id: 'v3', car_number: 'EE9012FF', manufacturer: 'Toyota', model: 'Camry', status: 'CTO', driver: { id: 'd2', first_name: 'Anna', last_name: 'Nowak' } }),
];

const defaultProps = {
  vehicles,
  onSelectVehicle: vi.fn(),
  onAddVehicle: vi.fn(),
  onUpdateStatus: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  dndHandlers.onDragEnd = null;
  dndHandlers.onDragStart = null;
});

// Helper: assert a car number is present (may appear in both mobile + desktop sections)
const expectVisible = (carNumber: string) =>
  expect(screen.getAllByText(carNumber).length).toBeGreaterThan(0);

// Helper: assert absent in both sections
const expectAbsent = (carNumber: string) =>
  expect(screen.queryAllByText(carNumber).length).toBe(0);

// ─── Search filter ────────────────────────────────────────────────────────────

describe('VehicleKanban – search filter', () => {
  it('shows all vehicles when search is empty', () => {
    render(<VehicleKanban {...defaultProps} />);
    expectVisible('AA1234BB');
    expectVisible('CC5678DD');
    expectVisible('EE9012FF');
  });

  it('filters vehicles by car_number (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('search');
    await user.type(searchInput, 'aa1234');

    expectVisible('AA1234BB');
    expectAbsent('CC5678DD');
    expectAbsent('EE9012FF');
  });

  it('filters vehicles by manufacturer (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('search');
    await user.type(searchInput, 'bmw');

    expectAbsent('AA1234BB');
    expectVisible('CC5678DD');
    expectAbsent('EE9012FF');
  });

  it('filters vehicles by model (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('search'), 'camry');

    expectAbsent('AA1234BB');
    expectAbsent('CC5678DD');
    expectVisible('EE9012FF');
  });

  it('clears search and shows all vehicles when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    await user.type(screen.getByPlaceholderText('search'), 'bmw');
    expectAbsent('AA1234BB');

    // Click the clear button (appears when searchTerm is non-empty)
    const clearBtn = screen.getByTitle('Очистити пошук');
    await user.click(clearBtn);

    expectVisible('AA1234BB');
    expectVisible('CC5678DD');
    expectVisible('EE9012FF');
  });
});

// ─── Status filter ────────────────────────────────────────────────────────────
// Desktop filter chips use "statuses.READY (1)" format (with parens).
// Mobile status tabs use "statuses.READY · 1" format.
// Regex /statuses\.READY \(/ targets only the desktop chip.

describe('VehicleKanban – status filter', () => {
  it('shows only vehicles with the selected status', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    // Click the READY status filter chip (desktop format: "statuses.READY (1)")
    const readyBtn = screen.getByRole('button', { name: /statuses\.READY \(/ });
    await user.click(readyBtn);

    expectVisible('AA1234BB');
    expectAbsent('CC5678DD');
    expectAbsent('EE9012FF');
  });

  it('combining two status filters shows vehicles from both statuses', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /statuses\.READY \(/ }));
    await user.click(screen.getByRole('button', { name: /statuses\.CTO \(/ }));

    expectVisible('AA1234BB');  // READY
    expectAbsent('CC5678DD');   // LEASING
    expectVisible('EE9012FF');  // CTO
  });

  it('deselecting a status filter shows all vehicles again', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    const readyBtn = screen.getByRole('button', { name: /statuses\.READY \(/ });
    await user.click(readyBtn);
    await user.click(readyBtn); // deselect

    expectVisible('AA1234BB');
    expectVisible('CC5678DD');
    expectVisible('EE9012FF');
  });
});

// ─── Driver filter ────────────────────────────────────────────────────────────

describe('VehicleKanban – driver filter', () => {
  it('"with driver" filter hides vehicles that have no driver', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /filters\.withDriver/ }));

    expectVisible('AA1234BB');  // has driver
    expectAbsent('CC5678DD');   // no driver
    expectVisible('EE9012FF');  // has driver
  });

  it('"without driver" filter hides vehicles that have a driver', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /filters\.withoutDriver/ }));

    expectAbsent('AA1234BB');
    expectVisible('CC5678DD');
    expectAbsent('EE9012FF');
  });
});

// ─── Clear all ────────────────────────────────────────────────────────────────

describe('VehicleKanban – clear all filters', () => {
  it('resets all filters and shows every vehicle', async () => {
    const user = userEvent.setup();
    render(<VehicleKanban {...defaultProps} />);

    // Apply a status filter to trigger "clear all" button visibility
    await user.click(screen.getByRole('button', { name: /statuses\.READY \(/ }));
    expectAbsent('CC5678DD');

    await user.click(screen.getByRole('button', { name: /filters\.clearAll/ }));

    expectVisible('AA1234BB');
    expectVisible('CC5678DD');
    expectVisible('EE9012FF');
  });
});

// ─── Drag & drop guard ────────────────────────────────────────────────────────

describe('VehicleKanban – handleDragEnd', () => {
  it('does NOT call onUpdateStatus when dropped on the same column', () => {
    render(<VehicleKanban {...defaultProps} />);

    act(() => {
      dndHandlers.onDragEnd?.({ active: { id: 'v1' }, over: { id: 'READY' as VehicleStatus } });
    });

    expect(defaultProps.onUpdateStatus).not.toHaveBeenCalled();
  });

  it('calls onUpdateStatus with correct vehicleId and newStatus when status changes', () => {
    render(<VehicleKanban {...defaultProps} />);

    act(() => {
      dndHandlers.onDragEnd?.({ active: { id: 'v1' }, over: { id: 'LEASING' as VehicleStatus } });
    });

    expect(defaultProps.onUpdateStatus).toHaveBeenCalledOnce();
    expect(defaultProps.onUpdateStatus).toHaveBeenCalledWith('v1', 'LEASING');
  });

  it('does NOT call onUpdateStatus when dropped outside any column (over = null)', () => {
    render(<VehicleKanban {...defaultProps} />);

    act(() => {
      dndHandlers.onDragEnd?.({ active: { id: 'v1' }, over: null });
    });

    expect(defaultProps.onUpdateStatus).not.toHaveBeenCalled();
  });
});
