import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? "http://goatedcodoer:8091").replace(/\/+$/, "");
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_SERVICE_TOKEN ||
    "";

type DirectusJson<T = any> = { data?: T };

function getHeaders(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function directusFetch<T = any>(path: string, attempt = 1): Promise<T> {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const res = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            headers: getHeaders(),
        });

        clearTimeout(timeoutId);

        // Retry transient pressure
        if ((res.status === 429 || res.status === 503) && attempt < 4) {
            await sleep(400 * attempt);
            return directusFetch<T>(path, attempt + 1);
        }

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
                `Directus request failed (${res.status}) for ${url}. Response: ${text.slice(0, 1400)}`
            );
        }

        return (await res.json()) as T;
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

/**
 * ✅ Paged fetch that NEVER silently fails.
 * If Directus errors, it throws and you’ll see the actual response.
 */
async function fetchAllPaged<T = any>(
    collection: string,
    fields: string,
    extraParams = "",
    pageSize = 1000
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;
    const MAX_PAGES = 600;

    for (let i = 0; i < MAX_PAGES; i++) {
        const path =
            `/items/${collection}` +
            `?fields=${encodeURIComponent(fields)}` +
            `&limit=${pageSize}&offset=${offset}` +
            `${extraParams || ""}`;

        const json = await directusFetch<DirectusJson<T[]>>(path);
        const chunk = Array.isArray(json?.data) ? json.data : [];

        out.push(...chunk);

        if (chunk.length < pageSize) break;
        offset += pageSize;
    }

    return out;
}

async function fetchAll<T = any>(collection: string, fields: string): Promise<T[]> {
    const path = `/items/${collection}?limit=-1&fields=${encodeURIComponent(fields)}`;
    const json = await directusFetch<DirectusJson<T[]>>(path);
    return Array.isArray(json?.data) ? json.data : [];
}

/* -------------------------------------------------------------------------- */
/* YOUR EXISTING RULES / CONSTANTS (UNCHANGED)                                 */
/* -------------------------------------------------------------------------- */

const DIVISION_RULES: any = {
    "Dry Goods": {
        brands: [
            "Lucky Me","Nescafe","Kopiko","Bear Brand","Maggi","Surf","Downy","Richeese","Richoco","Keratin",
            "KeratinPlus","Dove","Palmolive","Safeguard","Sunsilk","Cream Silk","Head & Shoulders","Colgate",
            "Close Up","Bioderm","Casino","Efficascent","Great Taste","Presto","Tide","Ariel","Champion","Callee",
            "Systemack","Wings","Pride","Smart",
        ],
        sections: [
            "Grocery","Canned","Noodles","Beverages","Non-Food","Personal Care","Snacks","Biscuits","Candy","Coffee","Milk","Powder",
        ],
    },
    "Frozen Goods": {
        brands: [
            "CDO","Tender Juicy","Mekeni","Virginia","Purefoods","Aviko","Swift","Argentina","Star","Holiday","Highland","Bibbo","Home Made","Young Pork",
        ],
        sections: [
            "Frozen","Meat","Processed Meat","Cold Cuts","Ice Cream","Hotdog","Chicken","Pork",
        ],
    },
    Industrial: {
        brands: [
            "Mama Sita","Datu Puti","Silver Swan","Golden Fiesta","LPG","Solane","Gasul","Fiesta","UFC","Super Q","Biguerlai","Equal","Jufran",
        ],
        sections: [
            "Condiments","Oil","Sacks","Sugar","Flour","Industrial","Gas","Rice","Salt",
        ],
    },
    "Mama Pina's": {
        brands: ["Mama Pina", "Mama Pinas", "Mama Pina's"],
        sections: ["Franchise", "Ready to Eat", "Kiosk", "Mama Pina", "MP"],
    },
};

const ALL_DIVISIONS = ["Dry Goods", "Frozen Goods", "Industrial", "Mama Pina's"];

