// TypeScript interface that matches your Django Driver model
export interface Driver {
  id: string; // UUID from backend
  first_name: string;
  last_name: string;
  phone_number: string; // Must start with 48, 10-15 digits
  has_vehicle: boolean; // Read-only, managed by backend
  is_active_driver: boolean; // Read-only, managed by backend
  last_active_at: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// Data needed to create a new driver (only editable fields)
export interface CreateDriverData {
  first_name: string;
  last_name: string;
  phone_number: string;
}

// Data needed to update a driver (same as create in this case)
export interface UpdateDriverData extends CreateDriverData {}
