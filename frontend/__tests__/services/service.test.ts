/**
 * serviceService tests
 *
 * WHY: fleet service CRUD operations must call correct endpoints and
 * properly extract paginated results.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllServices, createService, updateService, deleteService } from '@/services/service';
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

// ─── getAllServices ───────────────────────────────────────────────────────────

describe('getAllServices', () => {
  it('calls GET /fleet/services/ and extracts results', async () => {
    const services = [{ id: 1, name: 'Oil Change' }];
    mockedApi.get.mockResolvedValue({ data: { count: 1, next: null, previous: null, results: services } });

    const result = await getAllServices();

    expect(mockedApi.get).toHaveBeenCalledWith('/fleet/services/');
    expect(result).toEqual(services);
  });

  it('returns empty array when no services exist', async () => {
    mockedApi.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } });

    const result = await getAllServices();

    expect(result).toEqual([]);
  });
});

// ─── createService ───────────────────────────────────────────────────────────

describe('createService', () => {
  it('POSTs to /fleet/services/ with service data', async () => {
    const payload = { name: 'Oil Change', description: 'Regular oil change' };
    const created = { id: 1, ...payload };
    mockedApi.post.mockResolvedValue({ data: created });

    const result = await createService(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/fleet/services/', payload);
    expect(result).toEqual(created);
  });
});

// ─── updateService ───────────────────────────────────────────────────────────

describe('updateService', () => {
  it('PUTs to /fleet/services/{id}/ with updated data', async () => {
    const payload = { name: 'Brake Service', description: 'Full brake inspection' };
    mockedApi.put.mockResolvedValue({ data: { id: 5, ...payload } });

    const result = await updateService(5, payload);

    expect(mockedApi.put).toHaveBeenCalledWith('/fleet/services/5/', payload);
    expect(result.name).toBe('Brake Service');
  });
});

// ─── deleteService ───────────────────────────────────────────────────────────

describe('deleteService', () => {
  it('DELETEs /fleet/services/{id}/', async () => {
    mockedApi.delete.mockResolvedValue({});

    await deleteService(3);

    expect(mockedApi.delete).toHaveBeenCalledWith('/fleet/services/3/');
  });
});
