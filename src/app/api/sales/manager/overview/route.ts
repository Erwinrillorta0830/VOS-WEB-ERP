import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? "http://goatedcodoer:8091").replace(/\/+$/, "");
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_SERVICE_TOKEN ||
    "";

function getHeaders(): HeadersInit {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url: string, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const res = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            headers: getHeaders(),
        });

        clearTimeout(timeoutId);

        // retry transient pressure
        if ((res.status === 429 || res.status === 503) && attempt < 4) {
            await sleep(400 * attempt);
            return fetchJson(url, attempt + 1);
        }

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
                `Directus request failed (${res.status}) for ${url}. Response: ${text.slice(0, 1200)}`
            );
        }

        return res.json();
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

export async function GET() {
    try {
        // Exclusions: send as real array (JSON)
        const excludedDivisions = ["Internal Division", "Internal"];

        // Keep payload minimal with fields
        const salesUrl =
            `${DIRECTUS_URL}/items/sales?limit=-1` +
            `&fields=division,product_id,amount,date,branch` +
            `&filter[division][_nin]=${encodeURIComponent(JSON.stringify(excludedDivisions))}`;

        const productsUrl =
            `${DIRECTUS_URL}/items/products?limit=-1&fields=product_id,parent_id`;

        const ppsUrl =
            `${DIRECTUS_URL}/items/product_per_supplier?limit=-1&fields=product_id,supplier_id`;

        const suppliersUrl =
            `${DIRECTUS_URL}/items/suppliers?limit=-1&fields=id,supplier_name`;

        const [salesJson, productsJson, ppsJson, suppliersJson] = await Promise.all([
            fetchJson(salesUrl),
            fetchJson(productsUrl),
            fetchJson(ppsUrl),
            fetchJson(suppliersUrl),
        ]);

        const sales = Array.isArray(salesJson?.data) ? salesJson.data : [];
        const products = Array.isArray(productsJson?.data) ? productsJson.data : [];
        const pps = Array.isArray(ppsJson?.data) ? ppsJson.data : [];
        const suppliers = Array.isArray(suppliersJson?.data) ? suppliersJson.data : [];

        // product -> parent
        const parentMap = new Map<string, string | null>(
            products.map((p: any) => [
                String(p.product_id),
                p.parent_id != null ? String(p.parent_id) : null,
            ])
        );

        // product -> supplier (first one wins)
        const supplierIdMap = new Map<string, string>();
        for (const p of pps) {
            const pid = String(p.product_id);
            const sid = String(p.supplier_id);
            if (!supplierIdMap.has(pid)) supplierIdMap.set(pid, sid);
        }

        // supplier_id -> supplier_name
        const supplierNameMap = new Map<string, string>(
            suppliers.map((s: any) => [
                String(s.id),
                String(s.supplier_name || "").toUpperCase(),
            ])
        );

        // root resolver
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

            const root = current || pid;
            rootMemo.set(pid, root);
            return root;
        };

        // root -> supplier freq across descendants
        const rootSupplierFreq = new Map<string, Map<string, number>>();
        for (const [pid, sid] of supplierIdMap.entries()) {
            const root = getRootId(pid);
            if (!rootSupplierFreq.has(root)) rootSupplierFreq.set(root, new Map());
            const fm = rootSupplierFreq.get(root)!;
            fm.set(sid, (fm.get(sid) || 0) + 1);
        }

        // root -> chosen supplier_id (prefer direct root mapping if present)
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

        // override with direct mapping if root has one
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

        // ✅ drop unmapped families
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
                suppliers: Array.from(new Set(alignedSales.map((s) => s.aligned_supplier))).sort(),
                trends: alignedSales,
            },
            _debug: {
                directusUrl: DIRECTUS_URL,
                hasToken: Boolean(DIRECTUS_TOKEN),
                counts: {
                    sales: sales.length,
                    alignedSales: alignedSales.length,
                    products: products.length,
                    pps: pps.length,
                    suppliers: suppliers.length,
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
