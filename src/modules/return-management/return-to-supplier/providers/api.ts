import {
  Branch,
  Supplier,
  Product,
  ProductSupplier,
  LineDiscount,
  ReturnToSupplier,
  RTSItem,
  InventoryRecord,
  CreateReturnDTO,
  API_Product,
  API_ReturnToSupplier,
} from "../type";

const DIRECTUS_BASE = process.env.NEXT_PUBLIC_DIRECTUS_BASE_URL || "/api/items";
const SPRING_PROXY_BASE =
  process.env.NEXT_PUBLIC_SPRING_PROXY_BASE_URL || "/api/proxy/spring";

const getHeaders = () => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") || localStorage.getItem("access_token");
    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

// ... (Keep getSpringToken and fetchSpring helper functions) ...
const getSpringToken = async (): Promise<string | null> => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )springboot_token=([^;]+)"),
  );
  if (match) return match[2];
  try {
    const res = await fetch(`${SPRING_PROXY_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.NEXT_PUBLIC_SPRING_BOOT_EMAIL || "",
        hashPassword: process.env.NEXT_PUBLIC_SPRING_BOOT_PASSWORD || "",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    document.cookie = `springboot_token=${data.token};path=/;max-age=7200`;
    return data.token;
  } catch (e) {
    console.error("Spring Auth Error", e);
    return null;
  }
};

const fetchSpring = async (endpoint: string) => {
  let token = await getSpringToken();
  if (!token) return null;
  const res = await fetch(`${SPRING_PROXY_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (res.status === 401) {
    document.cookie = "springboot_token=; Max-Age=0";
    return null;
  }
  return res.ok ? await res.json() : null;
};

// GLOBAL CACHE
const GLOBAL_CACHE: {
  products: Map<string, any>;
  units: Map<string, string>;
  isLoaded: boolean;
} = {
  products: new Map(),
  units: new Map(),
  isLoaded: false,
};

export const ReturnToSupplierProvider = {
  // 1. GET REFERENCES
  async getReferences() {
    try {
      const [
        suppliers,
        branches,
        products,
        units,
        discounts,
        connections,
        returnTypes,
      ] = await Promise.all([
        fetch(`${DIRECTUS_BASE}/suppliers?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
        fetch(`${DIRECTUS_BASE}/branches?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
        fetch(
          `${DIRECTUS_BASE}/products?limit=-1&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,unit_of_measurement_count,priceA,price_per_unit,cost_per_unit`,
          { headers: getHeaders() },
        ).then((r) => r.json()),
        fetch(`${DIRECTUS_BASE}/units?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
        fetch(`${DIRECTUS_BASE}/line_discount?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
        fetch(
          `${DIRECTUS_BASE}/product_per_supplier?limit=-1&fields=id,product_id,supplier_id,discount_type`,
          { headers: getHeaders() },
        ).then((r) => r.json()),
        // ✅ NEW: Fetch Return Types
        fetch(`${DIRECTUS_BASE}/rts_return_type?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
      ]);

      // Populate Cache
      GLOBAL_CACHE.products.clear();
      GLOBAL_CACHE.units.clear();

      (products.data || []).forEach((p: any) => {
        GLOBAL_CACHE.products.set(String(p.product_id), {
          id: String(p.product_id),
          parent_id: p.parent_id,
          uom_id: p.unit_of_measurement,
          uom_count: Number(p.unit_of_measurement_count || 1),
          name: p.product_name,
          description: p.description,
          code: p.product_code,
          price: Number(p.cost_per_unit ?? 0),
        });
      });

      (units.data || []).forEach((u: any) => {
        GLOBAL_CACHE.units.set(String(u.unit_id), u.unit_name);
      });

      GLOBAL_CACHE.isLoaded = true;

      const priceList: Product[] = (products.data || []).map((p: any) => ({
        id: p.product_id.toString(),
        code: p.product_code || "N/A",
        name: p.description || "Ref",
        price: Number(p.cost_per_unit ?? 0),
        unit: "",
        uom_id: p.unit_of_measurement || 0,
        unitCount: 1,
      }));

      return {
        suppliers: (suppliers.data || []) as Supplier[],
        branches: (branches.data || []) as Branch[],
        products: priceList,
        lineDiscounts: (discounts.data || []) as LineDiscount[],
        connections: (connections.data || []) as ProductSupplier[],
        // ✅ NEW: Return Types
        returnTypes: (returnTypes.data || []) as any[],
      };
    } catch (error) {
      console.error("Provider Error (getReferences):", error);
      return {
        suppliers: [],
        branches: [],
        products: [],
        lineDiscounts: [],
        connections: [],
        returnTypes: [],
      };
    }
  },

  // 2. GET INVENTORY (Spring View) - UNCHANGED
  async getInventory(
    branchId: number,
    supplierId: number,
  ): Promise<InventoryRecord[]> {
    try {
      const data = await fetchSpring("/api/view-running-inventory/all");
      const list = Array.isArray(data) ? data : data?.data || [];

      const relevantItems = list.filter(
        (i: any) =>
          (i.branchId || i.branch_id) == branchId &&
          (i.supplierId || i.supplier_id) == supplierId,
      );

      if (relevantItems.length === 0) return [];

      const masterPoolMap = new Map<string, number>();
      const familyMap = new Map<string, any[]>();
      const uniqueVariantMap = new Map<string, any>();

      relevantItems.forEach((item: any) => {
        const pId = String(item.productId || item.product_id);
        const pInfo = GLOBAL_CACHE.products.get(pId);

        const displayName =
          pInfo?.description ||
          pInfo?.name ||
          item.productName ||
          item.product_name;

        let masterId = pId;
        if (pInfo && pInfo.parent_id && pInfo.parent_id !== 0) {
          masterId = String(pInfo.parent_id);
        }

        const unitCount = pInfo ? pInfo.uom_count : Number(item.unitCount || 1);
        const safeUnitCount = unitCount > 0 ? unitCount : 1;

        const variantKey = `${pId}`;

        if (!uniqueVariantMap.has(variantKey)) {
          const uomId = pInfo ? String(pInfo.uom_id) : "0";
          const unitName =
            GLOBAL_CACHE.units.get(uomId) ||
            item.unitName ||
            item.unit_name ||
            "Units";

          const variantObj = {
            id: `${item.branchId || item.branch_id}-${pId}`,
            product_id: pId,
            master_id: masterId,
            branch_id: item.branchId || item.branch_id,
            supplier_id: item.supplierId || item.supplier_id,
            product_code:
              pInfo?.code || item.product_code || item.productCode || "N/A",
            name: displayName,
            unit_name: unitName,
            uom_id: Number(uomId),
            unit_count: safeUnitCount,
            running_inventory: 0,
            raw_pieces_contributed: 0,
          };
          uniqueVariantMap.set(variantKey, variantObj);

          const list = familyMap.get(masterId) || [];
          list.push(variantObj);
          familyMap.set(masterId, list);
        }

        const rawQty = Number(
          item.runningInventory || item.running_inventory || 0,
        );
        const pieces = rawQty * safeUnitCount;

        const currentPool = masterPoolMap.get(masterId) || 0;
        masterPoolMap.set(masterId, currentPool + pieces);
      });

      const finalInventory: InventoryRecord[] = [];

      familyMap.forEach((variants, masterId) => {
        variants.sort((a, b) => b.unit_count - a.unit_count);

        let remainingPool = masterPoolMap.get(masterId) || 0;

        variants.forEach((variant) => {
          const possibleCount = Math.floor(remainingPool / variant.unit_count);
          variant.running_inventory = possibleCount;
          remainingPool = remainingPool % variant.unit_count;
          finalInventory.push(variant);
        });
      });

      return finalInventory;
    } catch (error) {
      console.error("Inventory Fetch/Calc Error", error);
      return [];
    }
  },

  // ... (getTransactions UNCHANGED) ...
  async getTransactions(
    search = "",
    status = "All",
  ): Promise<ReturnToSupplier[]> {
    try {
      const params = new URLSearchParams({
        limit: "-1",
        sort: "-date_created",
        fields:
          "id,doc_no,transaction_date,remarks,is_posted,supplier_id.supplier_name,branch_id.branch_name,total_net_amount",
      });
      if (search) params.append("filter[doc_no][_contains]", search);
      if (status !== "All")
        params.append(
          "filter[is_posted][_eq]",
          status === "Posted" ? "1" : "0",
        );

      const res = await fetch(`${DIRECTUS_BASE}/return_to_supplier?${params}`, {
        headers: getHeaders(),
      });
      if (!res.ok) return [];
      const { data } = await res.json();
      const returns: API_ReturnToSupplier[] = data || [];
      if (returns.length === 0) return [];

      const ids = returns.map((r) => r.id);
      const childRes = await fetch(
        `${DIRECTUS_BASE}/rts_items?limit=-1&fields=rts_id,net_amount&filter[rts_id][_in]=${ids.join(",")}`,
        { headers: getHeaders() },
      );
      const { data: items } = await childRes.json();

      const totalsMap = new Map<string, number>();
      (items || []).forEach((i: any) => {
        const parentId =
          typeof i.rts_id === "object" ? String(i.rts_id.id) : String(i.rts_id);
        totalsMap.set(
          parentId,
          (totalsMap.get(parentId) || 0) + (Number(i.net_amount) || 0),
        );
      });

      return returns.map((r) => {
        const idKey = String(r.id);
        const manualTotal = totalsMap.get(idKey) || 0;
        const storedTotal = Number(r.total_net_amount || 0);
        return {
          id: idKey,
          returnNo: r.doc_no,
          supplier:
            typeof r.supplier_id === "object"
              ? r.supplier_id.supplier_name
              : "Unknown",
          branch:
            typeof r.branch_id === "object"
              ? r.branch_id.branch_name
              : "Unknown",
          returnDate: r.transaction_date,
          totalAmount: manualTotal > 0 ? manualTotal : storedTotal,
          status: r.is_posted === 1 ? "Posted" : "Pending",
          remarks: r.remarks,
        };
      });
    } catch (error) {
      return [];
    }
  },

  async getTransactionDetails(id: string): Promise<RTSItem[]> {
    try {
      const params = new URLSearchParams({
        "filter[rts_id][_eq]": id,
        // ✅ NEW: Added return_type_id to fetched fields
        fields:
          "id,quantity,gross_unit_price,discount_rate,discount_amount,net_amount,return_type_id,product_id.product_name,product_id.product_code,product_id.product_id,product_id.unit_of_measurement_count,uom_id.unit_shortcut,uom_id.unit_id",
      });
      const res = await fetch(`${DIRECTUS_BASE}/rts_items?${params}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      return (data || []).map((i: any) => {
        const rawProductId =
          typeof i.product_id === "object"
            ? i.product_id.product_id
            : i.product_id;
        const rawUomId =
          typeof i.uom_id === "object" ? i.uom_id.unit_id : i.uom_id;
        const rawUnitCount =
          typeof i.product_id === "object"
            ? i.product_id.unit_of_measurement_count
            : 1;
        return {
          id: i.id,
          productId: Number(rawProductId),
          uomId: Number(rawUomId),
          code:
            typeof i.product_id === "object"
              ? i.product_id.product_code
              : "N/A",
          name:
            typeof i.product_id === "object"
              ? i.product_id.product_name
              : "Unknown",
          unit: typeof i.uom_id === "object" ? i.uom_id.unit_shortcut : "UNIT",
          quantity: Number(i.quantity),
          price: Number(i.gross_unit_price),
          discountRate: Number(i.discount_rate),
          discountAmount: Number(i.discount_amount),
          total: Number(i.net_amount),
          // ✅ NEW: Map return type
          returnTypeId: i.return_type_id,
          unitCount: Number(rawUnitCount) > 0 ? Number(rawUnitCount) : 1,
        };
      });
    } catch (error) {
      return [];
    }
  },

  async createTransaction(dto: CreateReturnDTO): Promise<boolean> {
    try {
      const { rts_items, ...header } = dto;
      const docNo = `RTS-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 10000,
      )
        .toString()
        .padStart(4, "0")}`;

      const res = await fetch(`${DIRECTUS_BASE}/return_to_supplier`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ ...header, doc_no: docNo }),
      });
      if (!res.ok) return false;
      const { data: parent } = await res.json();

      await Promise.all(
        rts_items.map((item) =>
          fetch(`${DIRECTUS_BASE}/rts_items`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ ...item, rts_id: parent.id }),
          }),
        ),
      );

      const totalNet = rts_items.reduce((s, i) => s + i.net_amount, 0);

      await fetch(`${DIRECTUS_BASE}/return_to_supplier/${parent.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ total_net_amount: totalNet }),
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  async updateTransaction(id: string, dto: CreateReturnDTO): Promise<boolean> {
    try {
      const { rts_items, ...header } = dto;
      await fetch(`${DIRECTUS_BASE}/return_to_supplier/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(header),
      });
      const existingItems = await this.getTransactionDetails(id);
      if (existingItems.length > 0)
        await Promise.all(
          existingItems.map((i) =>
            fetch(`${DIRECTUS_BASE}/rts_items/${i.id}`, {
              method: "DELETE",
              headers: getHeaders(),
            }),
          ),
        );
      if (rts_items.length > 0)
        await Promise.all(
          rts_items.map((item) =>
            fetch(`${DIRECTUS_BASE}/rts_items`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify({ ...item, rts_id: Number(id) }),
            }),
          ),
        );
      return true;
    } catch (error) {
      return false;
    }
  },
};
