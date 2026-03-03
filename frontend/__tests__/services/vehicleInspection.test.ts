/**
 * vehicleService – inspection methods
 *
 * WHY: Inspection CRUD uses FormData for file uploads, which is easy to
 * get wrong (missing fields, wrong Content-Type header). These tests verify
 * the correct API calls are made with proper FormData payloads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { vehicleService } from '@/services/vehicle';
import api from '@/lib/api';

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

// ─── getInspections ──────────────────────────────────────────────────────────

describe('vehicleService.getInspections', () => {
  it('calls GET /vehicle/{id}/inspections/', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    const result = await vehicleService.getInspections('v-123');

    expect(mockedApi.get).toHaveBeenCalledWith('/vehicle/v-123/inspections/');
    expect(result).toEqual([]);
  });
});

// ─── createInspection ────────────────────────────────────────────────────────

describe('vehicleService.createInspection', () => {
  it('POSTs FormData with inspection_date to /vehicle/{id}/inspections/', async () => {
    const mockInspection = { id: 1, inspection_date: '2025-06-15', expiry_date: '2026-06-15' };
    mockedApi.post.mockResolvedValue({ data: mockInspection });

    const result = await vehicleService.createInspection('v-123', {
      inspection_date: '2025-06-15',
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/vehicle/v-123/inspections/',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    expect(result).toEqual(mockInspection);
  });

  it('includes notes and report file when provided', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 2 } });
    const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });

    await vehicleService.createInspection('v-123', {
      inspection_date: '2025-06-15',
      notes: 'All good',
      report: file,
    });

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('inspection_date')).toBe('2025-06-15');
    expect(formData.get('notes')).toBe('All good');
    expect(formData.get('report')).toBe(file);
  });

  it('includes next_inspection_date in FormData when provided', async () => {
    mockedApi.post.mockResolvedValue({ data: { id: 3 } });

    await vehicleService.createInspection('v-123', {
      inspection_date: '2025-06-15',
      next_inspection_date: '2027-06-15',
    });

    const formData = mockedApi.post.mock.calls[0][1] as FormData;
    expect(formData.get('inspection_date')).toBe('2025-06-15');
    expect(formData.get('next_inspection_date')).toBe('2027-06-15');
  });
});

// ─── deleteInspection ────────────────────────────────────────────────────────

describe('vehicleService.deleteInspection', () => {
  it('DELETEs /vehicle/{id}/inspections/{inspectionId}/', async () => {
    mockedApi.delete.mockResolvedValue({});

    await vehicleService.deleteInspection('v-123', 42);

    expect(mockedApi.delete).toHaveBeenCalledWith('/vehicle/v-123/inspections/42/');
  });
});
