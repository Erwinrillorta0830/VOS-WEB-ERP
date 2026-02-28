import type {
  API_SalesReturnType,
  SummaryCustomerOption,
  SummarySalesmanOption,
  SummarySupplierOption,
  SummaryReturnHeader,
  SummaryReturnItem,
  SummaryFilters,
  SummaryResult,
} from "../type";

const API_BASE = "/api/items";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null")
      headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const parseBoolean = (val: any): boolean => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (val && val.type === "Buffer" && Array.isArray(val.data))
    return val.data[0] === 1;
  if (typeof val === "string")
    return val === "1" || val.toLowerCase() === "true";
  return false;
};

const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const inFilterParam = (values: (string | number)[]): string =>
  values
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => encodeURIComponent(String(v)))
    .join(",");

const normalizeFilters = (raw: any): SummaryFilters => {
  const f = raw || {};
  return {
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    status: f.status ?? "All",
    customerCode: f.customerCode ?? "All",
    salesmanId: f.salesmanId ?? "All",
    supplierName: f.supplierName ?? "All",
    returnCategory: f.returnCategory ?? "All",
  };
};

// ─── TYPED LOOKUP DATA ───────────────────────────────────────────────────────

interface CustomerRecord {
  customer_code: string;
  customer_name: string;
  store_name: string;
}

interface SalesmanRecord {
  id: number;
  salesman_name: string;
  salesman_code?: string;
  branch_code?: number;
}

interface BranchRecord {
  id: number;
  branch_name: string;
}

interface ReturnTypeRecord {
  type_id: number;
  type_name: string;
}

interface LineDiscountRecord {
  id: number;
  line_discount: string;
  percentage: string;
}

interface BrandRecord {
  brand_id: number;
  brand_name: string;
}

interface SupplierRecord {
  id: number;
  supplier_name: string;
  nonBuy?: any;
}

interface UnitRecord {
  unit_id: number;
  unit_name: string;
}

interface CategoryRecord {
  category_id: number;
  category_name: string;
}

interface ProductSupplierRecord {
  product_id: any;
  supplier_id: any;
}

interface LineDiscountData {
  name: string;
  percentage: number;
}

interface LookupData {
  customerMap: Map<string, CustomerRecord>;
  salesmanMap: Map<string, SalesmanRecord>;
  returnTypeMap: Map<string, ReturnTypeRecord>;
  lineDiscountMap: Map<string, LineDiscountData>;
  brandMap: Map<string, BrandRecord>;
  supplierMap: Map<string, SupplierRecord>;
  unitMap: Map<string, string>;
  categoryMap: Map<string, string>;
  suppliersByProduct: Map<string, Set<string>>;
  // Raw arrays for dropdown formatting
  rawCustomers: CustomerRecord[];
  rawSalesmen: SalesmanRecord[];
  rawBranches: BranchRecord[];
  rawSuppliers: SupplierRecord[];
  rawReturnTypes: ReturnTypeRecord[];
}

// ─── LOOKUP CACHE (5-min TTL) ────────────────────────────────────────────────

