// TypeScript interfaces matching Django Vehicle model

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

export interface Vehicle {
  id: string; // UUID
  model: string;
  manufacturer: ManufacturerChoice;
  year: number;
  cost: string; // Decimal as string
  vin_number: string;
  car_number: string;
  is_selected: boolean;
  status: VehicleStatus;
  driver: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface CreateVehicleData {
  model: string;
  manufacturer: ManufacturerChoice;
  year: number;
  cost: string | number;
  vin_number: string;
  car_number: string;
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
