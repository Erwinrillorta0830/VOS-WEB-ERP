// app/api/sales/manager/overview/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const target = new URL(url.toString());
    target.pathname = "/api/sales/manager";
    target.searchParams.set("activeTab", "Overview");
    return NextResponse.redirect(target, 307);
}
