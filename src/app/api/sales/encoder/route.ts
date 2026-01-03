import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL =
    (process.env.DIRECTUS_URL ?? "http://100.126.246.124:8060").replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN ?? "";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
    return headers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function directusFetch(path: string, attempt = 1) {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

    // Retry only for transient load/pressure
    if ((res.status === 503 || res.status === 429) && attempt < 4) {
        await sleep(400 * attempt);
        return directusFetch(path, attempt + 1);
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `Directus request failed (${res.status}) for ${url}. Response: ${text.slice(
                0,
                900
            )}`
        );
    }

    return res.json();
}

function toMoney(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// Directus boolean sometimes comes as Buffer/data array
function isTruthy(field: any) {
    if (field === true || field === 1 || field === "1") return true;
    if (field && typeof field === "object" && field.data && field.data[0] === 1)
        return true;
    return false;
}

function fmtMMDDYYYY(isoOrDate: string | null | undefined): string {
    if (!isoOrDate) return "";
    const s = String(isoOrDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const y = s.substring(0, 4);
        const m = s.substring(5, 7);
        const d = s.substring(8, 10);
        return `${m}/${d}/${y}`;
    }
    return s;
}

function monthKey(isoOrDate: string | null | undefined): string {
    if (!isoOrDate) return "Unknown";
    const s = String(isoOrDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 7);
    return "Unknown";
}

function deriveOrderStatus(inv: any): "Pending" | "Shipped" | "Delivered" {
    const paidLike = String(inv.payment_status ?? "").toLowerCase().includes("paid");
    const posted = isTruthy(inv.isPosted);
    const dispatched = isTruthy(inv.isDispatched);

    if (paidLike || posted) return "Delivered";
    if (dispatched) return "Shipped";
    return "Pending";
}

function deriveInvoiceAmount(inv: any): number {
    // Your payload confirms total_amount + discount_amount exist
    const total = toMoney(inv.total_amount);
    const disc = toMoney(inv.discount_amount);
    const net = Math.max(0, total - disc);

    if (net > 0) return net;

    // optional fallbacks if present/allowed
    const net_amount = toMoney(inv.net_amount);
    const gross_amount = toMoney(inv.gross_amount);
    return net_amount || gross_amount || total;
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") ?? "";
        const salesmanId = searchParams.get("salesmanId");

        // ------------------------------------------------------------
        // 1) SALESMEN LIST
        // ------------------------------------------------------------
        if (type === "salesmen") {
            // Use only fields that exist / permitted
            const json = await directusFetch(
                `/items/salesman?fields=id,salesman_name&limit=5000`
            );

            const rows = Array.isArray(json?.data) ? json.data : [];
            const data = rows
                .map((s: any) => ({
                    id: s.id,
                    name: String(s.salesman_name ?? `Salesman ${s.id}`).trim(),
                }))
                .sort((a: any, b: any) => a.name.localeCompare(b.name));

            return NextResponse.json({ data });
        }

        // ------------------------------------------------------------
        // 2) DASHBOARD
        // ------------------------------------------------------------
        if (type === "dashboard") {
            if (!salesmanId) {
                return NextResponse.json({ error: "Missing salesmanId" }, { status: 400 });
            }

            // Safe invoice fields ONLY (NO status, NO grand_total)
            const invoiceFields = [
                "branch_id",
                "created_date",
                "customer_code",
                "discount_amount",
                "dispatch_date",
                "due_date",
                "gross_amount",
                "invoice_date",
                "invoice_id",
                "invoice_no",
                "invoice_type",
                "isDispatched",
                "isPosted",
                "isReceipt",
                "isRemitted",
                "net_amount",
                "order_id",
                "payment_status",
                "payment_terms",
                "price_type",
                "salesman_id",
                "total_amount",
                "transaction_status",
                "vat_amount",
            ].join(",");

            // Fetch invoices (filtering in Directus is fine, but we can also filter locally)
            // Using limit=-1 to match your original approach.
            const invoicesJson = await directusFetch(
                `/items/sales_invoice?fields=${encodeURIComponent(
                    invoiceFields
                )}&limit=-1`
            );

            const allInvoices = Array.isArray(invoicesJson?.data) ? invoicesJson.data : [];

            // Filter locally to avoid any Directus filter quirks
            const invoices = allInvoices.filter(
                (inv: any) => String(inv.salesman_id) === String(salesmanId)
            );

            // Sort desc by invoice_date
            invoices.sort((a: any, b: any) => {
                const da = String(a.invoice_date ?? "");
                const db = String(b.invoice_date ?? "");
                return db.localeCompare(da);
            });

            const totalOrders = invoices.length;
            const orderValue = invoices.reduce((sum: number, inv: any) => {
                return sum + deriveInvoiceAmount(inv);
            }, 0);

            const pendingOrders = invoices.reduce((count: number, inv: any) => {
                const st = deriveOrderStatus(inv);
                return count + (st === "Delivered" ? 0 : 1);
            }, 0);

            // Returns count (optional; do not block dashboard if unavailable)
            let returnsCount = 0;
            try {
                const rJson = await directusFetch(
                    `/items/sales_return?fields=return_number,salesman_id&limit=-1`
                );
                const returns = Array.isArray(rJson?.data) ? rJson.data : [];
                returnsCount = returns.filter(
                    (r: any) => String(r.salesman_id) === String(salesmanId)
                ).length;
            } catch {
                // ignore
            }

            const orders = invoices.slice(0, 20).map((inv: any) => ({
                id: String(inv.invoice_no ?? inv.invoice_id ?? ""),
                date: fmtMMDDYYYY(inv.invoice_date),
                status: deriveOrderStatus(inv),
                amount: Math.round(deriveInvoiceAmount(inv)),
            }));

            // Monthly trend (last 12 months)
            const trendAgg = new Map<string, number>();
            for (const inv of invoices) {
                const m = monthKey(inv.invoice_date);
                trendAgg.set(m, (trendAgg.get(m) || 0) + deriveInvoiceAmount(inv));
            }

            const trend = Array.from(trendAgg.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-12)
                .map(([month, achieved]) => {
                    const target = achieved * 1.1; // placeholder target
                    return {
                        month,
                        target: Math.round(target),
                        achieved: Math.round(achieved),
                    };
                });

            // Target summary (placeholder but consistent)
            const targetTotal = orderValue * 1.1;
            const achievedTotal = orderValue;
            const gap = Math.max(0, targetTotal - achievedTotal);
            const percent = targetTotal > 0 ? Math.round((achievedTotal / targetTotal) * 100) : 0;

            // Use salesman_name if present (from salesmen list), else fallback
            let salesmanName = `Salesman ${salesmanId}`;
            try {
                const sJson = await directusFetch(
                    `/items/salesman/${encodeURIComponent(salesmanId)}?fields=id,salesman_name`
                );
                if (sJson?.data) {
                    salesmanName = String(sJson.data.salesman_name ?? salesmanName).trim();
                }
            } catch {
                // ignore
            }

            return NextResponse.json({
                data: {
                    salesmanName,
                    kpi: {
                        totalOrders,
                        orderValue: Math.round(orderValue),
                        pendingOrders,
                        returns: returnsCount,
                    },
                    orders,
                    target: {
                        total: Math.round(targetTotal),
                        achieved: Math.round(achievedTotal),
                        gap: Math.round(gap),
                        percent,
                    },
                    trend,
                    // Keep these empty for now (your page has fallbacks)
                    skuPerformance: [],
                    topProducts: [],
                    supplierSales: [],
                    returnHistory: [],
                },
            });
        }

        return NextResponse.json(
            { error: `Unknown type "${type}"` },
            { status: 400 }
        );
    } catch (error: unknown) {
        console.error("❌ Error in encoder API route:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch data from Directus",
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
