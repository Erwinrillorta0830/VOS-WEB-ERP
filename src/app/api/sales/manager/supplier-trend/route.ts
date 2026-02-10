import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? "http://goatedcodoer:8091").replace(/\/+$/, "");
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_SERVICE_TOKEN ||
    "";

type DirectusResponse<T> = { data?: T };

function getHeaders(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function directusFetch<T>(path: string, attempt = 1): Promise<T> {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;

    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

    // retry transient pressure only
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
}

export async function GET() {
    try {
        // Safer: encode nin list (Directus parses this reliably)
        const excludedDivisions = ["Internal Division", "Internal"].join(",");

        const [salesJson, productsJson, ppsJson, suppliersJson] = await Promise.all([
            directusFetch<DirectusResponse<any[]>>(
                `/items/sales?limit=-1&filter[division][_nin]=${encodeURIComponent(excludedDivisions)}`
            ),
            directusFetch<DirectusResponse<any[]>>(
                `/items/products?limit=-1&fields=${encodeURIComponent("product_id,parent_id")}`
            ),
            directusFetch<DirectusResponse<any[]>>(
                `/items/product_per_supplier?limit=-1&fields=${encodeURIComponent("product_id,supplier_id")}`
            ),
            directusFetch<DirectusResponse<any[]>>(
                `/items/suppliers?limit=-1&fields=${encodeURIComponent("id,supplier_name")}`
            ),
        ]);

        const sales = Array.isArray(salesJson?.data) ? salesJson.data : [];
        const products = Array.isArray(productsJson?.data) ? productsJson.data : [];
        const pps = Array.isArray(ppsJson?.data) ? ppsJson.data : [];
        const suppliers = Array.isArray(suppliersJson?.data) ? suppliersJson.data : [];

        const parentMap = new Map<string, string | null>(
            products.map((p: any) => [
                String(p.product_id),
                p.parent_id != null ? String(p.parent_id) : null,
            ])
        );

        const supplierIdMap = new Map<string, string>();
        pps.forEach((p: any) => {
            const pid = String(p.product_id);
            const sid = String(p.supplier_id);
            if (!supplierIdMap.has(pid)) supplierIdMap.set(pid, sid);
        });

        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [
                String(s.id),
                String(s.supplier_name || "").toUpperCase(),
            ])
        );

        const rootMemo = new Map<string, string>();
        const getRootId = (pid: string) => {
            if (rootMemo.has(pid)) return rootMemo.get(pid)!;
            let current = pid;
            const visited = new Set<string>();
            while (current && !visited.has(current)) {
                visited.add(current);
                const parent = parentMap.get(current);
                if (!parent) break;
                if (!parentMap.has(parent)) break;
                current = parent;
            }
            rootMemo.set(pid, current || pid);
            return current || pid;
        };

        const rootSupplierFreq = new Map<string, Map<string, number>>();
        for (const [pid, sid] of supplierIdMap.entries()) {
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

        // root direct mapping overrides frequency pick
        for (const root of rootSupplierIdMap.keys()) {
            const direct = supplierIdMap.get(root);
            if (direct) rootSupplierIdMap.set(root, direct);
        }

        const resolveSupplierNameOrNull = (productId: any): string | null => {
            const pid = String(productId);

            const direct = supplierIdMap.get(pid);
            if (direct) return supplierNameMap.get(direct) || null;

            const root = getRootId(pid);
            const rootSid = rootSupplierIdMap.get(root);
            if (!rootSid) return null;

            return supplierNameMap.get(rootSid) || null;
        };

        const alignedSales = sales
            .map((sale: any) => {
                const sName = resolveSupplierNameOrNull(sale.product_id);
                if (!sName) return null;
                return { ...sale, aligned_supplier: sName };
            })
            .filter(Boolean) as any[];

        return NextResponse.json({
            success: true,
            data: {
                suppliers: [...new Set(alignedSales.map((s: any) => s.aligned_supplier))],
                trends: alignedSales,
            },
            _debug: {
                directusUrl: DIRECTUS_URL,
                hasToken: Boolean(DIRECTUS_TOKEN),
                counts: {
                    sales: sales.length,
                    products: products.length,
                    pps: pps.length,
                    suppliers: suppliers.length,
                    alignedSales: alignedSales.length,
                },
            },
        });
    } catch (error: any) {
        console.error("Error aligning data:", error);
        return NextResponse.json(
            {
                error: "Failed to align supplier data",
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
