// src/app/api/pending-invoices/[invoiceNo]/route.ts
// NOTE:
// - This works even if your dynamic folder name is NOT exactly [invoiceNo].
// - It does NOT rely on ctx.params; it will fall back to parsing the invoice no from the request URL.

import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const RAW_DIRECTUS_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "";

// Normalize to: http(s)://host:port  (no trailing slash, no "/items")
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "").replace(/\/items$/i, "");

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function decodeSafe(v: any): string {
  try {
    return decodeURIComponent(String(v ?? "")).trim();
  } catch {
    return String(v ?? "").trim();
  }
}

/**
 * Bulletproof invoice no resolver:
 * 1) tries ctx.params (any key)
 * 2) tries query string (invoiceNo / invoice_no)
 * 3) tries last path segment
 */
function extractInvoiceNo(req: Request, params?: Record<string, any>): string {
  const p = params || {};

  // 1) Known keys + hyphenated keys + any first param value fallback
  let raw: any =
    p.invoiceNo ??
    p.invoice_no ??
    p.id ??
    p.slug ??
    p["invoice-no"] ??
    p["invoice_number"] ??
    p["invoice-number"] ??
    "";

  // catch-all param can be string[]
  if (Array.isArray(raw)) raw = raw[raw.length - 1] ?? "";

  // if still empty, grab first param value (covers any folder name)
  if (raw == null || String(raw).trim() === "") {
    const firstVal = Object.values(p)[0];
    raw = firstVal ?? "";
    if (Array.isArray(raw)) raw = raw[raw.length - 1] ?? "";
  }

  const url = new URL(req.url);

  // 2) Query fallback
  if (!raw) {
    raw =
      url.searchParams.get("invoiceNo") ||
      url.searchParams.get("invoice_no") ||
      "";
  }

  // 3) Path fallback: last segment
  if (!raw) {
    const parts = url.pathname.split("/").filter(Boolean);
    raw = parts[parts.length - 1] || "";
  }

  const invoiceNo = decodeSafe(raw);

  // Guard: sometimes last segment becomes "pending-invoices" if URL is wrong
  if (!invoiceNo || invoiceNo.toLowerCase() === "pending-invoices") return "";

  return invoiceNo;
}

async function fetchAllItems(collection: string): Promise<AnyRecord[]> {
  if (!DIRECTUS_BASE) return [];

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
    if (page > 100) break; // safety
  }

  return out;
}

function normalizeStatus(
  rawStatus: string,
  dispatchPlan: string
): "Unlinked" | "For Dispatch" | "Inbound" | "Cleared" {
  const dp = String(dispatchPlan || "").trim().toLowerCase();
  if (!dp || dp === "unlinked") return "Unlinked";

  const s = String(rawStatus || "").trim().toLowerCase();
  if (s === "cleared") return "Cleared";
  if (s === "inbound") return "Inbound";
  if (s === "for dispatch" || s === "for_dispatch") return "For Dispatch";

  // default when linked but status is unknown
  return "For Dispatch";
}

