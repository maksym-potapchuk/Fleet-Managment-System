/**
 * VehicleModal tests
 *
 * WHY: Two regressions this modal is prone to:
 * 1. The useEffect that populates form fields for editing — if the dependency
 *    array or field mapping changes, the edit form silently shows stale/empty
 *    data.
 * 2. The create/update branching — submitting an edit modal that calls
 *    createVehicle instead of updateVehicle would duplicate the vehicle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VehicleModal } from '@/components/vehicle/VehicleModal';
import { vehicleService } from '@/services/vehicle';
import { Vehicle } from '@/types/vehicle';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    return (key: string, params?: Record<string, unknown>) => {
      const full = `${namespace}.${key}`;
      if (params) {
        return `${full}(${JSON.stringify(params)})`;
      }
      return full;
    };
  },
}));

vi.mock('@/services/vehicle', () => ({
  vehicleService: {
    createVehicle: vi.fn(),
    updateVehicle: vi.fn(),
    archiveVehicle: vi.fn(),
  },
}));

vi.mock('@/services/driver', () => ({
  getAllDrivers: vi.fn().mockResolvedValue([]),
  createDriver: vi.fn(),
}));

const mockVehicle: Vehicle = {
  id: 'v1',
  car_number: 'AA1234BB',
  is_temporary_plate: false,
  manufacturer: 'Toyota',
  model: 'Corolla',
  year: 2020,
  cost: '25000.00',
  vin_number: '1HGBH41JXMN109186',
  color: 'Чорний',
  fuel_type: 'GASOLINE',
  initial_km: 50000,
  distance_unit: 'km' as const,
  is_selected: false,
  status: 'READY',
  status_position: 0,
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
};

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

/**
 * Fill required fields for create form (vehicle={null}) on step 1.
 * Selects (manufacturer, status) already have defaults so only text/number inputs need filling.
 */
async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('AA1234BB'), 'ZZ9999ZZ');
  await user.type(screen.getByPlaceholderText('1HGBH41JXMN109186'), 'WVWZZZ3CZWE123456');
  await user.type(screen.getByPlaceholderText('Corolla'), 'Camry');
  const yearInput = screen.getByDisplayValue(String(new Date().getFullYear()));
  await user.clear(yearInput);
  await user.type(yearInput, '2022');
  // Select a color: open dropdown then pick the first color (white)
  await user.click(screen.getByText('vehicleModal.selectColor'));
  await user.click(screen.getByText('vehicleModal.colors.white'));
  const costInput = screen.getByPlaceholderText('50 000.00');
  await user.type(costInput, '30000');
  await user.type(screen.getByPlaceholderText('0'), '10000');
}

/** Advance from step 1 to step 2 */
async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /vehicleModal\.next/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VehicleModal – rendering', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <VehicleModal {...baseProps} isOpen={false} vehicle={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows add title when no vehicle is provided', () => {
    render(<VehicleModal {...baseProps} vehicle={null} />);
    expect(screen.getByText('vehicleModal.addVehicle')).toBeInTheDocument();
  });

  it('shows edit title when a vehicle is provided', () => {
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);
    expect(screen.getByText('vehicleModal.editVehicle')).toBeInTheDocument();
  });

  it('shows the archive button only when editing an existing vehicle', () => {
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);
    expect(screen.getByRole('button', { name: /vehicleModal\.archive/ })).toBeInTheDocument();
  });

  it('does not show archive button for a new vehicle', () => {
    render(<VehicleModal {...baseProps} vehicle={null} />);
    expect(screen.queryByRole('button', { name: /vehicleModal\.archive/ })).not.toBeInTheDocument();
  });
});

describe('VehicleModal – useEffect pre-fill', () => {
  it('populates car_number input with existing vehicle data', () => {
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);
    expect(screen.getByDisplayValue('AA1234BB')).toBeInTheDocument();
  });

  it('populates model input with existing vehicle data', () => {
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);
    expect(screen.getByDisplayValue('Corolla')).toBeInTheDocument();
  });

  it('populates VIN input with existing vehicle data', () => {
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);
    expect(screen.getByDisplayValue('1HGBH41JXMN109186')).toBeInTheDocument();
  });
});

