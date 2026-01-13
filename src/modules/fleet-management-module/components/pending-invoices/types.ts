export type ID = number | string;

export type PendingInvoiceStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export type PendingInvoiceRow = {
  invoice_no: string;
  invoice_date: string | null; // raw date string
  customer_code: string | null;
  customer: string;
  salesman_id: number | null;
  salesman: string;
  net_amount: number;
  dispatch_plan: string; // "unlinked" or "DP-..."
  status: PendingInvoiceStatus;
};

export type ChartData = {
  name: string;
  value: number;
  fill: string;
};

export type PendingInvoicesApiResponse = {
  data: PendingInvoiceRow[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  kpis: {
    totalPending: number;
    unlinked: number;
    forDispatch: number;
    inbound: number;
    cleared: number;
  };
  aggregations: {
    statusCounts: ChartData[];
    statusAmounts: ChartData[];
    totalAmount: number;
  };
};

export type PendingInvoiceOptions = {
  salesmen: { id: number; salesman_name: string }[];
  customers: { customer_code: string; customer_name: string }[];
};

export type PendingInvoiceLine = {
  product_id: number;
  product_name: string;
  product_code: string;
  unit: string;
  qty: number;
  price: number;
  gross: number;
  disc_type: string;
  disc_amt: number;
  net_total: number;
};

export type PendingInvoiceDetails = {
  header: {
    invoice_no: string;
    customer_name: string;
    customer_code: string;
    salesman: string;
    location: string;
    sales_type: string;
    receipt_type: string; // if you have it; otherwise "-"
    price_type: string;
    date: string | null;
    due: string | null;
    dispatch_date: string | null;
    status: PendingInvoiceStatus;
    dispatch_plan: string;
  };
  lines: PendingInvoiceLine[];
  summary: {
    discount: number;
    vatable: number;
    net: number;
    vat: number;
    total: number;
    balance: number;
  };
};
