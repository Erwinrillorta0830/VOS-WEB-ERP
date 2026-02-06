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
          `${DIRECTUS_BASE}/products?limit=-1&fields=product_id,product_name,description,product_code,parent_id,unit_of_measurement,unit_of_measurement_count,cost_per_unit`,
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
        // ✅ ADDED: Fetch Return Types
        fetch(`${DIRECTUS_BASE}/rts_return_type?limit=-1`, {
          headers: getHeaders(),
        }).then((r) => r.json()),
      ]);

      // Populate Cache (Existing logic...)
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
        // ✅ ADDED: Return the fetched types
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
        returnTypes: [], // Ensure this defaults to empty array on error
      };
    }
  },

  // 2. GET INVENTORY (Spring View)
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

  // 3. GET TRANSACTIONS (Dual Fetch Strategy)
  async getTransactions(): Promise<ReturnToSupplier[]> {
    try {
      // A. Fetch Parents (Returns)
      // ✅ FIX 1: Changed 'return_no' to 'doc_no' to match your DB schema
      const parentParams = new URLSearchParams({
        limit: "-1",
        sort: "-date_created",
        fields:
          "id,doc_no,transaction_date,is_posted,remarks,supplier_id.supplier_name,branch_id.branch_name,total_net_amount",
      });

      // B. Fetch Children (Items)
      const childParams = new URLSearchParams({
        limit: "-1",
        fields: "rts_id,gross_amount,discount_amount,net_amount",
      });

      // C. Execute Fetches in Parallel
      const [parentRes, childRes] = await Promise.all([
        fetch(`${DIRECTUS_BASE}/return_to_supplier?${parentParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${DIRECTUS_BASE}/rts_items?${childParams}`, {
          headers: getHeaders(),
        }),
      ]);

      if (!parentRes.ok)
        throw new Error(`Parent Fetch Error: ${parentRes.status}`);
      if (!childRes.ok)
        throw new Error(`Child Fetch Error: ${childRes.status}`);

      const { data: parents } = await parentRes.json();
      const { data: children } = await childRes.json();

      // D. Map Children to Parent IDs
      const itemsMap = new Map<string, any[]>();

      (children || []).forEach((item: any) => {
        // ✅ FIX 2: robust ID extraction (handle object or primitive)
        const rawRtsId =
          typeof item.rts_id === "object" ? item.rts_id.id : item.rts_id;
        const pId = String(rawRtsId); // Normalize to string for safe matching

        if (!itemsMap.has(pId)) {
          itemsMap.set(pId, []);
        }
        itemsMap.get(pId)?.push(item);
      });

      // E. Calculate Totals
      return (parents || []).map((r: any) => {
        const pId = String(r.id);
        const items = itemsMap.get(pId) || [];

        const calculatedGross = items.reduce(
          (sum: number, item: any) => sum + Number(item.gross_amount || 0),
          0,
        );

        const calculatedDiscount = items.reduce(
          (sum: number, item: any) => sum + Number(item.discount_amount || 0),
          0,
        );

        const calculatedNet = items.reduce(
          (sum: number, item: any) => sum + Number(item.net_amount || 0),
          0,
        );

        // Fallback: If no items found, try to use the parent's total_net_amount
        const finalNet =
          items.length > 0 ? calculatedNet : Number(r.total_net_amount || 0);

        return {
          id: r.id,
          returnNo: r.doc_no || "N/A", // ✅ Mapped from doc_no
          supplier: r.supplier_id?.supplier_name || "Unknown",
          branch: r.branch_id?.branch_name || "Unknown",
          returnDate: r.transaction_date,
          status: r.is_posted ? "Posted" : "Pending",
          remarks: r.remarks,

          totalAmount: finalNet,
          grossAmount: calculatedGross,
          discountAmount: calculatedDiscount,
        };
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  },

  async getTransactionDetails(id: string): Promise<RTSItem[]> {
    try {
      const params = new URLSearchParams({
        "filter[rts_id][_eq]": id,
        // ✅ FIX 1: Added 'return_type_id' to fields list
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
          unitCount: Number(rawUnitCount) > 0 ? Number(rawUnitCount) : 1,
          // ✅ FIX 2: Map the fetched return type ID
          returnTypeId: i.return_type_id ? Number(i.return_type_id) : null,
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
