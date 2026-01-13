// src/app/api/pending-invoices/logic.ts
import { chunk, directusGet, type DirectusListResponse } from "./_directus";

export type PendingStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export type PendingInvoiceHeaderRow = {
  invoice_no: string;
  invoice_id: number;
  order_id?: number | null;

  customer_code?: string | null;
  dispatch_date?: string | null;

  salesman_id?: number | null;
  sales_type?: number | null; // in your SQL, filtered sales_type=1
  price_type?: string | null;

  vat_amount?: number | string | null;
  gross_amount?: number | string | null;
  discount_amount?: number | string | null;
  net_amount?: number | string | null;

  transaction_status?: string | null;
};

type CustomerRow = {
  customer_code: string;
  customer_name?: string | null;
  brgy?: string | null;
  city?: string | null;
  province?: string | null;
};

type SalesmanRow = {
  id: number;
  salesman_name?: string | null;
  price_type?: string | null;
};

type OperationRow = {
  id: number;
  operation_name?: string | null;
};

type DispatchInvoiceRow = {
  invoice_id: number;
  post_dispatch_plan_id?: number | null;
  post_dispatch_plan?: { doc_no?: string | null } | null;
};

type SalesInvoiceDetailRow = {
  id: number;

  // these fields vary between schemas; adjust if your Directus naming differs:
  invoice_id?: number | null;
  invoice_no?: string | null;

  order_id?: number | null;
  product_id?: number | null;
  unit_price?: number | string | null;
  quantity?: number | string | null;
  unit?: number | null;

  total_amount?: number | string | null;
  discount_amount?: number | string | null;
};

type ProductRow = {
  product_id: number;
  product_name?: string | null;
  product_category?: number | null;
  product_brand?: number | null;
  parent_id?: number | null;
};

type CategoryRow = { category_id: number; category_name?: string | null };
type BrandRow = { brand_id: number; brand_name?: string | null };
type UnitRow = { unit_id: number; unit_name?: string | null };

type ProductPerSupplierRow = {
  id: number;
  product_id: number;
  supplier_id?: { id: number; supplier_name?: string | null } | number | null;
};

export type ViewReplicaItemizedRow = {
  invoice_no: string;
  dispatch_plan: string; // group_concat doc_no OR 'unlinked'
  customer_code: string | null;
  customer: string | null;
  dispatch_date: string | null; // DATE ONLY
  salesman: string | null;

  brgy: string | null;
  city: string | null;
  province: string | null;

  sales_type: string | null; // operation_name
  price_type: string | null;

  vat_amount: number;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;

  status: string | null; // si.transaction_status

  product_id: number | null;
  product_name: string | null;
  product_category: string | null;
  product_brand: string | null;
  product_supplier: string | null;

  product_unit_price: number;
  product_quantity: number;
  product_unit: string | null;

  product_total_amount: number;
  product_discount_amount: number;
  product_net_amount: number;
};

export type PendingInvoiceListRow = {
  invoice_no: string;
  invoice_date: string | null; // DATE ONLY
  customer: string | null;
  salesman: string | null;
  net_amount: number;
  dispatch_plan: string;
  pending_status: PendingStatus;
};

export type PendingInvoiceKpis = {
  total_count: number;
  total_amount: number;
  by_status: Record<PendingStatus, { count: number; amount: number }>;
};

