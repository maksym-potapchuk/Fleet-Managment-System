// TypeScript interfaces matching Django Vehicle model

export interface VehiclePhoto {
  id: number;
  image: string; // absolute URL
  is_cover: boolean;
  uploaded_at: string;
}

export interface InspectionLinkedExpense {
  id: string;
  amount: string;
  official_cost: string;
  additional_cost: string;
  payment_method: 'CASH' | 'CASHLESS';
  receipt: string | null;
  registration_certificate: string | null;
  invoice_number: string | null;
  invoice_file: string | null;
  expense_date: string;
}

export interface TechnicalInspection {
  id: number;
  inspection_date: string;
  next_inspection_date: string;
  expiry_date: string;
  report: string | null;
  notes: string;
  created_at: string;
  linked_expense: InspectionLinkedExpense | null;
}

export type VehicleStatus =
  | 'AUCTION'
  | 'FOCUS'
  | 'GAS_INSTALL'
  | 'SERVICE'
  | 'CLEANING'
  | 'PRE_DELIVERY'
  | 'READY'
  | 'RENT'
  | 'LEASING'
  | 'SELLING'
  | 'SOLD';

export type ManufacturerChoice =
  | 'Toyota'
  | 'Ford'
  | 'Honda'
  | 'Chevrolet'
  | 'BMW'
  | 'Lexus'
  | 'Audi'
  | 'Tesla';

export type FuelType = 'GASOLINE' | 'DIESEL' | 'LPG' | 'LPG_GASOLINE' | 'ELECTRIC' | 'HYBRID' | 'GAS_GASOLINE_HYBRID';

export interface Vehicle {
  id: string; // UUID
  model: string;
  manufacturer: ManufacturerChoice;
  year: number | null;
  cost: string; // Decimal as string
  vin_number: string;
  car_number: string | null;
  is_temporary_plate: boolean;
  color: string;
  fuel_type: FuelType | null;
  initial_km: number;
  distance_unit: 'km' | 'mi';
  is_selected: boolean;
  status: VehicleStatus;
  status_position: number;
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
    current_owner: number;
    ownership_history: number;
    photos: number;
    inspections: number;
    service_history: number;
    regulations: number;
    service_plans: number;
    equipment: number;
    mileage_logs: number;
    expenses: number;
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
  year: number | null;
  cost: string | number;
  vin_number: string;
  car_number?: string;
  is_temporary_plate?: boolean;
  color: string;
  fuel_type: FuelType | null;
  initial_km: number;
  distance_unit?: 'km' | 'mi';
  status?: VehicleStatus;
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

export interface VehicleFilters {
  status?: VehicleStatus;
  manufacturer?: ManufacturerChoice;
  year?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
