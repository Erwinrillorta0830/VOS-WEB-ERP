// types.ts

export interface API_Unit {
  unit_id: number;
  unit_name: string;
  unit_shortcut: string;
  order: number;
}

export interface API_Product {
  product_id: number;
  product_name: string;
  product_code: string;
  barcode: string | null;
  description: string;
  price_per_unit: number | null;
  priceA: number | null;
  standard_price?: number; 
  unit_of_measurement: number | null;
  isActive: number;
  stock?: number;
}

// [UPDATED] Added uom_id so we can save it to the database
export interface Product {
  id: string;      
  code: string;    
  name: string;
  price: number;
  unit: string;    
  uom_id: number; // <--- Critical for rts_items table
}

export interface CartItem extends Product {
  quantity: number;
  onHand: number;
  discount: number;
  customPrice?: number;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  supplier_shortcut?: string;
  isActive: number;
}

export interface Branch {
  id: number;
  branch_name: string;
  branch_code: string;
  isActive: number;
}

export interface ProductSupplier {
  id: number;
  supplier_id: number;
  product_id: number;
  discount_type?: number; 
}

export interface DiscountType {
  id: number;
  discount_type: string;
}

export interface LineDiscount {
  id: number;
  line_discount: string;
  percentage: string;
}

// [NEW] Matches your rts_items database table exactly
export interface ReturnItemDB {
  id?: number;
  rts_id?: number;
  product_id: number;
  uom_id: number;
  quantity: number;
  gross_unit_price: number;
  gross_amount: number;
  discount_rate: number;
  discount_amount: number;
  net_amount: number;
  item_remarks?: string;
}

export interface API_ReturnToSupplier {
  id: number;
  doc_no: string;
  supplier_id: number | { id: number; supplier_name: string }; 
  branch_id: number | { id: number; branch_name: string };     
  transaction_date: string; 
  total_net_amount: string; 
  remarks: string;
  is_posted: number; 
  date_created: string;
}

export interface ReturnToSupplier {
  id: string;
  returnNo: string;
  supplier: string;
  branch: string;
  returnDate: string;
  totalAmount: number;
  status: "Pending" | "Posted";
  remarks: string;
}