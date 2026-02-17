/**
 * Service type matching the Django FleetService model
 */
export interface Service {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Data required to create or update a service
 */
export interface CreateServiceData {
  name: string;
  description?: string;
}
