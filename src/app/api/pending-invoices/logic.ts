// src/app/api/pending-invoices/logic.ts
import type { AnyRecord } from "./_directus";

export type PendingStatus = "Unlinked" | "For Dispatch" | "Inbound" | "Cleared";

export const STATUS_ORDER: PendingStatus[] = [
  "Unlinked",
  "For Dispatch",
  "Inbound",
  "Cleared",
];

export const STATUS_COLORS: Record<PendingStatus, string> = {
  Unlinked: "#6b7280",     // slate/gray
  "For Dispatch": "#2563eb", // blue
  Inbound: "#ea580c",      // orange
  Cleared: "#16a34a",      // green
};

export function safeNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Your UI status rules:
 * - If dispatch_plan is missing -> Unlinked
 * - Else normalize transaction_status into the known buckets
 */
export function normalizePendingStatus(params: {
  dispatchPlan: string | null | undefined;
  transactionStatus: any;
}): PendingStatus {
  const dispatchPlanRaw = String(params.dispatchPlan ?? "").trim().toLowerCase();
  if (!dispatchPlanRaw || dispatchPlanRaw === "unlinked") return "Unlinked";

  const s = String(params.transactionStatus ?? "").trim().toLowerCase();

  if (s === "cleared") return "Cleared";
  if (s === "inbound") return "Inbound";
  if (s === "for dispatch" || s === "fordispatch") return "For Dispatch";

  // fallback when linked but status is unknown:
  return "For Dispatch";
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function sortDocsAlpha(docs: string[]): string[] {
  return [...docs].filter(Boolean).sort((a, b) => a.localeCompare(b));
}

export function buildDispatchPlanMap(params: {
  postDispatchInvoices: AnyRecord[];
  postDispatchPlans: AnyRecord[];
}): Map<string, string> {
  const { postDispatchInvoices, postDispatchPlans } = params;

  const planById = new Map<number, AnyRecord>();
  for (const p of postDispatchPlans || []) {
    const id = Number(p.id);
    if (id) planById.set(id, p);
  }

  // invoice_id -> Set(doc_no)
  const docsByInvoice = new Map<string, Set<string>>();

  for (const pdi of postDispatchInvoices || []) {
    const invoiceId = pdi.invoice_id ?? pdi.invoiceId ?? pdi.sales_invoice_id;
    if (invoiceId == null) continue;

    const planId =
      pdi.post_dispatch_plan_id ??
      pdi.postDispatchPlanId ??
      pdi.dispatch_plan_id ??
      pdi.dispatchPlanId;

    const plan = planById.get(Number(planId));
    const docNo = String(plan?.doc_no ?? plan?.docNo ?? "").trim();
    if (!docNo) continue;

    const k = String(invoiceId);
    if (!docsByInvoice.has(k)) docsByInvoice.set(k, new Set<string>());
    docsByInvoice.get(k)!.add(docNo);
  }

  const map = new Map<string, string>();
  for (const [invoiceId, set] of docsByInvoice.entries()) {
    const docs = sortDocsAlpha(Array.from(set));
    map.set(invoiceId, docs.join(", "));
  }

  return map;
}

/**
 * Replicates view subquery:
 * supplier = first supplier_name for product_per_supplier where
 *   pps.product_id = IFNULL(p.parent_id, p.product_id)
 * order by pps.id limit 1
 */
export function buildPrimarySupplierNameByProduct(params: {
  products: AnyRecord[];
  productPerSupplier: AnyRecord[];
  suppliers: AnyRecord[];
}): Map<number, string> {
  const { products, productPerSupplier, suppliers } = params;

  const supplierNameById = new Map<number, string>();
  for (const s of suppliers || []) {
    const id = Number(s.id);
    if (id) supplierNameById.set(id, String(s.supplier_name ?? s.name ?? "Unknown"));
  }

  const productById = new Map<number, AnyRecord>();
  for (const p of products || []) {
    const id = Number(p.product_id ?? p.id);
    if (id) productById.set(id, p);
  }

  // baseProductId -> best PPS row (min pps.id)
  const bestPpsByBaseProduct = new Map<number, AnyRecord>();

  for (const pps of productPerSupplier || []) {
    const baseId = Number(pps.product_id);
    const ppsId = Number(pps.id);
    const supId = Number(pps.supplier_id);

    if (!baseId || !ppsId || !supId) continue;

    const cur = bestPpsByBaseProduct.get(baseId);
    if (!cur || Number(cur.id) > ppsId) bestPpsByBaseProduct.set(baseId, pps);
  }

  // product_id -> supplier_name (using parent fallback)
  const out = new Map<number, string>();

  for (const p of products || []) {
    const pid = Number(p.product_id ?? p.id);
    if (!pid) continue;

    const parentId = Number(p.parent_id ?? 0);
    const baseId = parentId && parentId !== 0 ? parentId : pid;

    const best = bestPpsByBaseProduct.get(baseId);
    const supName = best ? supplierNameById.get(Number(best.supplier_id)) : undefined;

    if (supName) out.set(pid, supName);
  }

  return out;
}
