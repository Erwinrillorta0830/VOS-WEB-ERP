// app/api/sales/executive/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL =
    (process.env.DIRECTUS_URL ?? "http://100.110.197.61:8091").replace(/\/+$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN;

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type DirectusListResponse<T> = { data: T[] };

/* -------------------------------------------------------------------------- */
/* UTIL                                                                       */
/* -------------------------------------------------------------------------- */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize incoming query dates to YYYY-MM-DD for safe string comparisons.
 * Accepts:
 * - YYYY-MM-DD
 * - MM/DD/YYYY
 * - DD/MM/YYYY (auto-detect: if first part > 12, treat as DD/MM)
 */
function normalizeDate(input: string | null): string | null {
    if (!input) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(input)) return input.substring(0, 10);

    if (input.includes("/")) {
        const parts = input.split("/");
        if (parts.length === 3) {
            const a = Number(parts[0]);
            const b = Number(parts[1]);
            const year = parts[2];

            const day = a > 12 ? String(a) : String(b);
            const month = a > 12 ? String(b) : String(a);

            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
    }

    return input;
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

function isTruthy(field: any) {
    if (field === true || field === 1 || field === "1" || field === "true")
        return true;
    if (field && typeof field === "object" && field.data && field.data[0] === 1)
        return true;
    return false;
}

/* -------------------------------------------------------------------------- */
/* DIRECTUS FETCH                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Fetch JSON from Directus with retry on transient backpressure errors.
 */
async function directusFetch<T>(path: string, attempt = 1): Promise<T> {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const res = await fetch(url, {
        cache: "no-store",
        headers: {
            ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
        },
    });

    // Retry on transient pressure responses
    if ((res.status === 503 || res.status === 429) && attempt < 4) {
        await sleep(500 * attempt); // 500ms, 1000ms, 1500ms
        return directusFetch<T>(path, attempt + 1);
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `Directus request failed (${res.status}) for ${url}. Response: ${text.slice(
                0,
                700
            )}`
        );
    }

    return res.json() as Promise<T>;
}

/**
 * Paged list fetcher for Directus /items endpoints.
 * Uses limit+offset to avoid limit=-1 load spikes.
 */
async function fetchAllPaged<T>(
    basePath: string,
    pageSize = 500,
    hardOffsetLimit = 200_000
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;

    while (true) {
        const joiner = basePath.includes("?") ? "&" : "?";
        const pagePath = `${basePath}${joiner}limit=${pageSize}&offset=${offset}`;

        const json = await directusFetch<DirectusListResponse<T>>(pagePath);
        const batch = json.data ?? [];

        out.push(...batch);

        if (batch.length < pageSize) break;

        offset += pageSize;
        if (offset > hardOffsetLimit) break; // safety
    }

    return out;
}

/* -------------------------------------------------------------------------- */
/* MAIN ROUTE                                                                 */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        const fromDate = normalizeDate(searchParams.get("fromDate"));
        const toDate = normalizeDate(searchParams.get("toDate"));

        const rawDiv = searchParams.get("division");
        const divisionFilter = rawDiv === "all" || !rawDiv ? null : rawDiv;

        const warnings: string[] = [];

        /* ---------------------------------------------------------------------- */
        /* LOAD DATA (reduce payload via fields=...)                              */
        /* ---------------------------------------------------------------------- */

        // Fetch sequentially (or in small groups) to reduce concurrent load.
        const invoices = await fetchAllPaged<any>(
            `/items/sales_invoice?fields=invoice_id,invoice_no,invoice_date,order_id,salesman_id`
        );

        const details = await fetchAllPaged<any>(
            `/items/sales_invoice_details?fields=invoice_no,product_id,quantity,unit_price,total_amount,discount_amount`
        );

        const products = await fetchAllPaged<any>(
            `/items/products?fields=product_id,parent_id,cost_per_unit,estimated_unit_cost`
        );

        const pps = await fetchAllPaged<any>(
            `/items/product_per_supplier?fields=id,product_id,supplier_id`,
            500
        );

        const suppliers = await fetchAllPaged<any>(
            `/items/suppliers?fields=id,supplier_name`,
            500
        );

        const salesmen = await fetchAllPaged<any>(
            `/items/salesman?fields=id,division_id`,
            500
        );

        const divisions = await fetchAllPaged<any>(
            `/items/division?fields=division_id,division_name`,
            500
        );

        const returns = await fetchAllPaged<any>(
            `/items/sales_return?fields=return_number,order_id,invoice_no`,
            500
        );

        const returnDetails = await fetchAllPaged<any>(
            `/items/sales_return_details?fields=return_no,product_id,total_amount,discount_amount`,
            500
        );

        // Collections: likely the largest + most prone to 503. Do not fail whole dashboard.
        let collections: any[] = [];
        try {
            collections = await fetchAllPaged<any>(
                `/items/collection?fields=collection_date,salesman_id,totalAmount,isCancelled`,
                300
            );
        } catch (e) {
            warnings.push(
                "Collections data temporarily unavailable (Directus under pressure). KPI collection rate may be incomplete."
            );
            collections = [];
        }

        /* ---------------------------------------------------------------------- */
        /* BUILD MAPS                                                             */
        /* ---------------------------------------------------------------------- */

        const monthSet = new Set<string>();

        // Robust invoice keying: invoice_id, invoice_no, and Directus id (if any)
        const invoiceMap = new Map<string, any>();

        invoices.forEach((i: any) => {
            const invoiceDate = i.invoice_date?.substring?.(0, 10);
            if (!invoiceDate) return;

            // Strict date filtering
            if (fromDate && invoiceDate < fromDate) return;
            if (toDate && invoiceDate > toDate) return;

            if (i.invoice_id != null) invoiceMap.set(String(i.invoice_id), i);
            if (i.invoice_no != null) invoiceMap.set(String(i.invoice_no), i);
            if (i.id != null) invoiceMap.set(String(i.id), i);

            monthSet.add(i.invoice_date.substring(0, 7));
        });

        const sortedMonths = Array.from(monthSet).sort();

        const productParentMap = new Map<string | number, string | number>(
            products.map((p: any) => {
                const parentId =
                    p.parent_id === 0 || p.parent_id === null
                        ? p.product_id
                        : p.parent_id;
                return [p.product_id, parentId];
            })
        );

        const productCostMap = new Map<string | number, number>(
            products.map((p: any) => [
                p.product_id,
                Number(p.cost_per_unit) || Number(p.estimated_unit_cost) || 0,
            ])
        );

        const primarySupplierMap = new Map<string | number, string | number>();
        pps
            .slice()
            .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
            .forEach((r: any) => {
                if (!primarySupplierMap.has(r.product_id)) {
                    primarySupplierMap.set(r.product_id, r.supplier_id);
                }
            });

        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [String(s.id), String(s.supplier_name)])
        );

        const salesmanDivisionMap = new Map<string, string>(
            salesmen.map((s: any) => [String(s.id), String(s.division_id)])
        );

        const divisionNameMap = new Map<string, string>(
            divisions.map((d: any) => [
                String(d.division_id),
                String(d.division_name),
            ])
        );

        // Returns lookup (avoid returns.find for each return detail)
        const returnsByReturnNo = new Map<string, any>();
        returns.forEach((r: any) => {
            if (r.return_number != null)
                returnsByReturnNo.set(String(r.return_number), r);
        });

        const returnItemMap = new Map<string, { total: number; disc: number }>();
        returnDetails.forEach((rd: any) => {
            const parent = returnsByReturnNo.get(String(rd.return_no));
            if (!parent) return;

            const masterProduct =
                productParentMap.get(rd.product_id) || rd.product_id;

            const key = `${parent.order_id}_${parent.invoice_no}_${masterProduct}`;
            const cur = returnItemMap.get(key) || { total: 0, disc: 0 };

            returnItemMap.set(key, {
                total: cur.total + (+rd.total_amount || 0),
                disc: cur.disc + (+rd.discount_amount || 0),
            });
        });

        /* ---------------------------------------------------------------------- */
        /* AGGREGATION CONTAINERS                                                 */
        /* ---------------------------------------------------------------------- */

        const heatmapMap = new Map<string, Map<string, any>>();
        const supplierChartMap = new Map<string, Map<string, number>>();
        const divisionTotals = new Map<string, number>();

        const monthlyStats = new Map<
            string,
            { sales: number; returns: number; cogs: number; collections: number }
        >();
        sortedMonths.forEach((m) => {
            monthlyStats.set(m, { sales: 0, returns: 0, cogs: 0, collections: 0 });
        });

        const divisionStats = new Map<
            string,
            { sales: number; returns: number; cogs: number; collections: number }
        >();

        divisions.forEach((d: any) => {
            const name = String(d.division_name || d.division);
            if (name) {
                divisionTotals.set(name, 0);
                divisionStats.set(name, {
                    sales: 0,
                    returns: 0,
                    cogs: 0,
                    collections: 0,
                });
            }
        });

        ["Dry Goods", "Industrial", "Mama Pina's", "Frozen Goods", "Unassigned"].forEach(
            (name) => {
                if (!divisionStats.has(name)) {
                    divisionStats.set(name, {
                        sales: 0,
                        returns: 0,
                        cogs: 0,
                        collections: 0,
                    });
                }
            }
        );

        let grandTotalSales = 0;
        let grandTotalReturns = 0;
        let grandTotalCOGS = 0;

        /* ---------------------------------------------------------------------- */
        /* PROCESS SALES DETAILS                                                  */
        /* ---------------------------------------------------------------------- */

        details.forEach((det: any) => {
            // invoice_no can be:
            // - invoice_no string
            // - invoice_id number
            // - object { id, invoice_id, invoice_no }
            const invKey =
                typeof det.invoice_no === "object"
                    ? String(
                        det.invoice_no?.invoice_id ??
                        det.invoice_no?.invoice_no ??
                        det.invoice_no?.id ??
                        ""
                    )
                    : String(det.invoice_no ?? "");

            const inv = invoiceMap.get(invKey);
            if (!inv) return;

            const masterProduct =
                productParentMap.get(det.product_id) || det.product_id;

            const supplierId = String(primarySupplierMap.get(masterProduct) ?? "");
            const supplierRaw = supplierNameMap.get(supplierId);
            const supplier = typeof supplierRaw === "string" ? supplierRaw : "No Supplier";

            const divisionId = salesmanDivisionMap.get(String(inv.salesman_id));
            let division = divisionId ? divisionNameMap.get(divisionId) : undefined;

            // Fallback logic
            if (!division || division === "Unassigned") {
                if (supplier === "VOS" || supplier === "VOS BIA") division = "Dry Goods";
                else if (supplier === "Mama Pina's") division = "Mama Pina's";
                else if (
                    supplier === "Industrial Corp" ||
                    (supplier && supplier.includes("Industrial"))
                )
                    division = "Industrial";
                else if (supplier && supplier !== "No Supplier") division = "Frozen Goods";
                else division = "Unassigned";
            }

            if (divisionFilter && division !== divisionFilter) return;

            const month = inv.invoice_date.substring(0, 7);

            const retKey = `${inv.order_id}_${inv.invoice_no}_${masterProduct}`;
            const ret = returnItemMap.get(retKey) || { total: 0, disc: 0 };
            const returnAmount = ret.total - ret.disc;

            const net =
                (+det.total_amount || 0) - (+det.discount_amount || 0) - returnAmount;

            const unitCost = Number(productCostMap.get(det.product_id) || 0);
            const unitPrice = +det.unit_price || 0;
            const returnedQtyApprox = unitPrice > 0 ? returnAmount / unitPrice : 0;
            const netQty = (+det.quantity || 0) - returnedQtyApprox;
            const cogs = unitCost * netQty;

            grandTotalSales += net;
            grandTotalReturns += returnAmount;
            grandTotalCOGS += cogs;

            if (!divisionStats.has(division)) {
                divisionStats.set(division, {
                    sales: 0,
                    returns: 0,
                    cogs: 0,
                    collections: 0,
                });
            }

            const dStat = divisionStats.get(division)!;
            dStat.sales += net;
            dStat.returns += returnAmount;
            dStat.cogs += cogs;

            divisionTotals.set(division, (divisionTotals.get(division) || 0) + net);

            const mStat = monthlyStats.get(month);
            if (mStat) {
                mStat.sales += net;
                mStat.returns += returnAmount;
                mStat.cogs += cogs;
            }

            if (net === 0) return;

            // Heatmap
            if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
            const divMap = heatmapMap.get(division)!;

            if (!divMap.has(supplier)) {
                const row: any = { supplier, total: 0 };
                sortedMonths.forEach((m) => (row[m] = 0));
                divMap.set(supplier, row);
            }

            const hRow = divMap.get(supplier)!;
            if (hRow[month] !== undefined) hRow[month] += net;
            hRow.total += net;

            // Supplier chart
            if (!supplierChartMap.has(division))
                supplierChartMap.set(division, new Map());
            const chartMap = supplierChartMap.get(division)!;
            chartMap.set(supplier, (chartMap.get(supplier) || 0) + net);
        });

        /* ---------------------------------------------------------------------- */
        /* PROCESS COLLECTIONS                                                    */
        /* ---------------------------------------------------------------------- */

        let grandTotalCollected = 0;

        collections.forEach((col: any) => {
            if (!col.collection_date) return;
            const d = col.collection_date.substring(0, 10);

            if (fromDate && d < fromDate) return;
            if (toDate && d > toDate) return;
            if (isTruthy(col.isCancelled)) return;

            const divId = salesmanDivisionMap.get(String(col.salesman_id));
            const colDivision = divId
                ? divisionNameMap.get(divId) || "Unassigned"
                : "Unassigned";

            if (divisionFilter && colDivision !== divisionFilter) return;

            const amount = Number(col.totalAmount) || 0;
            const month = col.collection_date.substring(0, 7);

            grandTotalCollected += amount;

            if (!divisionStats.has(colDivision)) {
                divisionStats.set(colDivision, {
                    sales: 0,
                    returns: 0,
                    cogs: 0,
                    collections: 0,
                });
            }

            divisionStats.get(colDivision)!.collections += amount;

            const mStat = monthlyStats.get(month);
            if (mStat) mStat.collections += amount;
        });

        /* ---------------------------------------------------------------------- */
        /* KPI CALCULATIONS                                                       */
        /* ---------------------------------------------------------------------- */

        const grossMargin =
            grandTotalSales > 0
                ? ((grandTotalSales - grandTotalCOGS) / grandTotalSales) * 100
                : 0;

        const collectionRate =
            grandTotalSales > 0 ? (grandTotalCollected / grandTotalSales) * 100 : 0;

        const kpiByDivision: any = {};
        divisionStats.forEach((val, key) => {
            const divGM = val.sales > 0 ? ((val.sales - val.cogs) / val.sales) * 100 : 0;
            const divCR = val.sales > 0 ? (val.collections / val.sales) * 100 : 0;

            kpiByDivision[key] = {
                totalNetSales: toFixed(val.sales),
                totalReturns: toFixed(val.returns),
                grossMargin: toFixed(divGM),
                collectionRate: toFixed(divCR),
            };
        });

        /* ---------------------------------------------------------------------- */
        /* FORMAT RESPONSE                                                        */
        /* ---------------------------------------------------------------------- */

        const heatmapFinal: any = {};
        for (const [divName, sMap] of heatmapMap.entries()) {
            heatmapFinal[divName] = Array.from(sMap.values())
                .map((row) => {
                    row.total = toFixed(row.total);
                    sortedMonths.forEach((m) => (row[m] = toFixed(row[m] || 0)));
                    return row;
                })
                .sort((a, b) => b.total - a.total);
        }

        const chartFinal: any = {};
        for (const [divName, sMap] of supplierChartMap.entries()) {
            chartFinal[divName] = Array.from(sMap, ([name, netSales]) => ({
                name,
                netSales: toFixed(netSales),
            })).sort((a, b) => b.netSales - a.netSales);
        }

        const divisionSalesFormatted = Array.from(divisionTotals, ([division, netSales]) => ({
            division,
            netSales: toFixed(netSales),
        }))
            .filter((d) => d.division !== "Unassigned" || d.netSales > 0)
            .sort((a, b) => b.netSales - a.netSales);

        const salesTrendFormatted = sortedMonths.map((month) => {
            const s = monthlyStats.get(month) || { sales: 0 };
            return {
                date: month,
                netSales: toFixed((s as any).sales ?? 0),
            };
        });

        return NextResponse.json({
            warnings,
            kpi: {
                totalNetSales: toFixed(grandTotalSales),
                totalReturns: toFixed(grandTotalReturns),
                grossMargin: toFixed(grossMargin),
                collectionRate: toFixed(collectionRate),
            },
            kpiByDivision,
            divisionSales: divisionSalesFormatted,
            supplierSalesByDivision: chartFinal,
            heatmapDataByDivision: heatmapFinal,
            salesTrend: salesTrendFormatted,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Dashboard Error:", err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
