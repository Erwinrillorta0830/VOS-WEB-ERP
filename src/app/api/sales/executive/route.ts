// route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Fixes:
 * - Parent-Child Supplier Alignment: Child products now inherit supplier from parent if missing.
 * - Heatmap Data: "Internal / Others" minimized by correctly mapping product hierarchy.
 * - Removed: "Internal" division as per user request.
 */

/* -------------------------------------------------------------------------- */
/* DIRECTUS CONFIG (match working style)                                      */
/* -------------------------------------------------------------------------- */

const DIRECTUS_URL = (
    process.env.DIRECTUS_URL ?? "http://goatedcodoer:8056"
).replace(/\/+$/, "");

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_SERVICE_TOKEN ||
    "";

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

type DirectusErrorItem = {
    collection: string;
    status?: number;
    message: string;
    url: string;
};

function getHeaders(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Working-style fetch:
 * - absolute URL
 * - cache no-store
 * - retries for 429/503
 * - throws on non-ok with response body snippet
 */
async function directusFetchJson(url: string, attempt = 1): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const res = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Retry only for transient load/pressure
        if ((res.status === 503 || res.status === 429) && attempt < 4) {
            await sleep(400 * attempt);
            return directusFetchJson(url, attempt + 1);
        }

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
                `Directus request failed (${res.status}) for ${url}. Response: ${text.slice(
                    0,
                    1200
                )}`
            );
        }

        return await res.json();
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

/**
 * Paged fetch:
 * - keeps your current pagination approach
 * - BUT now: it surfaces real errors into `errors[]`
 *   (no more silent empty array masking a 403)
 */
async function fetchAllPaged<T>(
    collection: string,
    fields: string,
    errors: DirectusErrorItem[],
    pageSize = 500
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;
    const MAX_PAGES = 300;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url =
            `${DIRECTUS_URL}/items/${collection}` +
            `?fields=${encodeURIComponent(fields)}` +
            `&limit=${pageSize}&offset=${offset}`;

        try {
            const json = await directusFetchJson(url);
            const chunk = (Array.isArray(json?.data) ? json.data : []) as T[];
            out.push(...chunk);

            if (chunk.length < pageSize) break;
            offset += pageSize;
        } catch (err: any) {
            errors.push({
                collection,
                status: undefined,
                message: err?.message || String(err),
                url,
            });
            // Stop paging this collection when it errors (likely 403 field)
            break;
        }
    }

    return out;
}

// --- 1. DIVISION MAPPING RULES ---
const DIVISION_RULES: Record<string, { brands: string[]; sections: string[] }> =
    {
        "Dry Goods": {
            brands: [
                "Lucky Me",
                "Nescafe",
                "Kopiko",
                "Bear Brand",
                "Maggi",
                "Surf",
                "Downy",
                "Richeese",
                "Richoco",
                "Keratin",
                "KeratinPlus",
                "Dove",
                "Palmolive",
                "Safeguard",
                "Sunsilk",
                "Cream Silk",
                "Head & Shoulders",
                "Colgate",
                "Close Up",
                "Bioderm",
                "Casino",
                "Efficascent",
                "Great Taste",
                "Presto",
                "Tide",
                "Ariel",
                "Champion",
                "Callee",
                "Systemack",
                "Wings",
                "Pride",
                "Smart",
            ],
            sections: [
                "Grocery",
                "Canned",
                "Noodles",
                "Beverages",
                "Non-Food",
                "Personal Care",
                "Snacks",
                "Biscuits",
                "Candy",
                "Coffee",
                "Milk",
                "Powder",
            ],
        },
        "Frozen Goods": {
            brands: [
                "CDO",
                "Tender Juicy",
                "Mekeni",
                "Virginia",
                "Purefoods",
                "Aviko",
                "Swift",
                "Argentina",
                "Star",
                "Holiday",
                "Highland",
                "Bibbo",
                "Home Made",
                "Young Pork",
            ],
            sections: [
                "Frozen",
                "Meat",
                "Processed Meat",
                "Cold Cuts",
                "Ice Cream",
                "Hotdog",
                "Chicken",
                "Pork",
            ],
        },
        Industrial: {
            brands: [
                "Mama Sita",
                "Datu Puti",
                "Silver Swan",
                "Golden Fiesta",
                "LPG",
                "Solane",
                "Gasul",
                "Fiesta",
                "UFC",
                "Super Q",
                "Biguerlai",
                "Equal",
                "Jufran",
            ],
            sections: [
                "Condiments",
                "Oil",
                "Sacks",
                "Sugar",
                "Flour",
                "Industrial",
                "Gas",
                "Rice",
                "Salt",
            ],
        },
        "Mama Pina's": {
            brands: ["Mama Pina", "Mama Pinas", "Mama Pina's"],
            sections: ["Franchise", "Ready to Eat", "Kiosk", "Mama Pina", "MP"],
        },
    };