let lookupCache: LookupData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchLookups(headers: HeadersInit): Promise<LookupData> {
  // Return cached data if still valid
  if (lookupCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return lookupCache;
  }

  // Fetch all 10 tables in parallel (includes product_per_supplier + branches)
  const [
    customers,
    salesmen,
    branches,
    returnTypes,
    lineDiscounts,
    brands,
    suppliersAll,
    units,
    categories,
    ppsAll,
  ] = await Promise.all([
    fetch(
      `${API_BASE}/customer?limit=-1&fields=customer_code,customer_name,store_name`,
      { headers },
    ).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(
      `${API_BASE}/salesman?limit=-1&fields=id,salesman_name,salesman_code,branch_code`,
      { headers },
    ).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(`${API_BASE}/branches?limit=-1&fields=id,branch_name`, {
      headers,
    }).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(`${API_BASE}/sales_return_type?limit=-1&fields=type_id,type_name`, {
      headers,
    }).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(
      `${API_BASE}/line_discount?limit=-1&fields=id,line_discount,percentage`,
      { headers },
    ).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(`${API_BASE}/brand?limit=-1&fields=brand_id,brand_name`, {
      headers,
    }).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(`${API_BASE}/suppliers?limit=-1&fields=id,supplier_name,nonBuy`, {
      headers,
    }).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(`${API_BASE}/units?limit=-1&fields=unit_id,unit_name`, {
      headers,
    }).then((r) => (r.ok ? r.json() : { data: [] })),
    fetch(
      `${API_BASE}/categories?limit=-1&fields=category_id,category_name`,
      { headers },
    ).then((r) => (r.ok ? r.json() : { data: [] })),
    // Pre-fetch product_per_supplier in lookup cache
    fetch(
      `${API_BASE}/product_per_supplier?limit=-1&fields=product_id,supplier_id`,
      { headers },
    ).then((r) => (r.ok ? r.json() : { data: [] })),
  ]);

  // Build typed Maps
  const customerMap = new Map<string, CustomerRecord>();
  for (const c of (customers.data || []) as CustomerRecord[]) {
    customerMap.set(String(c.customer_code), c);
  }

  const salesmanMap = new Map<string, SalesmanRecord>();
  for (const s of (salesmen.data || []) as SalesmanRecord[]) {
    salesmanMap.set(String(s.id), s);
  }

  const returnTypeMap = new Map<string, ReturnTypeRecord>();
  for (const t of (returnTypes.data || []) as ReturnTypeRecord[]) {
    returnTypeMap.set(String(t.type_id), t);
  }

  const lineDiscountMap = new Map<string, LineDiscountData>();
  for (const d of (lineDiscounts.data || []) as LineDiscountRecord[]) {
    lineDiscountMap.set(String(d.id), {
      name: d.line_discount,
      percentage: parseFloat(d.percentage) || 0,
    });
  }

  const brandMap = new Map<string, BrandRecord>();
  for (const b of (brands.data || []) as BrandRecord[]) {
    brandMap.set(String(b.brand_id), b);
  }

  const rawSuppliersArr = (suppliersAll.data || []) as SupplierRecord[];
  const activeSuppliers = rawSuppliersArr.filter(
    (s) => parseBoolean(s.nonBuy) === false,
  );

  const supplierMap = new Map<string, SupplierRecord>();
  for (const s of activeSuppliers) {
    supplierMap.set(String(s.id), s);
  }

  const unitMap = new Map<string, string>();
  for (const u of (units.data || []) as UnitRecord[]) {
    unitMap.set(String(u.unit_id), u.unit_name);
  }

  const categoryMap = new Map<string, string>();
  for (const c of (categories.data || []) as CategoryRecord[]) {
    categoryMap.set(String(c.category_id), c.category_name);
  }

  // Build supplier-by-product map from pre-fetched data
  const suppliersByProduct = new Map<string, Set<string>>();
  for (const row of (ppsAll.data || []) as ProductSupplierRecord[]) {
    const prodId =
      typeof row.product_id === "object"
        ? String(row.product_id?.product_id || row.product_id?.id)
        : String(row.product_id);
    const supId =
      typeof row.supplier_id === "object"
        ? String(row.supplier_id?.id)
        : String(row.supplier_id);
    const sup = supplierMap.get(supId);
    if (sup) {
      if (!suppliersByProduct.has(prodId))
        suppliersByProduct.set(prodId, new Set());
      suppliersByProduct.get(prodId)!.add(String(sup.supplier_name));
    }
  }

  lookupCache = {
    customerMap,
    salesmanMap,
    returnTypeMap,
    lineDiscountMap,
    brandMap,
    supplierMap,
    unitMap,
    categoryMap,
    suppliersByProduct,
    rawCustomers: (customers.data || []) as CustomerRecord[],
    rawSalesmen: (salesmen.data || []) as SalesmanRecord[],
    rawBranches: (branches.data || []) as BranchRecord[],
    rawSuppliers: activeSuppliers,
    rawReturnTypes: (returnTypes.data || []) as ReturnTypeRecord[],
  };
  cacheTimestamp = Date.now();
  return lookupCache;
}

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export const SalesReturnProvider = {
  /** Clear the lookup cache (e.g., after data changes) */
  clearCache() {
    lookupCache = null;
    cacheTimestamp = 0;
  },

  // --- DROPDOWN FETCHERS (powered by cache) ---
  async getCustomersList(): Promise<SummaryCustomerOption[]> {
    try {
      const lookups = await fetchLookups(getHeaders());
      return lookups.rawCustomers.map((c) => ({
        value: c.customer_code,
        label: c.customer_name || c.store_name || c.customer_code,
        store: c.store_name || "",
      }));
    } catch {
      return [];
    }
  },

  async getSalesmenList(): Promise<SummarySalesmanOption[]> {
    try {
      const lookups = await fetchLookups(getHeaders());
      return lookups.rawSalesmen.map((s) => {
        const b = lookups.rawBranches.find(
          (x) => String(x.id) === String(s.branch_code),
        );
        return {
          value: String(s.id),
          label: s.salesman_name,
          code: s.salesman_code || "",
          branch: b?.branch_name || "",
        };
      });
    } catch {
      return [];
    }
  },

  async getSuppliers(): Promise<SummarySupplierOption[]> {
    try {
      const lookups = await fetchLookups(getHeaders());
      return lookups.rawSuppliers.map((s) => ({
        id: s.id,
        name: s.supplier_name,
      }));
    } catch {
      return [];
    }
  },

  async getSalesReturnTypes(): Promise<API_SalesReturnType[]> {
    try {
      const lookups = await fetchLookups(getHeaders());
      return lookups.rawReturnTypes;
    } catch {
      return [];
    }
  },

  // --- MAIN REPORT LOGIC ---
  async getSummaryReturnsWithItems(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    filters: SummaryFilters = {},
  ): Promise<SummaryResult> {
    const f = normalizeFilters(filters);

    // Cache headers for entire call
    const headers = getHeaders();

    try {
      // Use cached lookups
      const lookups = await fetchLookups(headers);

      // 2. Fetch Headers
      let url = `${API_BASE}/sales_return?page=${page}&limit=${limit}&meta=filter_count&fields=return_id,return_number,return_date,status,customer_code,salesman_id,invoice_no,total_amount,remarks&sort=-return_date,-return_id`;

      if (search) {
        const term = encodeURIComponent(search);
        url += `&filter[_or][0][return_number][_contains]=${term}`;
        url += `&filter[_or][1][invoice_no][_contains]=${term}`;
        url += `&filter[_or][2][customer_code][_contains]=${term}`;
        url += `&filter[_or][3][status][_contains]=${term}`;
      }
      if (f.status && f.status !== "All")
        url += `&filter[status][_eq]=${encodeURIComponent(f.status)}`;
      if (f.customerCode && f.customerCode !== "All")
        url += `&filter[customer_code][_eq]=${encodeURIComponent(f.customerCode)}`;
      if (f.salesmanId && f.salesmanId !== "All")
        url += `&filter[salesman_id][_eq]=${encodeURIComponent(String(f.salesmanId))}`;
      if (f.dateFrom)
        url += `&filter[return_date][_gte]=${encodeURIComponent(f.dateFrom)}`;
      if (f.dateTo)
        url += `&filter[return_date][_lte]=${encodeURIComponent(f.dateTo)}`;

      const parentRes = await fetch(url, { headers, cache: "no-store" });
      if (!parentRes.ok) return { data: [], total: 0 };

      const parentJson = await parentRes.json();
      const parentsRaw = parentJson.data || [];
      let total = parentJson.meta?.filter_count || 0;

      const returnNos: string[] = parentsRaw
        .map((r: any) => String(r.return_number))
        .filter(Boolean);

      // 3. Fetch Items (chunk size = 50)
      let allDetails: any[] = [];
      if (returnNos.length > 0) {
        const detailChunks = chunk(returnNos, 50);
        const results = await Promise.all(
          detailChunks.map(async (list) => {
            const detailsUrl = `${API_BASE}/sales_return_details?limit=-1&filter[return_no][_in]=${inFilterParam(list)}&fields=detail_id,return_no,reason,quantity,unit_price,gross_amount,discount_type,total_amount,sales_return_type_id,product_id.product_id,product_id.product_code,product_id.product_name,product_id.product_brand,product_id.parent_id,product_id.unit_of_measurement,product_id.product_category`;
            const res = await fetch(detailsUrl, {
              headers,
              cache: "no-store",
            });
            return res.ok ? (await res.json()).data || [] : [];
          }),
        );
        allDetails = results.flat();
      }

      // 4. Supplier lookup helper (uses pre-cached data)
      const supplierNamesFor = (baseProdId: string): string => {
        const set = lookups.suppliersByProduct.get(baseProdId);
        return set ? Array.from(set).sort().join(", ") : "";
      };

      // 5. Process Items
      const detailsByReturnNo = new Map<string, SummaryReturnItem[]>();
      for (const d of allDetails) {
        const returnNo = String(d.return_no);
        const product = d.product_id || {};
        const baseProdId = String(
          product.parent_id || product.product_id || "",
        );

        const brandId =
          product.product_brand &&
            typeof product.product_brand === "object"
            ? String(product.product_brand.brand_id)
            : String(product.product_brand || "");

        const returnTypeName =
          lookups.returnTypeMap.get(String(d.sales_return_type_id))
            ?.type_name || "";

        const unitId =
          product.unit_of_measurement &&
            typeof product.unit_of_measurement === "object"
            ? String(product.unit_of_measurement.unit_id)
            : String(product.unit_of_measurement || "");

        const catId =
          product.product_category &&
            typeof product.product_category === "object"
            ? String(product.product_category.category_id)
            : String(product.product_category || "");

        // Discount calculation from line_discount.percentage
        const discountData = lookups.lineDiscountMap.get(
          String(d.discount_type),
        );
        const discountApplied = discountData
          ? discountData.name
          : "No Discount";

        const qty = toNum(d.quantity);
        const price = toNum(d.unit_price);
        const calculatedGross = Math.round(qty * price * 100) / 100;
        const discountPercentage = discountData
          ? discountData.percentage
          : 0;
        const discountAmt = Math.round(calculatedGross * (discountPercentage / 100) * 100) / 100;
        const calculatedNet = Math.round((calculatedGross - discountAmt) * 100) / 100;

        const item: SummaryReturnItem = {
          detailId: d.detail_id,
          returnNo,
          productCode: product.product_code || "",
          productName: product.product_name || "",
          brandName: lookups.brandMap.get(brandId)?.brand_name || "",
          unit: lookups.unitMap.get(unitId) || "Pcs",
          productCategory: lookups.categoryMap.get(catId) || "-",
          supplierName: supplierNamesFor(baseProdId),
          returnCategory: returnTypeName,
          specificReason: d.reason || "",
          quantity: qty,
          unitPrice: price,
          grossAmount: calculatedGross,
          discountAmount: discountAmt,
          discountApplied,
          netAmount: calculatedNet,
        };

        if (!detailsByReturnNo.has(returnNo))
          detailsByReturnNo.set(returnNo, []);
        detailsByReturnNo.get(returnNo)!.push(item);
      }

      // 6. Build Rows
      let data: SummaryReturnHeader[] = parentsRaw.map((r: any) => {
        const cust = lookups.customerMap.get(String(r.customer_code));
        const sm = lookups.salesmanMap.get(String(r.salesman_id));
        const rawItems =
          detailsByReturnNo.get(String(r.return_number)) || [];
        const items = rawItems.map((item) => ({
          ...item,
          invoiceNo: r.invoice_no || "-",
        }));

        return {
          returnId: r.return_id,
          returnNumber: r.return_number,
          returnDate: r.return_date,
          returnStatus: r.status,
          customerName: cust?.customer_name || "",
          storeName: cust?.store_name || "",
          salesmanName: sm?.salesman_name || "",
          invoiceNo: r.invoice_no || "",
          netTotal: toNum(r.total_amount),
          remarks: r.remarks || "",
          items,
        };
      });

      // 7. Client-side item filtering (Supplier / Return Category)
      if (f.supplierName && f.supplierName !== "All") {
        const needle = String(f.supplierName).toLowerCase();
        data = data
          .map((row) => ({
            ...row,
            items: row.items.filter((it) =>
              (it.supplierName || "").toLowerCase().includes(needle),
            ),
          }))
          .filter((row) => row.items.length > 0);
        total = data.length;
      }

      if (f.returnCategory && f.returnCategory !== "All") {
        const cat = String(f.returnCategory).toLowerCase();
        data = data
          .map((row) => ({
            ...row,
            items: row.items.filter(
              (it) => (it.returnCategory || "").toLowerCase() === cat,
            ),
          }))
          .filter((row) => row.items.length > 0);
        total = data.length;
      }

      return { data, total };
    } catch (error) {
      console.error("[SRS Provider] getSummaryReturnsWithItems error:", error);
      return { data: [], total: 0 };
    }
  },

  async getSalesReturnSummaryReport(args: any): Promise<SummaryResult> {
    const page = Number(args?.page ?? 1);
    const limit = Number(args?.limit ?? 10);
    const search = String(args?.search ?? "");
    const rawFilters = args?.filters ? args.filters : args;
    const filters = normalizeFilters(rawFilters);
    return SalesReturnProvider.getSummaryReturnsWithItems(
      page,
      limit,
      search,
      filters,
    );
  },
};
