// src/app/api/sales/salesman/list/route.ts
import { NextResponse } from "next/server";

const RAW_DIRECTUS_URL = process.env.DIRECTUS_URL || "";
const DIRECTUS_BASE = RAW_DIRECTUS_URL.replace(/\/+$/, "");

const DIRECTUS_TOKEN =
    process.env.DIRECTUS_TOKEN ||
    process.env.DIRECTUS_ACCESS_TOKEN ||
    process.env.DIRECTUS_STATIC_TOKEN ||
    "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getHeaders(): HeadersInit {
    const headers: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };

    if (DIRECTUS_TOKEN) {
        (headers as any).Authorization = `Bearer ${DIRECTUS_TOKEN}`;
    }

    return headers;
}

export async function GET() {
    try {
        if (!DIRECTUS_BASE) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Missing DIRECTUS_URL in environment",
                },
                { status: 500 }
            );
        }

        // NOTE: keep fields minimal to avoid 403 forbidden on non-permitted fields
        const url = `${DIRECTUS_BASE}/items/salesman?fields=id,salesman_name&limit=500`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store",
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to fetch salesmen list",
                    details: text,
                    status: res.status,
                    _debug: {
                        directusUrl: DIRECTUS_BASE + "/",
                        hasToken: Boolean(DIRECTUS_TOKEN),
                        url,
                    },
                },
                { status: 500 }
            );
        }

        const json = await res.json();
        return NextResponse.json({
            success: true,
            data: json?.data || [],
            _debug: {
                directusUrl: DIRECTUS_BASE + "/",
                hasToken: Boolean(DIRECTUS_TOKEN),
                count: Array.isArray(json?.data) ? json.data.length : 0,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error?.message || "Unknown error",
                _debug: {
                    directusUrl: DIRECTUS_BASE ? DIRECTUS_BASE + "/" : null,
                    hasToken: Boolean(DIRECTUS_TOKEN),
                },
            },
            { status: 500 }
        );
    }
}