const SUPPLIER_TO_DIVISION: Record<string, string> = {
    MEN2: "Dry Goods",
    "MEN2 MARKETING": "Dry Goods",
    PUREFOODS: "Frozen Goods",
    CDO: "Frozen Goods",
    INDUSTRIAL: "Industrial",
    "MAMA PINA": "Mama Pina's",
    VIRGINIA: "Frozen Goods",
    AVIKO: "Frozen Goods",
    MEKENI: "Frozen Goods",
    TIONGSAN: "Dry Goods",
    CSI: "Dry Goods",
    TSH: "Dry Goods",
    JUMAPAS: "Dry Goods",
    COSTSAVER: "Dry Goods",
    "RISING SUN": "Dry Goods",
    MUNICIPAL: "Dry Goods",
};

const ALL_DIVISIONS = [
    "Dry Goods",
    "Frozen Goods",
    "Industrial",
    "Mama Pina's",
] as const;

function normalizeDate(d: string | null) {
    if (!d) return null;
    const dateObj = new Date(d);
    if (Number.isNaN(dateObj.getTime())) return d;
    return dateObj.toISOString().split("T")[0];
}

const toFixed = (num: number) => Math.round(num * 100) / 100;

function isTrue(field: any) {
    if (field === true) return true;
    if (field === 1) return true;
    if (field === "1") return true;
    if (typeof field === "object" && field !== null) {
        if (field.data && field.data[0] === 1) return true;
        if (field.type === "Buffer" && field.data && field.data[0] === 1)
            return true;
    }
    return false;
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
    const errors: DirectusErrorItem[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const rawFrom = searchParams.get("fromDate");
        const rawTo = searchParams.get("toDate");
        const rawDiv = searchParams.get("division");

        const fromDate = normalizeDate(rawFrom);
        const toDate = normalizeDate(rawTo);
        const divisionFilter = rawDiv === "all" ? null : rawDiv;

        // --- FETCH DATA ---
        const [
            invoices,
            details,
            products,
            pps,
            suppliers,
            salesmen,
            divisions,
            returns,
            returnDetails,
            collections,
            brands,
            sections,
        ] = await Promise.all([
            fetchAllPaged<any>("sales_invoice", "invoice_id,invoice_date", errors),
            fetchAllPaged<any>(
                "sales_invoice_details",
                "invoice_no,product_id,quantity,total_amount,discount_amount",
                errors
            ),
            fetchAllPaged<any>(
                "products",
                "product_id,product_name,product_brand,product_section,estimated_unit_cost,priceA,price_per_unit,parent_id",
                errors
            ),
            fetchAllPaged<any>("product_per_supplier", "product_id,supplier_id", errors),
            fetchAllPaged<any>("suppliers", "id,supplier_name", errors),
            fetchAllPaged<any>("salesman", "id,division_id", errors),
            fetchAllPaged<any>("division", "division_id,division_name", errors),
            fetchAllPaged<any>(
                "sales_return",
                "return_id,return_number,return_date,received_at,created_at,updated_at,total_amount",
                errors
            ),
            fetchAllPaged<any>(
                "sales_return_details",
                "return_no,product_id,quantity,total_amount,gross_amount,discount_amount,unit_price",
                errors
            ),
            fetchAllPaged<any>(
                "collection",
                "collection_date,isCancelled,totalAmount,salesman_id",
                errors
            ),
            fetchAllPaged<any>("brand", "brand_id,brand_name", errors),
            fetchAllPaged<any>("sections", "section_id,section_name", errors),
        ]);

        // If data is empty because of 403/URL/token issues, surface the errors clearly
        if (errors.length > 0 && invoices.length === 0 && details.length === 0) {
            return NextResponse.json(
                {
                    error: "Directus fetch failed (see _debug.errors).",
                    _debug: {
                        directusUrl: DIRECTUS_URL,
                        hasToken: Boolean(DIRECTUS_TOKEN),
                        errors,
                    },
                },
                { status: 500 }
            );
        }

        // Safety return (original behavior)
        if (invoices.length === 0 && details.length === 0 && products.length === 0) {
            return NextResponse.json({
                kpi: { totalNetSales: 0, totalReturns: 0, grossMargin: 0, collectionRate: 0 },
                kpiByDivision: {},
                divisionSales: [],
                salesTrend: [],
                supplierSalesByDivision: {},
                heatmapDataByDivision: {},
                _debug: {
                    directusUrl: DIRECTUS_URL,
                    hasToken: Boolean(DIRECTUS_TOKEN),
                    counts: { invoices: invoices.length, products: products.length },
                    errors,
                },
            });
        }

        // --- 1. BUILD MAPS ---
        const brandMap = new Map<number | string, string>();
        brands.forEach((b: any) => {
            if (b?.brand_id != null)
                brandMap.set(b.brand_id, String(b.brand_name || "").toUpperCase());
        });

        const sectionMap = new Map<number | string, string>();
        sections.forEach((s: any) => {
            if (s?.section_id != null)
                sectionMap.set(s.section_id, String(s.section_name || "").toUpperCase());
        });

        const productMap = new Map<string, any>();
        products.forEach((p: any) => {
            const pid = String(p.product_id);
            productMap.set(pid, {
                ...p,
                brand_name: brandMap.get(p.product_brand) || "",
                section_name: sectionMap.get(p.product_section) || "",
            });
        });

        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [String(s.id), String(s.supplier_name || "")])
        );

        const primarySupplierMap = new Map<string, string>();
        pps.forEach((r: any) => {
            const pid = String(r.product_id);
            if (!primarySupplierMap.has(pid)) primarySupplierMap.set(pid, String(r.supplier_id));
        });

        const salesmanDivisionMap = new Map<string, string>();
        salesmen.forEach((s: any) =>
            salesmanDivisionMap.set(String(s.id), String(s.division_id ?? ""))
        );

        const divisionNameMap = new Map<string, string>();
        divisions.forEach((d: any) =>
            divisionNameMap.set(String(d.division_id), String(d.division_name || ""))
        );

        // --- 2. HIERARCHY-AWARE SUPPLIER HELPER ---
        const getEffectiveSupplierId = (pId: string): string | null => {
            if (primarySupplierMap.has(pId)) return primarySupplierMap.get(pId)!;

            const prod = productMap.get(pId);
            if (prod?.parent_id) {
                const parentId = String(prod.parent_id);
                if (primarySupplierMap.has(parentId)) return primarySupplierMap.get(parentId)!;
            }
            return null;
        };

        // --- 3. DIVISION MATCHING LOGIC ---
        const getDivisionForProduct = (pId: string) => {
            const prod = productMap.get(String(pId));
            if (!prod) return "Dry Goods";

            const pBrand = String(prod.brand_name || "").toUpperCase();
            const pSection = String(prod.section_name || "").toUpperCase();
            const pName = String(prod.product_name || "").toUpperCase();

            for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
                if (
                    rules.brands.some(
                        (b) => pBrand.includes(b.toUpperCase()) || pName.includes(b.toUpperCase())
                    )
                )
                    return divName;

                if (rules.sections.some((s) => pSection.includes(s.toUpperCase()))) return divName;
            }

            const suppId = getEffectiveSupplierId(String(pId));
            if (suppId) {
                const suppName = (supplierNameMap.get(String(suppId)) || "").toUpperCase();
                for (const [key, val] of Object.entries(SUPPLIER_TO_DIVISION)) {
                    if (suppName.includes(key)) return val;
                }
            }

            if (pSection.includes("FROZEN") || pName.includes("HOTDOG")) return "Frozen Goods";
            return "Dry Goods";
        };

        // --- 4. AGGREGATION SETUP ---
        const divisionTotals = new Map<string, number>();
        const trendMap = new Map<string, number>();
        const divisionStats = new Map<
            string,
            { sales: number; returns: number; cogs: number; collections: number }
        >();
        const heatmapMap = new Map<string, Map<string, any>>();
        const supplierChartMap = new Map<string, Map<string, number>>();

        ALL_DIVISIONS.forEach((div) => {
            divisionStats.set(div, { sales: 0, returns: 0, cogs: 0, collections: 0 });
            divisionTotals.set(div, 0);
        });

        let grandTotalSales = 0;
        let grandTotalReturns = 0;
        let grandTotalCOGS = 0;
        let grandTotalCollected = 0;

        const invoiceLookup = new Map<string, any>();
        const filteredInvoiceIds = new Set<string>();
        const sortedFilteredMonths = new Set<string>();

        invoices.forEach((inv: any) => {
            if (!inv?.invoice_date) return;
            const d = String(inv.invoice_date).substring(0, 10);
            if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;
            invoiceLookup.set(String(inv.invoice_id), inv);
            filteredInvoiceIds.add(String(inv.invoice_id));
        });

        // --- 5. PROCESS DETAILS ---
        details.forEach((det: any) => {
            const invId =
                typeof det.invoice_no === "object"
                    ? String(det.invoice_no?.id ?? "")
                    : String(det.invoice_no ?? "");
            if (!invId || !filteredInvoiceIds.has(invId)) return;

            const inv = invoiceLookup.get(invId);
            const d = String(inv.invoice_date).substring(0, 10);
            const month = String(inv.invoice_date).substring(0, 7);
            sortedFilteredMonths.add(month);

            const pId = String(det.product_id);
            const division = getDivisionForProduct(pId);
            if (divisionFilter && division !== divisionFilter) return;

            const netDetail = (Number(det.total_amount) || 0) - (Number(det.discount_amount) || 0);
            const unitCost = Number(productMap.get(pId)?.estimated_unit_cost || 0);
            const qty = Number(det.quantity) || 0;
            const cogs = unitCost * qty;

            grandTotalSales += netDetail;
            grandTotalCOGS += cogs;

            divisionTotals.set(division, (divisionTotals.get(division) || 0) + netDetail);
            trendMap.set(d, (trendMap.get(d) || 0) + netDetail);

            if (divisionStats.has(division)) {
                const stats = divisionStats.get(division)!;
                stats.sales += netDetail;
                stats.cogs += cogs;
            }

            const supplierId = getEffectiveSupplierId(pId);
            const supplier = supplierNameMap.get(String(supplierId)) || "Others";

            if (netDetail > 0) {
                if (!heatmapMap.has(division)) heatmapMap.set(division, new Map());
                const divMap = heatmapMap.get(division)!;

                if (!divMap.has(supplier)) divMap.set(supplier, { supplier, total: 0 });
                const row = divMap.get(supplier)!;
                row[month] = (row[month] || 0) + netDetail;
                row.total += netDetail;

                if (!supplierChartMap.has(division)) supplierChartMap.set(division, new Map());
                const chMap = supplierChartMap.get(division)!;
                chMap.set(supplier, (chMap.get(supplier) || 0) + netDetail);
            }
        });

        // --- 6. PROCESS RETURNS ---
        const validReturnNos = new Set<string>();

        returns.forEach((ret: any) => {
            const rn = String(ret?.return_number ?? "").trim();
            const raw = ret?.return_date ?? ret?.received_at ?? ret?.created_at ?? null;
            if (!rn || !raw) return;
            const d = String(raw).substring(0, 10);
            if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;
            validReturnNos.add(rn);
        });

        returnDetails.forEach((rd: any) => {
            const rn = String(rd?.return_no ?? "").trim();
            if (!validReturnNos.has(rn)) return;

            const totalAmt = Number(rd.total_amount);
            const grossAmt = Number(rd.gross_amount);
            const discAmt = Number(rd.discount_amount);
            const returnVal = Math.abs(
                totalAmt !== 0
                    ? totalAmt
                    : grossAmt - discAmt || Number(rd.unit_price) * Number(rd.quantity) || 0
            );

            const div = getDivisionForProduct(String(rd.product_id));
            if (divisionFilter && div !== divisionFilter) return;

            grandTotalReturns += returnVal;
            if (divisionStats.has(div)) divisionStats.get(div)!.returns += returnVal;
        });

        // --- 7. PROCESS COLLECTIONS ---
        collections.forEach((col: any) => {
            if (isTrue(col.isCancelled) || !col?.collection_date) return;
            const d = String(col.collection_date).substring(0, 10);
            if ((fromDate && d < fromDate) || (toDate && d > toDate)) return;

            const amount = Number(col.totalAmount) || 0;
            const sId = String(col.salesman_id ?? "");
            const divId = salesmanDivisionMap.get(sId) || "";
            let colDiv = divId ? divisionNameMap.get(divId) || "Dry Goods" : "Dry Goods";

            if (colDiv.includes("Frozen")) colDiv = "Frozen Goods";
            else if (colDiv.includes("Dry")) colDiv = "Dry Goods";
            else if (colDiv.includes("Industrial")) colDiv = "Industrial";
            else if (colDiv.includes("Pina")) colDiv = "Mama Pina's";
            else colDiv = "Dry Goods";

            if (divisionFilter && colDiv !== divisionFilter) return;

            grandTotalCollected += amount;
            if (divisionStats.has(colDiv)) divisionStats.get(colDiv)!.collections += amount;
        });

        // --- 8. FINALIZE RESULTS ---
        const netSales = grandTotalSales - grandTotalReturns;
        const grossMargin = netSales > 0 ? ((netSales - grandTotalCOGS) / netSales) * 100 : 0;
        const collectionRate = netSales > 0 ? (grandTotalCollected / netSales) * 100 : 0;

        const heatmapFinal: Record<string, any[]> = {};
        const monthList = Array.from(sortedFilteredMonths).sort();

        for (const [divName, sMap] of heatmapMap.entries()) {
            heatmapFinal[divName] = Array.from(sMap.values())
                .map((row) => {
                    const newRow: any = { supplier: row.supplier, total: toFixed(row.total) };
                    monthList.forEach((m) => (newRow[m] = toFixed(row[m] || 0)));
                    return newRow;
                })
                .sort((a, b) => b.total - a.total);
        }

        const kpiByDivision: Record<string, any> = {};
        divisionStats.forEach((val, key) => {
            const divNetSales = val.sales - val.returns;
            kpiByDivision[key] = {
                totalNetSales: toFixed(divNetSales),
                totalReturns: toFixed(val.returns),
                grossMargin: toFixed(divNetSales > 0 ? ((divNetSales - val.cogs) / divNetSales) * 100 : 0),
                collectionRate: toFixed(divNetSales > 0 ? (val.collections / divNetSales) * 100 : 0),
            };
        });

        return NextResponse.json({
            kpi: {
                totalNetSales: toFixed(netSales),
                totalReturns: toFixed(grandTotalReturns),
                grossMargin: toFixed(grossMargin),
                collectionRate: toFixed(collectionRate),
            },
            kpiByDivision,
            divisionSales: Array.from(divisionTotals.entries())
                .map(([division, grossSales]) => ({
                    division,
                    netSales: toFixed(grossSales - (divisionStats.get(division)?.returns || 0)),
                }))
                .sort((a, b) => b.netSales - a.netSales),
            salesTrend: Array.from(trendMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([d, val]) => ({
                    date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    netSales: toFixed(val),
                })),
            supplierSalesByDivision: Object.fromEntries(
                Array.from(supplierChartMap.entries()).map(([div, sMap]) => [
                    div,
                    Array.from(sMap.entries())
                        .map(([name, ns]) => ({ name, netSales: toFixed(ns) }))
                        .sort((a, b) => b.netSales - a.netSales)
                        .slice(0, 10),
                ])
            ),
            heatmapDataByDivision: heatmapFinal,
            _debug: {
                directusUrl: DIRECTUS_URL,
                hasToken: Boolean(DIRECTUS_TOKEN),
                fromDate,
                toDate,
                counts: { invoices: invoices.length, details: details.length, products: products.length },
                errors,
            },
        });
    } catch (err: any) {
        console.error("API Error", err);
        return NextResponse.json(
            {
                error: err?.message || "Unknown error",
                _debug: {
                    directusUrl: DIRECTUS_URL,
                    hasToken: Boolean(DIRECTUS_TOKEN),
                    hint:
                        "Check _debug.errors for 403 field permission issues, or verify DIRECTUS_URL/DIRECTUS_TOKEN env vars.",
                },
            },
            { status: 500 }
        );
    }
}