export async function GET(req: Request, ctx: { params?: Record<string, any> }) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        {
          error:
            "Missing API base url. Set NEXT_PUBLIC_API_BASE_URL (preferred) or DIRECTUS_URL.",
        },
        { status: 500 }
      );
    }

    const invoiceNo = extractInvoiceNo(req, ctx?.params);

    // Debug log (server console)
    console.log("pending-invoices details:", {
      params: ctx?.params ?? null,
      url: req.url,
      resolvedInvoiceNo: invoiceNo,
    });

    if (!invoiceNo) {
      return NextResponse.json(
        {
          error: "Missing invoice number in route param.",
          debug: { params: ctx?.params ?? null, url: req.url },
        },
        { status: 400 }
      );
    }

    // Fetch all collections used by your MySQL view
    const [
      salesInvoice,
      salesInvoiceDetails,
      customer,
      salesman,
      operation,
      products,
      categories,
      brand,
      units,
      productPerSupplier,
      suppliers,
      postDispatchInvoices,
      postDispatchPlan,
    ] = await Promise.all([
      fetchAllItems("sales_invoice"),
      fetchAllItems("sales_invoice_details"),
      fetchAllItems("customer"),
      fetchAllItems("salesman"),
      fetchAllItems("operation"),
      fetchAllItems("products"),
      fetchAllItems("categories"),
      fetchAllItems("brand"),
      fetchAllItems("units"),
      fetchAllItems("product_per_supplier"),
      fetchAllItems("suppliers"),
      fetchAllItems("post_dispatch_invoices"),
      fetchAllItems("post_dispatch_plan"),
    ]);

    // Find invoice header by invoice_no (view selects si.invoice_no)
    const header =
      (salesInvoice || []).find((x) => String(x.invoice_no) === invoiceNo) ||
      null;

    if (!header) {
      return NextResponse.json(
        { error: `Invoice not found: ${invoiceNo}` },
        { status: 404 }
      );
    }

    // Maps
    const customerByCode = new Map<string, AnyRecord>();
    for (const c of customer || []) customerByCode.set(String(c.customer_code), c);

    const salesmanById = new Map<number, AnyRecord>();
    for (const s of salesman || []) salesmanById.set(Number(s.id), s);

    const operationById = new Map<number, AnyRecord>();
    for (const o of operation || []) operationById.set(Number(o.id), o);

    const productById = new Map<number, AnyRecord>();
    for (const p of products || []) productById.set(Number(p.product_id), p);

    const categoryById = new Map<number, AnyRecord>();
    for (const c of categories || []) {
      categoryById.set(Number(c.category_id ?? c.id), c);
    }

    const brandById = new Map<number, AnyRecord>();
    for (const b of brand || []) {
      brandById.set(Number(b.brand_id ?? b.id), b);
    }

    const unitById = new Map<number, AnyRecord>();
    for (const u of units || []) {
      unitById.set(Number(u.unit_id ?? u.id), u);
    }

    const supplierById = new Map<number, AnyRecord>();
    for (const s of suppliers || []) supplierById.set(Number(s.id), s);

    // Replicate view's product_supplier subquery:
    // supplier = first supplier for (IFNULL(p.parent_id, p.product_id)) ordered by pps.id ASC limit 1
    const bestSupplierByBaseProduct = new Map<number, { ppsId: number; name: string }>();
    for (const row of productPerSupplier || []) {
      const basePid = Number(row.product_id);
      const supId = Number(row.supplier_id);
      const ppsId = Number(row.id);
      if (!basePid || !supId || !ppsId) continue;

      const sup = supplierById.get(supId);
      const name = sup?.supplier_name ? String(sup.supplier_name) : "";
      if (!name) continue;

      const cur = bestSupplierByBaseProduct.get(basePid);
      if (!cur || ppsId < cur.ppsId) bestSupplierByBaseProduct.set(basePid, { ppsId, name });
    }

    // Dispatch plan docs concat per invoice_id
    const pdpById = new Map<number, AnyRecord>();
    for (const p of postDispatchPlan || []) pdpById.set(Number(p.id), p);

    const dpSet = new Set<string>();
    const headerInvoiceId = header?.invoice_id;

    for (const pdi of postDispatchInvoices || []) {
      if (headerInvoiceId == null) continue;
      if (String(pdi.invoice_id) !== String(headerInvoiceId)) continue;

      const dp = pdpById.get(Number(pdi.post_dispatch_plan_id));
      if (dp?.doc_no) dpSet.add(String(dp.doc_no));
    }

    const dispatchPlan =
      dpSet.size > 0
        ? Array.from(dpSet).sort((a, b) => a.localeCompare(b)).join(", ")
        : "unlinked";

    // Header joins
    const cust = customerByCode.get(String(header.customer_code));
    const sm = salesmanById.get(Number(header.salesman_id));
    const op = operationById.get(Number(header.sales_type));

    const location =
      [cust?.brgy, cust?.city, cust?.province].filter(Boolean).join(", ") || "-";

    const status = normalizeStatus(String(header.transaction_status ?? ""), dispatchPlan);

    // Details join condition from your view:
    // sid.invoice_no = si.invoice_id AND sid.order_id = si.order_id
    const orderId = header?.order_id;

    const details = (salesInvoiceDetails || []).filter((d) => {
      const invKey = d.invoice_no ?? d.invoice_id ?? d.sales_invoice_id;
      const okInv =
        headerInvoiceId != null
          ? String(invKey) === String(headerInvoiceId)
          : false;

      const okOrder =
        orderId != null ? String(d.order_id ?? "") === String(orderId) : true;

      return okInv && okOrder;
    });

    const lines = details.map((d) => {
      const prod = productById.get(Number(d.product_id));
      const productId = Number(d.product_id);

      const unitName = unitById.get(Number(d.unit))?.unit_name || "Unit";

      const parentIdRaw = prod?.parent_id;
      const basePid =
        parentIdRaw != null && Number(parentIdRaw) !== 0
          ? Number(parentIdRaw)
          : Number(prod?.product_id ?? productId);

      const supplierName = bestSupplierByBaseProduct.get(basePid)?.name || "Unknown";

      const cat = categoryById.get(Number(prod?.product_category));
      const br = brandById.get(Number(prod?.product_brand));

      const gross = safeNum(d.total_amount);
      const discAmt = safeNum(d.discount_amount);
      const net = gross - discAmt;

      return {
        product_id: productId,
        product_code: String(prod?.product_code ?? productId ?? "-"),
        product_name: String(prod?.product_name ?? "Unknown"),
        product_category: String(cat?.category_name ?? "-"),
        product_brand: String(br?.brand_name ?? "-"),
        product_supplier: supplierName,

        unit: unitName,
        qty: safeNum(d.quantity),
        price: safeNum(d.unit_price),

        gross,
        disc_type: String(d.discount_type ?? "No Discount"),
        disc_amt: discAmt,
        net_total: net,
      };
    });

    // Totals from header (view selects vat_amount, gross_amount, discount_amount, net_amount)
    const gross_amount = safeNum(header.gross_amount);
    const discount_amount = safeNum(header.discount_amount);
    const net_amount = safeNum(header.net_amount);
    const vat_amount = safeNum(header.vat_amount);

    const vatable = Math.max(0, net_amount - vat_amount);

    return NextResponse.json({
      header: {
        invoice_no: String(header.invoice_no),
        dispatch_plan: dispatchPlan,

        customer_code: String(header.customer_code ?? "-"),
        customer_name: String(cust?.customer_name ?? "Unknown"),
        location,

        salesman: sm ? `${sm.id} - ${sm.salesman_name}` : "Unknown",
        sales_type: String(op?.operation_name ?? "-"),
        price_type: String(sm?.price_type ?? header.price_type ?? "-"),
        receipt_type: String(header.receipt_type ?? "-"),

        dispatch_date: header.dispatch_date ? String(header.dispatch_date) : null,
        date: String(header.invoice_date ?? header.transaction_date ?? header.dispatch_date ?? "") || null,
        due: header.due_date ? String(header.due_date) : null,

        raw_status: String(header.transaction_status ?? ""),
        status,
      },
      lines,
      summary: {
        gross: gross_amount,
        discount: discount_amount,
        net: net_amount,
        vat: vat_amount,
        vatable,
        total: net_amount,
        balance: net_amount,
      },
    });
  } catch (e: any) {
    console.error("pending-invoices invoice details error:", e);
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
