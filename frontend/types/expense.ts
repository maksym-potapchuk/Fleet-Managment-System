// ── Category ──

export interface ExpenseCategory {
  id: string;
  code: string | null;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  is_active: boolean;
  order: number;
}

export type SystemCategoryCode =
  | 'FUEL'
  | 'SERVICE'
  | 'PARTS'
  | 'WASHING'
  | 'FINES'
  | 'INSPECTION'
  | 'ACCESSORIES'
  | 'DOCUMENTS'
  | 'PARKING'
  | 'OTHER';

// ── Enums ──

export type FuelType = 'GASOLINE' | 'DIESEL' | 'LPG' | 'ELECTRIC';
export type WashType = 'EXTERIOR' | 'INTERIOR' | 'FULL';
export type PaymentMethod = 'CASH' | 'CASHLESS';
export type PayerType = 'COMPANY' | 'CLIENT';
export type SupplierType = 'DISASSEMBLY' | 'INDIVIDUAL' | 'SHOP';
export type ApprovalStatus = 'DRAFT' | 'SENT' | 'REVIEW' | 'APPROVED';

// ── Parts & Invoices ──

export interface ExpensePart {
  id?: string;
  name: string;
  quantity: number;
  unit_price: string;
}

export interface Invoice {
  id: string;
  number: string;
  file: string;
  vendor_name: string;
  invoice_date: string | null;
  total_amount: string | null;
  expense_count: number;
  created_at: string;
}

export interface InvoiceSearchResult {
  id: string;
  number: string;
  vendor_name: string;
  invoice_date: string | null;
  total_amount: string | null;
  expense_count: number;
}

// ── Service Items ──

export interface ServiceItem {
  id?: string;
  name: string;
  price: string;
}

// ── Expense ──

export interface Expense {
  id: string;
  vehicle: string;
  vehicle_car_number: string;
  vehicle_vin_number: string;
  // Category
  category: string;
  category_code: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  // Base
  amount: string;
  expense_date: string;
  receipt: string | null;
  // Payment & payer
  payment_method: PaymentMethod;
  payer_type: PayerType;
  expense_for: string;
  // Cost splitting
  company_amount: string | null;
  client_amount: string | null;
  client_driver: string | null;
  client_driver_name: string | null;
  approval_status: ApprovalStatus | null;
  exclude_from_cost: boolean;
  // FUEL
  fuel_types: FuelType[];
  // SERVICE
  service: number | null;
  service_name: string;
  service_items: ServiceItem[];
  // WASHING
  wash_type: WashType | '';
  // FINES
  fine_number: string;
  violation_type: string;
  fine_date: string | null;
  driver_at_time: string | null;
  // INSPECTION
  inspection_date: string | null;
  official_cost: string | null;
  additional_cost: string | null;
  next_inspection_date: string | null;
  registration_certificate: string | null;
  // PARTS
  source_name: string | null;
  supplier_type: SupplierType | null;
  parts: ExpensePart[];
  // Invoice
  invoice: string | null;
  invoice_data: Invoice | null;
  invoice_existing?: boolean;
  // Meta
  created_by: { id: string; username: string; email: string; color: string } | null;
  edited_by: { id: string; username: string; email: string; color: string } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  vehicle?: string;
  category: string;
  expense_date: string;
  receipt?: File;
  // Payment & payer
  payment_method?: PaymentMethod;
  payer_type?: PayerType;
  expense_for?: string;
  // Amounts: amount for COMPANY payer; company_amount + client_amount for CLIENT payer
  amount?: string | number;
  company_amount?: string | number;
  client_amount?: string | number;
  client_driver?: string;
  exclude_from_cost?: boolean;
  // FUEL
  fuel_types?: FuelType[];
  // SERVICE
  service?: number | string;
  service_items_json?: string;
  // WASHING
  wash_type?: WashType;
  // FINES
  fine_number?: string;
  violation_type?: string;
  fine_date?: string;
  driver_at_time?: string;
  // INSPECTION
  inspection_date?: string;
  official_cost?: string | number;
  additional_cost?: string | number;
  next_inspection_date?: string;
  // PARTS
  source_name?: string;
  supplier_type?: SupplierType;
  parts_json?: string;
  // Invoice
  invoice_number?: string;
  invoice_file?: File;
  vendor_name?: string;
  invoice_total_amount?: string;
}

export interface ExpenseFilters {
  category_code?: string;
  vehicle?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  payment_method?: string;
  payer_type?: string;
  approval_status?: string;
  search?: string;
  ordering?: string;
}

export interface PaginatedExpenseResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Expense[];
}

// ── Quick Expenses ──

export interface FuelSubEntry {
  amount: string;
  fuel_types: FuelType[];
  receipt?: File;
}

export interface QuickExpenseEntry {
  id: string;
  category: string;
  category_code: string | null;
  category_name: string;
  category_icon: string;
  category_color: string;
  amount: string;
  expense_date: string;
  // Payment & payer
  payment_method?: PaymentMethod;
  payer_type?: PayerType;
  expense_for?: string;
  // Cost splitting
  company_amount?: string;
  client_amount?: string;
  client_driver?: string;
  exclude_from_cost?: boolean;
  // FUEL
  fuel_types?: FuelType[];
  receipt?: File;
  fuel_entries?: FuelSubEntry[];
  // WASHING
  wash_type?: WashType;
  // FINES
  violation_type?: string;
  fine_number?: string;
  fine_date?: string;
  // INSPECTION
  inspection_date?: string;
  official_cost?: string;
  additional_cost?: string;
  next_inspection_date?: string;
  // SERVICE
  service?: string;
  service_items?: ServiceItem[];
  // Invoice
  invoice_number?: string;
  invoice_file?: File;
  // PARTS
  source_name?: string;
  supplier_type?: SupplierType;
  parts?: ExpensePart[];
}

// ── Expense Summary ──

export interface ExpenseCategorySummary {
  code: string | null;
  name: string;
  icon: string;
  color: string;
  total: string;
}

export interface ExpenseSummary {
  total: string;
  excluded_total: string;
  categories: ExpenseCategorySummary[];
}

export type QuickExpenseSubmissionStatus = 'pending' | 'submitting' | 'success' | 'error';

export interface QuickExpenseResult {
  entryId: string;
  status: QuickExpenseSubmissionStatus;
  error?: string;
}
