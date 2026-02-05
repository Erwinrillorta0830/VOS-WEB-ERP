// src/modules/return-to-supplier/type.ts

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
  cost_per_unit?: number;
  unit_of_measurement: number | null;
  unit_of_measurement_count?: number;
  isActive: number;
  stock?: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  unit: string;
  uom_id: number;
  unitCount: number;
  stock?: number;
  rawStock?: number;
  discountType?: string;
  supplierDiscount?: number;
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

export interface LineDiscount {
  id: number;
  line_discount: string;
  percentage: string;
}

// [REV] Updated InventoryRecord to include unit info from the view
export interface InventoryRecord {
  id: string;
  product_id: number;
  branch_id: number;
  supplier_id: number;
  running_inventory: string | number;
  unit_name?: string;
  unit_count?: number;
}

export interface API_RTS_Item {
  id: number;
  rts_id: number;
  product_id:
    | {
        product_id: number;
        product_name: string;
        product_code: string;
        description: string;
        unit_of_measurement_count?: number;
      }
    | number;
  uom_id: { unit_id: number; unit_shortcut: string } | number;
  quantity: string;
  gross_unit_price: string;
  gross_amount: string;
  discount_rate: string;
  discount_amount: string;
  net_amount: string;
  item_remarks: string | null;
}

export interface RTSItem {
  id: number;
  productId: number;
  uomId: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  unitCount: number;
}

export interface ReturnItem {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
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

export interface CreateReturnItemDTO {
  product_id: number;
  uom_id: number;
  quantity: number;
  gross_unit_price: number;
  gross_amount: number;
  discount_rate: number;
  discount_amount: number;
  net_amount: number;
  item_remarks: string;
}

export interface CreateReturnDTO {
  supplier_id: number;
  branch_id: number;
  transaction_date: string;
  remarks: string;
  is_posted: number;
  rts_items: CreateReturnItemDTO[];
}
