import api from '@/lib/api';
import { Vehicle, CreateVehicleData, UpdateVehicleData, VehicleFilters } from '@/types/vehicle';

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

  // Delete vehicle
  async deleteVehicle(id: string): Promise<void> {
    await api.delete(`/vehicle/${id}/`);
  },

  // Update vehicle status (for Kanban drag & drop)
  async updateVehicleStatus(id: string, status: string): Promise<Vehicle> {
    try {
      const response = await api.patch<Vehicle>(`/vehicle/${id}/`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Error updating vehicle status:', error.response?.data || error.message);
      throw error;
    }
  },
};