const INTERNAL_CUSTOMER_KEYWORDS = [
    "WALK-IN","WALKIN","EMPLOYEE","POLITICIAN","CLE ACE","OFFICE","INTERNAL","VOS","USE","INTERNAL DIVISION",
];

const SUPPLIER_TO_DIVISION: Record<string, string> = {
    MEN2: "Dry Goods",
    "MEN2 MARKETING": "Dry Goods",
    TIONGSAN: "Dry Goods",
    CSI: "Dry Goods",
    TSH: "Dry Goods",
    JUMAPAS: "Dry Goods",
    COSTSAVER: "Dry Goods",
    "RISING SUN": "Dry Goods",
    MUNICIPAL: "Dry Goods",

    PUREFOODS: "Frozen Goods",
    CDO: "Frozen Goods",
    FOODSPHERE: "Frozen Goods",
    VIRGINIA: "Frozen Goods",
    AVIKO: "Frozen Goods",
    MEKENI: "Frozen Goods",

    INDUSTRIAL: "Industrial",
    LPG: "Industrial",
    SOLANE: "Industrial",
    GASUL: "Industrial",
    "ISLA LPG": "Industrial",

    "MAMA PINA": "Mama Pina's",
    "MAMA PINA'S": "Mama Pina's",
};

function getSafeId(val: any, preferredKeys: string[] = []): string {
    if (val === null || val === undefined) return "";
    if (typeof val !== "object") return String(val);

    for (const k of preferredKeys) {
        const v = val?.[k];
        if (v !== undefined && v !== null) {
            return typeof v === "object" ? getSafeId(v, preferredKeys) : String(v);
        }
    }

    const keys = [
        "product_id","supplier_id","brand_id","section_id","invoice_id","return_number","return_no","customer_code","division_id",
    ];

    for (const k of keys) {
        const v = val?.[k];
        if (v !== undefined && v !== null) {
            return typeof v === "object" ? getSafeId(v, [k]) : String(v);
        }
    }

    if (val.id !== undefined && val.id !== null) return String(val.id);
    return "";
}

function normalizeDivisionLabel(input: string) {
    const v = String(input || "").trim().toUpperCase();
    if (!v) return "";

    if (v === "OVERVIEW") return "Overview";
    if (v.includes("FROZEN")) return "Frozen Goods";
    if (v.includes("INDUSTRIAL")) return "Industrial";
    if (v.includes("MAMA") && v.includes("PINA")) return "Mama Pina's";
    if (v.includes("DRY")) return "Dry Goods";

    if (v === "DRY GOODS") return "Dry Goods";
    if (v === "FROZEN GOODS") return "Frozen Goods";
    if (v === "INDUSTRIAL") return "Industrial";
    if (v === "MAMA PINA'S" || v === "MAMA PINAS") return "Mama Pina's";

    return input;
}

