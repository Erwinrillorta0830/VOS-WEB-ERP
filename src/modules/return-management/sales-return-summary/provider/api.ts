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

// --- HELPERS ---
const getHeaders = () => {
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

const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const chunk = <T>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const inFilterParam = (values: (string | number)[]) =>
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

export const SalesReturnProvider = {
  // --- DROPDOWN FETCHERS ---
  async getCustomersList(): Promise<SummaryCustomerOption[]> {
    try {
      const res = await fetch(
        `${API_BASE}/customer?limit=-1&fields=customer_code,customer_name,store_name&sort=customer_name`,
        { headers: getHeaders() },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((c: any) => ({
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
      const [salesmanRes, branchRes] = await Promise.all([
        fetch(
          `${API_BASE}/salesman?limit=-1&fields=id,salesman_name,salesman_code,branch_code`,
          { headers: getHeaders() },
        ),
        fetch(`${API_BASE}/branches?limit=-1&fields=id,branch_name`, {
          headers: getHeaders(),
        }),
      ]);
      if (!salesmanRes.ok || !branchRes.ok) return [];
      const salesmen = (await salesmanRes.json()).data || [];
      const branches = (await branchRes.json()).data || [];
      return salesmen.map((s: any) => {
        const b = branches.find(
          (x: any) => String(x.id) === String(s.branch_code),
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
      const res = await fetch(
        `${API_BASE}/suppliers?limit=-1&fields=id,supplier_name,nonBuy&sort=supplier_name`,
        { headers: getHeaders() },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || [])
        .filter((s: any) => parseBoolean(s.nonBuy) === false)
        .map((s: any) => ({ id: s.id, name: s.supplier_name }));
    } catch {
      return [];
    }
  },

  async getSalesReturnTypes(): Promise<API_SalesReturnType[]> {
    try {
      const res = await fetch(
        `${API_BASE}/sales_return_type?limit=-1&fields=type_id,type_name&sort=type_name`,
        { headers: getHeaders() },
      );
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
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

    // 1. Fetch Lookups
    const [
      customers,
      salesmen,
      returnTypes,
      lineDiscounts,
      brands,
      suppliersAll,
      units,
      categories,
    ] = await Promise.all([
      fetch(
        `${API_BASE}/customer?limit=-1&fields=customer_code,customer_name,store_name`,
        { headers: getHeaders() },
      ).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/salesman?limit=-1&fields=id,salesman_name`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/sales_return_type?limit=-1&fields=type_id,type_name`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/line_discount?limit=-1&fields=id,line_discount`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/brand?limit=-1&fields=brand_id,brand_name`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/suppliers?limit=-1&fields=id,supplier_name,nonBuy`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(`${API_BASE}/units?limit=-1&fields=unit_id,unit_name`, {
        headers: getHeaders(),
      }).then((r) => (r.ok ? r.json() : { data: [] })),
      fetch(
        `${API_BASE}/categories?limit=-1&fields=category_id,category_name`,
        { headers: getHeaders() },
      ).then((r) => (r.ok ? r.json() : { data: [] })),
    ]);

    // Build Maps
    const customerMap = new Map();
    (customers.data || []).forEach((c: any) =>
      customerMap.set(String(c.customer_code), c),
    );
    const salesmanMap = new Map();
    (salesmen.data || []).forEach((s: any) => salesmanMap.set(String(s.id), s));
    const returnTypeMap = new Map();
    (returnTypes.data || []).forEach((t: any) =>
      returnTypeMap.set(String(t.type_id), t),
    );
    const lineDiscountMap = new Map();
    (lineDiscounts.data || []).forEach((d: any) =>
      lineDiscountMap.set(String(d.id), d.line_discount),
    );
    const brandMap = new Map();
    (brands.data || []).forEach((b: any) =>
      brandMap.set(String(b.brand_id), b),
    );
    const supplierMap = new Map();
    (suppliersAll.data || [])
      .filter((s: any) => parseBoolean(s.nonBuy) === false)
      .forEach((s: any) => supplierMap.set(String(s.id), s));
    const unitMap = new Map();
    (units.data || []).forEach((u: any) =>
      unitMap.set(String(u.unit_id), u.unit_name),
    );
    const categoryMap = new Map();
    (categories.data || []).forEach((c: any) =>
      categoryMap.set(String(c.category_id), c.category_name),
    );

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

    const parentRes = await fetch(url, {
      headers: getHeaders(),
      cache: "no-store",
    });
    if (!parentRes.ok) return { data: [], total: 0 };

    const parentJson = await parentRes.json();
    const parentsRaw = parentJson.data || [];
    let total = parentJson.meta?.filter_count || 0;

    const returnNos = parentsRaw
      .map((r: any) => String(r.return_number))
      .filter(Boolean);

    // 3. Fetch Items
    let allDetails: any[] = [];
    if (returnNos.length > 0) {
      const detailChunks = chunk(returnNos, 25);
      const results = await Promise.all(
        detailChunks.map(async (list) => {
          const detailsUrl = `${API_BASE}/sales_return_details?limit=-1&filter[return_no][_in]=${inFilterParam(list)}&fields=detail_id,return_no,reason,quantity,unit_price,gross_amount,discount_amount,discount_type,total_amount,sales_return_type_id,product_id.product_id,product_id.product_code,product_id.product_name,product_id.product_brand,product_id.parent_id,product_id.unit_of_measurement,product_id.product_category`;
          const res = await fetch(detailsUrl, {
            headers: getHeaders(),
            cache: "no-store",
          });
          return res.ok ? (await res.json()).data || [] : [];
        }),
      );
      allDetails = results.flat();
    }

    // 4. Map Suppliers
    const baseProductIds = Array.from(
      new Set(
        allDetails
          .map((d) => d?.product_id)
          .filter(Boolean)
          .map((p: any) => String(p.parent_id || p.product_id || "")),
      ),
    );
    let ppsRows: any[] = [];
    if (baseProductIds.length > 0) {
      const ppsResults = await Promise.all(
        chunk(baseProductIds, 50).map(async (list) => {
          const res = await fetch(
            `${API_BASE}/product_per_supplier?limit=-1&filter[product_id][_in]=${inFilterParam(list)}&fields=product_id,supplier_id`,
            { headers: getHeaders(), cache: "no-store" },
          );
          return res.ok ? (await res.json()).data || [] : [];
        }),
      );
      ppsRows = ppsResults.flat();
    }

    const suppliersByBaseProduct = new Map<string, Set<string>>();
    for (const row of ppsRows) {
      const prodId =
        typeof row.product_id === "object"
          ? String(row.product_id.product_id || row.product_id.id)
          : String(row.product_id);
      const supId =
        typeof row.supplier_id === "object"
          ? String(row.supplier_id.id)
          : String(row.supplier_id);
      const sup = supplierMap.get(supId);
      if (sup) {
        if (!suppliersByBaseProduct.has(prodId))
          suppliersByBaseProduct.set(prodId, new Set());
        suppliersByBaseProduct.get(prodId)!.add(String(sup.supplier_name));
      }
    }
    const supplierNamesFor = (baseProdId: string) => {
      const set = suppliersByBaseProduct.get(baseProdId);
      return set ? Array.from(set).sort().join(", ") : "";
    };

    // 5. Process Items
    const detailsByReturnNo = new Map<string, SummaryReturnItem[]>();
    for (const d of allDetails) {
      const returnNo = String(d.return_no);
      const product = d.product_id || {};
      const baseProdId = String(product.parent_id || product.product_id || "");
      // 🟢 FIX: Added check for 'product.product_brand' to prevent null crash
      const brandId =
        product.product_brand && typeof product.product_brand === "object"
          ? String(product.product_brand.brand_id)
          : String(product.product_brand || "");

      const returnTypeName =
        returnTypeMap.get(String(d.sales_return_type_id))?.type_name || "";

      // 🟢 FIX: Added check for 'product.unit_of_measurement'
      const unitId =
        product.unit_of_measurement &&
        typeof product.unit_of_measurement === "object"
          ? String(product.unit_of_measurement.unit_id)
          : String(product.unit_of_measurement || "");

      // 🟢 FIX: Added check for 'product.product_category'
      const catId =
        product.product_category && typeof product.product_category === "object"
          ? String(product.product_category.category_id)
          : String(product.product_category || "");
      let discountApplied = "No Discount";
      const mappedType = lineDiscountMap.get(String(d.discount_type));
      if (mappedType) discountApplied = mappedType;
      else if (toNum(d.discount_amount) > 0) discountApplied = "Custom / Other";

      // 🟢 CALCULATION
      const qty = toNum(d.quantity);
      const price = toNum(d.unit_price);
      const calculatedGross = qty * price;
      const discountAmt = toNum(d.discount_amount);
      const calculatedNet = calculatedGross - discountAmt;

      const item: SummaryReturnItem = {
        detailId: d.detail_id,
        returnNo,
        productCode: product.product_code || "",
        productName: product.product_name || "",
        brandName: brandMap.get(brandId)?.brand_name || "",
        unit: unitMap.get(unitId) || "Pcs",
        productCategory: categoryMap.get(catId) || "-",
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

      if (!detailsByReturnNo.has(returnNo)) detailsByReturnNo.set(returnNo, []);
      detailsByReturnNo.get(returnNo)!.push(item);
    }

    // 6. Build Rows
    let data: SummaryReturnHeader[] = parentsRaw.map((r: any) => {
      const cust = customerMap.get(String(r.customer_code));
      const sm = salesmanMap.get(String(r.salesman_id));
      const rawItems = detailsByReturnNo.get(String(r.return_number)) || [];
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

    // 🟢 7. STRICT ITEM FILTERING
    // This ensures that if we are filtering by Supplier or Category,
    // we REMOVE items that don't match, and we REMOVE headers that become empty.
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

      // Update total to reflect filtered results
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
