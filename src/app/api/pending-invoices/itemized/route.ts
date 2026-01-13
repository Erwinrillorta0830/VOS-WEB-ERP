// src/app/api/pending-invoices/route.ts
import { NextResponse } from "next/server";
import { fetchAllItems, fetchAllItems as fetchAll, chunk } from "./_directus";
import {
  normalizePendingStatus,
  safeNum,
  STATUS_COLORS,
  STATUS_ORDER,
  type PendingStatus,
  buildDispatchPlanMap,
} from "./logic";

function toLocalISODate(d: Date, tzOffsetMinutes = 480) {
  const ms = d.getTime() + tzOffsetMinutes * 60 * 1000;
  const x = new Date(ms);
  const yyyy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(x.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonthISO(tzOffsetMinutes = 480) {
  const now = new Date();
  const ms = now.getTime() + tzOffsetMinutes * 60 * 1000;
  const x = new Date(ms);
  const yyyy = x.getUTCFullYear();
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function endOfMonthISO(tzOffsetMinutes = 480) {
  const now = new Date();
  const ms = now.getTime() + tzOffsetMinutes * 60 * 1000;
  const x = new Date(ms);
  const yyyy = x.getUTCFullYear();
  const m = x.getUTCMonth();
  const last = new Date(Date.UTC(yyyy, m + 1, 0));
  const mm = String(last.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(last.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.max(1, Number(searchParams.get("limit") || 20));

  const search = String(searchParams.get("search") || "").trim().toLowerCase();
  const statusFilter = String(searchParams.get("status") || "all").trim(); // all | Unlinked | For Dispatch | ...
  const salesmanFilter = String(searchParams.get("salesman") || "all").trim(); // id or all
  const customerFilter = String(searchParams.get("customer") || "all").trim(); // customer_code or all

  const tzOffsetMinutes = Number(process.env.REPORT_TZ_OFFSET_MINUTES ?? 480);

  const from =
    String(searchParams.get("from") || "").trim() || startOfMonthISO(tzOffsetMinutes);
  const to =
    String(searchParams.get("to") || "").trim() || endOfMonthISO(tzOffsetMinutes);

  try {
    // 1) Fetch headers + lookup tables
    const [salesInvoices, customers, salesman, operations] = await Promise.all([
      fetchAll("sales_invoice"),
      fetchAll("customer"),
      fetchAll("salesman"),
      fetchAll("operation"),
    ]);

    // Map lookups
    const customerByCode = new Map<string, any>();
    for (const c of customers || []) {
      const code = String(c.customer_code ?? "").trim();
      if (code) customerByCode.set(code, c);
    }

    const salesmanById = new Map<number, any>();
    for (const s of salesman || []) {
      const id = Number(s.id);
      if (id) salesmanById.set(id, s);
    }

    const opById = new Map<number, any>();
    for (const o of operations || []) {
      const id = Number(o.id);
      if (id) opById.set(id, o);
    }

    // Date filtering (prefer dispatch_date, fallback invoice_date/created_at)
    const fromTs = Date.parse(`${from}T00:00:00`);
    const toTs = Date.parse(`${to}T23:59:59`);

    const headers = (salesInvoices || []).filter((si: any) => {
      const dt =
        si.dispatch_date ??
        si.invoice_date ??
        si.date ??
        si.created_at ??
        si.date_created;

      const ts = Date.parse(String(dt));
      if (!Number.isFinite(ts)) return true; // keep if unknown
      return ts >= fromTs && ts <= toTs;
    });

    // 2) Build dispatch plan map: need PDI + PDP, but only for visible invoices
    const invoiceIds = headers
      .map((h: any) => h.invoice_id ?? h.id ?? null)
      .filter((x: any) => x != null)
      .map((x: any) => String(x));

    const [pdiAll, pdpAll] = await Promise.all([
      fetchAllItems("post_dispatch_invoices"),
      fetchAllItems("post_dispatch_plan"),
    ]);

    // Keep only relevant PDI
    const invoiceIdSet = new Set(invoiceIds);
    const pdi = (pdiAll || []).filter((x: any) => invoiceIdSet.has(String(x.invoice_id ?? x.invoiceId ?? "")));
    const dispatchPlanMap = buildDispatchPlanMap({
      postDispatchInvoices: pdi,
      postDispatchPlans: pdpAll || [],
    });

    // 3) Build final rows (summary)
    const rows = headers.map((si: any) => {
      const invoiceId = si.invoice_id ?? si.id ?? null;
      const invoiceIdKey = invoiceId != null ? String(invoiceId) : "";

      const invoiceNo = String(si.invoice_no ?? si.doc_no ?? si.invoiceId ?? invoiceIdKey ?? "-");
      const invoiceDate =
        si.dispatch_date ??
        si.invoice_date ??
        si.date ??
        si.created_at ??
        si.date_created ??
        "";

      const custCode = String(si.customer_code ?? "").trim();
      const cust = customerByCode.get(custCode);
      const customerName = String(cust?.customer_name ?? si.customer ?? "Unknown");

      const smId = Number(si.salesman_id ?? si.salesman ?? 0);
      const sm = salesmanById.get(smId);
      const salesmanLabel = sm
        ? `${smId} - ${sm.salesman_name ?? sm.name ?? "Unknown"}`
        : smId
          ? `${smId} - Unknown`
          : String(si.salesman ?? "Unknown");

      const dispatchPlan =
        dispatchPlanMap.get(invoiceIdKey) ??
        dispatchPlanMap.get(String(si.invoice_id ?? "")) ??
        "unlinked";

      const status = normalizePendingStatus({
        dispatchPlan,
        transactionStatus: si.transaction_status ?? si.status,
      });

      const netAmount = safeNum(si.net_amount ?? si.net ?? si.amount ?? 0);

      const salesTypeName = (() => {
        const opId = Number(si.sales_type ?? 0);
        const op = opById.get(opId);
        return String(op?.operation_name ?? si.sales_type ?? "");
      })();

      return {
        invoiceNo,
        invoiceId: invoiceIdKey,
        invoiceDate,
        customerCode: custCode,
        customer: customerName,
        salesmanId: smId || null,
        salesman: salesmanLabel,
        netAmount,
        dispatchPlan: String(dispatchPlan || "unlinked"),
        status,
        salesType: salesTypeName,
      };
    });

    // 4) Apply filters
    const filtered = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (salesmanFilter !== "all" && String(r.salesmanId ?? "") !== salesmanFilter) return false;
      if (customerFilter !== "all" && String(r.customerCode) !== customerFilter) return false;

      if (search) {
        const hay = [
          r.invoiceNo,
          r.customer,
          r.salesman,
          r.dispatchPlan,
        ]
          .join(" ")
          .toLowerCase();

        if (!hay.includes(search)) return false;
      }

      return true;
    });

    // 5) Aggregations (count + amount by status)
    const countByStatus = new Map<PendingStatus, number>();
    const amountByStatus = new Map<PendingStatus, number>();
    for (const s of STATUS_ORDER) {
      countByStatus.set(s, 0);
      amountByStatus.set(s, 0);
    }

    let totalAmount = 0;
    for (const r of filtered) {
      const s = r.status as PendingStatus;
      countByStatus.set(s, (countByStatus.get(s) || 0) + 1);
      amountByStatus.set(s, (amountByStatus.get(s) || 0) + safeNum(r.netAmount));
      totalAmount += safeNum(r.netAmount);
    }

    const pie = STATUS_ORDER.map((s) => ({
      name: s,
      value: countByStatus.get(s) || 0,
      fill: STATUS_COLORS[s],
    }));

    const bar = STATUS_ORDER.map((s) => ({
      name: s,
      amount: amountByStatus.get(s) || 0,
      fill: STATUS_COLORS[s],
    }));

    // 6) Pagination
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages },
      aggregations: {
        pie,
        bar,
        totalAmount,
        counts: Object.fromEntries(STATUS_ORDER.map((s) => [s, countByStatus.get(s) || 0])),
      },
      range: { from, to },
    });
  } catch (e: any) {
    console.error("pending-invoices/api error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
