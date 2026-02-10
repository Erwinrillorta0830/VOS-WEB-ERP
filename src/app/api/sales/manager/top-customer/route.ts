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
    const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (DIRECTUS_TOKEN) h.Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function directusFetch<T>(path: string, attempt = 1): Promise<T> {
    const url = `${DIRECTUS_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await fetch(url, { headers: getHeaders(), cache: "no-store" });

    if ((res.status === 429 || res.status === 503) && attempt < 4) {
        await sleep(400 * attempt);
        return directusFetch<T>(path, attempt + 1);
    }

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Directus request failed (${res.status}) for ${url}. Response: ${text.slice(0, 1400)}`);
    }

    return (await res.json()) as T;
}

export async function GET() {
    try {
        // Build params safely (avoid broken _nin parsing)
        const excludedDivisions = ["Internal Division", "Internal"].join(",");
        const excludedCustomers = ["Unknown", "Others", "Internal Customer"].join(",");

        const params = new URLSearchParams();
        params.set("aggregate[sum]", "amount");
        params.append("groupBy[]", "customer_name");
        params.set("filter[division][_nin]", excludedDivisions);
        params.set("filter[customer_name][_nin]", excludedCustomers);
        params.set("sort", "-sum.amount");
        params.set("limit", "10");

        const json = await directusFetch<DirectusResponse<any[]>>(`/items/sales?${params.toString()}`);
        const rows = Array.isArray(json?.data) ? json.data : [];

        return NextResponse.json({
            success: true,
            data: {
                topCustomers: rows.map((item: any) => ({
                    customerName: item.customer_name,
                    totalSpent: Number(item?.sum?.amount) || 0,
                })),
            },
            _debug: {
                directusUrl: DIRECTUS_URL,
                hasToken: Boolean(DIRECTUS_TOKEN),
                returned: rows.length,
            },
        });
    } catch (error: any) {
        console.error("topCustomers route error:", error);
        return NextResponse.json(
            { error: "Failed to fetch top customer data", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
