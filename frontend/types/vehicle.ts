// TypeScript interfaces matching Django Vehicle model

export interface VehiclePhoto {
  id: number;
  image: string; // absolute URL
  uploaded_at: string;
}

export interface VehicleOwnerHistory {
  id: number;
  driver: {
    id: string;
    first_name: string;
    last_name: string;
  };
  agreement_number: string;
  acquired_at: string;
  released_at: string | null;
}

export interface TechnicalInspection {
  id: number;
  inspection_date: string;
  next_inspection_date: string;
  expiry_date: string;
  report: string | null;
  notes: string;
  created_at: string;
}

export type VehicleStatus =
  | 'CTO'
  | 'FOCUS'
  | 'CLEANING'
  | 'PREPARATION'
  | 'READY'
  | 'LEASING'
  | 'RENT'
  | 'SELLING'
  | 'SOLD';

export type ManufacturerChoice =
  | 'Toyota'
  | 'Ford'
  | 'Honda'
  | 'Chevrolet'
  | 'BMW'
  | 'Lexus'
  | 'Audi';

export type FuelType = 'GASOLINE' | 'DIESEL' | 'LPG' | 'LPG_GASOLINE' | 'ELECTRIC' | 'HYBRID';

export interface Vehicle {
  id: string; // UUID
  model: string;
  manufacturer: ManufacturerChoice;
  year: number;
  cost: string; // Decimal as string
  vin_number: string;
  car_number: string;
  color: string;
  fuel_type: FuelType;
  initial_km: number;
  is_selected: boolean;
  status: VehicleStatus;
  driver: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  photos: VehiclePhoto[];
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  days_until_inspection: number | null;
  equipment_total: number;
  equipment_equipped: number;
  regulation_overdue: number;
  has_regulation: boolean;
  expenses_total: string;
  total_cost: string;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface VehicleDeleteCheck {
  has_related_data: boolean;
  related_counts: {
    owner_history: number;
    driver_history: number;
    photos: number;
    inspections: number;
    service_history: number;
    regulations: number;
    service_plans: number;
    equipment: number;
    mileage_logs: number;
  };
}

export interface MileageLog {
  id: number;
  km: number;
  recorded_at: string;
  created_by: number | null;
  created_at: string;
}

export interface CreateVehicleData {
  model: string;
  manufacturer: ManufacturerChoice;
  year: number;
  cost: string | number;
  vin_number: string;
  car_number: string;
  color: string;
  fuel_type: FuelType;
  initial_km: number;
  status?: VehicleStatus;
  driver?: string | null; // driver ID
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VehicleFilters {
  status?: VehicleStatus;
  manufacturer?: ManufacturerChoice;
  year?: number;
  search?: string;
}
