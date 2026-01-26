import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, ""); // <-- removes trailing slashes

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

type DirectusErr = {
    collection: string;
    status?: number;
    message: string;
    url: string;
};

function getHeaders(): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    if (DIRECTUS_TOKEN) {
        (headers as any).Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }
    return headers;
}

function safeId(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && val !== null) return val.id ? String(val.id) : "";
    return String(val);
}

/**
 * Build ISO date filter using _gte/_lte (more reliable than _between)
 * expects fromDate/toDate as YYYY-MM-DD
 */
function buildDateFilter(field: string, fromDate: string, toDate: string) {
    const from = encodeURIComponent(`${fromDate}T00:00:00`);
    const to = encodeURIComponent(`${toDate}T23:59:59`);
    return `&filter[${encodeURIComponent(field)}][_gte]=${from}&filter[${encodeURIComponent(field)}][_lte]=${to}`;
}

/**
 * Fetch all records with pagination (stable replacement for limit=-1)
 */
async function fetchAll<T = any>(
    collection: string,
    query: string = "",
    errors: DirectusErr[],
    pageSize = 500
): Promise<T[]> {
    if (!DIRECTUS_BASE) {
        errors.push({
            collection,
            message: "Missing DIRECTUS_URL in environment",
            url: "DIRECTUS_URL is empty",
        });
        return [];
    }

    const out: T[] = [];
    let offset = 0;

    for (let page = 0; page < 200; page++) {
        const url = `${DIRECTUS_BASE}/items/${collection}?limit=${pageSize}&offset=${offset}${query}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(url, {
                cache: "no-store",
                headers: getHeaders(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                errors.push({
                    collection,
                    status: res.status,
                    message: `Directus request failed. ${text}`,
                    url,
                });
                return out;
            }

            const json = await res.json();
            const chunk = ((json?.data as T[]) || []) as T[];
            out.push(...chunk);

            if (chunk.length < pageSize) break;
            offset += pageSize;
        } catch (e: any) {
            errors.push({
                collection,
                status: undefined,
                message: e?.message || "Unknown fetch error",
                url,
            });
            return out;
        }
    }

    return out;
}

export async function GET(request: Request) {
    const errors: DirectusErr[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get("fromDate"); // expects YYYY-MM-DD
        const toDate = searchParams.get("toDate"); // expects YYYY-MM-DD
        const salesmanId = searchParams.get("salesmanId");

        if (!fromDate || !toDate) {
            return NextResponse.json(
                { success: false, error: "Missing date parameters" },
                { status: 400 }
            );
        }

        // Filters (safe)
        const invoiceDateFilter = buildDateFilter("invoice_date", fromDate, toDate);
        const returnDateFilter = buildDateFilter("return_date", fromDate, toDate);
        const orderDateFilter = buildDateFilter("order_date", fromDate, toDate);

        // Fetch data
        const [
            salesmen,
            invoices,
            invoiceDetails,
            returns,
            returnDetails,
            suppliers,
            productSupplierMap,
            allProducts,
            orders,
        ] = await Promise.all([
            fetchAll("salesman", `&fields=${encodeURIComponent("id,salesman_name,level,points_growth")}`, errors),
            fetchAll(
                "sales_invoice",
                `&fields=${encodeURIComponent("invoice_id,invoice_no,total_amount,net_amount,salesman_id")}${invoiceDateFilter}`,
                errors
            ),
            fetchAll(
                "sales_invoice_details",
                `&fields=${encodeURIComponent("invoice_no,product_id,total_amount,quantity")}`,
                errors
            ),
            fetchAll(
                "sales_return",
                `&fields=${encodeURIComponent("return_number,total_amount,return_date")}${returnDateFilter}`,
                errors
            ),
            fetchAll(
                "sales_return_details",
                `&fields=${encodeURIComponent("return_no,product_id,total_amount,reason")}`,
                errors
            ),
            fetchAll("suppliers", `&fields=${encodeURIComponent("id,supplier_name,supplier_shortcut")}`, errors),
            fetchAll("product_per_supplier", `&fields=${encodeURIComponent("supplier_id,product_id")}`, errors),
            fetchAll("products", `&fields=${encodeURIComponent("product_id,product_name")}`, errors),
            fetchAll("sales_order", `&fields=${encodeURIComponent("order_id,order_status,order_date")}${orderDateFilter}`, errors),
        ]);

        // 1) Filter invoices by salesman (handles FK object)
        const filteredInvoices = invoices.filter((inv: any) => {
            if (!salesmanId || salesmanId === "all") return true;
            return safeId(inv.salesman_id) === String(salesmanId);
        });

        // Invoice numbers for fast lookup (details keyed by invoice_no)
        const filteredInvoiceNos = new Set<string>(
            filteredInvoices.map((inv: any) => String(inv.invoice_no))
        );

        // 2) Maps
        const productNameMap = new Map<string, string>(
            allProducts.map((p: any) => [String(p.product_id), String(p.product_name)])
        );

        const prodToSupMap = new Map<string, string>(
            productSupplierMap.map((m: any) => [String(m.product_id), safeId(m.supplier_id)])
        );

        const supplierMap = new Map<string, string>();
        suppliers.forEach((s: any) => {
            const id = safeId(s.id);
            supplierMap.set(id, s.supplier_shortcut || s.supplier_name || `Supplier ${id}`);
        });

        // 3) Compute product + supplier sales using invoiceDetails (only those invoice_no in filteredInvoiceNos)
        const productSalesMap = new Map<string, number>();
        const supplierSalesMap = new Map<string, number>();

        invoiceDetails.forEach((det: any) => {
            const invNo = String(det.invoice_no);
            if (!filteredInvoiceNos.has(invNo)) return;

            const pId = String(det.product_id);
            const amount = Number(det.total_amount) || 0;

            productSalesMap.set(pId, (productSalesMap.get(pId) || 0) + amount);

            const sId = prodToSupMap.get(pId);
            if (sId) supplierSalesMap.set(sId, (supplierSalesMap.get(sId) || 0) + amount);
        });

        // 4) Formatting for charts
        const chartColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

        const supplierPerformance = Array.from(supplierSalesMap.entries())
            .map(([id, value], index) => ({
                name: supplierMap.get(id) || `Supplier ${id}`,
                value,
                fill: chartColors[index % chartColors.length],
            }))
            .sort((a, b) => b.value - a.value);

        const productPerformance = Array.from(productSalesMap.entries())
            .map(([id, value]) => ({
                name: productNameMap.get(id) || `Product ${id}`,
                value,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 5) Bad Storage / Returns
        const badStorage = returnDetails
            .map((rd: any) => ({
                product: productNameMap.get(String(rd.product_id)) || `ID: ${rd.product_id}`,
                reason: rd.reason || "NO REASON",
                amount: Number(rd.total_amount) || 0,
            }))
            .sort((a: any, b: any) => b.amount - a.amount)
            .slice(0, 10);

        const currentSalesman =
            salesmanId && salesmanId !== "all"
                ? salesmen.find((s: any) => String(s.id) === String(salesmanId))
                : null;

        // KPI
        const revenue = filteredInvoices.reduce((acc: number, inv: any) => {
            const net = Number(inv.net_amount);
            const total = Number(inv.total_amount);
            return acc + (Number.isFinite(net) ? net : Number.isFinite(total) ? total : 0);
        }, 0);

        const returnsTotal = returns.reduce(
            (acc: number, ret: any) => acc + (Number(ret.total_amount) || 0),
            0
        );

        // Status monitoring (orders already filtered by date above)
        const delivered = orders.filter((o: any) => o.order_status === "Delivered").length;
        const pending = orders.filter((o: any) => o.order_status === "Pending").length;
        const cancelled = orders.filter((o: any) =>
            ["Cancelled", "Not Fulfilled"].includes(o.order_status)
        ).length;

        return NextResponse.json({
            success: true,
            data: {
                salesman: {
                    name:
                        currentSalesman?.salesman_name ||
                        (salesmanId === "all" || !salesmanId ? "Whole Team" : "Unknown"),
                    level: currentSalesman?.level ?? 0,
                    levelUp: currentSalesman?.points_growth ?? 0,
                },
                kpi: {
                    orders: filteredInvoices.length,
                    revenue,
                    returns: returnsTotal,
                },
                target: { quota: 100000, achieved: 0, gap: 0, percent: 45 },
                statusMonitoring: {
                    delivered,
                    pending,
                    cancelled,
                },
                badStorage,
                charts: {
                    products: productPerformance.length > 0 ? productPerformance : [],
                    suppliers: supplierPerformance.length > 0 ? supplierPerformance : [],
                },
            },
            _debug: {
                directusUrl: DIRECTUS_BASE ? DIRECTUS_BASE + "/" : null,
                hasToken: Boolean(DIRECTUS_TOKEN),
                fromDate,
                toDate,
                salesmanId: salesmanId || null,
                counts: {
                    salesmen: salesmen.length,
                    invoices: invoices.length,
                    filteredInvoices: filteredInvoices.length,
                    invoiceDetails: invoiceDetails.length,
                    returns: returns.length,
                    returnDetails: returnDetails.length,
                    suppliers: suppliers.length,
                    productPerSupplier: productSupplierMap.length,
                    products: allProducts.length,
                    orders: orders.length,
                },
                errors,
            },
        });
    } catch (error: any) {
        console.error("Salesman API Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
