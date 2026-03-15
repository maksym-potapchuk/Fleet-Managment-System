import api from '@/lib/api';
import { Vehicle, VehiclePhoto, VehicleOwner, OwnerHistoryRecord, TechnicalInspection, CreateVehicleData, UpdateVehicleData, VehicleFilters, VehicleDeleteCheck, PaginatedResponse } from '@/types/vehicle';

export const vehicleService = {
  // Get all vehicles (fetches pages with concurrency limit)
  async getVehicles(filters?: VehicleFilters): Promise<Vehicle[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.manufacturer) params.append('manufacturer', filters.manufacturer);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const baseUrl = queryString ? `/vehicle/?${queryString}` : '/vehicle/';

    // Fetch first page
    const firstPage = await api.get<PaginatedResponse<Vehicle>>(baseUrl);
    const { count, results } = firstPage.data;

    if (!firstPage.data.next) return results;

    // Fetch remaining pages with concurrency limit
    const pageSize = results.length;
    const totalPages = Math.ceil(count / pageSize);
    const MAX_CONCURRENT = 5;
    const allResults = [...results];

    for (let batch = 2; batch <= totalPages; batch += MAX_CONCURRENT) {
      const end = Math.min(batch + MAX_CONCURRENT, totalPages + 1);
      const requests = [];
      for (let page = batch; page < end; page++) {
        const separator = baseUrl.includes('?') ? '&' : '?';
        requests.push(api.get<PaginatedResponse<Vehicle>>(`${baseUrl}${separator}page=${page}`));
      }
      const responses = await Promise.all(requests);
      allResults.push(...responses.flatMap(r => r.data.results));
    }

    return allResults;
  },

  // Get single vehicle by ID
  async getVehicle(id: string): Promise<Vehicle> {
    const response = await api.get<Vehicle>(`/vehicle/${id}/`);
    return response.data;
  },

  // Create new vehicle
  async createVehicle(data: CreateVehicleData): Promise<Vehicle> {
    const response = await api.post<Vehicle>('/vehicle/', data);
    return response.data;
  },

  // Update vehicle
  async updateVehicle(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    const response = await api.patch<Vehicle>(`/vehicle/${id}/`, data);
    return response.data;
  },

  // Archive vehicle (soft-delete)
  async archiveVehicle(id: string): Promise<void> {
    await api.delete(`/vehicle/${id}/`);
  },

  // Get archived vehicles (paginated, fetches all pages)
  async getArchivedVehicles(): Promise<Vehicle[]> {
    const firstPage = await api.get<PaginatedResponse<Vehicle>>('/vehicle/archive/');
    const { count, results } = firstPage.data;

    if (!firstPage.data.next) return results;

    const pageSize = results.length;
    const totalPages = Math.ceil(count / pageSize);
    const requests = [];
    for (let page = 2; page <= totalPages; page++) {
      requests.push(api.get<PaginatedResponse<Vehicle>>(`/vehicle/archive/?page=${page}`));
    }

    const responses = await Promise.all(requests);
    return [...results, ...responses.flatMap(r => r.data.results)];
  },

  // Restore vehicle from archive
  async restoreVehicle(id: string): Promise<Vehicle> {
    const response = await api.post<Vehicle>(`/vehicle/${id}/restore/`);
    return response.data;
  },

  // Check if vehicle can be permanently deleted
  async checkVehicleDelete(id: string): Promise<VehicleDeleteCheck> {
    const response = await api.get<VehicleDeleteCheck>(`/vehicle/${id}/delete-check/`);
    return response.data;
  },

  // Permanently delete vehicle (from archive only)
  async permanentlyDeleteVehicle(id: string): Promise<void> {
    await api.delete(`/vehicle/${id}/permanent-delete/?confirm=true`);
  },

  // Update vehicle status (for Kanban drag & drop)
  async updateVehicleStatus(id: string, status: string, statusPosition?: number): Promise<Vehicle> {
    try {
      const payload: Record<string, unknown> = { status };
      if (statusPosition !== undefined) payload.status_position = statusPosition;
      const response = await api.patch<Vehicle>(`/vehicle/${id}/`, payload);
      return response.data;
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: unknown } };
      console.error(
        'Error updating vehicle status:',
        axiosErr?.response?.status ?? 'no status',
        JSON.stringify(axiosErr?.response?.data) ?? (error instanceof Error ? error.message : String(error))
      );
      throw error;
    }
  },

  // Photos
  async uploadVehiclePhoto(vehicleId: string, file: File): Promise<VehiclePhoto> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<VehiclePhoto>(`/vehicle/${vehicleId}/photos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteVehiclePhoto(vehicleId: string, photoId: number): Promise<void> {
    await api.delete(`/vehicle/${vehicleId}/photos/${photoId}/`);
  },

  async setCoverPhoto(vehicleId: string, photoId: number): Promise<VehiclePhoto> {
    const response = await api.post<VehiclePhoto>(`/vehicle/${vehicleId}/photos/${photoId}/cover/`);
    return response.data;
  },

  // Current owner
  async getCurrentOwner(vehicleId: string): Promise<VehicleOwner | null> {
    const response = await api.get<VehicleOwner | null>(`/vehicle/${vehicleId}/owner/`);
    return response.data;
  },

  async assignOwner(vehicleId: string, data: { driver: string; agreement_number?: string }): Promise<VehicleOwner> {
    const response = await api.post<VehicleOwner>(`/vehicle/${vehicleId}/owner/`, data);
    return response.data;
  },

  async updateOwner(vehicleId: string, data: { agreement_number: string }): Promise<VehicleOwner> {
    const response = await api.patch<VehicleOwner>(`/vehicle/${vehicleId}/owner/`, data);
    return response.data;
  },

  async unassignOwner(vehicleId: string): Promise<void> {
    await api.delete(`/vehicle/${vehicleId}/owner/`);
  },

  // Ownership history
  async getOwnershipHistory(vehicleId: string): Promise<OwnerHistoryRecord[]> {
    const response = await api.get<OwnerHistoryRecord[] | { results: OwnerHistoryRecord[] }>(`/vehicle/${vehicleId}/owner/history/`);
    return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  },

  // Technical inspections
  async getInspections(vehicleId: string): Promise<TechnicalInspection[]> {
    const response = await api.get<TechnicalInspection[] | { results: TechnicalInspection[] }>(`/vehicle/${vehicleId}/inspections/`);
    return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  },

  async createInspection(
    vehicleId: string,
    data: { inspection_date: string; next_inspection_date?: string; notes?: string; report?: File },
  ): Promise<TechnicalInspection> {
    const formData = new FormData();
    formData.append('inspection_date', data.inspection_date);
    if (data.next_inspection_date) formData.append('next_inspection_date', data.next_inspection_date);
    if (data.notes) formData.append('notes', data.notes);
    if (data.report) formData.append('report', data.report);
    const response = await api.post<TechnicalInspection>(
      `/vehicle/${vehicleId}/inspections/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async updateInspection(
    vehicleId: string,
    inspectionId: number,
    data: { inspection_date?: string; next_inspection_date?: string; notes?: string; report?: File },
  ): Promise<TechnicalInspection> {
    const formData = new FormData();
    if (data.inspection_date) formData.append('inspection_date', data.inspection_date);
    if (data.next_inspection_date) formData.append('next_inspection_date', data.next_inspection_date);
    if (data.notes !== undefined) formData.append('notes', data.notes);
    if (data.report) formData.append('report', data.report);
    const response = await api.patch<TechnicalInspection>(
      `/vehicle/${vehicleId}/inspections/${inspectionId}/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  },

  async deleteInspection(vehicleId: string, inspectionId: number): Promise<void> {
    await api.delete(`/vehicle/${vehicleId}/inspections/${inspectionId}/`);
  },

  // Reorder vehicles (batch position update)
  async reorderVehicles(items: { id: string; status_position: number }[]): Promise<{ updated: number }> {
    const response = await api.post<{ updated: number }>('/vehicle/reorder/', items);
    return response.data;
  },
};
