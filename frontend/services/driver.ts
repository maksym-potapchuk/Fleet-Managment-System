// API service for driver operations
import api from "@/lib/api";
import { Driver, CreateDriverData, UpdateDriverData } from "@/types/driver";

/**
 * Paginated response from Django REST Framework
 */
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Fetch all drivers from the backend
 * GET /api/driver/
 * Note: Backend uses pagination, so we extract the results array
 */
export async function getAllDrivers() {
  const response = await api.get<PaginatedResponse<Driver>>("/driver/");
  // Extract the results array from the paginated response
  return response.data.results;
}

/**
 * Fetch a single driver by ID
 * GET /api/driver/{id}/
 */
export async function getDriverById(id: string) {
  const response = await api.get<Driver>(`/driver/${id}/`);
  return response.data;
}

/**
 * Create a new driver
 * POST /api/driver/
 */
export async function createDriver(data: CreateDriverData) {
  const response = await api.post<Driver>("/driver/", data);
  return response.data;
}

/**
 * Update an existing driver
 * PUT /api/driver/{id}/
 */
export async function updateDriver(id: string, data: UpdateDriverData) {
  const response = await api.put<Driver>(`/driver/${id}/`, data);
  return response.data;
}

/**
 * Delete a driver
 * DELETE /api/driver/{id}/
 */
export async function deleteDriver(id: string) {
  await api.delete(`/driver/${id}/`);
}
