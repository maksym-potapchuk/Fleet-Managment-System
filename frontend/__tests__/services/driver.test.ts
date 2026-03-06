/**
 * driverService tests
 *
 * WHY: driver CRUD operations must call correct endpoints and
 * properly extract paginated results.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllDrivers, getDriverById, createDriver, updateDriver, deleteDriver } from '@/services/driver';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getAllDrivers ────────────────────────────────────────────────────────────

describe('getAllDrivers', () => {
  it('calls GET /driver/ and extracts results from paginated response', async () => {
    const drivers = [{ id: 'd1', first_name: 'Jan', last_name: 'Kowalski' }];
    mockedApi.get.mockResolvedValue({ data: { count: 1, next: null, previous: null, results: drivers } });

    const result = await getAllDrivers();

    expect(mockedApi.get).toHaveBeenCalledWith('/driver/');
    expect(result).toEqual(drivers);
  });

  it('returns empty array when no drivers exist', async () => {
    mockedApi.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });

    const result = await getAllDrivers();

    expect(result).toEqual([]);
  });
});

// ─── getDriverById ───────────────────────────────────────────────────────────

describe('getDriverById', () => {
  it('calls GET /driver/{id}/ and returns driver data', async () => {
    const driver = { id: 'd1', first_name: 'Jan' };
    mockedApi.get.mockResolvedValue({ data: driver });

    const result = await getDriverById('d1');

    expect(mockedApi.get).toHaveBeenCalledWith('/driver/d1/');
    expect(result).toEqual(driver);
  });
});

// ─── createDriver ────────────────────────────────────────────────────────────

describe('createDriver', () => {
  it('POSTs to /driver/ with driver data', async () => {
    const payload = { first_name: 'Jan', last_name: 'Kowalski', phone_number: '48123456789' };
    const created = { id: 'd1', ...payload };
    mockedApi.post.mockResolvedValue({ data: created });

    const result = await createDriver(payload as Parameters<typeof createDriver>[0]);

    expect(mockedApi.post).toHaveBeenCalledWith('/driver/', payload);
    expect(result).toEqual(created);
  });
});

// ─── updateDriver ────────────────────────────────────────────────────────────

describe('updateDriver', () => {
  it('PUTs to /driver/{id}/ with updated data', async () => {
    const payload = { first_name: 'Adam' };
    mockedApi.put.mockResolvedValue({ data: { id: 'd1', ...payload } });

    const result = await updateDriver('d1', payload as Parameters<typeof updateDriver>[1]);

    expect(mockedApi.put).toHaveBeenCalledWith('/driver/d1/', payload);
    expect(result.first_name).toBe('Adam');
  });
});

// ─── deleteDriver ────────────────────────────────────────────────────────────

describe('deleteDriver', () => {
  it('DELETEs /driver/{id}/', async () => {
    mockedApi.delete.mockResolvedValue({});

    await deleteDriver('d1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/driver/d1/');
  });
});