function toNum(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? n : 0;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeStr(s: unknown) {
  return (typeof s === "string" ? s : "").trim();
}

/** Convert ISO datetime -> YYYY-MM-DD (keeps YYYY-MM-DD as-is) */
function dateOnlyIso(v: unknown) {
  if (!v) return null;
  const s = String(v);
  if (s.includes("T")) return s.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return s;
  return d.toISOString().split("T")[0];
}

/**
 * Dashboard Pending Status:
 * - Unlinked: no dispatch plan doc
 * - Else mapped by transaction_status (fallback to For Dispatch)
 */
export function derivePendingStatus(dispatch_plan: string, transaction_status: string | null): PendingStatus {
  const dp = normalizeStr(dispatch_plan).toLowerCase();
  if (!dp || dp === "unlinked") return "Unlinked";

  const st = normalizeStr(transaction_status).toLowerCase();
  if (st.includes("clear")) return "Cleared";
  if (st.includes("inbound")) return "Inbound";
  if (st.includes("dispatch")) return "For Dispatch";

  // default when linked but unknown
  return "For Dispatch";
}

export type ListFilters = {
  q?: string;
  status?: PendingStatus | "All";
  salesmanId?: string;
  customerCode?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
};

function startOfDayIso(date: string) {
  return `${date}T00:00:00.000Z`;
}

function nextDayIso(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

async function fetchInvoicesBase(filters: ListFilters) {
  const collection = "/sales_invoice";

  const directusFilter: any = {
    _and: [{ sales_type: { _eq: 1 } }],
  };

  // ✅ include full day range (handles dispatch_date stored as datetime)
  if (filters.dateFrom) {
    directusFilter._and.push({ dispatch_date: { _gte: startOfDayIso(filters.dateFrom) } });
  }
  if (filters.dateTo) {
    // exclusive end = next day 00:00:00Z, so it includes all times within dateTo
    directusFilter._and.push({ dispatch_date: { _lt: nextDayIso(filters.dateTo) } });
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim();
    directusFilter._and.push({
      _or: [{ invoice_no: { _icontains: q } }, { customer_code: { _icontains: q } }],
    });
  }

  const params: Record<string, string> = {
    fields: [
      "invoice_id",
      "invoice_no",
      "order_id",
      "customer_code",
      "dispatch_date",
      "salesman_id",
      "sales_type",
      "vat_amount",
      "gross_amount",
      "discount_amount",
      "net_amount",
      "transaction_status",
    ].join(","),
    sort: "-dispatch_date",
    limit: "-1",
    filter: JSON.stringify(directusFilter),
  };

  const res = await directusGet<DirectusListResponse<PendingInvoiceHeaderRow>>(collection, params);
  return res.data ?? [];
}

async function fetchCustomersByCodes(codes: string[]) {
  if (codes.length === 0) return new Map<string, CustomerRow>();

  const map = new Map<string, CustomerRow>();
  for (const batch of chunk(codes, 200)) {
    const filter = { customer_code: { _in: batch } };
    const res = await directusGet<DirectusListResponse<CustomerRow>>("/customer", {
      fields: "customer_code,customer_name,brgy,city,province",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const r of res.data ?? []) map.set(r.customer_code, r);
  }
  return map;
}

async function fetchSalesmenByIds(ids: number[]) {
  if (ids.length === 0) return new Map<number, SalesmanRow>();

  const map = new Map<number, SalesmanRow>();
  for (const batch of chunk(ids, 200)) {
    const filter = { id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<SalesmanRow>>("/salesman", {
      fields: "id,salesman_name,price_type",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const r of res.data ?? []) map.set(r.id, r);
  }
  return map;
}

async function fetchOperationsByIds(ids: number[]) {
  if (ids.length === 0) return new Map<number, OperationRow>();

  const map = new Map<number, OperationRow>();
  for (const batch of chunk(ids, 200)) {
    const filter = { id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<OperationRow>>("/operation", {
      fields: "id,operation_name",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const r of res.data ?? []) map.set(r.id, r);
  }
  return map;
}

// ✅ Robust 2-step dispatch doc aggregation (works even if relation expansion is not configured)
async function fetchDispatchPlanDocsByInvoiceIds(invoiceIds: number[]) {
  const out = new Map<number, string[]>();
  if (invoiceIds.length === 0) return out;

  type PdiRow = { invoice_id: number; post_dispatch_plan_id?: number | null };
  type PdpRow = { id: number; doc_no?: string | null };

  for (const batch of chunk(invoiceIds, 200)) {
    const pdiFilter = { invoice_id: { _in: batch } };
    const pdiRes = await directusGet<DirectusListResponse<PdiRow>>("/post_dispatch_invoices", {
      fields: "invoice_id,post_dispatch_plan_id",
      limit: "-1",
      filter: JSON.stringify(pdiFilter),
    });

    const pdiRows = pdiRes.data ?? [];
    const planIds = uniq(
      pdiRows
        .map((r) => r.post_dispatch_plan_id ?? null)
        .filter((x): x is number => Number.isFinite(x as any))
    );

    const planDocMap = new Map<number, string>();
    if (planIds.length > 0) {
      for (const planBatch of chunk(planIds, 200)) {
        const pdpFilter = { id: { _in: planBatch } };
        const pdpRes = await directusGet<DirectusListResponse<PdpRow>>("/post_dispatch_plan", {
          fields: "id,doc_no",
          limit: "-1",
          filter: JSON.stringify(pdpFilter),
        });

        for (const p of pdpRes.data ?? []) {
          const doc = normalizeStr(p.doc_no);
          if (doc) planDocMap.set(p.id, doc);
        }
      }
    }

    for (const r of pdiRows) {
      const invId = r.invoice_id;
      const planId = r.post_dispatch_plan_id ?? null;
      if (!Number.isFinite(invId as any) || !planId) continue;

      const doc = planDocMap.get(planId);
      if (!doc) continue;

      const arr = out.get(invId) ?? [];
      arr.push(doc);
      out.set(invId, arr);
    }
  }

  for (const [k, arr] of out.entries()) {
    const uniqueSorted = uniq(arr).sort((a, b) => a.localeCompare(b));
    out.set(k, uniqueSorted);
  }

  return out;
}

export async function listPendingInvoices(filters: ListFilters) {
  const invoices = await fetchInvoicesBase(filters);

  const customerCodes = uniq(invoices.map((i) => i.customer_code).filter(Boolean) as string[]);
  const salesmanIds = uniq(invoices.map((i) => i.salesman_id).filter((x): x is number => Number.isFinite(x as any)));

  const customersMap = await fetchCustomersByCodes(customerCodes);
  const salesmenMap = await fetchSalesmenByIds(salesmanIds);

  const invoiceIds = invoices.map((i) => i.invoice_id).filter((x): x is number => Number.isFinite(x as any));
  const dispatchDocsMap = await fetchDispatchPlanDocsByInvoiceIds(invoiceIds);

  let rows: PendingInvoiceListRow[] = invoices.map((inv) => {
    const cust = inv.customer_code ? customersMap.get(inv.customer_code) : undefined;
    const sm = inv.salesman_id ? salesmenMap.get(inv.salesman_id) : undefined;

    const docs = dispatchDocsMap.get(inv.invoice_id) ?? [];
    const dispatch_plan = docs.length ? docs.join(", ") : "unlinked";

    const salesman = sm ? `${sm.id} - ${sm.salesman_name ?? ""}`.trim() : null;
    const pending_status = derivePendingStatus(dispatch_plan, inv.transaction_status ?? null);

    return {
      invoice_no: inv.invoice_no,
      invoice_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
      customer: cust?.customer_name ?? null,
      salesman,
      net_amount: toNum(inv.net_amount),
      dispatch_plan,
      pending_status,
    };
  });

  if (filters.salesmanId && filters.salesmanId !== "All") {
    rows = rows.filter((r) => normalizeStr(r.salesman).startsWith(`${filters.salesmanId} -`));
  }
  if (filters.customerCode && filters.customerCode !== "All") {
    rows = rows.filter((r) => normalizeStr(r.customer ?? "").length > 0);
  }
  if (filters.status && filters.status !== "All") {
    rows = rows.filter((r) => r.pending_status === filters.status);
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter((r) => {
      return (
        r.invoice_no.toLowerCase().includes(q) ||
        (r.customer ?? "").toLowerCase().includes(q) ||
        (r.salesman ?? "").toLowerCase().includes(q) ||
        (r.dispatch_plan ?? "").toLowerCase().includes(q)
      );
    });
  }

  const by_status: PendingInvoiceKpis["by_status"] = {
    Unlinked: { count: 0, amount: 0 },
    "For Dispatch": { count: 0, amount: 0 },
    Inbound: { count: 0, amount: 0 },
    Cleared: { count: 0, amount: 0 },
  };

  for (const r of rows) {
    by_status[r.pending_status].count += 1;
    by_status[r.pending_status].amount += r.net_amount;
  }

  const kpis: PendingInvoiceKpis = {
    total_count: rows.length,
    total_amount: rows.reduce((sum, r) => sum + r.net_amount, 0),
    by_status,
  };

  const pageSize =
    Number.isFinite(filters.pageSize) && (filters.pageSize as number) > 0 ? (filters.pageSize as number) : 25;
  const page = Number.isFinite(filters.page) && (filters.page as number) > 0 ? (filters.page as number) : 1;
  const total = rows.length;
  const start = (page - 1) * pageSize;
  const paged = rows.slice(start, start + pageSize);

  return { rows: paged, total, kpis };
}

/**
 * Itemized replica:
 * returns rows matching the SQL view output (one row per invoice line).
 */
export async function fetchItemizedReplica(filters: ListFilters): Promise<ViewReplicaItemizedRow[]> {
  const invoicesAll = await fetchInvoicesBase(filters);

  const customerCodes = uniq(invoicesAll.map((i) => i.customer_code).filter(Boolean) as string[]);
  const salesmanIds = uniq(
    invoicesAll.map((i) => i.salesman_id).filter((x): x is number => Number.isFinite(Number(x)))
  );
  const operationIds = uniq(
    invoicesAll.map((i) => i.sales_type).filter((x): x is number => Number.isFinite(Number(x)))
  );

  const customersMap = await fetchCustomersByCodes(customerCodes);
  const salesmenMap = await fetchSalesmenByIds(salesmanIds);
  const operationsMap = await fetchOperationsByIds(operationIds);

  const invoiceIdsAll = invoicesAll.map((i) => i.invoice_id).filter((x): x is number => Number.isFinite(Number(x)));
  const dispatchDocsMap = await fetchDispatchPlanDocsByInvoiceIds(invoiceIdsAll);

  let invoices = invoicesAll;

  if (filters.salesmanId && filters.salesmanId !== "All") {
    const sid = Number(filters.salesmanId);
    invoices = invoices.filter((inv) => Number(inv.salesman_id) === sid);
  }

  if (filters.customerCode && filters.customerCode !== "All") {
    invoices = invoices.filter((inv) => (inv.customer_code ?? "") === filters.customerCode);
  }

  if (filters.status && filters.status !== "All") {
    invoices = invoices.filter((inv) => {
      const docs = dispatchDocsMap.get(inv.invoice_id) ?? [];
      const dispatch_plan = docs.length ? docs.join(", ") : "unlinked";
      const pending = derivePendingStatus(dispatch_plan, inv.transaction_status ?? null);
      return pending === filters.status;
    });
  }

  const invoiceIds = invoices.map((i) => i.invoice_id).filter((x): x is number => Number.isFinite(Number(x)));

  // ✅ invoice_no stores invoice_id (often string in Directus)
  const details: SalesInvoiceDetailRow[] = [];
  for (const batch of chunk(invoiceIds, 150)) {
    const batchAsStrings = batch.map(String);
    const filter = { invoice_no: { _in: batchAsStrings } };

    const res = await directusGet<DirectusListResponse<SalesInvoiceDetailRow>>("/sales_invoice_details", {
      fields: "id,invoice_no,order_id,product_id,unit_price,quantity,unit,total_amount,discount_amount",
      limit: "-1",
      filter: JSON.stringify(filter),
    });

    details.push(...(res.data ?? []));
  }

  const detailsByKey = new Map<string, SalesInvoiceDetailRow[]>();
  for (const d of details) {
    const invIdRaw = (d as any).invoice_no;
    const invId = typeof invIdRaw === "string" ? Number(invIdRaw) : Number(invIdRaw);
    const ordId = typeof (d as any).order_id === "string" ? Number((d as any).order_id) : Number((d as any).order_id);

    if (!Number.isFinite(invId)) continue;
    if (!Number.isFinite(ordId)) continue;

    const key = `${invId}:${ordId}`;
    const arr = detailsByKey.get(key) ?? [];
    arr.push(d);
    detailsByKey.set(key, arr);
  }

  const productIds = uniq(details.map((d) => d.product_id).filter((x): x is number => Number.isFinite(Number(x))));

  const productsMap = new Map<number, ProductRow>();
  for (const batch of chunk(productIds, 200)) {
    const filter = { product_id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<ProductRow>>("/products", {
      fields: "product_id,product_name,product_category,product_brand,parent_id",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const p of res.data ?? []) productsMap.set(p.product_id, p);
  }

  const categoryIds = uniq(
    Array.from(productsMap.values())
      .map((p) => p.product_category)
      .filter((x): x is number => Number.isFinite(Number(x)))
  );

  const brandIds = uniq(
    Array.from(productsMap.values())
      .map((p) => p.product_brand)
      .filter((x): x is number => Number.isFinite(Number(x)))
  );

  const categoriesMap = new Map<number, CategoryRow>();
  for (const batch of chunk(categoryIds, 200)) {
    const filter = { category_id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<CategoryRow>>("/categories", {
      fields: "category_id,category_name",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const c of res.data ?? []) categoriesMap.set(c.category_id, c);
  }

  const brandsMap = new Map<number, BrandRow>();
  for (const batch of chunk(brandIds, 200)) {
    const filter = { brand_id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<BrandRow>>("/brand", {
      fields: "brand_id,brand_name",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const b of res.data ?? []) brandsMap.set(b.brand_id, b);
  }

  const unitIds = uniq(details.map((d) => d.unit).filter((x): x is number => Number.isFinite(Number(x))));
  const unitsMap = new Map<number, UnitRow>();
  for (const batch of chunk(unitIds, 200)) {
    const filter = { unit_id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<UnitRow>>("/units", {
      fields: "unit_id,unit_name",
      limit: "-1",
      filter: JSON.stringify(filter),
    });
    for (const u of res.data ?? []) unitsMap.set(u.unit_id, u);
  }

  const parentOrSelfIds = uniq(
    Array.from(productsMap.values())
      .map((p) => (p.parent_id ? p.parent_id : p.product_id))
      .filter((x): x is number => Number.isFinite(Number(x)))
  );

  const supplierNameByProduct = new Map<number, string>();
  for (const batch of chunk(parentOrSelfIds, 150)) {
    const filter = { product_id: { _in: batch } };
    const res = await directusGet<DirectusListResponse<ProductPerSupplierRow>>("/product_per_supplier", {
      fields: "id,product_id,supplier_id.id,supplier_id.supplier_name",
      sort: "id",
      limit: "-1",
      filter: JSON.stringify(filter),
    });

    for (const pps of res.data ?? []) {
      const pid = Number((pps as any).product_id);
      if (!Number.isFinite(pid) || supplierNameByProduct.has(pid)) continue;

      let name = "";
      const sup = (pps as any).supplier_id;
      if (typeof sup === "object" && sup) name = normalizeStr(sup.supplier_name);
      if (name) supplierNameByProduct.set(pid, name);
    }
  }

  const out: ViewReplicaItemizedRow[] = [];

  for (const inv of invoices) {
    const cust = inv.customer_code ? customersMap.get(inv.customer_code) : undefined;
    const sm = inv.salesman_id ? salesmenMap.get(inv.salesman_id) : undefined;
    const op = inv.sales_type ? operationsMap.get(inv.sales_type) : undefined;

    const docs = dispatchDocsMap.get(inv.invoice_id) ?? [];
    const dispatch_plan = docs.length ? docs.join(", ") : "unlinked";

    const invIdNum = Number(inv.invoice_id);
    const ordIdNum = Number(inv.order_id);

    if (!Number.isFinite(invIdNum) || !Number.isFinite(ordIdNum)) continue;

    const key = `${invIdNum}:${ordIdNum}`;
    const lines = detailsByKey.get(key) ?? [];

    for (const line of lines) {
      const product = line.product_id ? productsMap.get(line.product_id) : undefined;
      const cat = product?.product_category ? categoriesMap.get(product.product_category) : undefined;
      const br = product?.product_brand ? brandsMap.get(product.product_brand) : undefined;

      const parentOrSelf = product ? (product.parent_id ? product.parent_id : product.product_id) : null;
      const supplier = parentOrSelf ? supplierNameByProduct.get(parentOrSelf) ?? null : null;

      const unit = line.unit ? unitsMap.get(line.unit)?.unit_name ?? null : null;

      const total = toNum(line.total_amount);
      const disc = toNum(line.discount_amount);
      const net = total - disc;

      out.push({
        invoice_no: inv.invoice_no,
        dispatch_plan,
        customer_code: inv.customer_code ?? null,
        customer: cust?.customer_name ?? null,
        dispatch_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
        salesman: sm ? `${sm.id} - ${sm.salesman_name ?? ""}`.trim() : null,

        brgy: cust?.brgy ?? null,
        city: cust?.city ?? null,
        province: cust?.province ?? null,

        sales_type: op?.operation_name ?? null,
        price_type: sm?.price_type ?? null,

        vat_amount: toNum(inv.vat_amount),
        gross_amount: toNum(inv.gross_amount),
        discount_amount: toNum(inv.discount_amount),
        net_amount: toNum(inv.net_amount),

        status: inv.transaction_status ?? null,

        product_id: line.product_id ?? null,
        product_name: product?.product_name ?? null,
        product_category: cat?.category_name ?? null,
        product_brand: br?.brand_name ?? null,
        product_supplier: supplier,

        product_unit_price: toNum(line.unit_price),
        product_quantity: toNum(line.quantity),
        product_unit: unit,

        product_total_amount: total,
        product_discount_amount: disc,
        product_net_amount: net,
      });
    }
  }

  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    return out.filter((r) => {
      return (
        r.invoice_no.toLowerCase().includes(q) ||
        (r.customer ?? "").toLowerCase().includes(q) ||
        (r.salesman ?? "").toLowerCase().includes(q) ||
        (r.dispatch_plan ?? "").toLowerCase().includes(q) ||
        (r.product_name ?? "").toLowerCase().includes(q)
      );
    });
  }

  return out;
}

// ✅ Invoice details fetch using sid.invoice_no = si.invoice_id AND sid.order_id = si.order_id
export async function fetchInvoiceDetails(invoiceNo: string) {
  const filter = { _and: [{ sales_type: { _eq: 1 } }, { invoice_no: { _eq: invoiceNo } }] };

  const invRes = await directusGet<DirectusListResponse<PendingInvoiceHeaderRow>>("/sales_invoice", {
    fields:
      "invoice_id,invoice_no,order_id,customer_code,dispatch_date,salesman_id,sales_type,vat_amount,gross_amount,discount_amount,net_amount,transaction_status",
    limit: "1",
    filter: JSON.stringify(filter),
  });

  const inv = (invRes.data ?? [])[0];
  if (!inv) return null;

  const customersMap = await fetchCustomersByCodes(inv.customer_code ? [inv.customer_code] : []);
  const salesmenMap = await fetchSalesmenByIds(inv.salesman_id ? [inv.salesman_id] : []);
  const opsMap = await fetchOperationsByIds(inv.sales_type ? [inv.sales_type] : []);

  const dispatchDocsMap = await fetchDispatchPlanDocsByInvoiceIds([inv.invoice_id]);
  const docs = dispatchDocsMap.get(inv.invoice_id) ?? [];
  const dispatch_plan = docs.length ? docs.join(", ") : "unlinked";

  const invIdNum = Number(inv.invoice_id);
  const ordIdNum = Number(inv.order_id);

  if (!Number.isFinite(invIdNum) || !Number.isFinite(ordIdNum)) {
    const cust = inv.customer_code ? customersMap.get(inv.customer_code) : undefined;
    const sm = inv.salesman_id ? salesmenMap.get(inv.salesman_id) : undefined;
    const op = inv.sales_type ? opsMap.get(inv.sales_type) : undefined;

    return {
      header: {
        invoice_no: inv.invoice_no,
        invoice_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
        dispatch_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
        customer_code: inv.customer_code ?? null,
        customer_name: cust?.customer_name ?? null,
        address: [cust?.brgy, cust?.city, cust?.province].filter(Boolean).join(", "),
        salesman: sm ? `${sm.id} - ${sm.salesman_name ?? ""}`.trim() : null,
        sales_type: op?.operation_name ?? null,
        price_type: sm?.price_type ?? null,
        status: derivePendingStatus(dispatch_plan, inv.transaction_status ?? null),
        dispatch_plan,
      },
      lines: [],
      summary: {
        discount: toNum(inv.discount_amount),
        vatable: toNum(inv.net_amount) - toNum(inv.vat_amount),
        net: toNum(inv.net_amount),
        vat: toNum(inv.vat_amount),
        total: toNum(inv.net_amount),
        balance: toNum(inv.net_amount),
      },
    };
  }

  const detailsFilter: any = {
    _and: [{ invoice_no: { _eq: String(invIdNum) } }, { order_id: { _eq: ordIdNum } }],
  };

  const detailsRes = await directusGet<DirectusListResponse<SalesInvoiceDetailRow>>("/sales_invoice_details", {
    fields: "id,invoice_no,order_id,product_id,unit_price,quantity,unit,total_amount,discount_amount",
    limit: "-1",
    filter: JSON.stringify(detailsFilter),
  });
  const lines = detailsRes.data ?? [];

  const productIds = uniq(lines.map((d) => d.product_id).filter((x): x is number => Number.isFinite(Number(x))));
  const productsMap = new Map<number, ProductRow>();
  if (productIds.length) {
    const prodRes = await directusGet<DirectusListResponse<ProductRow>>("/products", {
      fields: "product_id,product_name,product_category,product_brand,parent_id",
      limit: "-1",
      filter: JSON.stringify({ product_id: { _in: productIds } }),
    });
    for (const p of prodRes.data ?? []) productsMap.set(p.product_id, p);
  }

  const unitIds = uniq(lines.map((d) => d.unit).filter((x): x is number => Number.isFinite(Number(x))));
  const unitsMap = new Map<number, UnitRow>();
  if (unitIds.length) {
    const unitRes = await directusGet<DirectusListResponse<UnitRow>>("/units", {
      fields: "unit_id,unit_name",
      limit: "-1",
      filter: JSON.stringify({ unit_id: { _in: unitIds } }),
    });
    for (const u of unitRes.data ?? []) unitsMap.set(u.unit_id, u);
  }

  const customer = inv.customer_code ? customersMap.get(inv.customer_code) : undefined;
  const salesman = inv.salesman_id ? salesmenMap.get(inv.salesman_id) : undefined;
  const op = inv.sales_type ? opsMap.get(inv.sales_type) : undefined;

  const detailRows = lines.map((l) => {
    const product = l.product_id ? productsMap.get(l.product_id) : undefined;
    const unitName = l.unit ? unitsMap.get(l.unit)?.unit_name ?? null : null;

    const gross = toNum(l.total_amount);
    const disc = toNum(l.discount_amount);
    const net = gross - disc;

    return {
      id: l.id,
      product_id: l.product_id ?? null,
      product_name: product?.product_name ?? null,
      unit: unitName,
      qty: toNum(l.quantity),
      price: toNum(l.unit_price),
      gross,
      disc_type: disc > 0 ? "Discount" : "No Discount",
      disc_amt: disc,
      net_total: net,
    };
  });

  const summary = {
    discount: toNum(inv.discount_amount),
    vatable: toNum(inv.net_amount) - toNum(inv.vat_amount),
    net: toNum(inv.net_amount),
    vat: toNum(inv.vat_amount),
    total: toNum(inv.net_amount),
    balance: toNum(inv.net_amount),
  };

  return {
    header: {
      invoice_no: inv.invoice_no,
      invoice_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
      dispatch_date: dateOnlyIso(inv.dispatch_date), // ✅ DATE ONLY
      customer_code: inv.customer_code ?? null,
      customer_name: customer?.customer_name ?? null,
      address: [customer?.brgy, customer?.city, customer?.province].filter(Boolean).join(", "),
      salesman: salesman ? `${salesman.id} - ${salesman.salesman_name ?? ""}`.trim() : null,
      sales_type: op?.operation_name ?? null,
      price_type: salesman?.price_type ?? null,
      status: derivePendingStatus(dispatch_plan, inv.transaction_status ?? null),
      dispatch_plan,
    },
    lines: detailRows,
    summary,
  };
}
