import { SalesReturn, SalesReturnItem } from "../types";

const API_BASE = "/api/items";

export const SalesReturnProvider = {
  // ✅ UPDATED: Added 'search' parameter
  async getInvoices(page: number = 1, limit: number = 10, search: string = ""): Promise<{ data: SalesReturn[], total: number }> {
    try {
      // Base URL with pagination and sorting
      let url = `${API_BASE}/sales_invoice?page=${page}&limit=${limit}&meta=filter_count&sort=-invoice_date`;

      // ✅ LOGIC: If search exists, add filters for Invoice OR Customer
      if (search) {
        const term = encodeURIComponent(search);
        // This syntax means: (invoice_no contains term) OR (customer_code contains term)
        url += `&filter[_or][0][invoice_no][_contains]=${term}`;
        url += `&filter[_or][1][customer_code][_contains]=${term}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();

      const mappedData = (result.data || []).map((item: any) => ({
        invoiceNo: item.invoice_no,
        orderNo: item.order_id,
        salesman: `Salesman #${item.salesman_id}`,
        salesmanCode: item.salesman_id?.toString(),
        customer: item.customer_code,
        customerCode: item.customer_code,
        branch: `Branch ${item.branch_id}`,
        returnDate: item.invoice_date ? new Date(item.invoice_date).toLocaleDateString() : "N/A",
        totalAmount: parseFloat(item.total_amount) || 0,
        status: item.payment_status === "Unpaid" ? "Pending" : "Received",
        remarks: item.remarks || "",
        items: [],
      }));

      return {
        data: mappedData,
        total: result.meta?.filter_count || 0 
      };

    } catch (error) {
      console.error("Provider Error (getInvoices):", error);
      throw error;
    }
  },

  // ... (Keep existing getInvoiceDetails and submitReturn) ...
  async getInvoiceDetails(invoiceNo: string | number): Promise<SalesReturnItem[]> {
      // (Your existing code here)
      const response = await fetch(`${API_BASE}/sales_invoice_details?filter[invoice_no][_eq]=${invoiceNo}`);
      const result = await response.json();
      return (result.data || []).map((detail: any) => ({
          code: detail.product_id?.toString(),
          description: `Product ${detail.product_id}`,
          unit: detail.unit,
          quantity: detail.quantity,
          unitPrice: detail.unit_price,
          grossAmount: detail.gross_amount,
          discountType: detail.discount_type,
          discountAmount: detail.discount_amount,
          totalAmount: detail.total_amount,
          reason: "N/A",
          returnType: "Good Order"
      }));
  },

  async submitReturn(payload: SalesReturn) {
      // (Your existing submit code here)
      return {}; 
  }
};