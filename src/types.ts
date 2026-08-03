export interface Product {
  id: string;
  category: string;
  flavor: string;
  unitWeight: number; // in kg
  realCartonWeight?: number; // actual weight of full carton
  defaultStock: number; // in packs/cartons
}

export interface Driver {
  name: string;
  vehicle: string; // e.g. "نیسان", "پیکان وانت", "پراید وانت"
  capacity?: number; // in kg (optional / deprecated)
  color?: string; // Hex color preset or code
}

export interface InvoiceRun {
  id: string; // unique invoice id
  driverName: string;
  round: number; // 1, 2, 3
  customerName: string;
  destinationLocation: string;
  quantities: { [productId: string]: number }; // productId -> quantity loaded
  isActive?: boolean; // toggle to include/exclude from calculations and inventory deductions
  description?: string; // description or notes for the invoice run
  shippingAgency?: string; // cargo / shipping agency field
}

export interface DailyPlan {
  date: string; // "YYYY-MM-DD" or Solar Hijri "YYYY/MM/DD"
  invoices: InvoiceRun[];
  manualStockOverrides: { [productId: string]: number }; // productId -> stock quantity
  driverSearchSlots?: string[];
}

export interface CategorySummary {
  category: string;
  totalOutflowWeight: number;
  totalOutflowPacks: number;
}
