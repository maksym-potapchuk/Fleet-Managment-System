import api from '@/lib/api';
import { Vehicle, VehiclePhoto, VehicleOwnerHistory, TechnicalInspection, CreateVehicleData, UpdateVehicleData, VehicleFilters, VehicleDeleteCheck } from '@/types/vehicle';

export const vehicleService = {
  // Get all vehicles
  async getVehicles(filters?: VehicleFilters): Promise<Vehicle[]> {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.manufacturer) params.append('manufacturer', filters.manufacturer);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `/vehicle/?${queryString}` : '/vehicle/';

    const response = await api.get<Vehicle[]>(url);
    return response.data;
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

  // Get archived vehicles
  async getArchivedVehicles(): Promise<Vehicle[]> {
    const response = await api.get<Vehicle[]>('/vehicle/archive/');
    return response.data;
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
  async updateVehicleStatus(id: string, status: string): Promise<Vehicle> {
    try {
      const response = await api.patch<Vehicle>(`/vehicle/${id}/`, { status });
      return response.data;
    } catch (error: unknown) {
      const logDetail =
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { data?: unknown } }).response?.data;
      console.error(
        'Error updating vehicle status:',
        logDetail ?? (error instanceof Error ? error.message : String(error))
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

  // Owner history
  async getOwnerHistory(vehicleId: string): Promise<VehicleOwnerHistory[]> {
    const response = await api.get<VehicleOwnerHistory[] | { results: VehicleOwnerHistory[] }>(`/vehicle/${vehicleId}/owner-history/`);
    return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
  },

  async addOwner(vehicleId: string, data: { driver: string; agreement_number?: string }): Promise<VehicleOwnerHistory> {
    const response = await api.post<VehicleOwnerHistory>(`/vehicle/${vehicleId}/owner-history/`, data);
    return response.data;
  },

  async closeOwnership(vehicleId: string, historyId: number): Promise<VehicleOwnerHistory> {
    const response = await api.patch<VehicleOwnerHistory>(
      `/vehicle/${vehicleId}/owner-history/${historyId}/`,
      { released_at: new Date().toISOString() },
    );
    return response.data;
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
};
