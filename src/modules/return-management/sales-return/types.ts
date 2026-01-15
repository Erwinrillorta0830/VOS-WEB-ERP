// modules/sales-return/types.ts

// ✅ 1. Return Item (The rows in your blue table)
// Updated to match the specific strings used in your UI Select components
export interface ReturnItem {
  code: string;           // Matches "item.code" in your table
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  
  // These specific string unions match your SelectItem values
  discountType: 'No Discount' | 'Fixed'; 
  discountAmount: number;
  
  totalAmount: number;
  reason: string;
  
  // Matches "Bad Order" | "Expired" in your SelectItem
  returnType: 'Bad Order' | 'Expired'; 
}

// ✅ 2. Sales Return (The Main Form Data)
// This combines your header info, items, and footer totals into one object
export interface SalesReturn {
  id?: string;            // Optional, as a NEW return won't have an ID yet
  returnNo: string;       // e.g., "NEW" or "SR-001"
  status: 'Draft' | 'Pending' | 'Received';
  returnDate: string;     // Keeping as string (YYYY-MM-DD) makes it easier for Input type="date"
  
  // Header Information
  salesman: string;
  salesmanCode: string;   // Required by UI
  customer: string;
  customerCode: string;   // Required by UI
  branch: string;         // Required by UI
  thirdParty: boolean;

  // The list of products
  items: ReturnItem[];

  // Footer / Financials
  orderNo: string;
  invoiceNo: string;
  remarks: string;
  totalAmount: number;
}

// ✅ 3. Product (Reference data for the Modal)
// Use this when selecting products from the database
export interface Product {
  code: string;
  description: string;
  unit: string;
  unitPrice: number;
  category?: string;
}

// ✅ 4. (Optional) Form Values
// If you use React Hook Form later, you can use this, 
// but for now, your component is using the 'SalesReturn' interface directly.
export interface SalesReturnFormValues {
  salesmanId: string;
  customerId: string;
  returnDate: Date;
  items: ReturnItem[];
}