import { NextResponse } from "next/server";

/**
 * IMPORTANT:
 * - Always normalize base URL (remove trailing slashes) to avoid //items/...
 * - Provide a fallback URL so route works even if env is missing.
 * - Optional token support (if your Directus requires auth).
 */
const RAW_DIRECTUS_URL =
    process.env.DIRECTUS_URL || "http://100.110.197.61:8091";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

/** Mapping for supplier -> division */
const SUPPLIER_MAPPING: Record<string, string> = {
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
    COSTSAVER: "Dry Goods",
};

const ALL_DIVISIONS = ["Dry Goods", "Frozen Goods", "Industrial", "Mama Pina's"];

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (DIRECTUS_TOKEN) headers.Authorization = `Bearer ${DIRECTUS_TOKEN}`;

        const res = await fetch(fullUrl, {
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
                url: fullUrl,
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

function resolveDivisionFromSupplierName(supplierUpper: string): string {
    // Default fallback
    let division = "Dry Goods";

    for (const [key, val] of Object.entries(SUPPLIER_MAPPING)) {
        if (supplierUpper.includes(key)) {
            division = val;
            break;
        }
    }

    return division;
}

export async function GET(request: Request) {
    const errors: DirectusErrorItem[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const selectedDivision = searchParams.get("division"); // 'all' or one division

        // 1) LOAD DATA (paged + field limited)
        // NOTE: include status fields because you filter by them.
        const [invoices, details, pps, suppliers] = await Promise.all([
            fetchAllPaged<any>(
                "sales_invoice",
                "invoice_id,invoice_date,status,is_cancelled",
                errors
            ),
            fetchAllPaged<any>(
                "sales_invoice_details",
                "invoice_no,product_id,total_amount,discount_amount",
                errors
            ),
            fetchAllPaged<any>(
                "product_per_supplier",
                "product_id,supplier_id",
                errors
            ),
            fetchAllPaged<any>("suppliers", "id,supplier_name", errors),
        ]);

        // If everything failed, return debug so you can see why immediately.
        if (
            invoices.length === 0 &&
            details.length === 0 &&
            pps.length === 0 &&
            suppliers.length === 0
        ) {
            return NextResponse.json({
                data: {},
                _debug: {
                    directusUrl: DIRECTUS_BASE + "/",
                    hasToken: Boolean(DIRECTUS_TOKEN),
                    counts: {
                        invoices: invoices.length,
                        details: details.length,
                        pps: pps.length,
                        suppliers: suppliers.length,
                    },
                    errors,
                },
            });
        }

        // 2) BUILD MAPS
        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [
                String(s.id),
                String(s.supplier_name || "").toUpperCase(),
            ])
        );

        // If a product has multiple supplier rows, keep the first encountered.
        const productSupplierMap = new Map<string, string>();
        pps.forEach((p: any) => {
            const pid = String(p.product_id);
            const sid = String(p.supplier_id);
            if (!productSupplierMap.has(pid)) productSupplierMap.set(pid, sid);
        });

        // 3) FILTER VALID INVOICES
        const validInvoiceIds = new Set<string>();
        invoices.forEach((inv: any) => {
            const status = String(inv.status || "").toLowerCase();
            const cancelled =
                inv.is_cancelled === true ||
                String(inv.is_cancelled || "").toLowerCase() === "true" ||
                String(inv.is_cancelled || "") === "1";

            if (status === "void" || status === "cancelled" || cancelled) return;
            validInvoiceIds.add(String(inv.invoice_id));
        });

        // 4) GROUP BY SUPPLIER
        const supplierSales: Record<string, number> = {};
        const supplierDivisions: Record<string, string> = {};

        details.forEach((det: any) => {
            const invId =
                typeof det.invoice_no === "object"
                    ? det.invoice_no?.id
                    : det.invoice_no;

            if (!validInvoiceIds.has(String(invId))) return;

            const pId = String(det.product_id);

            const total = Number(det.total_amount) || 0;
            const discount = Number(det.discount_amount) || 0;
            const netSales = total - discount;

            // Supplier resolve
            const suppId = productSupplierMap.get(pId);
            const suppName = suppId
                ? supplierNameMap.get(String(suppId))
                : "UNASSIGNED";

            if (!suppName) return;

            // Division resolve
            const division = resolveDivisionFromSupplierName(String(suppName));

            if (!supplierSales[suppName]) {
                supplierSales[suppName] = 0;
                supplierDivisions[suppName] = division;
            }

            supplierSales[suppName] += netSales;
        });

        // 5) FORMAT RESULT
        const resultList = Object.entries(supplierSales)
            .map(([name, sales]) => ({
                name,
                sales,
                division: supplierDivisions[name] || "Dry Goods",
            }))
            .sort((a, b) => b.sales - a.sales);

        const finalResponse: Record<string, any[]> = {};

        if (selectedDivision && selectedDivision !== "all") {
            finalResponse[selectedDivision] = resultList.filter(
                (i) => i.division === selectedDivision
            );

            // Force show UNASSIGNED in Dry Goods (same as your old behavior)
            if (selectedDivision === "Dry Goods") {
                const unassigned = resultList.filter((i) => i.name === "UNASSIGNED");
                if (unassigned.length > 0) {
                    finalResponse["Dry Goods"] = [
                        ...(finalResponse["Dry Goods"] || []),
                        ...unassigned,
                    ];
                }
            }
        } else {
            ALL_DIVISIONS.forEach((div) => {
                finalResponse[div] = resultList.filter((i) => i.division === div);
            });
        }

        return NextResponse.json({
            data: finalResponse,
            _debug: {
                directusUrl: DIRECTUS_BASE + "/",
                hasToken: Boolean(DIRECTUS_TOKEN),
                selectedDivision: selectedDivision || "all",
                counts: {
                    invoices: invoices.length,
                    details: details.length,
                    pps: pps.length,
                    suppliers: suppliers.length,
                    validInvoiceIds: validInvoiceIds.size,
                    suppliersInResult: resultList.length,
                },
                errors,
            },
        });
    } catch (error: any) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("❌ Executive V2 API Error:", error);

        return NextResponse.json(
            {
                error: "Failed to fetch executive-v2 data",
                details: msg,
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
