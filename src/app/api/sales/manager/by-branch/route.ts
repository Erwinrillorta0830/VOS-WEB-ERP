import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIRECTUS_URL = (process.env.DIRECTUS_URL ?? "http://goatedcodoer:8091").replace(/\/+$/, "");
const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_SERVICE_TOKEN ||
    "";

function getHeaders(): Record<string, string> {
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

        if ((res.status === 503 || res.status === 429) && attempt < 4) {
            await sleep(400 * attempt);
            return directusFetch(url, attempt + 1);
        }

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Directus request failed (${res.status}) for ${url}. Response: ${text.slice(0, 900)}`);
        }

        return res.json();
    } catch (e) {
        clearTimeout(timeoutId);
        throw e;
    }
}

export async function GET() {
    try {
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

        const EXCLUDED_BRANCHES = ["Unknown", "UNKNOWN", "Others", "OTHERS", "N/A", "", " "];

        const params = new URLSearchParams();
        params.append("aggregate[sum]", "amount");
        params.append("groupBy[]", "branch");

        // Safer: JSON array for _nin
        params.append("filter[division][_nin]", JSON.stringify(EXCLUDED_DIVISIONS));
        params.append("filter[branch][_nin]", JSON.stringify(EXCLUDED_BRANCHES));

        params.append("filter[branch][_nnull]", "true");
        params.append("sort", "-sum.amount");

        const url = `${DIRECTUS_URL}/items/sales?${params.toString()}`;

        const json = await directusFetch(url);
        const data = Array.isArray(json?.data) ? json.data : [];

        return NextResponse.json({
            success: true,
            data: {
                branches: data.map((b: any) => b.branch),
                sales: data.map((b: any) => ({
                    branch: b.branch,
                    totalSales: Number(b?.sum?.amount) || 0,
                })),
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: "Failed to fetch branch data",
                details: error?.message || String(error),
            },
            { status: 500 }
        );
    }
}
