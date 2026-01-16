import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

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

function getSafeId(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "object" && val !== null) return val.id ? String(val.id) : "";
    return String(val);
}

function normalizeDate(d: string | null) {
    return d ? d : null; // expects YYYY-MM-DD
}

function buildDateFilter(field: string, fromDate: string, toDate: string) {
    // Use ISO gte/lte (avoid _between with spaces)
    const from = encodeURIComponent(`${fromDate}T00:00:00`);
    const to = encodeURIComponent(`${toDate}T23:59:59`);
    return `&filter[${encodeURIComponent(field)}][_gte]=${from}&filter[${encodeURIComponent(field)}][_lte]=${to}`;
}

async function directusFetchList<T>(
    collection: string,
    query: string,
    errors: DirectusErrorItem[],
    pageSize = 500
): Promise<T[]> {
    if (!DIRECTUS_BASE) {
        errors.push({
            collection,
            status: undefined,
            message: "Missing DIRECTUS_URL in environment",
            url: "DIRECTUS_URL is empty",
        });
        return [];
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

    const out: T[] = [];
    let offset = 0;

    for (let page = 0; page < 200; page++) {
        const url = `${DIRECTUS_BASE}/items/${collection}?limit=${pageSize}&offset=${offset}${query}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(url, {
                cache: "no-store",
                headers,
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
    const errors: DirectusErrorItem[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const fromDate = normalizeDate(searchParams.get("fromDate"));
        const toDate = normalizeDate(searchParams.get("toDate"));

        if (!fromDate || !toDate) {
            return NextResponse.json(
                { success: false, error: "Missing date parameters" },
                { status: 400 }
            );
        }

        const invoiceFields = encodeURIComponent(
            "invoice_id,total_amount,discount_amount,net_amount,salesman_id,customer_code,invoice_date"
        );
        const invoiceQuery = `&fields=${invoiceFields}${buildDateFilter(
            "invoice_date",
            fromDate,
            toDate
        )}`;

        const invoiceDetailsQuery = `&fields=${encodeURIComponent(
            "invoice_no,product_id,quantity,total_amount"
        )}`;

        const returnsQuery = `&fields=${encodeURIComponent(
            "total_amount,return_date"
        )}${buildDateFilter("return_date", fromDate, toDate)}`;

        const rtsQuery = `&fields=${encodeURIComponent(
            "supplier_id,transaction_date"
        )}${buildDateFilter("transaction_date", fromDate, toDate)}`;

        const [
            salesmen,
            invoices,
            invoiceDetails,
            returns,
            customers,
            products,
            rtsData,
            storeTypes,
        ] = await Promise.all([
            directusFetchList<any>(
                "salesman",
                `&fields=${encodeURIComponent("id,salesman_name,isActive")}`,
                errors
            ),
            directusFetchList<any>("sales_invoice", invoiceQuery, errors),
            directusFetchList<any>("sales_invoice_details", invoiceDetailsQuery, errors),
            directusFetchList<any>("sales_return", returnsQuery, errors),
            directusFetchList<any>(
                "customer",
                `&fields=${encodeURIComponent("id,customer_code,store_type")}`,
                errors
            ),
            directusFetchList<any>(
                "products",
                `&fields=${encodeURIComponent("product_id,product_name,isActive")}`,
                errors
            ),
            directusFetchList<any>("return_to_supplier", rtsQuery, errors),
            directusFetchList<any>(
                "store_type",
                `&fields=${encodeURIComponent("id,store_type")}`,
                errors
            ),
        ]);

        const activeSalesmenSet = new Set<string>();
        const activeProductsSet = new Set<string>();
        const invoicedCustomerCodes = new Set<string>();
        const activeSuppliersSet = new Set<string>();

        const salesmanSalesMap = new Map<string, number>();
        const productVolumeMap = new Map<string, number>();

        let totalNetSales = 0;
        let totalDiscounts = 0;

        // 1) Process Invoices & Salesmen
        invoices.forEach((inv: any) => {
            totalNetSales += Number(inv.net_amount) || 0;
            totalDiscounts += Number(inv.discount_amount) || 0;

            if (inv.customer_code) invoicedCustomerCodes.add(String(inv.customer_code));

            const sId = getSafeId(inv.salesman_id);
            if (sId) {
                activeSalesmenSet.add(sId);
                salesmanSalesMap.set(sId, (salesmanSalesMap.get(sId) || 0) + (Number(inv.net_amount) || 0));
            }
        });

        // 2) Process Suppliers (Returns-to-supplier based)
        rtsData.forEach((rts: any) => {
            const suppId = getSafeId(rts.supplier_id);
            if (suppId) activeSuppliersSet.add(suppId);
        });

        // 3) Process Product Volumes (details grouped by invoice id)
        const detailsMap = new Map<string, any[]>();
        invoiceDetails.forEach((det: any) => {
            const invNo = getSafeId(det.invoice_no);
            if (!invNo) return;
            if (!detailsMap.has(invNo)) detailsMap.set(invNo, []);
            detailsMap.get(invNo)!.push(det);
        });

        invoices.forEach((inv: any) => {
            const invId = getSafeId(inv.invoice_id) || getSafeId(inv.id);
            const relatedDetails = detailsMap.get(invId) || [];
            relatedDetails.forEach((det: any) => {
                const pId = getSafeId(det.product_id);
                if (!pId) return;
                activeProductsSet.add(pId);
                productVolumeMap.set(
                    pId,
                    (productVolumeMap.get(pId) || 0) + (Number(det.quantity) || 0)
                );
            });
        });

        // 4) Coverage Metrics
        const sariSariIds = storeTypes
            .filter((st: any) => String(st.store_type || "").toLowerCase().includes("sari"))
            .map((st: any) => getSafeId(st.id))
            .filter(Boolean);

        const restoIds = storeTypes
            .filter((st: any) => {
                const t = String(st.store_type || "").toLowerCase();
                return t.includes("resto") || t.includes("restaurant");
            })
            .map((st: any) => getSafeId(st.id))
            .filter(Boolean);

        const sariSariCustomers = customers.filter((c: any) =>
            sariSariIds.includes(getSafeId(c.store_type))
        );
        const restoCustomers = customers.filter((c: any) =>
            restoIds.includes(getSafeId(c.store_type))
        );

        const sariInvoiced = sariSariCustomers.filter((c: any) =>
            invoicedCustomerCodes.has(String(c.customer_code))
        ).length;

        const restoInvoiced = restoCustomers.filter((c: any) =>
            invoicedCustomerCodes.has(String(c.customer_code))
        ).length;

        const totalReturnAmt = returns.reduce(
            (acc: number, curr: any) => acc + (Number(curr.total_amount) || 0),
            0
        );

        const returnRate =
            totalNetSales > 0
                ? (((totalReturnAmt + totalDiscounts) / totalNetSales) * 100).toFixed(2)
                : "0.00";

        return NextResponse.json({
            success: true,
            data: {
                activeSalesmen: activeSalesmenSet.size,
                topProductsCount: activeProductsSet.size,
                suppliersCount: activeSuppliersSet.size,
                returnRate,
                strikeRate:
                    customers.length > 0
                        ? ((invoicedCustomerCodes.size / customers.length) * 100).toFixed(1)
                        : "0.0",
                coverage: {
                    sariPercent:
                        sariSariCustomers.length > 0
                            ? Math.round((sariInvoiced / sariSariCustomers.length) * 100)
                            : 0,
                    restoPercent:
                        restoCustomers.length > 0
                            ? Math.round((restoInvoiced / restoCustomers.length) * 100)
                            : 0,
                },
                salesmanRanking: salesmen
                    .filter((s: any) => s.isActive === 1)
                    .map((s: any) => ({
                        name: s.salesman_name,
                        amount: salesmanSalesMap.get(String(s.id)) || 0,
                    }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5),
                topProducts: products
                    .filter((p: any) => p.isActive === 1)
                    .map((p: any) => ({
                        name: p.product_name,
                        cases: productVolumeMap.get(String(p.product_id)) || 0,
                    }))
                    .sort((a, b) => b.cases - a.cases)
                    .slice(0, 5),
            },
            _debug: {
                directusUrl: DIRECTUS_BASE ? DIRECTUS_BASE + "/" : null,
                hasToken: Boolean(DIRECTUS_TOKEN),
                fromDate,
                toDate,
                counts: {
                    salesmen: salesmen.length,
                    invoices: invoices.length,
                    invoiceDetails: invoiceDetails.length,
                    returns: returns.length,
                    customers: customers.length,
                    products: products.length,
                    rtsData: rtsData.length,
                    storeTypes: storeTypes.length,
                },
                errors,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