describe('VehicleModal – form submission', () => {
  it('calls vehicleService.createVehicle (not updateVehicle) when creating', async () => {
    const user = userEvent.setup();
    vi.mocked(vehicleService.createVehicle).mockResolvedValue({ ...mockVehicle, id: 'new-id' });
    render(<VehicleModal {...baseProps} vehicle={null} />);

    await fillStep1(user);
    await goToStep2(user);
    await user.click(screen.getByRole('button', { name: /vehicleModal\.save/ }));

    await waitFor(() => expect(vehicleService.createVehicle).toHaveBeenCalledOnce());
    expect(vehicleService.updateVehicle).not.toHaveBeenCalled();
  });

  it('calls vehicleService.updateVehicle (not createVehicle) when editing', async () => {
    const user = userEvent.setup();
    vi.mocked(vehicleService.updateVehicle).mockResolvedValue(mockVehicle);
    render(<VehicleModal {...baseProps} vehicle={mockVehicle} />);

    // Edit mode: step 1 is pre-filled, go to step 2 and submit
    await goToStep2(user);
    await user.click(screen.getByRole('button', { name: /vehicleModal\.save/ }));

    await waitFor(() => expect(vehicleService.updateVehicle).toHaveBeenCalledOnce());
    expect(vehicleService.updateVehicle).toHaveBeenCalledWith('v1', expect.any(Object));
    expect(vehicleService.createVehicle).not.toHaveBeenCalled();
  });

  it('calls onSave and onClose after a successful create', async () => {
    const user = userEvent.setup();
    vi.mocked(vehicleService.createVehicle).mockResolvedValue({ ...mockVehicle, id: 'new-id' });
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<VehicleModal isOpen={true} vehicle={null} onSave={onSave} onClose={onClose} />);

    await fillStep1(user);
    await goToStep2(user);
    await user.click(screen.getByRole('button', { name: /vehicleModal\.save/ }));

    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows error message when the API call fails', async () => {
    const user = userEvent.setup();
    vi.mocked(vehicleService.createVehicle).mockRejectedValue(new Error('Network error'));
    render(<VehicleModal {...baseProps} vehicle={null} />);

    await fillStep1(user);
    await goToStep2(user);
    await user.click(screen.getByRole('button', { name: /vehicleModal\.save/ }));

    await waitFor(() =>
      expect(screen.getByText('vehicleModal.errorSaveVehicle')).toBeInTheDocument()
    );
  });
});

describe('VehicleModal – optional car_number & temporary plate', () => {
  it('allows proceeding to step 2 without car_number', async () => {
    const user = userEvent.setup();
    render(<VehicleModal {...baseProps} vehicle={null} />);

    // Fill all required fields EXCEPT car_number
    await user.type(screen.getByPlaceholderText('1HGBH41JXMN109186'), 'WVWZZZ3CZWE123456');
    await user.type(screen.getByPlaceholderText('Corolla'), 'Camry');
    const yearInput = screen.getByDisplayValue(String(new Date().getFullYear()));
    await user.clear(yearInput);
    await user.type(yearInput, '2022');
    await user.click(screen.getByText('vehicleModal.selectColor'));
    await user.click(screen.getByText('vehicleModal.colors.white'));
    await user.type(screen.getByPlaceholderText('50 000.00'), '30000');
    await user.type(screen.getByPlaceholderText('0'), '10000');

    const nextBtn = screen.getByRole('button', { name: /vehicleModal\.next/ });
    expect(nextBtn).not.toBeDisabled();
  });

  it('renders is_temporary_plate checkbox unchecked by default', () => {
    render(<VehicleModal {...baseProps} vehicle={null} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('populates is_temporary_plate checkbox from existing vehicle', () => {
    const vehicleWithTempPlate = { ...mockVehicle, is_temporary_plate: true };
    render(<VehicleModal {...baseProps} vehicle={vehicleWithTempPlate} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('sends is_temporary_plate when creating vehicle', async () => {
    const user = userEvent.setup();
    vi.mocked(vehicleService.createVehicle).mockResolvedValue({ ...mockVehicle, id: 'new-id' });
    render(<VehicleModal {...baseProps} vehicle={null} />);

    await fillStep1(user);
    // Check the temporary plate checkbox
    await user.click(screen.getByRole('checkbox'));
    await goToStep2(user);
    await user.click(screen.getByRole('button', { name: /vehicleModal\.save/ }));

    await waitFor(() => expect(vehicleService.createVehicle).toHaveBeenCalledOnce());
    expect(vehicleService.createVehicle).toHaveBeenCalledWith(
      expect.objectContaining({ is_temporary_plate: true })
    );
  });
});

describe('VehicleModal – close button', () => {
  it('calls onClose when the X button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<VehicleModal isOpen={true} vehicle={null} onSave={vi.fn()} onClose={onClose} />);

    // The close button contains the X icon — it's the button next to the title
    const closeBtn = screen.getByRole('button', { name: '' }); // icon-only
    await user.click(closeBtn);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
