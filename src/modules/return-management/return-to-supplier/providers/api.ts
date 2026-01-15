// api.ts
import { 
  Branch, 
  Supplier, 
  Product, 
  ProductSupplier, 
  DiscountType, 
  LineDiscount, 
  API_Product, 
  API_Unit, 
  API_ReturnToSupplier, 
  ReturnToSupplier 
} from "../type";

const API_BASE = "/api/items";  

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

export const ReturnToSupplierProvider = {
  
  // --- 1. GET METHODS ---
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch(`${API_BASE}/suppliers?limit=-1`, { method: "GET", headers: getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();
      return (result.data || []).filter((item: any) => item.isActive === 1);
    } catch (error) {
      console.error("Provider Error (getSuppliers):", error);
      return [];
    }
  },

  async getBranches(): Promise<Branch[]> {
    try {
      const fields = "id,branch_name,branch_code,isActive";
      const response = await fetch(`${API_BASE}/branches?limit=-1&fields=${fields}`, { method: "GET", headers: getHeaders() });
      if (!response.ok) return [];
      const result = await response.json();
      return (result.data || []).filter((item: any) => item.isActive === 1);
    } catch (error) {
      console.error("Provider Error (getBranches):", error);
      return [];
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const [productsRes, unitsRes] = await Promise.all([
        fetch(`${API_BASE}/products?limit=-1`, { headers: getHeaders() }),
        fetch(`${API_BASE}/units?limit=-1`, { headers: getHeaders() })
      ]);

      if (!productsRes.ok || !unitsRes.ok) return [];

      const productsData: API_Product[] = (await productsRes.json()).data || [];
      const unitsData: API_Unit[] = (await unitsRes.json()).data || [];
      const unitMap = new Map<number, string>();
      unitsData.forEach(u => unitMap.set(u.unit_id, u.unit_shortcut));

      return productsData
        .filter(item => item.isActive === 1) 
        .map((item) => {
          // Default to 1 (PCS) if null
          const unitId = item.unit_of_measurement || 1; 
          const unitName = (unitId && unitMap.has(unitId)) ? unitMap.get(unitId)! : "PCS"; 
          
          return {
            id: item.product_id.toString(),
            code: item.product_code || item.barcode || "N/A",
            name: item.description || item.product_name || "Unknown Product",
            price: Number(item.priceA || item.standard_price || 0),
            unit: unitName,
            uom_id: unitId // [CRITICAL] Saving the ID for rts_items
          };
        });
    } catch (error) {
      console.error("Provider Error (getProducts):", error);
      return [];
    }
  },

  async getProductSupplierConnections(): Promise<ProductSupplier[]> {
    try {
      const response = await fetch(`${API_BASE}/product_per_supplier?limit=-1`, { method: "GET", headers: getHeaders() });
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      console.error("Provider Error (getProductSupplierConnections):", error);
      return [];
    }
  },

  async getDiscountTypes(): Promise<DiscountType[]> {
    try {
      const fields = "id,discount_type";
      const response = await fetch(`${API_BASE}/discount_type?limit=-1&fields=${fields}`, { method: "GET", headers: getHeaders() });
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      console.error("Provider Error (getDiscountTypes):", error);
      return [];
    }
  },

  async getLineDiscounts(): Promise<LineDiscount[]> {
    try {
      const fields = "id,line_discount,percentage";
      const response = await fetch(`${API_BASE}/line_discount?limit=-1&fields=${fields}`, { method: "GET", headers: getHeaders() });
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      console.error("Provider Error (getLineDiscounts):", error);
      return [];
    }
  },

  async getReturnTransactions(
    search: string = "", 
    statusFilter: "All" | "Pending" | "Posted" = "All",
    startDate?: string,
    endDate?: string
  ): Promise<ReturnToSupplier[]> {
    try {
      const fields = [
        "id", "doc_no", "transaction_date", "total_net_amount",
        "remarks", "is_posted", "supplier_id.supplier_name", "branch_id.branch_name"
      ].join(",");

      const params = new URLSearchParams();
      params.append("fields", fields);
      params.append("limit", "-1"); 
      params.append("sort", "-date_created"); 

      if (search) params.append("filter[doc_no][_contains]", search);
      
      if (statusFilter !== "All") {
        const statusValue = statusFilter === "Posted" ? "1" : "0";
        params.append("filter[is_posted][_eq]", statusValue);
      }

      if (startDate && endDate) {
        params.append("filter[transaction_date][_between]", `${startDate},${endDate}`);
      }

      const response = await fetch(`${API_BASE}/return_to_supplier?${params.toString()}`, { 
        method: "GET",
        headers: getHeaders() 
      });

      if (!response.ok) return [];

      const result = await response.json();
      const rawData: API_ReturnToSupplier[] = result.data || [];

      return rawData.map((item) => {
        const supplierName = typeof item.supplier_id === 'object' && item.supplier_id 
          ? item.supplier_id.supplier_name 
          : `ID: ${item.supplier_id}`;
          
        const branchName = typeof item.branch_id === 'object' && item.branch_id 
          ? item.branch_id.branch_name 
          : `ID: ${item.branch_id}`;

        return {
          id: item.id.toString(),
          returnNo: item.doc_no,
          supplier: supplierName,
          branch: branchName,
          returnDate: item.transaction_date,
          totalAmount: Number(item.total_net_amount),
          status: item.is_posted === 1 ? "Posted" : "Pending",
          remarks: item.remarks
        };
      });

    } catch (error) {
      console.error("Provider Error (getReturnTransactions):", error);
      return [];
    }
  },

  // --- 2. POST METHODS ---
  async createReturnTransaction(payload: any): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/return_to_supplier`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Log detailed error for easier debugging
        console.error("❌ SUBMISSION FAILED DETAILS:", JSON.stringify(errorData, null, 2));
        return false;
      }
      return true;
    } catch (error) {
      console.error("Provider Error (createReturnTransaction):", error);
      return false;
    }
  },
};