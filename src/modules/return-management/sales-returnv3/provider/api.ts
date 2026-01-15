// src/modules/sales-returnv3/provider/api.ts
import { 
  SalesReturn, 
  SalesReturnItem, 
  Brand, 
  Category, 
  Supplier, 
  Unit, 
  Product,
  ProductSupplierConnection,
  API_DiscountType,
  API_LineDiscount,
  API_SalesReturnType,
  API_SalesReturnDetail,
  SalesReturnStatusCard
} from "../type";

const API_BASE = "/api/items"; 

// --- HELPER: Get Auth Headers ---
const getHeaders = () => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem("token") || 
                  localStorage.getItem("access_token") || 
                  sessionStorage.getItem("token");
    
    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

// --- HELPER: Parse Buffer to Boolean ---
const parseBoolean = (val: any): boolean => {
  if (typeof val === 'number') return val === 1;
  if (val && val.type === 'Buffer' && Array.isArray(val.data)) {
    return val.data[0] === 1;
  }
  return false;
};

// --- HELPER: Format Date to YYYY-MM-DD ---
const formatDateForAPI = (dateString: string | Date) => {
    try {
        if (!dateString) return new Date().toISOString().split('T')[0];
        return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
};

// --- HELPER: Clean IDs ---
const cleanId = (id: any) => {
    if (id === null || id === undefined || id === "") return null;
    const num = Number(id);
    return isNaN(num) ? id : num; 
};

// =========================================================
// EXPORTED LOCAL INTERFACES
// =========================================================
export interface SalesmanOption {
  id: string | number;
  name: string;
  code: string;
  priceType: string;
  branchId: string | number;
}

export interface CustomerOption {
  id: string | number;
  name: string;
  code: string;
}

export interface BranchOption {
  id: string | number;
  name: string;
}

// =========================================================
// MAIN PROVIDER
// =========================================================
export const SalesReturnProvider = {

  // =========================================================
  // 🟢 SECTION 1: SALES RETURN HISTORY
  // =========================================================
  async getReturns(
    page: number = 1, 
    limit: number = 10, 
    search: string = "",
    filters: { salesman?: string; customer?: string; status?: string } = {}
  ): Promise<{ data: SalesReturn[], total: number }> {
    try {
      // 🟢 Added 'return_number' explicitly
      const allowedFields = "return_id,return_number,invoice_no,customer_code,salesman_id,total_amount,status,return_date,remarks";
      let url = `${API_BASE}/sales_return?page=${page}&limit=${limit}&meta=filter_count&fields=${allowedFields}&sort=-return_id`;
      
      if (search) {
        const term = encodeURIComponent(search);
        url += `&filter[_or][0][return_number][_contains]=${term}`;
        url += `&filter[_or][1][invoice_no][_contains]=${term}`;
        url += `&filter[_or][2][customer_code][_contains]=${term}`;
      }
      if (filters.salesman && filters.salesman !== "All") {
        url += `&filter[salesman_id][_eq]=${filters.salesman}`;
      }
      if (filters.customer && filters.customer !== "All") {
        url += `&filter[customer_code][_eq]=${encodeURIComponent(filters.customer)}`;
      }
      if (filters.status && filters.status !== "All") {
        url += `&filter[status][_eq]=${filters.status}`;
      }

      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) return { data: [], total: 0 };
      
      const result = await response.json();
      const mappedData: SalesReturn[] = (result.data || []).map((item: any) => ({
        id: item.return_id,
        returnNo: item.return_number, // This captures SR-952
        invoiceNo: item.invoice_no,
        customerCode: item.customer_code,
        salesmanId: item.salesman_id,
        returnDate: item.return_date ? new Date(item.return_date).toLocaleDateString() : "N/A",
        totalAmount: parseFloat(item.total_amount) || 0,
        status: item.status || "Pending",
        remarks: item.remarks
      }));
      return { data: mappedData, total: result.meta?.filter_count || 0 };
    } catch (error) {
      console.error("Provider Error (getReturns):", error);
      throw error;
    }
  },

  // =========================================================
  // 🟠 SECTION 2: LIST PAGE FILTERS
  // =========================================================
  async getSalesmenList(): Promise<{ value: string; label: string; code: string; branch: string }[]> {
    try {
      const [salesmanRes, branchRes] = await Promise.all([
        fetch(`${API_BASE}/salesman?limit=-1&fields=id,salesman_name,salesman_code,branch_code`, { headers: getHeaders() }),
        fetch(`${API_BASE}/branches?limit=-1&fields=id,branch_name`, { headers: getHeaders() })
      ]);

      if (!salesmanRes.ok || !branchRes.ok) return [];

      const salesmenData = (await salesmanRes.json()).data || [];
      const branchesData = (await branchRes.json()).data || [];

      return salesmenData.map((item: any) => {
        const matchedBranch = branchesData.find((b: any) => b.id === item.branch_code);
        return {
          value: item.id.toString(),
          label: item.salesman_name,
          code: item.salesman_code || "N/A", 
          branch: matchedBranch ? matchedBranch.branch_name : "N/A"
        };
      });
    } catch (error) { 
      return []; 
    }
  },

  async getCustomersList(): Promise<{ value: string; label: string }[]> {
    try {
      // We only fetch fields needed for the dropdown
      const fields = "id,customer_code,customer_name";
      const response = await fetch(`${API_BASE}/customer?limit=-1&fields=${fields}`, { headers: getHeaders() });
      
      if (!response.ok) return [];
      const result = await response.json();
      
      return (result.data || []).map((item: any) => ({
        value: item.customer_code, // Kept as code because getReturns filters by customer_code
        label: item.customer_name  
      }));
    } catch (error) { 
      console.error("Error fetching customers list:", error);
      return []; 
    }
  },

  // =========================================================
  // 🟢 SECTION 3: FORM DATA FETCHERS
  // =========================================================
  async getFormSalesmen(): Promise<SalesmanOption[]> {
    try {
      const fields = "id,salesman_name,salesman_code,price_type,branch_code";
      const response = await fetch(`${API_BASE}/salesman?limit=-1&fields=${fields}`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        name: item.salesman_name,
        code: item.salesman_code,
        priceType: item.price_type || "A",
        branchId: item.branch_code 
      }));
    } catch (error) { return []; }
  },

  async getFormCustomers(): Promise<CustomerOption[]> {
    try {
      const fields = "id,store_name,customer_name,customer_code";
      const response = await fetch(`${API_BASE}/customer?limit=-1&fields=${fields}`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        // Prioritize customer_name
        name: item.customer_name || item.store_name, 
        code: item.customer_code
      }));
    } catch (error) { return []; }
  },

  async getFormBranches(): Promise<BranchOption[]> {
    try {
      const fields = "id,branch_name";
      const response = await fetch(`${API_BASE}/branches?limit=-1&fields=${fields}`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        name: item.branch_name
      }));
    } catch (error) { return []; }
  },


  async getInvoiceReturnList(): Promise<InvoiceOption[]> {
    try {
      const response = await fetch(`${API_BASE}/sales_invoice_sales_return?limit=-1`, { 
        headers: getHeaders() 
      });

      if (!response.ok) return [];
      
      const result = await response.json();
      const rawData = result.data || [];

      // Remove Duplicates logic
      const uniqueInvoices = new Map();
      rawData.forEach((item: any) => {
        if (item.invoice_no && !uniqueInvoices.has(item.invoice_no)) {
          uniqueInvoices.set(item.invoice_no, {
            id: item.id,
            invoice_no: item.invoice_no.toString()
          });
        }
      });

      return Array.from(uniqueInvoices.values());
    } catch (error) {
      console.error("Error fetching invoice list:", error);
      return [];
    }
  },

  // =========================================================
  // 🔵 SECTION 4: INVOICE FETCHING
  // =========================================================
  async getInvoices(page: number = 1, limit: number = 10, search: string = ""): Promise<{ data: SalesReturn[], total: number }> {
    try {
      let url = `${API_BASE}/sales_invoice?page=${page}&limit=${limit}&meta=filter_count&sort=-invoice_date`;
      if (search) {
        const term = encodeURIComponent(search);
        url += `&filter[_or][0][invoice_no][_contains]=${term}`;
        url += `&filter[_or][1][customer_code][_contains]=${term}`;
      }
      const response = await fetch(url, { headers: getHeaders() });
      const result = await response.json();
      const mappedData = (result.data || []).map((item: any) => ({
        invoiceNo: item.invoice_no,
        orderNo: item.order_id,
        salesman: `Salesman #${item.salesman_id}`,
        salesmanCode: item.salesman_id?.toString(),
        customer: item.customer_code,
        customerCode: item.customer_code,
        returnDate: item.invoice_date ? new Date(item.invoice_date).toLocaleDateString() : "N/A",
        totalAmount: parseFloat(item.total_amount) || 0,
        status: item.payment_status === "Unpaid" ? "Pending" : "Received",
        items: [],
      }));
      return { data: mappedData, total: result.meta?.filter_count || 0 };
    } catch (error) { throw error; }
  },

  // =========================================================
  // 🔴 SECTION 5: ACTIONS (SUBMIT) - FIXED FOR SHORT IDs
  // =========================================================
  // ... inside api.ts ...

  // ... inside SalesReturnProvider ...

  // ... inside SalesReturnProvider object ...

 
