import api from '@/lib/api';
import { Service, CreateServiceData } from '@/types/service';

/**
 * Interface for paginated API responses from Django REST Framework
 */
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetch all services from the API
 * @returns Promise with array of services
 */
export async function getAllServices(): Promise<Service[]> {
  const response = await api.get<PaginatedResponse<Service>>('/fleet/services/');
  return response.data.results;
}

/**
 * Create a new service
 * @param data - Service data (name, description)
 * @returns Promise with the created service
 */
export async function createService(data: CreateServiceData): Promise<Service> {
  const response = await api.post<Service>('/fleet/services/', data);
  return response.data;
}

/**
 * Update an existing service
 * @param id - Service ID
 * @param data - Updated service data
 * @returns Promise with the updated service
 */
export async function updateService(id: number, data: CreateServiceData): Promise<Service> {
  const response = await api.put<Service>(`/fleet/services/${id}/`, data);
  return response.data;
}

/**
 * Delete a service
 * @param id - Service ID to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteService(id: number): Promise<void> {
  await api.delete(`/fleet/services/${id}/`);
}
