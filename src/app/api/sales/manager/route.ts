import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || "http://100.110.197.61:8091";

// Remove trailing slashes so we never produce //items/...
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

/** Normalize dates like "MM/DD/YYYY" -> "YYYY-MM-DD" */
function normalizeDate(d: string | null) {
    if (!d) return null;
    if (d.includes("/")) {
        const [m, day, y] = d.split("/");
        return `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    return d;
}

type DirectusErrorItem = {
    collection: string;
    status?: number;
    message: string;
    url: string;
};

async function directusFetch<T>(
    fullUrl: string,
    errors: DirectusErrorItem[],
    collection: string
): Promise<T[]> {
    try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

        const res = await fetch(fullUrl, { cache: "no-store", headers });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            errors.push({
                collection,
                status: res.status,
                message: `Directus request failed. ${text}`,
                url: fullUrl,
            });
            return [];
        }

        const json = await res.json();
        return (json?.data as T[]) || [];
    } catch (e: any) {
        errors.push({
            collection,
            status: undefined,
            message: e?.message || "Unknown fetch error",
            url: fullUrl,
        });
        return [];
    }
}

async function fetchAllPaged<T>(
    collection: string,
    fields: string,
    errors: DirectusErrorItem[],
    pageSize = 500
): Promise<T[]> {
    const out: T[] = [];
    let offset = 0;

    // Hard guard to avoid runaway loops in case of a bad API
    const MAX_PAGES = 200;

    for (let page = 0; page < MAX_PAGES; page++) {
        const url =
            `${DIRECTUS_BASE}/items/${collection}` +
            `?fields=${encodeURIComponent(fields)}` +
            `&limit=${pageSize}&offset=${offset}`;

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
        const fromDate = normalizeDate(searchParams.get("fromDate"));
        const toDate = normalizeDate(searchParams.get("toDate"));
        const reqDivision = searchParams.get("activeTab") || "Overview";

        // 1) LOAD DATA (paged + field-limited)
        const [
            invoices,
            invDetails,
            returns,
            retDetails,
            products,
            salesmen,
            divisions,
            pps,
            suppliers,
            customers,
        ] = await Promise.all([
            fetchAllPaged<any>(
                "sales_invoice",
                "invoice_id,invoice_date,salesman_id,customer_id",
                errors
            ),
            fetchAllPaged<any>(
                "sales_invoice_details",
                "invoice_no,product_id,quantity,total_amount,unit_price",
                errors
            ),
            fetchAllPaged<any>("sales_return", "return_number,return_date,salesman_id", errors),
            fetchAllPaged<any>(
                "sales_return_details",
                "return_no,product_id,quantity,total_amount,unit_price",
                errors
            ),
            fetchAllPaged<any>("products", "product_id,product_name,parent_id", errors),
            fetchAllPaged<any>("salesman", "id,salesman_name,division_id,isActive", errors),
            fetchAllPaged<any>("division", "division_id,division_name", errors),
            fetchAllPaged<any>("product_per_supplier", "product_id,supplier_id", errors),
            fetchAllPaged<any>("suppliers", "id,supplier_name", errors),
            fetchAllPaged<any>("customer", "id,customer_name,store_name", errors),
        ]);

        // 2) BUILD MAPS
        const invoiceMap = new Map<string, any>();
        invoices.forEach((i: any) => invoiceMap.set(String(i.invoice_id), i));

        const returnMap = new Map<string, any>();
        returns.forEach((r: any) => returnMap.set(String(r.return_number), r));

        const salesmanDivisionMap = new Map<string, string>();
        const divisionNameMap = new Map<string, string>();
        const salesmanMap = new Map<string, string>();
        const customerMap = new Map<string, string>();

        // Customer mapping with fallbacks
        customers.forEach((c: any) => {
            let finalName = c.customer_name;
            if (!finalName || finalName === "0" || finalName === "0.00" || String(finalName).trim() === "") {
                finalName = c.store_name;
            }
            if (!finalName || finalName === "0" || finalName === "0.00" || String(finalName).trim() === "") {
                finalName = "Walk-in / Cash Sales";
            }
            customerMap.set(String(c.id), String(finalName));
        });

        divisions.forEach((d: any) =>
            divisionNameMap.set(String(d.division_id), String(d.division_name))
        );

        salesmen.forEach((s: any) => {
            salesmanMap.set(String(s.id), String(s.salesman_name));
            const divName = divisionNameMap.get(String(s.division_id));
            if (divName) salesmanDivisionMap.set(String(s.id), divName);
        });

        // Product maps
        const productParentMap = new Map<string | number, string | number>();
        const productNameMap = new Map<string | number, string>();
        products.forEach((p: any) => {
            const pid = p.product_id;
            const parentId = p.parent_id === 0 || p.parent_id === null ? pid : p.parent_id;
            productParentMap.set(pid, parentId);
            productNameMap.set(pid, p.product_name);
        });

        // Supplier maps
        const primarySupplierMap = new Map<string | number, string | number>();
        pps.forEach((r: any) => {
            if (!primarySupplierMap.has(r.product_id)) {
                primarySupplierMap.set(r.product_id, r.supplier_id);
            }
        });

        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [String(s.id), String(s.supplier_name)])
        );

        // Division Resolver (your existing heuristic)
        const getDivision = (salesmanId: string | number, productId: string | number) => {
            const div = salesmanDivisionMap.get(String(salesmanId));
            if (div) return div;

            const masterProduct = productParentMap.get(productId) || productId;
            const supplierId = String(primarySupplierMap.get(masterProduct));
            const supplierRaw = supplierNameMap.get(supplierId) || "";
            const sUpper = String(supplierRaw || "").toUpperCase();
            const pName = String(productNameMap.get(productId) || "").toUpperCase();

            if (sUpper.includes("SKINTEC") || sUpper.includes("FOODSPHERE") || sUpper === "VOS" || pName.includes("CDO"))
                return "Dry Goods";
            if (sUpper.includes("ISLA LPG") || sUpper.includes("INDUSTRIAL"))
                return "Industrial";
            if (sUpper.includes("MAMA PINA")) return "Mama Pina's";

            return "Frozen Goods";
        };

        const resolveSupplierName = (productId: number) => {
            const masterProduct = productParentMap.get(productId) || productId;
            const sid = String(primarySupplierMap.get(masterProduct));
            const sName = supplierNameMap.get(sid);
            if (sName && sName !== "Unknown Supplier") return sName;

            const pName = String(productNameMap.get(productId) || "").toUpperCase();
            if (pName.includes("CDO")) return "CDO Foodsphere";
            if (pName.includes("SKINTEC")) return "Skintec";
            if (pName.includes("MAMA PINA")) return "Mama Pina's";
            return "Uncategorized Supplier";
        };

        // 3) AGGREGATE DATA
        const aggData: Record<string, any> = {
            Overview: { goodOut: 0, badIn: 0, months: {} },
        };

        const initDiv = (div: string) => {
            if (!aggData[div]) aggData[div] = { goodOut: 0, badIn: 0, months: {} };
        };

        const supplierSalesMap = new Map<string, number>();
        const salesmanSalesMap = new Map<string, number>();
        const supplierBreakdownMap = new Map<string, any>();
        const productSalesPareto = new Map<string, number>();
        const customerSalesPareto = new Map<string, number>();

        // --- PROCESS SALES DETAILS ---
        invDetails.forEach((det: any) => {
            const invId =
                typeof det.invoice_no === "object" ? det.invoice_no?.id : det.invoice_no;

            const inv = invoiceMap.get(String(invId));
            if (!inv || !inv.invoice_date) return;

            const d = String(inv.invoice_date).substring(0, 10);
            if (fromDate && d < fromDate) return;
            if (toDate && d > toDate) return;

            const divName = getDivision(inv.salesman_id, det.product_id);
            const qty = Number(det.quantity) || 0;
            const amount = Number(det.total_amount) || 0;

            const dateObj = new Date(inv.invoice_date);
            const monthKey = dateObj.toLocaleString("en-US", { month: "short" });

            initDiv(divName);

            aggData[divName].goodOut += qty;
            aggData[divName].months[monthKey] ||= { good: 0, bad: 0 };
            aggData[divName].months[monthKey].good += qty;

            aggData["Overview"].goodOut += qty;
            aggData["Overview"].months[monthKey] ||= { good: 0, bad: 0 };
            aggData["Overview"].months[monthKey].good += qty;

            // filter by active tab
            if (reqDivision === "Overview" || reqDivision === divName) {
                const supplierName = resolveSupplierName(Number(det.product_id));
                const salesmanName = String(salesmanMap.get(String(inv.salesman_id)) || "Unknown Salesman");
                const prodName = String(productNameMap.get(det.product_id) || "Unknown Product");
                const custName = String(customerMap.get(String(inv.customer_id)) || "Walk-in / Cash Sales");

                supplierSalesMap.set(supplierName, (supplierSalesMap.get(supplierName) || 0) + amount);
                salesmanSalesMap.set(salesmanName, (salesmanSalesMap.get(salesmanName) || 0) + amount);

                if (!supplierBreakdownMap.has(supplierName)) {
                    supplierBreakdownMap.set(supplierName, {
                        id: supplierName,
                        name: supplierName,
                        totalSales: 0,
                        salesmen: new Map<string, number>(),
                    });
                }
                const supEntry = supplierBreakdownMap.get(supplierName);
                supEntry.totalSales += amount;
                supEntry.salesmen.set(salesmanName, (supEntry.salesmen.get(salesmanName) || 0) + amount);

                productSalesPareto.set(prodName, (productSalesPareto.get(prodName) || 0) + amount);
                customerSalesPareto.set(custName, (customerSalesPareto.get(custName) || 0) + amount);
            }
        });

        // --- PROCESS RETURN DETAILS ---
        retDetails.forEach((ret: any) => {
            const returnInfo = returnMap.get(String(ret.return_no));
            if (!returnInfo || !returnInfo.return_date) return;

            const d = String(returnInfo.return_date).substring(0, 10);
            if (fromDate && d < fromDate) return;
            if (toDate && d > toDate) return;

            const divName = getDivision(returnInfo.salesman_id, ret.product_id);

            let qty = Number(ret.quantity) || 0;
            if (qty === 0 && Number(ret.unit_price) > 0) {
                qty = Math.round((Number(ret.total_amount) || 0) / Number(ret.unit_price));
            }

            const dateObj = new Date(returnInfo.return_date);
            const monthKey = dateObj.toLocaleString("en-US", { month: "short" });

            initDiv(divName);

            aggData[divName].badIn += qty;
            aggData[divName].months[monthKey] ||= { good: 0, bad: 0 };
            aggData[divName].months[monthKey].bad += qty;

            aggData["Overview"].badIn += qty;
            aggData["Overview"].months[monthKey] ||= { good: 0, bad: 0 };
            aggData["Overview"].months[monthKey].bad += qty;
        });

        // 4) FORMAT OUTPUT
        const formatDivisionData = (divName: string, raw: any) => {
            const totalOut = raw.goodOut;
            const totalIn = raw.badIn;
            const totalMovement = totalOut + totalIn;

            const velocity = totalMovement > 0 ? Math.round((totalOut / totalMovement) * 100) : 0;

            let status: "Healthy" | "Warning" | "Critical" = "Healthy";
            if (velocity < 80) status = "Warning";
            if (velocity < 50) status = "Critical";

            const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

            const trendData = monthOrder
                .map((m) => ({
                    date: m,
                    goodStockOutflow: raw.months[m]?.good || 0,
                    badStockInflow: raw.months[m]?.bad || 0,
                }))
                .filter((t) => t.goodStockOutflow > 0 || t.badStockInflow > 0);

            return {
                division: divName,
                goodStock: {
                    velocityRate: velocity,
                    status,
                    totalOutflow: totalOut,
                    totalInflow: totalOut + totalIn,
                },
                badStock: {
                    accumulated: totalIn,
                    status: totalIn > totalOut * 0.05 ? "High" : "Normal",
                    totalInflow: totalIn,
                },
                trendData,
            };
        };

        const targetRawData = aggData[reqDivision] || { goodOut: 0, badIn: 0, months: {} };
        const finalData: any = formatDivisionData(reqDivision, targetRawData);

        finalData.salesBySupplier = Array.from(supplierSalesMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);

        finalData.salesBySalesman = Array.from(salesmanSalesMap.entries())
            .map(([name, sales]) => ({ name, sales }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 50);

        finalData.supplierBreakdown = Array.from(supplierBreakdownMap.values())
            .map((sup: any) => {
                const salesmenList = Array.from((sup.salesmen as Map<string, number>).entries())
                    .map(([sName, amount]) => ({
                        name: sName,
                        amount,
                        percent: sup.totalSales > 0 ? Number(((amount / sup.totalSales) * 100).toFixed(1)) : 0,
                    }))
                    .sort((a, b) => b.amount - a.amount);

                return { id: sup.id, name: sup.name, totalSales: sup.totalSales, salesmen: salesmenList };
            })
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 100);

        finalData.pareto = {
            products: Array.from(productSalesPareto.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 50),
            customers: Array.from(customerSalesPareto.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 50),
        };

        if (reqDivision === "Overview") {
            const divisionsList = ["Dry Goods", "Industrial", "Mama Pina's", "Frozen Goods"];
            finalData.divisionBreakdown = divisionsList.map((divName) => {
                const raw = aggData[divName] || { goodOut: 0, badIn: 0, months: {} };
                return formatDivisionData(divName, raw);
            });
        }

        // DEBUG INFO (matches what you pasted)
        finalData._debug = {
            directusUrl: DIRECTUS_BASE + "/",
            hasToken: Boolean(DIRECTUS_TOKEN),
            fromDate,
            toDate,
            activeTab: reqDivision,
            counts: {
                invoices: invoices.length,
                invoiceDetails: invDetails.length,
                returns: returns.length,
                returnDetails: retDetails.length,
            },
            errors,
        };

        return NextResponse.json(finalData);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Manager API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch data", details: msg, _debug: { directusUrl: DIRECTUS_BASE + "/", hasToken: Boolean(DIRECTUS_TOKEN), errors } },
            { status: 500 }
        );
    }
}