// ... inside SalesReturnProvider ...

  async submitReturn(payload: any): Promise<any> {
    try {
      console.log("🚀 Starting Sales Return Submission...");

      // --- 1. PREPARE & VALIDATE DATA ---
      const totalGross = payload.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      const totalDiscount = payload.items.reduce((sum: number, item: any) => sum + Number(item.discountAmount || 0), 0);
      const formattedDate = formatDateForAPI(payload.returnDate);
      
      const returnTypes = await SalesReturnProvider.getSalesReturnTypes(); 

      // --- 2. GENERATE SAFER RETURN NO (Limit to ~12 chars) ---
      // Old way: SR-1767764844826 (Too long!)
      // New way: SR-1024-582 (Short & Unique)
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000); // 4 digits
      const shortTimestamp = Math.floor(Date.now() / 1000).toString().slice(-4); // Last 4 digits of timestamp
      const generatedReturnNo = `SR-${shortTimestamp}-${uniqueSuffix}`;

      console.log(`📝 Step 1: Creating Header [${generatedReturnNo}]`);

      // 🟢 VALIDATION: Ensure IDs are valid
      const cleanSalesmanId = cleanId(payload.salesmanId);
      if (!cleanSalesmanId) throw new Error("Salesman is required.");
      
      const cleanCustomerCode = payload.customer || payload.customerCode;
      if (!cleanCustomerCode) throw new Error("Customer is required.");

      let createdBy = 205; 
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem("user_id") || localStorage.getItem("userId");
          if (stored) createdBy = Number(stored);
      }

      // --- 3. SUBMIT HEADER ---
      const headerPayload = {
        return_number: generatedReturnNo, 
        gross_amount: totalGross,
        discount_amount: totalDiscount,
        created_by: createdBy,
        invoice_no: payload.invoiceNo || "", // Ensure string, not undefined
        customer_code: cleanCustomerCode,
        salesman_id: cleanSalesmanId, 
        total_amount: payload.totalAmount,
        status: "Pending",
        return_date: formattedDate,
        price_type: payload.priceType || "A",
        remarks: payload.remarks || "Created via Web App"
      };

      console.log("📤 Sending Payload:", JSON.stringify(headerPayload, null, 2));

      const headerResponse = await fetch(`${API_BASE}/sales_return`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(headerPayload),
      });

      if (!headerResponse.ok) {
        // 🟢 DEBUG: Get the EXACT text response from the server
        const errText = await headerResponse.text();
        console.error("❌ SERVER ERROR RESPONSE:", errText);
        
        let errMsg = headerResponse.statusText;
        try {
            const jsonErr = JSON.parse(errText);
            // Try to find the specific message in common API error formats
            errMsg = jsonErr.message || jsonErr.error?.message || jsonErr.errors?.[0]?.message || errText;
        } catch (e) {
            errMsg = errText; // Fallback to raw text if not JSON
        }
        
        throw new Error(`Header Creation Failed (${headerResponse.status}): ${errMsg}`);
      }
      
      const headerResult = await headerResponse.json();
      // Use the confirmed ID from server if available, otherwise use ours
      const finalReturnNo = headerResult.data?.return_number || generatedReturnNo;
      console.log(`✅ Step 1 Success: Header Saved as [${finalReturnNo}]`);

      // --- 4. SUBMIT DETAILS ---
      console.log("📝 Step 2: Saving Details...");

      const detailPromises = payload.items.map(async (item: any, index: number) => {
          const matchedType = returnTypes.find(t => t.type_name === item.returnType);
          const typeId = matchedType ? matchedType.type_id : (returnTypes[0]?.type_id || 1);

          const rawProdId = item.productId || item.product_id || item.id;
          
          const detailPayload = {
            return_no: finalReturnNo,
            product_id: Number(rawProdId),
            quantity: Number(item.quantity),
            unit_price: Number(item.unitPrice),
            gross_amount: Number(item.quantity) * Number(item.unitPrice),
            discount_amount: Number(item.discountAmount || 0),
            total_amount: (Number(item.quantity) * Number(item.unitPrice)) - Number(item.discountAmount || 0),
            sales_return_type_id: typeId,
            discount_type: (item.discountType && item.discountType !== "") ? Number(item.discountType) : null,
            reason: item.reason || null,
          };

          const res = await fetch(`${API_BASE}/sales_return_details`, {
             method: "POST", headers: getHeaders(), body: JSON.stringify(detailPayload)
          });
          
          if (!res.ok) {
             const errText = await res.text();
             console.error(`❌ Item ${index + 1} Failed:`, errText);
             return { ok: false };
          }
          return { ok: true };
      });

      const results = await Promise.all(detailPromises);
      const failed = results.filter((r: any) => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length} items failed to save. Check console for details.`);

      return headerResult;

    } catch (error: any) {
      console.error("Submit Error:", error);
      throw error; // Pass the error up to the UI
    }
  },
  // =========================================================
  // 🟢 SECTION 6: LOOKUPS
  // =========================================================
  async getBrands(): Promise<Brand[]> {
    try {
      const response = await fetch(`${API_BASE}/brand?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(`${API_BASE}/categories?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch(`${API_BASE}/suppliers?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getUnits(): Promise<Unit[]> {
    try {
      const response = await fetch(`${API_BASE}/units?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },
  
  async getProductSupplierConnections(): Promise<ProductSupplierConnection[]> {
    try {
      const response = await fetch(`${API_BASE}/product_per_supplier?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return (result.data || []).map((item: any) => ({
        id: item.id,
        supplier_id: item.supplier_id,
        product_id: typeof item.product_id === 'object' ? item.product_id.product_id : item.product_id
      }));
    } catch (error) { return []; }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const url = `${API_BASE}/products?limit=-1`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getDiscountTypes(): Promise<API_DiscountType[]> {
    try {
      const response = await fetch(`${API_BASE}/discount_type?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getLineDiscounts(): Promise<API_LineDiscount[]> {
    try {
      const response = await fetch(`${API_BASE}/line_discount?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  async getSalesReturnTypes(): Promise<API_SalesReturnType[]> {
    try {
      const response = await fetch(`${API_BASE}/sales_return_type?limit=-1`, { headers: getHeaders() });
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  },

  // =========================================================
  // 🟢 CRITICAL SECTION: PRODUCT SUMMARY FETCH (FIXED FOR TRUNCATED DATA)
  // =========================================================
  // ... inside SalesReturnProvider ...
// ... inside SalesReturnProvider ...

 // ... inside SalesReturnProvider ...

  // 🟢 CRITICAL FIX: Fetch correct tables and return IDs for dropdowns
  async getProductsSummary(id: string | number, returnString?: string): Promise<SalesReturnItem[]> {
    try {
      console.log(`🔍 [API] Smart Hunting for: ${returnString}`);

      if (!returnString) return [];

      const filters = [];
      let orIndex = 0;
      
      // 1. Try Full String (SR-12345)
      filters.push(`filter[_or][${orIndex}][return_no][_eq]=${encodeURIComponent(returnString)}`);
      orIndex++;

      // 2. Try 15 Characters (Database Limit Safety)
      if (returnString.length > 15) {
          const cut15 = returnString.substring(0, 15);
          filters.push(`filter[_or][${orIndex}][return_no][_eq]=${encodeURIComponent(cut15)}`);
          orIndex++;
      }

      // 3. Try 12 Characters
      if (returnString.length > 12) {
          const cut12 = returnString.substring(0, 12);
          filters.push(`filter[_or][${orIndex}][return_no][_eq]=${encodeURIComponent(cut12)}`);
          orIndex++;
      }
      
      const filterQuery = filters.join('&');
      const searchUrl = `${API_BASE}/sales_return_details?${filterQuery}&fields=*,product_id.*&limit=-1`;
      
      const [detailsRes, units, lineDiscounts, returnTypes] = await Promise.all([
        fetch(searchUrl, { headers: getHeaders(), cache: 'no-store' }).then(r => r.json()),
        SalesReturnProvider.getUnits(),
        SalesReturnProvider.getLineDiscounts(), // 🟢 FIX 1: Fetch Line Discounts (L1, L2...), NOT DiscountTypes
        SalesReturnProvider.getSalesReturnTypes()
      ]);

      const rawItems = detailsRes.data || [];
      console.log(`✅ [API] Found ${rawItems.length} unique items`);

      return rawItems.map((detail: any) => {
        const product = (typeof detail.product_id === 'object' && detail.product_id !== null) 
            ? detail.product_id 
            : { product_code: "N/A", product_name: `Unknown (ID: ${detail.product_id})` };
        
        const unitId = (typeof product.unit_of_measurement === 'object')
            ? product.unit_of_measurement?.unit_id 
            : product.unit_of_measurement;
        const unit = units.find(u => u.unit_id === unitId);

        const discount = lineDiscounts.find(d => d.id === detail.discount_type);
        // Find the return type object based on the ID stored in DB
        const returnTypeObj = returnTypes.find(rt => rt.type_id == detail.sales_return_type_id);

        return {
          id: detail.detail_id || detail.id, 
          productId: product.product_id, 
          code: product.product_code || "N/A",
          description: product.product_name || product.description || "Unknown Item",
          unit: unit ? unit.unit_shortcut : "Pcs",
          quantity: Number(detail.quantity),
          unitPrice: Number(detail.unit_price),
          grossAmount: Number(detail.gross_amount),
          
          // 🟢 FIX 2: Return the Discount ID (e.g. 43) so the dropdown selects "L1"
          discountType: detail.discount_type ? Number(detail.discount_type) : "", 

          discountAmount: Number(detail.discount_amount),
          totalAmount: Number(detail.total_amount),
          reason: detail.reason || "", // This is the text reason (e.g. "Item Broken")
          
          // 🟢 FIX 3: Return the Type ID (e.g. 5) so the dropdown selects "Good Order"
          sales_return_type_id: detail.sales_return_type_id ? Number(detail.sales_return_type_id) : "",
          
          // Backup Name (just in case UI needs text)
          returnType: returnTypeObj ? returnTypeObj.type_name : "Good Order", 
        };
      });

    } catch (error) {
      console.error("Critical API Error:", error);
      return [];
    }
  },
  // =========================================================
  // 🟢 SECTION 7: STATUS CARD DATA
  // =========================================================
  async getStatusCardData(returnId: number): Promise<SalesReturnStatusCard | null> {
    try {
      const fields = "return_id,isApplied,updated_at,status,isPosted,isReceived,order_id";
      const url = `${API_BASE}/sales_return/${returnId}?fields=${fields}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) return null;
      
      const result = await response.json();
      const data = result.data;
      
      return {
        returnId: data.return_id,
        isApplied: data.isApplied === 1,
        dateApplied: data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "-", 
        transactionStatus: data.status || "Closed",
        isPosted: parseBoolean(data.isPosted),   
        isReceived: parseBoolean(data.isReceived), 
        appliedTo: data.order_id || "-"
      };
    } catch (error) { return null; }
  },
  // ... inside SalesReturnProvider object ...

  // 🟢 8. UPDATE STATUS FUNCTION (Using PUT to fix 405 Error)
  // 🟢 8. UPDATE STATUS (Tunneling Version for 405 Errors)
  // 🟢 8. UPDATE STATUS (Batch Strategy to fix 405/404)
  // 🟢 8. UPDATE STATUS (Query String Tunneling Strategy)
 // ... inside SalesReturnProvider object ...

  // 🟢 8. UPDATE STATUS (Standard PATCH)
  // Now that you fixed route.ts, this will work perfectly.
  async updateStatus(id: number | string, status: string): Promise<any> {
    try {
      const payload = { status: status };
      
      // Target the SPECIFIC ID with the PATCH method
      const response = await fetch(`${API_BASE}/sales_return/${id}`, {
        method: "PATCH", 
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to update status: ${response.status} ${errText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Status Update Error:", error);
      throw error;
    }
  },


  

// ... ensure this is before the closing }; of the object
  
};
