import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL =
    process.env.DIRECTUS_URL || "http://100.110.197.61:8091";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

// Optional token if your Directus requires auth (safe if blank)
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

type DirectusErrorItem = {
    collection: string;
    status?: number;
    message: string;
    url: string;
};

// --- 1. CONFIGURATION RULES (Hardcoded logic habang wala pa sa DB) ---
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
        Internal: {
            brands: ["Internal", "Office Supplies", "VOS"],
            sections: ["Internal", "Office", "Supplies"],
        },
    };

const ALL_DIVISIONS = [
    "Dry Goods",
    "Frozen Goods",
    "Industrial",
    "Mama Pina's",
    "Internal",
] as const;

const INTERNAL_CUSTOMER_KEYWORDS = [
    "WALK-IN",
    "WALKIN",
    "EMPLOYEE",
    "POLITICIAN",
    "CLE ACE",
    "OFFICE",
    "INTERNAL",
    "VOS",
    "USE", // For "Office Use"
];

// --- HELPERS ---
function normalizeDate(d: string | null) {
    if (!d) return null;
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d; // already maybe YYYY-MM-DD
    return dt.toISOString().slice(0, 10);
}

function getRelId(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") {
        // common Directus relation object shapes
        if (val.id != null) return String(val.id);
        if (val.invoice_id != null) return String(val.invoice_id);
        if (val.return_number != null) return String(val.return_number);
        if (val.return_id != null) return String(val.return_id);
    }
    return String(val);
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

async function directusFetch<T>(
    url: string,
    errors: DirectusErrorItem[],
    collection: string
): Promise<T[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

        const res = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            headers,
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
            return [];
        }

        const json = await res.json();
        return (json?.data as T[]) || [];
    } catch (e: any) {
        clearTimeout(timeoutId);
        errors.push({
            collection,
            status: undefined,
            message: e?.message || "Unknown fetch error",
            url,
        });
        return [];
    }
}

async function fetchAllPaged<T>(
    collection: string,
    fields: string,
    errors: DirectusErrorItem[],
    filterQuery = "",
    pageSize = 500
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;

    for (let page = 0; page < 400; page++) {
        const url =
            `${DIRECTUS_BASE}/items/${collection}` +
            `?fields=${encodeURIComponent(fields)}` +
            `&limit=${pageSize}&offset=${offset}` +
            (filterQuery ? `&${filterQuery}` : "");

        const chunk = await directusFetch<T>(url, errors, collection);
        out.push(...chunk);

        if (chunk.length < pageSize) break;
        offset += pageSize;
    }

    return out;
}

