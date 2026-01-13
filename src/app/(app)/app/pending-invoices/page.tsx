import PendingInvoicesModule from "@/modules/pending-invoices/PendingInvoicesModule";

export default function PendingInvoicesPage() {
  return <PendingInvoicesModule />;
}
import { NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const RAW_DIRECTUS_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchAllItems(collection: string): Promise<AnyRecord[]> {
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
    if (page > 50) break;
  }
  return out;
}

function normalizeStatus(
  s: string,
  dispatchPlan: string
): "Unlinked" | "For Dispatch" | "Inbound" | "Cleared" {
  const dp = (dispatchPlan || "").toLowerCase();
  if (!dp || dp === "unlinked") return "Unlinked";

  const x = String(s || "").trim().toLowerCase();
  if (x === "for dispatch" || x === "for_dispatch") return "For Dispatch";
  if (x === "inbound") return "Inbound";
  if (x === "cleared") return "Cleared";
  return "For Dispatch";
}

/**
 * ✅ Robust param resolver:
 * - Works whether your folder is [invoiceNo], [invoice_no], or [id]
 * - Prevents silent 400s
 */
function resolveInvoiceNo(params: Record<string, any>): string {
  const raw =
    params.invoiceNo ??
    params.invoice_no ??
    params.id ??
    params.slug ??
    "";

  return decodeURIComponent(String(raw)).trim();
}

export async function GET(_req: Request, ctx: { params: Record<string, any> }) {
  try {
    if (!DIRECTUS_BASE) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_API_BASE_URL / DIRECTUS_URL" },
        { status: 500 }
      );
    }

    const invoiceNo = resolveInvoiceNo(ctx.params);

    // ✅ Better error payload (so client can show what happened)
    if (!invoiceNo) {
      return NextResponse.json(
        {
          error: "Missing invoice number in route param.",
          hint:
            "Ensure your folder is named [invoiceNo] OR update the server to read the correct param key.",
          receivedParams: ctx.params,
        },
        { status: 400 }
      );
    }

    // --- fetch collections (same as before) ---
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

    const header = salesInvoice.find((x) => String(x.invoice_no) === invoiceNo);
    if (!header) {
      return NextResponse.json(
        { error: `Invoice not found: ${invoiceNo}` },
        { status: 404 }
      );
    }

    const customerByCode = new Map<string, AnyRecord>();
    for (const c of customer) customerByCode.set(String(c.customer_code), c);

    const salesmanById = new Map<number, AnyRecord>();
    for (const s of salesman) salesmanById.set(Number(s.id), s);

    const operationById = new Map<number, AnyRecord>();
    for (const o of operation) operationById.set(Number(o.id), o);

    const productById = new Map<number, AnyRecord>();
    for (const p of products) productById.set(Number(p.product_id), p);

    const unitById = new Map<number, AnyRecord>();
    for (const u of units) unitById.set(Number(u.unit_id), u);

    const supplierById = new Map<number, AnyRecord>();
    for (const s of suppliers) supplierById.set(Number(s.id), s);

    // Best supplier per product (lowest pps.id)
    const bestSupplierByProduct = new Map<number, { ppsId: number; supplierName: string }>();
    for (const pps of productPerSupplier) {
      const pid = Number(pps.product_id);
      const sid = Number(pps.supplier_id);
      const ppsId = Number(pps.id);
      if (!pid || !sid || !ppsId) continue;
      const sup = supplierById.get(sid);
      if (!sup?.supplier_name) continue;

      const cur = bestSupplierByProduct.get(pid);
      if (!cur || ppsId < cur.ppsId) {
        bestSupplierByProduct.set(pid, { ppsId, supplierName: String(sup.supplier_name) });
      }
    }

    // Dispatch plan concat by invoice_id
    const pdpById = new Map<number, AnyRecord>();
    for (const p of postDispatchPlan) pdpById.set(Number(p.id), p);

    const invoiceIdKey = header?.invoice_id != null ? String(header.invoice_id) : "";
    const dpSet = new Set<string>();
    for (const pdi of postDispatchInvoices) {
      if (invoiceIdKey && String(pdi.invoice_id) !== invoiceIdKey) continue;
      const dp = pdpById.get(Number(pdi.post_dispatch_plan_id));
      if (dp?.doc_no) dpSet.add(String(dp.doc_no));
    }
    const dispatchPlan = dpSet.size
      ? Array.from(dpSet).sort((a, b) => a.localeCompare(b)).join(", ")
      : "unlinked";

    const cust = customerByCode.get(String(header.customer_code));
    const sm = salesmanById.get(Number(header.salesman_id));
    const op = operationById.get(Number(header.sales_type));

    const location =
      [cust?.brgy, cust?.city, cust?.province].filter(Boolean).join(", ") || "-";

    // details match
    const headerInvoiceId = header.invoice_id;
    const headerOrderId = header.order_id;

    const details = salesInvoiceDetails.filter((d) => {
      const invKey = d.invoice_no ?? d.invoice_id ?? d.sales_invoice_id;
      const okInv =
        headerInvoiceId != null
          ? String(invKey) === String(headerInvoiceId)
          : String(invKey) === String(invoiceNo);

      const okOrder =
        headerOrderId != null ? String(d.order_id ?? "") === String(headerOrderId) : true;

      return okInv && okOrder;
    });

    const lines = details.map((d) => {
      const prod = productById.get(Number(d.product_id));
      const unitName = unitById.get(Number(d.unit))?.unit_name || "Unit";

      const gross = safeNum(d.total_amount);
      const discAmt = safeNum(d.discount_amount);
      const net = gross - discAmt;

      return {
        product_id: Number(d.product_id),
        product_name: String(prod?.product_name ?? "Unknown"),
        product_code: String(prod?.product_code ?? prod?.product_id ?? "-"),
        unit: unitName,
        qty: safeNum(d.quantity),
        price: safeNum(d.unit_price),
        gross,
        disc_type: String(d.discount_type ?? "No Discount"),
        disc_amt: discAmt,
        net_total: net,
      };
    });

    const net = safeNum(header.net_amount);
    const vat = safeNum(header.vat_amount);
    const disc = safeNum(header.discount_amount);

    const status = normalizeStatus(header.transaction_status, dispatchPlan);

    return NextResponse.json({
      header: {
        invoice_no: String(header.invoice_no),
        customer_name: cust?.customer_name || "Unknown",
        customer_code: String(header.customer_code || "-"),
        salesman: sm ? `${sm.id} - ${sm.salesman_name}` : "Unknown",
        location,
        sales_type: op?.operation_name || "-",
        receipt_type: String(header.receipt_type ?? "-"),
        price_type: String(sm?.price_type ?? header.price_type ?? "-"),
        date: String(header.invoice_date ?? header.transaction_date ?? header.dispatch_date ?? "") || null,
        due: String(header.due_date ?? header.due ?? "") || null,
        dispatch_date: String(header.dispatch_date ?? "") || null,
        status,
        dispatch_plan: dispatchPlan,
      },
      lines,
      summary: {
        discount: disc,
        vatable: Math.max(0, net - vat),
        net,
        vat,
        total: net,
        balance: net,
      },
    });
  } catch (e: any) {
    console.error("pending-invoices invoice details error", e);
    return NextResponse.json(
      { error: e?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
