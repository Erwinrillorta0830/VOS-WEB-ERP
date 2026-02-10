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

async function directusFetch(url: string, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const res = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
            headers: getHeaders(),
        });

        clearTimeout(timeoutId);

        // Retry transient pressure
        if ((res.status === 503 || res.status === 429) && attempt < 4) {
            await sleep(400 * attempt);
            return directusFetch(url, attempt + 1);
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
        // ✅ Stronger exclusions (covers variants)
        const EXCLUDED_DIVISIONS = [
            "Internal Division",
            "Internal",
            "Unknown",
            "UNKNOWN",
            "Others",
            "OTHERS",
            "OTHERS / UNKNOWN",
            "N/A",
            "",
            " ",
        ];

        const params = new URLSearchParams();
        params.append("aggregate[sum]", "amount");
        params.append("groupBy[]", "division");

        // ✅ IMPORTANT: _nin should be an array; JSON string is the most compatible encoding
        params.append("filter[division][_nin]", JSON.stringify(EXCLUDED_DIVISIONS));

        params.append("filter[division][_nnull]", "true");

        const url = `${DIRECTUS_URL}/items/sales?${params.toString()}`;

        const json = await directusFetch(url);
        const data = Array.isArray(json?.data) ? json.data : [];

        return NextResponse.json({
            success: true,
            data: {
                divisions: data.map((d: any) => d.division),
                sales: data.map((d: any) => ({
                    division: d.division,
                    totalAmount: Number(d?.sum?.amount) || 0,
                })),
            },
        });
    } catch (error: any) {
        console.error("❌ Division API route error:", error);
        return NextResponse.json(
            {
                error: "Failed to fetch division data",
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