export async function GET(request: Request) {
    const errors: DirectusErrorItem[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const rawFrom = searchParams.get("fromDate");
        const rawTo = searchParams.get("toDate");
        const activeTab = searchParams.get("activeTab") || "Overview";

        const fromDate = normalizeDate(rawFrom);
        const toDate = normalizeDate(rawTo);

        // We only date-filter invoice headers + return headers at source (safe + cheap)
        const invoiceDateFilter =
            fromDate && toDate
                ? `filter[invoice_date][_between]=[${encodeURIComponent(
                    fromDate
                )},${encodeURIComponent(toDate + "T23:59:59")}]`
                : "";

        const returnDateFilter =
            fromDate && toDate
                ? `filter[return_date][_between]=[${encodeURIComponent(
                    fromDate
                )},${encodeURIComponent(toDate + "T23:59:59")}]`
                : "";

        // --- FETCH DATA (paged + fields) ---
        const [
            invoices,
            invoiceDetails,
            returns,
            returnDetails,
            products,
            salesmen,
            customers,
            suppliers,
            pps,
            brands,
            sections,
        ] = await Promise.all([
            fetchAllPaged<any>(
                "sales_invoice",
                "invoice_id,invoice_date,total_amount,salesman_id,customer_code",
                errors,
                invoiceDateFilter
            ),
            fetchAllPaged<any>(
                "sales_invoice_details",
                "invoice_no,product_id,total_amount,quantity,discount_amount",
                errors
            ),
            fetchAllPaged<any>(
                "sales_return",
                "id,return_number,return_date",
                errors,
                returnDateFilter
            ),
            fetchAllPaged<any>(
                "sales_return_details",
                "return_no,product_id,quantity,total_amount,unit_price",
                errors
            ),
            fetchAllPaged<any>(
                "products",
                "product_id,product_name,product_brand,product_section,stock,inventory,quantity",
                errors
            ),
            fetchAllPaged<any>("salesman", "id,salesman_name", errors),
            fetchAllPaged<any>(
                "customer",
                "customer_code,store_name,customer_name",
                errors
            ),
            fetchAllPaged<any>("suppliers", "id,supplier_name", errors),
            fetchAllPaged<any>("product_per_supplier", "product_id,supplier_id", errors),
            fetchAllPaged<any>("brand", "brand_id,brand_name", errors),
            fetchAllPaged<any>("sections", "section_id,section_name", errors),
        ]);

        // --- MAPS ---
        const brandMap = new Map<string, string>();
        for (const b of brands) {
            const id = getRelId((b as any).brand_id);
            if (id) brandMap.set(id, String((b as any).brand_name || "").toUpperCase());
        }

        const sectionMap = new Map<string, string>();
        for (const s of sections) {
            const id = getRelId((s as any).section_id);
            if (id)
                sectionMap.set(id, String((s as any).section_name || "").toUpperCase());
        }

        const supplierNameMap = new Map<string, string>();
        suppliers.forEach((s: any) => {
            const id = getRelId(s.id);
            if (id) supplierNameMap.set(id, String(s.supplier_name || "").toUpperCase());
        });

        const productToSupplierMap = new Map<string, string>();
        pps.forEach((p: any) => {
            const pId = getRelId(p.product_id);
            const sId = getRelId(p.supplier_id);
            if (pId && sId) productToSupplierMap.set(pId, sId);
        });

        const productMap = new Map<string, any>();
        products.forEach((p: any) => {
            const pId = getRelId(p.product_id);
            if (!pId) return;

            const stockCount =
                Number(p.stock) || Number(p.inventory) || Number(p.quantity) || 0;

            productMap.set(pId, {
                ...p,
                brand_name: brandMap.get(getRelId(p.product_brand)) || "",
                section_name: sectionMap.get(getRelId(p.product_section)) || "",
                stock: stockCount,
            });
        });

        const salesmanMap = new Map<string, string>();
        salesmen.forEach((s: any) => {
            const id = getRelId(s.id);
            if (id) salesmanMap.set(id, String(s.salesman_name || ""));
        });

        const customerMap = new Map<string, string>();
        customers.forEach((c: any) => {
            const code = String(c.customer_code ?? "").trim();
            const name = String(c.store_name || c.customer_name || "").toUpperCase();
            if (code) customerMap.set(code, name);
        });

        // Invoice lookup (only those already date-filtered at source)
        const invoiceLookup = new Map<string, any>();
        invoices.forEach((inv: any) => {
            const id = getRelId(inv.invoice_id);
            if (id) invoiceLookup.set(id, inv);
        });

        const validInvoiceIds = new Set<string>(Array.from(invoiceLookup.keys()));

        // Returns: valid by BOTH id and return_number (because details may reference either)
        const validReturnRefs = new Set<string>();
        returns.forEach((r: any) => {
            if (r?.id != null) validReturnRefs.add(String(r.id));
            if (r?.return_number != null) validReturnRefs.add(String(r.return_number));
        });

        // --- AGGREGATION SETUP ---
        const divisionStats = new Map<string, { good: number; bad: number }>();
        ALL_DIVISIONS.forEach((div) => divisionStats.set(div, { good: 0, bad: 0 }));

        const trendMap = new Map<string, { good: number; bad: number }>();
        const supplierSales = new Map<string, number>();
        const salesmanSales = new Map<string, number>();
        const productSales = new Map<string, number>();
        const customerSales = new Map<string, number>();

        let totalGoodStockOutflow = 0;
        let totalBadStockInflow = 0;

        const isTabMatch = (realDivision: string, currentTab: string) => {
            if (!currentTab || currentTab === "Overview") return true;
            return realDivision === currentTab;
        };

        if (fromDate && toDate) {
            getDatesInRange(fromDate, toDate).forEach((d) => {
                if (!trendMap.has(d)) trendMap.set(d, { good: 0, bad: 0 });
            });
        }

        // --- IDENTIFICATION LOGIC ---
        const getSupplierName = (pId: string) => {
            const sId = productToSupplierMap.get(pId);
            if (sId && supplierNameMap.has(sId)) return supplierNameMap.get(sId)!;

            const pName = (productMap.get(pId)?.product_name || "").toUpperCase();
            if (pName.includes("MEN2")) return "MEN2 MARKETING";
            if (pName.includes("PUREFOODS") || pName.includes("PF"))
                return "FOODSPHERE INC";
            if (pName.includes("CDO")) return "FOODSPHERE INC";
            if (pName.includes("VIRGINIA")) return "VIRGINIA FOOD INC";
            if (pName.includes("MEKENI")) return "MEKENI FOOD CORP";
            if (pName.includes("MAMA PINA")) return "MAMA PINA'S";
            return "Internal / Others";
        };

        const getTransactionDivision = (pId: string, invoiceId: string) => {
            // 1) Customer keyword abang -> INTERNAL
            const inv = invoiceLookup.get(invoiceId);
            if (inv) {
                const custName =
                    customerMap.get(String(inv.customer_code ?? "").trim()) || "";
                if (INTERNAL_CUSTOMER_KEYWORDS.some((k) => custName.includes(k))) {
                    return "Internal";
                }
            }

            // 2) Product brand/section rules
            const prod = productMap.get(pId);
            if (!prod) return "Dry Goods";

            const pBrand = (prod.brand_name || "").toUpperCase();
            const pSection = (prod.section_name || "").toUpperCase();
            const pName = (prod.product_name || "").toUpperCase();

            for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
                if (
                    rules.brands.some((b) => {
                        const key = b.toUpperCase();
                        return pBrand.includes(key) || pName.includes(key);
                    })
                )
                    return divName;

                if (rules.sections.some((s) => pSection.includes(s.toUpperCase())))
                    return divName;
            }

            return "Dry Goods";
        };

        // --- PROCESS INVOICE DETAILS (filter by invoice headers in-memory) ---
        invoiceDetails.forEach((det: any) => {
            const invId = getRelId(det.invoice_no);
            if (!invId || !validInvoiceIds.has(invId)) return;

            const inv = invoiceLookup.get(invId);
            if (!inv?.invoice_date) return;

            // If you want strict date check again (safe):
            if (fromDate && String(inv.invoice_date).substring(0, 10) < fromDate) return;
            if (toDate && String(inv.invoice_date).substring(0, 10) > toDate) return;

            const pId = getRelId(det.product_id);
            const qty = Number(det.quantity) || 0;

            const amt =
                (Number(det.total_amount) || 0) - (Number(det.discount_amount) || 0);

            const realDivision = getTransactionDivision(pId, invId);

            if (divisionStats.has(realDivision)) {
                divisionStats.get(realDivision)!.good += qty;
            }

            if (isTabMatch(realDivision, activeTab)) {
                totalGoodStockOutflow += qty;

                const pName = productMap.get(pId)?.product_name || `Product ${pId}`;
                productSales.set(pName, (productSales.get(pName) || 0) + amt);

                const sName = getSupplierName(pId);
                supplierSales.set(sName, (supplierSales.get(sName) || 0) + amt);

                const d = String(inv.invoice_date).substring(0, 10);
                const curr = trendMap.get(d) || { good: 0, bad: 0 };
                curr.good += qty;
                trendMap.set(d, curr);

                const smName =
                    salesmanMap.get(getRelId(inv.salesman_id)) || "Unknown Salesman";
                salesmanSales.set(smName, (salesmanSales.get(smName) || 0) + amt);

                const cName =
                    customerMap.get(String(inv.customer_code ?? "").trim()) ||
                    `Customer ${inv.customer_code ?? ""}`;
                customerSales.set(cName, (customerSales.get(cName) || 0) + amt);
            }
        });

        // --- PROCESS RETURNS ---
        // Build quick lookup for return headers by both id and return_number
        const returnHeaderByRef = new Map<string, any>();
        returns.forEach((r: any) => {
            if (r?.id != null) returnHeaderByRef.set(String(r.id), r);
            if (r?.return_number != null)
                returnHeaderByRef.set(String(r.return_number), r);
        });

        returnDetails.forEach((ret: any) => {
            const ref = getRelId(ret.return_no); // can be id/object/string
            if (!ref || !validReturnRefs.has(ref)) return;

            const header = returnHeaderByRef.get(ref);
            if (!header?.return_date) return;

            // Date guard (because details are not date-filtered at source)
            const hd = String(header.return_date).substring(0, 10);
            if (fromDate && hd < fromDate) return;
            if (toDate && hd > toDate) return;

            const pId = getRelId(ret.product_id);
            const qty = Number(ret.quantity) || 0;

            // For returns division: product-based (unless you also fetch return->customer)
            const prod = productMap.get(pId);
            let realDivision = "Dry Goods";
            if (prod) {
                const pBrand = (prod.brand_name || "").toUpperCase();
                const pSection = (prod.section_name || "").toUpperCase();
                const pName = (prod.product_name || "").toUpperCase();

                for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
                    if (
                        rules.brands.some((b) => {
                            const key = b.toUpperCase();
                            return pBrand.includes(key) || pName.includes(key);
                        })
                    ) {
                        realDivision = divName;
                        break;
                    }
                    if (rules.sections.some((s) => pSection.includes(s.toUpperCase()))) {
                        realDivision = divName;
                        break;
                    }
                }
            }

            if (divisionStats.has(realDivision)) {
                divisionStats.get(realDivision)!.bad += qty;
            }

            if (isTabMatch(realDivision, activeTab)) {
                totalBadStockInflow += qty;

                const curr = trendMap.get(hd) || { good: 0, bad: 0 };
                curr.bad += qty;
                trendMap.set(hd, curr);
            }
        });

        // --- CALCULATE CURRENT STOCK FOR ACTIVE TAB ---
        let totalCurrentStock = 0;
        productMap.forEach((prod: any, pId: string) => {
            // derive product division from rules (no internal customer logic here)
            let prodDiv = "Dry Goods";
            const pBrand = (prod.brand_name || "").toUpperCase();
            const pSection = (prod.section_name || "").toUpperCase();
            const pName = (prod.product_name || "").toUpperCase();

            for (const [divName, rules] of Object.entries(DIVISION_RULES)) {
                if (
                    rules.brands.some((b) => {
                        const key = b.toUpperCase();
                        return pBrand.includes(key) || pName.includes(key);
                    })
                ) {
                    prodDiv = divName;
                    break;
                }
                if (rules.sections.some((s) => pSection.includes(s.toUpperCase()))) {
                    prodDiv = divName;
                    break;
                }
            }

            if (isTabMatch(prodDiv, activeTab)) {
                totalCurrentStock += Number(prod.stock) || 0;
            }
        });

        const totalMoved = totalGoodStockOutflow + totalCurrentStock;
        const velocityRate = totalMoved > 0 ? (totalGoodStockOutflow / totalMoved) * 100 : 0;

        let velocityStatus = "Stagnant";
        if (velocityRate > 50) velocityStatus = "Fast Moving";
        else if (velocityRate > 20) velocityStatus = "Healthy";
        else if (velocityRate > 5) velocityStatus = "Slow Moving";

        const returnRate =
            totalGoodStockOutflow > 0
                ? (totalBadStockInflow / totalGoodStockOutflow) * 100
                : 0;

        let badStockStatus = "Normal";
        if (returnRate > 5) badStockStatus = "Critical";
        else if (returnRate > 2) badStockStatus = "High";
        else if (returnRate > 0) badStockStatus = "Normal";
        else badStockStatus = "Excellent";

        // --- FORMAT RESULTS ---
        let trendData: any[] = [];
        if (fromDate && toDate) {
            trendData = getDatesInRange(fromDate, toDate).map((date) => ({
                date: new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                goodStockOutflow: trendMap.get(date)?.good || 0,
                badStockInflow: trendMap.get(date)?.bad || 0,
            }));
        } else {
            trendData = Array.from(trendMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, vals]) => ({
                    date: new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    }),
                    goodStockOutflow: vals.good,
                    badStockInflow: vals.bad,
                }));
        }

        const allSupplierSales = Array.from(supplierSales.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesBySupplier = allSupplierSales.slice(0, 10);

        const salesBySalesman = Array.from(salesmanSales.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const topProducts = Array.from(productSales.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);

        const topCustomers = Array.from(customerSales.entries())
            .filter(([name]) => {
                const up = String(name || "").toUpperCase();
                if (up.includes("MEN2")) return false;
                return !INTERNAL_CUSTOMER_KEYWORDS.some((k) => up.includes(k));
            })
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);

        const supplierBreakdown = allSupplierSales.map((s) => ({
            id: s.name,
            name: s.name,
            totalSales: s.value,
            salesmen: [{ name: "Total Sales", amount: s.value, percent: 100 }],
        }));

        const divisionBreakdown = ALL_DIVISIONS.map((divName) => {
            const stats = divisionStats.get(divName) || { good: 0, bad: 0 };
            return {
                division: divName,
                goodStock: {
                    velocityRate: 0,
                    totalOutflow: stats.good,
                    status: stats.good > 5000 ? "Healthy" : "Warning",
                },
                badStock: { accumulated: stats.bad },
            };
        });

        return NextResponse.json({
            division: activeTab,
            goodStock: {
                velocityRate: Math.round(velocityRate * 100) / 100,
                status: velocityStatus,
                totalOutflow: totalGoodStockOutflow,
                totalInflow: totalMoved,
            },
            badStock: {
                accumulated: totalBadStockInflow,
                status: badStockStatus,
                totalInflow: totalBadStockInflow,
            },
            trendData,
            salesBySupplier,
            salesBySalesman,
            supplierBreakdown,
            divisionBreakdown,
            pareto: { products: topProducts, customers: topCustomers },

            // Keep while debugging (remove later)
            _debug: {
                directusUrl: DIRECTUS_BASE + "/",
                hasToken: Boolean(DIRECTUS_TOKEN),
                fromDate,
                toDate,
                activeTab,
                counts: {
                    invoices: invoices.length,
                    invoiceDetails: invoiceDetails.length,
                    returns: returns.length,
                    returnDetails: returnDetails.length,
                    products: products.length,
                    customers: customers.length,
                    suppliers: suppliers.length,
                    pps: pps.length,
                    brands: brands.length,
                    sections: sections.length,
                },
                errors,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error?.message || "Unknown error",
                _debug: {
                    directusUrl: DIRECTUS_BASE + "/",
                    hasToken: Boolean(DIRECTUS_TOKEN),
                    errors,
                },
            },
            { status: 500 }
        );
    }
}
