import {
  Branch,
  Supplier,
  Product,
  ProductSupplier,
  DiscountType,
  LineDiscount,
  API_Product,
  API_ReturnToSupplier,
  ReturnToSupplier,
  API_RTS_Item,
  RTSItem,
  InventoryRecord,
  API_Unit,
} from "../type";

// --- CONFIGURATION ---
const DIRECTUS_BASE = "/api/items";
const SPRING_PROXY_BASE = "/api/proxy/spring";

// --- CREDENTIALS ---
const AUTH_CREDENTIALS = {
  email: process.env.NEXT_PUBLIC_SPRING_BOOT_EMAIL,
  hashPassword: process.env.NEXT_PUBLIC_SPRING_BOOT_PASSWORD,
};

// --- COOKIE HELPERS ---
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

const setCookie = (name: string, value: string, hours: number) => {
  if (typeof document === "undefined") return;
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
};

// --- AUTH LOGIC ---
const getSpringToken = async (): Promise<string | null> => {
  try {
    let token = getCookie("springboot_token");
    if (token) return token;

    try {
      const loginResponse = await fetch(`${SPRING_PROXY_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(AUTH_CREDENTIALS),
      });

      if (!loginResponse.ok) return null;

      const data = await loginResponse.json();
      token = data.token;

      if (token) {
        setCookie("springboot_token", token, 2);
        return token;
      }
    } catch (networkError) {
      console.error("Auth Network Error:", networkError);
      return null;
    }
  } catch (error) {
    console.error("Auth Error:", error);
  }
  return null;
};

// --- FETCH WRAPPER ---
const fetchSpring = async (endpoint: string): Promise<any> => {
  let token = await getSpringToken();
  if (!token) return null;

  const makeRequest = async (t: string) => {
    return fetch(`${SPRING_PROXY_BASE}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
    });
  };

  try {
    let response = await makeRequest(token);

    if (response.status === 401 || response.status === 403) {
      setCookie("springboot_token", "", 0);
      token = await getSpringToken();
      if (token) {
        response = await makeRequest(token);
      }
    }

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

const getHeaders = () => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token");

    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export const ReturnToSupplierProvider = {
  // --- GET METHODS ---
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch(`${DIRECTUS_BASE}/suppliers?limit=-1`, {
        method: "GET",
        headers: getHeaders(),
      });
      if (!response.ok) return [];
      const result = await response.json();
      return (result.data || []).filter((item: any) => item.isActive === 1);
    } catch (error) {
      return [];
    }
  },

  async getBranches(): Promise<Branch[]> {
    try {
      const fields = "id,branch_name,branch_code,isActive";
      const response = await fetch(
        `${DIRECTUS_BASE}/branches?limit=-1&fields=${fields}`,
        { method: "GET", headers: getHeaders() },
      );
      if (!response.ok) return [];
      const result = await response.json();
      return (result.data || []).filter((item: any) => item.isActive === 1);
    } catch (error) {
      return [];
    }
  },

  async getProducts(): Promise<Product[]> {
    try {
      const [productsRes, unitsRes] = await Promise.all([
        fetch(`${DIRECTUS_BASE}/products?limit=-1`, { headers: getHeaders() }),
        fetch(`${DIRECTUS_BASE}/units?limit=-1`, { headers: getHeaders() }),
      ]);

      if (!productsRes.ok || !unitsRes.ok) return [];

      const productsData: API_Product[] = (await productsRes.json()).data || [];
      const unitsData: API_Unit[] = (await unitsRes.json()).data || [];
      const unitMap = new Map<number, string>();
      unitsData.forEach((u) => unitMap.set(u.unit_id, u.unit_shortcut));

      return productsData
        .filter((item) => item.isActive === 1)
        .map((item) => {
          const unitId = item.unit_of_measurement || 1;
          const unitName =
            unitId && unitMap.has(unitId) ? unitMap.get(unitId)! : "PCS";

          return {
            id: item.product_id.toString(),
            code: item.product_code || item.barcode || "N/A",
            name: item.description || item.product_name || "Unknown Product",
            price: Number(item.priceA || item.standard_price || 0),
            unit: unitName,
            uom_id: unitId,
          };
        });
    } catch (error) {
      return [];
    }
  },

  async getProductSupplierConnections(): Promise<ProductSupplier[]> {
    try {
      const response = await fetch(
        `${DIRECTUS_BASE}/product_per_supplier?limit=-1`,
        { method: "GET", headers: getHeaders() },
      );
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      return [];
    }
  },

  async getDiscountTypes(): Promise<DiscountType[]> {
    try {
      const fields = "id,discount_type";
      const response = await fetch(
        `${DIRECTUS_BASE}/discount_type?limit=-1&fields=${fields}`,
        { method: "GET", headers: getHeaders() },
      );
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      return [];
    }
  },

  async getLineDiscounts(): Promise<LineDiscount[]> {
    try {
      const fields = "id,line_discount,percentage";
      const response = await fetch(
        `${DIRECTUS_BASE}/line_discount?limit=-1&fields=${fields}`,
        { method: "GET", headers: getHeaders() },
      );
      if (!response.ok) return [];
      return (await response.json()).data || [];
    } catch (error) {
      return [];
    }
  },

  // ✅ FIXED: Manual Join to calculate totals
  async getReturnTransactions(
    search: string = "",
    statusFilter: "All" | "Pending" | "Posted" = "All",
    startDate?: string,
    endDate?: string,
  ): Promise<ReturnToSupplier[]> {
    try {
      // 1. Fetch Parents (Return Headers)
      const parentFields = [
        "id",
        "doc_no",
        "transaction_date",
        "remarks",
        "is_posted",
        "supplier_id.supplier_name",
        "branch_id.branch_name",
      ].join(",");

      const params = new URLSearchParams();
      params.append("fields", parentFields);
      params.append("limit", "-1");
      params.append("sort", "-date_created");

      if (search) params.append("filter[doc_no][_contains]", search);
      if (statusFilter !== "All") {
        const statusValue = statusFilter === "Posted" ? "1" : "0";
        params.append("filter[is_posted][_eq]", statusValue);
      }
      if (startDate && endDate) {
        params.append(
          "filter[transaction_date][_between]",
          `${startDate},${endDate}`,
        );
      }

      const parentRes = await fetch(
        `${DIRECTUS_BASE}/return_to_supplier?${params.toString()}`,
        { method: "GET", headers: getHeaders() },
      );

      if (!parentRes.ok) return [];
      const parentData = await parentRes.json();
      const returns: any[] = parentData.data || [];

      if (returns.length === 0) return [];

      // 2. Fetch Children (Items) for these parents
      // We grab all item IDs to perform a single batch fetch
      const returnIds = returns.map((r) => r.id);

      const childFields = "rts_id,net_amount";
      // Filter items where rts_id is IN the list of parent IDs
      const childParams = new URLSearchParams();
      childParams.append("filter[rts_id][_in]", returnIds.join(","));
      childParams.append("fields", childFields);
      childParams.append("limit", "-1");

      const childRes = await fetch(
        `${DIRECTUS_BASE}/rts_items?${childParams.toString()}`,
        { method: "GET", headers: getHeaders() },
      );

      let totalsMap = new Map<number, number>();

      if (childRes.ok) {
        const childData = await childRes.json();
        const items = childData.data || [];

        // Sum up items per parent ID
        items.forEach((item: any) => {
          const parentId = Number(item.rts_id); // Ensure ID is number
          const amount = Number(item.net_amount) || 0;
          const currentTotal = totalsMap.get(parentId) || 0;
          totalsMap.set(parentId, currentTotal + amount);
        });
      }

      // 3. Merge Data
      return returns.map((item) => {
        const supplierName =
          typeof item.supplier_id === "object" && item.supplier_id
            ? item.supplier_id.supplier_name
            : `ID: ${item.supplier_id}`;
        const branchName =
          typeof item.branch_id === "object" && item.branch_id
            ? item.branch_id.branch_name
            : `ID: ${item.branch_id}`;

        // Get total from map, default to 0
        const calculatedTotal = totalsMap.get(item.id) || 0;

        return {
          id: item.id.toString(),
          returnNo: item.doc_no,
          supplier: supplierName,
          branch: branchName,
          returnDate: item.transaction_date,
          totalAmount: calculatedTotal, // ✅ Populated via Manual Join
          status: item.is_posted === 1 ? "Posted" : "Pending",
          remarks: item.remarks,
        };
      });
    } catch (error) {
      console.error("Provider Error (getReturnTransactions):", error);
      return [];
    }
  },

  async getReturnItems(rtsId: string): Promise<RTSItem[]> {
    try {
      const fields = [
        "id",
        "quantity",
        "gross_unit_price",
        "discount_rate",
        "discount_amount",
        "net_amount",
        "product_id.product_name",
        "product_id.product_code",
        "uom_id.unit_shortcut",
      ].join(",");

      const response = await fetch(
        `${DIRECTUS_BASE}/rts_items?filter[rts_id][_eq]=${rtsId}&fields=${fields}`,
        { method: "GET", headers: getHeaders() },
      );

      if (!response.ok) return [];
      const result = await response.json();
      const rawData: API_RTS_Item[] = result.data || [];

      return rawData.map((item) => {
        const code =
          typeof item.product_id === "object"
            ? item.product_id.product_code
            : "N/A";
        const name =
          typeof item.product_id === "object"
            ? item.product_id.product_name
            : "Unknown Product";
        const unit =
          typeof item.uom_id === "object" ? item.uom_id.unit_shortcut : "UNIT";

        return {
          id: item.id,
          code,
          name,
          unit,
          quantity: Number(item.quantity),
          price: Number(item.gross_unit_price),
          discountRate: Number(item.discount_rate),
          discountAmount: Number(item.discount_amount),
          total: Number(item.net_amount),
        };
      });
    } catch (error) {
      console.error("Provider Error (getReturnItems):", error);
      return [];
    }
  },

  async getBranchInventory(
    branchId: number,
    supplierId: number,
  ): Promise<InventoryRecord[]> {
    try {
      const result = await fetchSpring("/api/view-running-inventory/all");
      if (!result) return [];

      const allInventory: any[] = Array.isArray(result)
        ? result
        : result.data || [];

      return allInventory
        .filter(
          (item: any) =>
            Number(item.branchId) === branchId &&
            Number(item.supplierId) === supplierId,
        )
        .map((item: any) => ({
          id: `${item.branchId}-${item.productId}`,
          product_id: item.productId,
          branch_id: item.branchId,
          supplier_id: item.supplierId,
          running_inventory: item.runningInventory,
        }));
    } catch (error) {
      return [];
    }
  },

  // --- 2. POST METHODS ---
  async createReturnTransaction(payload: any): Promise<boolean> {
    try {
      const { rts_items, ...headerPayload } = payload;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomSuffix = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0");
      headerPayload.doc_no =
        headerPayload.doc_no || `RTS-${dateStr}-${randomSuffix}`;

      // Create Parent
      const parentResponse = await fetch(
        `${DIRECTUS_BASE}/return_to_supplier`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(headerPayload),
        },
      );

      if (!parentResponse.ok) {
        const errorData = await parentResponse.json();
        console.error("❌ Parent Creation Failed:", JSON.stringify(errorData));
        return false;
      }

      const parentResult = await parentResponse.json();
      const newParentId = parentResult.data?.id || parentResult.id;

      if (!newParentId) return false;

      // Create Items
      if (rts_items && rts_items.length > 0) {
        const itemCreationPromises = rts_items.map((item: any) => {
          return fetch(`${DIRECTUS_BASE}/rts_items`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ ...item, rts_id: newParentId }),
          });
        });
        await Promise.all(itemCreationPromises);
      }
      return true;
    } catch (error) {
      console.error("Provider Error (createReturnTransaction):", error);
      return false;
    }
  },
};
