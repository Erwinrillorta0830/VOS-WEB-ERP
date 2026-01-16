export interface SalesReturnItem {
  code: string;
  description: string;
  unit: string | number;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  discountType: string | null;
  discountAmount: number;
  totalAmount: number;
  reason?: string;
  returnType?: string;
}

export interface SalesReturn {
  invoiceNo: string;
  orderNo: string;
  salesman: string;
  salesmanCode: string;
  customer: string;
  customerCode: string;
  branch: string;
  returnDate: string;
  totalAmount: number;
  status: "Pending" | "Received";
  remarks: string;
  items: SalesReturnItem[];
}