import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? "http://100.110.197.61:8091")
    .replace(/\/+$/, "");
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN ?? "";

/* -------------------------------------------------------------------------- */
/* DIRECTUS FETCH                                                             */
/* -------------------------------------------------------------------------- */

function getHeaders(): HeadersInit {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) headers["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
    return headers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function directusFetch(path: string, attempt = 1): Promise<any> {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

    // Retry only on transient “under pressure” responses
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

function safeNet(inv: any): number {
    const total = toMoney(inv.total_amount);
    const disc = toMoney(inv.discount_amount);
    const net = total - disc;
    return Number.isFinite(net) ? net : 0;
}

function monthKey(isoOrDate: string | null | undefined): string {
    if (!isoOrDate) return "Unknown";
    const s = String(isoOrDate);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 7);
    return "Unknown";
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get("fromDate"); // yyyy-MM-dd
        const toDate = searchParams.get("toDate"); // yyyy-MM-dd

        /* ---------------------------------------------------------------------- */
        /* 1) FETCH (SAFE FIELDS ONLY)                                             */
        /* ---------------------------------------------------------------------- */

        // Salesmen: keep it minimal to avoid field permission issues
        const salesmenPromise = directusFetch(
            `/items/salesman?fields=id,salesman_name&limit=-1`
        ).catch(() => ({ data: [] }));

        // Invoices: only fields we know exist and are commonly permitted
        const invoicesPromise = directusFetch(
            `/items/sales_invoice?fields=${encodeURIComponent(
                [
                    "invoice_id",
                    "invoice_no",
                    "invoice_date",
                    "salesman_id",
                    "total_amount",
                    "discount_amount",
                ].join(",")
            )}&limit=-1`
        ).catch(() => ({ data: [] }));

        // Invoice details: optional, used for top products
        const detailsPromise = directusFetch(
            `/items/sales_invoice_details?fields=${encodeURIComponent(
                ["invoice_no", "product_id", "total_amount", "quantity"].join(",")
            )}&limit=-1`
        ).catch(() => ({ data: [] }));

        // Products: optional product map
        const productsPromise = directusFetch(
            `/items/products?fields=${encodeURIComponent(
                ["product_id", "product_name"].join(",")
            )}&limit=-1`
        ).catch(() => ({ data: [] }));

        // Customers: optional coverage (store_name)
        const customersPromise = directusFetch(
            `/items/customer?fields=${encodeURIComponent(["id", "store_name"].join(","))}&limit=-1`
        ).catch(() => ({ data: [] }));

        const [salesmenJson, invoicesJson, detailsJson, productsJson, customersJson] =
            await Promise.all([
                salesmenPromise,
                invoicesPromise,
                detailsPromise,
                productsPromise,
                customersPromise,
            ]);

        const salesmen = Array.isArray(salesmenJson?.data) ? salesmenJson.data : [];
        const invoicesAll = Array.isArray(invoicesJson?.data) ? invoicesJson.data : [];
        const invoiceDetails = Array.isArray(detailsJson?.data) ? detailsJson.data : [];
        const products = Array.isArray(productsJson?.data) ? productsJson.data : [];
        const customers = Array.isArray(customersJson?.data) ? customersJson.data : [];

        /* ---------------------------------------------------------------------- */
        /* 2) MAPS                                                                 */
        /* ---------------------------------------------------------------------- */

        const productNameById = new Map<string | number, string>(
            products.map((p: any) => [p.product_id, String(p.product_name ?? "Unknown")])
        );

        /* ---------------------------------------------------------------------- */
        /* 3) FILTER INVOICES BY DATE RANGE                                        */
        /* ---------------------------------------------------------------------- */

        const filteredInvoices = invoicesAll.filter((inv: any) => {
            if (!inv.invoice_date) return false;
            const d = String(inv.invoice_date).substring(0, 10);
            if (fromDate && d < fromDate) return false;
            if (toDate && d > toDate) return false;
            return true;
        });

        /* ---------------------------------------------------------------------- */
        /* 4) INIT SALESMAN STATS                                                  */
        /* ---------------------------------------------------------------------- */

        const DEFAULT_TARGET = 500_000;

        const salesmanStats = new Map<
            string,
            {
                id: string;
                name: string;
                netSales: number;
                target: number;
                returnRate: number; // placeholder
                visits: number; // estimated
                orders: number;
                strikeRate: number;
                topProduct: string;
                topSupplier: string; // placeholder
                productsSold: number;
                productCounts: Map<string, number>; // product -> sales
            }
        >();

        salesmen.forEach((s: any) => {
            const id = String(s.id);
            const name = String(s.salesman_name ?? `Salesman ${id}`).trim();

            // If you later confirm an "isActive" field is permitted, you can filter here.
            salesmanStats.set(id, {
                id,
                name,
                netSales: 0,
                target: DEFAULT_TARGET,
                returnRate: 0,
                visits: 0,
                orders: 0,
                strikeRate: 0,
                topProduct: "N/A",
                topSupplier: "Internal",
                productsSold: 0,
                productCounts: new Map(),
            });
        });

        /* ---------------------------------------------------------------------- */
        /* 5) AGGREGATE TEAM + PER SALESMAN                                        */
        /* ---------------------------------------------------------------------- */

        let teamSales = 0;
        let totalInvoicesCount = 0;

        // Map invoice_id -> salesman_id (for detail attribution)
        const invoiceIdToSalesman = new Map<string | number, string>();
        // Also track valid invoice ids for quick lookup
        const validInvoiceIds = new Set<string | number>();

        filteredInvoices.forEach((inv: any) => {
            const sid = String(inv.salesman_id ?? "");
            const stats = salesmanStats.get(sid);
            if (!stats) return;

            const net = safeNet(inv);
            stats.netSales += net;
            stats.orders += 1;

            teamSales += net;
            totalInvoicesCount += 1;

            const invId = inv.invoice_id;
            validInvoiceIds.add(invId);
            invoiceIdToSalesman.set(invId, sid);
        });

        // Team target = number of active salesmen * default target
        const teamTarget = salesmanStats.size * DEFAULT_TARGET;

        /* ---------------------------------------------------------------------- */
        /* 6) INVOICE DETAILS -> TOP PRODUCTS                                      */
        /* ---------------------------------------------------------------------- */

        // Team-wide product totals
        const teamProductTotals = new Map<string, number>();

        invoiceDetails.forEach((det: any) => {
            // In Directus relational setups, invoice_no might be:
            // - a number (invoice_id)
            // - or an object { id: ... }
            const invId =
                typeof det.invoice_no === "object" ? det.invoice_no?.id : det.invoice_no;

            if (!validInvoiceIds.has(invId)) return;

            const sid = invoiceIdToSalesman.get(invId);
            if (!sid) return;

            const stats = salesmanStats.get(sid);
            if (!stats) return;

            const pName =
                productNameById.get(det.product_id) ||
                (det.product_id ? `Product ${det.product_id}` : "Unknown");

            const val = toMoney(det.total_amount);

            // per salesman
            stats.productCounts.set(pName, (stats.productCounts.get(pName) || 0) + val);

            // team wide
            teamProductTotals.set(pName, (teamProductTotals.get(pName) || 0) + val);
        });

        /* ---------------------------------------------------------------------- */
        /* 7) FINALIZE SALESMAN STATS                                              */
        /* ---------------------------------------------------------------------- */

        const salesmenList = Array.from(salesmanStats.values())
            .map((s) => {
                // top product
                let topP = "N/A";
                let maxVal = 0;
                s.productCounts.forEach((val, key) => {
                    if (val > maxVal) {
                        maxVal = val;
                        topP = key;
                    }
                });

                // estimated visits + strike rate
                const estimatedVisits = s.orders > 0 ? Math.round(s.orders * 1.3) : 0;
                const strikeRate =
                    estimatedVisits > 0 ? Math.round((s.orders / estimatedVisits) * 100) : 0;

                // products sold = unique products
                const productsSold = s.productCounts.size;

                return {
                    ...s,
                    topProduct: topP,
                    visits: estimatedVisits,
                    strikeRate,
                    productsSold,
                    // keep returnRate at 0 unless you add real returns logic later
                    returnRate: 0,
                };
            })
            .sort((a, b) => b.netSales - a.netSales);

        /* ---------------------------------------------------------------------- */
        /* 8) COVERAGE (CUSTOMERS)                                                 */
        /* ---------------------------------------------------------------------- */

        let sariSariCount = 0;
        let restoCount = 0;
        let othersCount = 0;

        customers.forEach((c: any) => {
            const name = String(c.store_name ?? "").toUpperCase();
            if (name.includes("SARI") || name.includes("STORE")) sariSariCount++;
            else if (name.includes("RESTO") || name.includes("CAFE") || name.includes("KITCHEN"))
                restoCount++;
            else othersCount++;
        });

        const coverageDistribution = [
            { type: "Sari-Sari Store", count: sariSariCount, fill: "#3b82f6" },
            { type: "Restaurant", count: restoCount, fill: "#10b981" },
            { type: "Others", count: othersCount, fill: "#f59e0b" },
        ];

        const totalCustomers = customers.length;
        const penetrationRate =
            totalCustomers > 0
                ? (((sariSariCount + restoCount) / totalCustomers) * 100).toFixed(1)
                : "0.0";

        /* ---------------------------------------------------------------------- */
        /* 9) MONTHLY PERFORMANCE (REAL AGG, LAST 6 MONTHS)                        */
        /* ---------------------------------------------------------------------- */

        const monthAgg = new Map<string, number>();
        filteredInvoices.forEach((inv: any) => {
            const m = monthKey(inv.invoice_date);
            monthAgg.set(m, (monthAgg.get(m) || 0) + safeNet(inv));
        });

        const monthsSorted = Array.from(monthAgg.entries()).sort((a, b) =>
            a[0].localeCompare(b[0])
        );

        const monthlyPerformance = monthsSorted.slice(-6).map(([month, achieved]) => ({
            month,
            target: DEFAULT_TARGET, // placeholder; swap with real target table later
            achieved,
        }));

        /* ---------------------------------------------------------------------- */
        /* 10) TOP PRODUCTS (TEAM-WIDE)                                            */
        /* ---------------------------------------------------------------------- */

        const topProducts = Array.from(teamProductTotals.entries())
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            data: {
                teamSales,
                teamTarget,
                totalInvoices: totalInvoicesCount,
                penetrationRate: Number(penetrationRate),
                coverageDistribution,
                salesmen: salesmenList,
                monthlyPerformance,
                topProducts,
                // Keep placeholders; your page already has fallbacks
                topSuppliers: [],
                returnHistory: [],
            },
        });
    } catch (error: any) {
        console.error("Supervisor API Error:", error);
        return NextResponse.json(
            { success: false, error: error?.message ?? String(error) },
            { status: 500 }
        );
    }
}
