/**
 * vehicleService tests
 *
 * WHY: getVehicles builds URLSearchParams dynamically — a silent bug here
 * means wrong data silently flows into the Kanban board. updateVehicleStatus
 * has non-trivial error handling that must re-throw so callers can react.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vehicleService } from '@/services/vehicle';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getVehicles ─────────────────────────────────────────────────────────────

describe('vehicleService.getVehicles', () => {
  it('calls /vehicle/ with no query string when no filters provided', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await vehicleService.getVehicles();

    expect(mockedApi.get).toHaveBeenCalledWith('/vehicle/');
  });

  it('appends status filter to the URL', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await vehicleService.getVehicles({ status: 'RENT' });

    const url = mockedApi.get.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('status')).toBe('RENT');
  });

  it('appends manufacturer and year filters to the URL', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await vehicleService.getVehicles({ manufacturer: 'Toyota', year: 2020 });

    const url = mockedApi.get.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('manufacturer')).toBe('Toyota');
    expect(params.get('year')).toBe('2020');
  });

  it('appends search filter to the URL', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await vehicleService.getVehicles({ search: 'AA1234' });

    const url = mockedApi.get.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('search')).toBe('AA1234');
  });

  it('returns the data from the response', async () => {
    const vehicles = [{ id: 'v1', car_number: 'AA1234BB' }];
    mockedApi.get.mockResolvedValue({ data: vehicles });

    const result = await vehicleService.getVehicles();

    expect(result).toEqual(vehicles);
  });
});

// ─── getVehicle ───────────────────────────────────────────────────────────────

describe('vehicleService.getVehicle', () => {
  it('calls /vehicle/{id}/', async () => {
    mockedApi.get.mockResolvedValue({ data: { id: 'v1' } });

    await vehicleService.getVehicle('v1');

    expect(mockedApi.get).toHaveBeenCalledWith('/vehicle/v1/');
  });
});

// ─── createVehicle ────────────────────────────────────────────────────────────

describe('vehicleService.createVehicle', () => {
  it('POSTs to /vehicle/ with the provided data', async () => {
    const payload = { model: 'Corolla', manufacturer: 'Toyota' as const, year: 2020, cost: '25000', vin_number: 'VIN', car_number: 'AA1234BB', initial_km: 0 };
    mockedApi.post.mockResolvedValue({ data: { id: 'new', ...payload } });

    await vehicleService.createVehicle(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/vehicle/', payload);
  });
});

// ─── updateVehicle ────────────────────────────────────────────────────────────

describe('vehicleService.updateVehicle', () => {
  it('PATCHes /vehicle/{id}/ with the provided data', async () => {
    mockedApi.patch.mockResolvedValue({ data: { id: 'v1' } });

    await vehicleService.updateVehicle('v1', { model: 'Camry' });

    expect(mockedApi.patch).toHaveBeenCalledWith('/vehicle/v1/', { model: 'Camry' });
  });
});

// ─── deleteVehicle ────────────────────────────────────────────────────────────

describe('vehicleService.deleteVehicle', () => {
  it('DELETEs /vehicle/{id}/', async () => {
    mockedApi.delete.mockResolvedValue({});

    await vehicleService.deleteVehicle('v1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/vehicle/v1/');
  });
});

// ─── updateVehicleStatus ─────────────────────────────────────────────────────

describe('vehicleService.updateVehicleStatus', () => {
  it('PATCHes /vehicle/{id}/ with only the new status', async () => {
    mockedApi.patch.mockResolvedValue({ data: { id: 'v1', status: 'LEASING' } });

    await vehicleService.updateVehicleStatus('v1', 'LEASING');

    expect(mockedApi.patch).toHaveBeenCalledWith('/vehicle/v1/', { status: 'LEASING' });
  });

  it('re-throws the error so the caller can handle it', async () => {
    const apiError = { response: { data: { detail: 'Not found' } } };
    mockedApi.patch.mockRejectedValue(apiError);

    await expect(vehicleService.updateVehicleStatus('v1', 'RENT')).rejects.toEqual(apiError);
  });
});