function getDatesInRange(startDate: string, endDate: string) {
    const date = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    while (date <= end) {
        dates.push(new Date(date).toISOString().split("T")[0]);
        date.setDate(date.getDate() + 1);
    }
    return dates;
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromDate = searchParams.get("fromDate");
        const toDate = searchParams.get("toDate");
        const activeTabRaw = searchParams.get("activeTab") || "Overview";
        const debugMode = searchParams.get("debug") === "1";
        const activeTab = normalizeDivisionLabel(activeTabRaw);

        // ✅ IMPORTANT: Directus _between best with comma-separated form (like your working routes)
        const invoiceFilter =
            fromDate && toDate ? `&filter[invoice_date][_between]=${fromDate},${toDate}` : "";
        const returnFilter =
            fromDate && toDate ? `&filter[return_date][_between]=${fromDate},${toDate}` : "";

        // ✅ DO NOT use fragile nested filters for invoice_details / return_details
        // Fetch them and filter locally via invoice ids / return numbers (stable)
        const [
            invoices,
            invoiceDetails,
            returns,
            returnDetails,
            products,
            pps,
            suppliers,
            brands,
            sections,
            salesmen,
            customers,
        ] = await Promise.all([
            fetchAllPaged("sales_invoice", "invoice_id,invoice_date,total_amount,salesman_id,customer_code", invoiceFilter),
            fetchAllPaged("sales_invoice_details", "invoice_no,product_id,total_amount,quantity"),
            fetchAllPaged("sales_return", "return_number,return_date", returnFilter),
            fetchAllPaged("sales_return_details", "return_no,product_id,quantity"),
            fetchAllPaged("products", "product_id,parent_id,product_name,product_brand,product_section"),
            fetchAllPaged("product_per_supplier", "product_id,supplier_id"),
            fetchAllPaged("suppliers", "id,supplier_name"),
            fetchAllPaged("brand", "brand_id,brand_name"),
            fetchAllPaged("sections", "section_id,section_name"),
            fetchAll("salesman", "id,salesman_name"),
            fetchAll("customer", "customer_code,store_name"),
        ]);

        // --- MAPS ---
        const supplierNameMap = new Map<string, string>();
        suppliers.forEach((s: any) => {
            const sid = getSafeId(s.id, ["id"]);
            if (!sid) return;
            supplierNameMap.set(sid, String(s.supplier_name || "").toUpperCase());
        });

        const productToSupplierMap = new Map<string, string>();
        pps.forEach((p: any) => {
            const pid = getSafeId(p.product_id, ["product_id"]);
            const sid = getSafeId(p.supplier_id, ["supplier_id"]);
            if (!pid || !sid) return;
            if (!productToSupplierMap.has(pid)) productToSupplierMap.set(pid, sid);
        });

        const brandNameById = new Map<string, string>();
        brands.forEach((b: any) => {
            const bid = getSafeId(b.brand_id, ["brand_id"]);
            if (!bid) return;
            brandNameById.set(bid, String(b.brand_name || "").toUpperCase());
        });

        const sectionNameById = new Map<string, string>();
        sections.forEach((s: any) => {
            const sid = getSafeId(s.section_id, ["section_id"]);
            if (!sid) return;
            sectionNameById.set(sid, String(s.section_name || "").toUpperCase());
        });

        const productMap = new Map<string, any>();
        const parentIdMap = new Map<string, string | null>();

        products.forEach((p: any) => {
            const pId = getSafeId(p.product_id, ["product_id"]);
            if (!pId) return;

            const brandId = getSafeId(p.product_brand, ["brand_id"]);
            const sectionId = getSafeId(p.product_section, ["section_id"]);

            const parent =
                getSafeId(p.parent_id, ["product_id"]) ||
                "";

            const parentId = parent ? String(parent) : null;

            productMap.set(pId, {
                ...p,
                brand_name: brandNameById.get(brandId) || "",
                section_name: sectionNameById.get(sectionId) || "",
                stock: Number(p.stock) || Number(p.inventory) || 0,
                parent_id: parentId,
            });

            parentIdMap.set(pId, parentId);
        });

        const rootMemo = new Map<string, string>();
        const getRootId = (pId: string): string => {
            const pid = String(pId);
            if (rootMemo.has(pid)) return rootMemo.get(pid)!;

            let current = pid;
            const visited = new Set<string>();

            while (current && !visited.has(current)) {
                visited.add(current);
                const parent = parentIdMap.get(current);
                if (!parent) break;
                if (!parentIdMap.has(parent)) break;
                current = parent;
            }

            rootMemo.set(pid, current || pid);
            return current || pid;
        };

        // family supplier mapping
        const rootSupplierFreq = new Map<string, Map<string, number>>();
        for (const [pid, sid] of productToSupplierMap.entries()) {
            const root = getRootId(pid);
            if (!rootSupplierFreq.has(root)) rootSupplierFreq.set(root, new Map());
            const fm = rootSupplierFreq.get(root)!;
            fm.set(sid, (fm.get(sid) || 0) + 1);
        }

        const rootSupplierIdMap = new Map<string, string>();
        for (const [root, fm] of rootSupplierFreq.entries()) {
            let bestSid = "";
            let bestCount = -1;
            for (const [sid, cnt] of fm.entries()) {
                if (cnt > bestCount) {
                    bestCount = cnt;
                    bestSid = sid;
                }
            }
            if (bestSid) rootSupplierIdMap.set(root, bestSid);
        }

        for (const root of rootSupplierIdMap.keys()) {
            const directRoot = productToSupplierMap.get(root);
            if (directRoot) rootSupplierIdMap.set(root, directRoot);
        }

        const getEffectiveSupplierId = (pId: string): string | null => {
            const pid = String(pId);
            const direct = productToSupplierMap.get(pid);
            if (direct) return direct;
            const root = getRootId(pid);
            return rootSupplierIdMap.get(root) || null;
        };

        const getResolvedSupplierNameOrNull = (pId: string): string | null => {
            const sid = getEffectiveSupplierId(pId);
            if (!sid) return null;
            const name = supplierNameMap.get(sid);
            return name ? name : null;
        };

        const salesmanMap = new Map<string, string>();
        salesmen.forEach((s: any) =>
            salesmanMap.set(getSafeId(s.id, ["id"]), String(s.salesman_name || "")),
        );

        const customerMap = new Map<string, string>();
        customers.forEach((c: any) =>
            customerMap.set(String(c.customer_code), String(c.store_name || "").toUpperCase()),
        );

        // invoice lookup
        const invoiceLookup = new Map<string, any>();
        invoices.forEach((inv: any) => {
            const invId = getSafeId(inv.invoice_id, ["invoice_id"]);
            if (!invId) return;
            invoiceLookup.set(invId, inv);
        });
        const validInvoiceIds = new Set<string>(invoiceLookup.keys());

        const validReturnIds = new Set(
            returns.map((r: any) => String(r.return_number)).filter(Boolean),
        );

        // --- AGGREGATION SETUP ---
        const divisionStats = new Map<string, { good: number; bad: number }>();
        ALL_DIVISIONS.forEach((div) => divisionStats.set(div, { good: 0, bad: 0 }));

        const trendMap = new Map<string, { good: number; bad: number }>();
        if (fromDate && toDate) {
            getDatesInRange(fromDate, toDate).forEach((d) => trendMap.set(d, { good: 0, bad: 0 }));
        }

        const supplierSales = new Map<string, number>();
        const salesmanSales = new Map<string, number>();
        const productSales = new Map<string, number>();
        const customerSales = new Map<string, number>();
        const supplierSalesmanMap = new Map<string, Map<string, number>>();

        let totalGoodStockOutflow = 0;
        let totalBadStockInflow = 0;

        let debugUnmappedCount = 0;
        const debugUnmappedExamples: Array<{ product_id: string; product_name: string; root_id: string }> = [];

        const getDivisionForProduct = (pId: string) => {
            const prod = productMap.get(pId);

            const pBrand = String(prod?.brand_name || "").toUpperCase();
            const pSection = String(prod?.section_name || "").toUpperCase();
            const pName = String(prod?.product_name || "").toUpperCase();

            for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
                const r = rules as any;
                if (r.brands.some((b: string) => pBrand.includes(b.toUpperCase()) || pName.includes(b.toUpperCase()))) return divName;
                if (r.sections.some((s: string) => pSection.includes(s.toUpperCase()))) return divName;
            }

            const sid = getEffectiveSupplierId(pId);
            if (sid) {
                const sName = (supplierNameMap.get(String(sid)) || "").toUpperCase();
                for (const [key, div] of Object.entries(SUPPLIER_TO_DIVISION)) {
                    if (sName.includes(key)) return div;
                }
            }

            if (pSection.includes("FROZEN")) return "Frozen Goods";
            if (pName.includes("HOTDOG") || pName.includes("ICE CREAM") || pName.includes("CHICKEN") || pName.includes("PORK")) return "Frozen Goods";
            if (pName.includes("LPG") || pName.includes("SOLANE") || pName.includes("GASUL")) return "Industrial";
            if (pName.includes("MAMA PINA")) return "Mama Pina's";

            return "Dry Goods";
        };

        const isTabMatch = (realDivision: string, currentTab: string) => {
            const tab = normalizeDivisionLabel(currentTab);
            if (!tab || tab === "Overview") return true;
            return normalizeDivisionLabel(realDivision) === tab;
        };

        // --- PROCESS INVOICES ---
        invoiceDetails.forEach((det: any) => {
            const invId = getSafeId(det.invoice_no, ["invoice_id"]);
            if (!invId || !validInvoiceIds.has(invId)) return;

            const parent = invoiceLookup.get(invId);
            const custName = customerMap.get(String(parent?.customer_code)) || "";

            const pId = getSafeId(det.product_id, ["product_id"]);
            if (!pId) return;

            const qty = Number(det.quantity) || 0;
            const amt = Number(det.total_amount) || 0;

            const realDivision = getDivisionForProduct(pId);
            if (divisionStats.has(realDivision)) divisionStats.get(realDivision)!.good += qty;

            if (isTabMatch(realDivision, activeTab)) {
                totalGoodStockOutflow += qty;

                const pName = productMap.get(pId)?.product_name || `Product ${pId}`;
                productSales.set(pName, (productSales.get(pName) || 0) + amt);

                const sName = getResolvedSupplierNameOrNull(pId);
                if (sName) {
                    supplierSales.set(sName, (supplierSales.get(sName) || 0) + amt);

                    if (parent) {
                        const d = String(parent.invoice_date || "").substring(0, 10);
                        if (trendMap.has(d)) {
                            const curr = trendMap.get(d)!;
                            curr.good += qty;
                            trendMap.set(d, curr);
                        }

                        const smName = salesmanMap.get(getSafeId(parent.salesman_id, ["id"])) || "Unknown Salesman";
                        salesmanSales.set(smName, (salesmanSales.get(smName) || 0) + amt);

                        customerSales.set(custName, (customerSales.get(custName) || 0) + amt);

                        if (!supplierSalesmanMap.has(sName)) supplierSalesmanMap.set(sName, new Map());
                        const smMap = supplierSalesmanMap.get(sName)!;
                        smMap.set(smName, (smMap.get(smName) || 0) + amt);
                    }
                } else {
                    debugUnmappedCount += 1;
                    if (debugMode && debugUnmappedExamples.length < 25) {
                        debugUnmappedExamples.push({
                            product_id: pId,
                            product_name: productMap.get(pId)?.product_name || `Product ${pId}`,
                            root_id: getRootId(pId),
                        });
                    }
                }
            }
        });

        // --- PROCESS RETURNS ---
        returnDetails.forEach((ret: any) => {
            const retId =
                getSafeId(ret.return_no, ["return_number", "return_no"]) || String(ret.return_no || "");
            if (!retId || !validReturnIds.has(String(retId))) return;

            const pId = getSafeId(ret.product_id, ["product_id"]);
            if (!pId) return;

            const qty = Number(ret.quantity) || 0;
            const realDivision = getDivisionForProduct(pId);

            if (divisionStats.has(realDivision)) divisionStats.get(realDivision)!.bad += qty;

            if (isTabMatch(realDivision, activeTab)) {
                totalBadStockInflow += qty;

                const parent = returns.find((r: any) => String(r.return_number) === String(retId));
                if (parent) {
                    const d = String(parent.return_date || "").substring(0, 10);
                    if (trendMap.has(d)) {
                        const curr = trendMap.get(d)!;
                        curr.bad += qty;
                        trendMap.set(d, curr);
                    }
                }
            }
        });

        // --- CALCULATE STOCK ---
        let totalCurrentStock = 0;
        productMap.forEach((prod: any) => {
            const pid = getSafeId(prod.product_id, ["product_id"]);
            if (!pid) return;

            const prodDiv = getDivisionForProduct(pid);
            if (isTabMatch(prodDiv, activeTab)) totalCurrentStock += prod.stock || 0;
        });

        const totalMoved = totalGoodStockOutflow + totalCurrentStock;
        const velocityRate = totalMoved > 0 ? (totalGoodStockOutflow / totalMoved) * 100 : 0;
        const returnRate = totalGoodStockOutflow > 0 ? (totalBadStockInflow / totalGoodStockOutflow) * 100 : 0;

        const trendData = Array.from(trendMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, vals]) => ({
                date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                goodStockOutflow: vals.good,
                badStockInflow: vals.bad,
            }));

        const supplierBreakdown = Array.from(supplierSalesmanMap.entries())
            .map(([sName, smMap]) => {
                const totalSales = Array.from(smMap.values()).reduce((a, b) => a + b, 0);
                const salesmen = Array.from(smMap.entries())
                    .map(([name, amount]) => ({
                        name,
                        amount,
                        percent: totalSales > 0 ? ((amount / totalSales) * 100).toFixed(1) : "0",
                    }))
                    .sort((a, b) => b.amount - a.amount);

                return { id: sName, name: sName, totalSales, salesmen };
            })
            .sort((a, b) => b.totalSales - a.totalSales);

        const responsePayload: any = {
            division: activeTabRaw,
            goodStock: {
                velocityRate: Math.round(velocityRate * 100) / 100,
                status: velocityRate > 50 ? "Fast Moving" : velocityRate > 20 ? "Healthy" : "Slow Moving",
                totalOutflow: totalGoodStockOutflow,
                totalInflow: totalMoved,
            },
            badStock: {
                accumulated: totalBadStockInflow,
                status: returnRate > 5 ? "Critical" : "Normal",
                totalInflow: totalBadStockInflow,
            },
            trendData,
            salesBySupplier: supplierBreakdown.slice(0, 10).map((s) => ({ name: s.name, value: s.totalSales })),
            salesBySalesman: Array.from(salesmanSales.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),
            supplierBreakdown,
            divisionBreakdown: ALL_DIVISIONS.map((divName) => {
                const stats = divisionStats.get(divName) || { good: 0, bad: 0 };
                return {
                    division: divName,
                    goodStock: {
                        totalOutflow: stats.good,
                        status: stats.good > 5000 ? "Healthy" : "Warning",
                    },
                    badStock: { accumulated: stats.bad },
                };
            }),
            pareto: {
                products: Array.from(productSales.entries())
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 50),
                customers: Array.from(customerSales.entries())
                    .filter(([name]) => !INTERNAL_CUSTOMER_KEYWORDS.some((k) => name.includes(k)))
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 50),
            },
        };

        if (debugMode) {
            responsePayload._debug = {
                activeTabRaw,
                activeTabNormalized: activeTab,
                counts: {
                    invoices: invoices.length,
                    invoiceDetails: invoiceDetails.length,
                    returns: returns.length,
                    returnDetails: returnDetails.length,
                    products: products.length,
                    pps: pps.length,
                    suppliers: suppliers.length,
                },
                mappedSuppliers: supplierBreakdown.length,
                unmappedLinesDropped: debugUnmappedCount,
                unmappedExamples: debugUnmappedExamples,
                directusUrl: DIRECTUS_URL,
                hasToken: Boolean(DIRECTUS_TOKEN),
            };
        }

        return NextResponse.json(responsePayload);
    } catch (error: any) {
        console.error("❌ Stock dashboard route error:", error);
        return NextResponse.json(
            {
                error: "Failed to build stock dashboard",
                details: error?.message || String(error),
                _debug: {
                    directusUrl: DIRECTUS_URL,
                    hasToken: Boolean(DIRECTUS_TOKEN),
                },
            },
            { status: 500 }
        );
    }
}
