import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const RAW_DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asDateOnly(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw);
  // keep raw if already "YYYY-MM-DD"
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

async function fetchAllItems(collection: string): Promise<AnyRecord[]> {
  // Paging to avoid limit=-1 issues
  const pageSize = 2000;
  let page = 1;
  const out: AnyRecord[] = [];

  while (true) {
    const url = `${DIRECTUS_BASE}/items/${collection}?limit=${pageSize}&page=${page}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return out;
    const json = await res.json();
    const rows: AnyRecord[] = json?.data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    page += 1;
    if (page > 50) break; // safety cap
  }

  return out;
}

function normalizeStatus(s: string, dispatchPlan: string): "Unlinked" | "For Dispatch" | "Inbound" | "Cleared" {
  const dp = (dispatchPlan || "").toLowerCase();
  if (!dp || dp === "unlinked") return "Unlinked";

  const x = String(s || "").trim().toLowerCase();
  if (x === "for dispatch" || x === "for_dispatch") return "For Dispatch";
  if (x === "inbound") return "Inbound";
  if (x === "cleared") return "Cleared";

  // fallback: treat unknown but linked as For Dispatch
  return "For Dispatch";
}

const COLORS = ["#64748b", "#2563eb", "#ea580c", "#16a34a"]; // unlinked, for dispatch, inbound, cleared
const STATUS_ORDER: Array<"Unlinked" | "For Dispatch" | "Inbound" | "Cleared"> = ["Unlinked", "For Dispatch", "Inbound", "Cleared"];

export async function GET(req: Request) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json({ error: "Missing NEXT_PUBLIC_API_BASE_URL / DIRECTUS_URL" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.max(1, Number(searchParams.get("limit") || 20));

    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = (searchParams.get("status") || "all").trim();
    const salesmanId = (searchParams.get("salesmanId") || "all").trim();
    const customerCode = (searchParams.get("customerCode") || "all").trim();
    const dateFrom = (searchParams.get("dateFrom") || "").trim(); // YYYY-MM-DD
    const dateTo = (searchParams.get("dateTo") || "").trim();     // YYYY-MM-DD

    // Collections referenced by your view
    const [
      salesInvoice,
      salesInvoiceDetails,
      customer,
      salesman,
      operation,

      postDispatchInvoices,
      postDispatchPlan,
    ] = await Promise.all([
      fetchAllItems("sales_invoice"),
      fetchAllItems("sales_invoice_details"),
      fetchAllItems("customer"),
      fetchAllItems("salesman"),
      fetchAllItems("operation"),

      fetchAllItems("post_dispatch_invoices"),
      fetchAllItems("post_dispatch_plan"),
    ]);

    // Maps
    const customerByCode = new Map<string, AnyRecord>();
    for (const c of customer) customerByCode.set(String(c.customer_code), c);

    const salesmanById = new Map<number, AnyRecord>();
    for (const s of salesman) salesmanById.set(Number(s.id), s);

    const operationById = new Map<number, AnyRecord>();
    for (const o of operation) operationById.set(Number(o.id), o);

    const pdpById = new Map<number, AnyRecord>();
    for (const p of postDispatchPlan) pdpById.set(Number(p.id), p);

    // dispatch plan doc_no list by invoice_id
    const dpDocsByInvoiceId = new Map<string, Set<string>>();
    for (const pdi of postDispatchInvoices) {
      const invoiceId = pdi?.invoice_id;
      const planId = pdi?.post_dispatch_plan_id;
      if (invoiceId == null || planId == null) continue;

      const dp = pdpById.get(Number(planId));
      const docNo = dp?.doc_no;
      if (!docNo) continue;

      const key = String(invoiceId);
      if (!dpDocsByInvoiceId.has(key)) dpDocsByInvoiceId.set(key, new Set());
      dpDocsByInvoiceId.get(key)!.add(String(docNo));
    }

    // We need invoice-level list (dedupe invoice_no).
    // We'll build a map keyed by invoice_no, and use header.net_amount.
    const invoiceByNo = new Map<string, AnyRecord>();
    for (const si of salesInvoice) {
      const invNo = si?.invoice_no;
      if (!invNo) continue;
      invoiceByNo.set(String(invNo), si);
    }

    // If your table should include only invoices that have details, keep it aligned to view’s join:
    // We'll collect invoice_nos that appear in details.
    const invoiceNosWithDetails = new Set<string>();
    for (const d of salesInvoiceDetails) {
      const invKey = d?.invoice_no ?? d?.invoice_id ?? d?.sales_invoice_id;
      if (invKey == null) continue;

      // best-effort mapping:
      // - if invKey matches header.invoice_id -> we map to that header's invoice_no
      const headerMatch =
        salesInvoice.find((h) => String(h.invoice_id) === String(invKey)) ||
        salesInvoice.find((h) => String(h.invoice_no) === String(invKey));

      if (headerMatch?.invoice_no) invoiceNosWithDetails.add(String(headerMatch.invoice_no));
    }

    // Build rows
    const rows: any[] = [];

    for (const [invoiceNo, header] of invoiceByNo.entries()) {
      // keep alignment with view: must have at least one detail row
      if (invoiceNosWithDetails.size > 0 && !invoiceNosWithDetails.has(invoiceNo)) continue;

      const invoiceIdKey = header?.invoice_id != null ? String(header.invoice_id) : "";

      const dpSet = invoiceIdKey ? dpDocsByInvoiceId.get(invoiceIdKey) : undefined;
      const dispatchPlan =
        dpSet && dpSet.size
          ? Array.from(dpSet).sort((a, b) => a.localeCompare(b)).join(", ")
          : "unlinked";

      const custCode = header?.customer_code ?? null;
      const cust = custCode ? customerByCode.get(String(custCode)) : null;

      const sm = header?.salesman_id != null ? salesmanById.get(Number(header.salesman_id)) : null;
      const op = header?.sales_type != null ? operationById.get(Number(header.sales_type)) : null;

      const normalizedStatus = normalizeStatus(header?.transaction_status, dispatchPlan);

      const invoiceDateRaw = header?.invoice_date ?? header?.transaction_date ?? header?.dispatch_date ?? null;

      const r = {
        invoice_no: invoiceNo,
        invoice_date: asDateOnly(invoiceDateRaw),
        customer_code: custCode ? String(custCode) : null,
        customer: cust?.customer_name || "Unknown",
        salesman_id: sm?.id != null ? Number(sm.id) : null,
        salesman: sm ? `${sm.id} - ${sm.salesman_name}` : "Unknown",
        net_amount: safeNum(header?.net_amount),
        dispatch_plan: dispatchPlan,
        status: normalizedStatus,
      };

      // Filtering
      if (salesmanId !== "all" && String(r.salesman_id ?? "") !== salesmanId) continue;
      if (customerCode !== "all" && String(r.customer_code ?? "") !== customerCode) continue;
      if (statusFilter !== "all" && r.status !== statusFilter) continue;

      if (dateFrom) {
        const d = String(r.invoice_date || "");
        if (d && d < dateFrom) continue;
      }
      if (dateTo) {
        const d = String(r.invoice_date || "");
        if (d && d > dateTo) continue;
      }

      if (search) {
        const hay = [
          r.invoice_no,
          r.customer,
          r.salesman,
          r.dispatch_plan,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(search)) continue;
      }

      rows.push(r);
    }

    // Sort by invoice_date desc then invoice_no
    rows.sort((a: any, b: any) => {
      const ad = String(a.invoice_date || "");
      const bd = String(b.invoice_date || "");
      if (ad !== bd) return bd.localeCompare(ad);
      return String(b.invoice_no).localeCompare(String(a.invoice_no));
    });

    // Aggregations
    const countByStatus = new Map<string, number>();
    const amountByStatus = new Map<string, number>();
    let totalAmount = 0;

    for (const r of rows) {
      countByStatus.set(r.status, (countByStatus.get(r.status) || 0) + 1);
      amountByStatus.set(r.status, (amountByStatus.get(r.status) || 0) + safeNum(r.net_amount));
      totalAmount += safeNum(r.net_amount);
    }

    const kpis = {
      totalPending: rows.length,
      unlinked: countByStatus.get("Unlinked") || 0,
      forDispatch: countByStatus.get("For Dispatch") || 0,
      inbound: countByStatus.get("Inbound") || 0,
      cleared: countByStatus.get("Cleared") || 0,
    };

    const statusCounts = STATUS_ORDER.map((s, i) => ({
      name: s,
      value: countByStatus.get(s) || 0,
      fill: COLORS[i] || "#94a3b8",
    })).filter(x => x.value > 0 || rows.length === 0);

    const statusAmounts = STATUS_ORDER.map((s, i) => ({
      name: s,
      value: Number((amountByStatus.get(s) || 0).toFixed(2)),
      fill: COLORS[i] || "#94a3b8",
    })).filter(x => x.value > 0 || rows.length === 0);

    // Pagination
    const start = (page - 1) * limit;
    const paged = rows.slice(start, start + limit);

    return NextResponse.json({
      data: paged,
      meta: {
        total: rows.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(rows.length / limit)),
      },
      kpis,
      aggregations: {
        statusCounts,
        statusAmounts,
        totalAmount: Number(totalAmount.toFixed(2)),
      },
    });
  } catch (e: any) {
    console.error("pending-invoices api error", e);
    return NextResponse.json({ error: e?.message || "Internal Server Error" }, { status: 500 });
  }
}
