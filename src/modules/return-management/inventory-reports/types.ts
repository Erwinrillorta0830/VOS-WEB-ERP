export interface Branch {
  id: number;
  branch_name: string;
}

export interface Product {
  product_id: number;
  product_name: string;
  product_code: string;
  unit_of_measurement: number;
  unit_of_measurement_count: number;
  product_category: number;
  parent_id: number | null; // Crucial for grouping
}

export interface Category {
  category_id: number;
  category_name: string;
}

export interface Unit {
  unit_id: number;
  unit_name: string;
}

export interface Supplier {
  id: number;
  supplier_name: string;
}

// --- NEW: Sub-structure for the "Stacked" data ---
export interface InventoryVariant {
  unit: string;
  unitCount: number; // e.g. 1 (Piece), 50 (Box)
  lastCutoff: string;
  lastCount: number;
  movement: number;
  onHand: number;
}

export interface InventoryRow {
  id: string; 
  supplierName: string;
  branchName: string;
  code: string;
  productName: string;
  categoryName: string;
  // Instead of flat numbers, we now have a list of variants
  variants: InventoryVariant[]; 
}

export interface ChartData {
  name: string;
  value: number;
  fill: string;
}

export interface InventoryApiResponse {
  data: InventoryRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  aggregations: {
    byBranch: ChartData[];
    byCategory: ChartData[];
  };
}